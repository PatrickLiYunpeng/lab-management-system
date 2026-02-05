"""
工单管理API端点 - Work Order Management API Endpoints

本模块提供工单全生命周期管理的API接口，是实验室管理系统的核心模块。
支持工单创建、任务分配、状态流转、物料消耗和技术员匹配等功能。

API端点列表:
- GET /work-orders: 分页获取工单列表，支持多条件筛选和排序
- GET /work-orders/{work_order_id}: 获取单个工单详情
- POST /work-orders: 创建新工单（需要Engineer及以上权限）
- PUT /work-orders/{work_order_id}: 更新工单信息
- DELETE /work-orders/{work_order_id}: 删除工单（需要Manager及以上权限）
- POST /work-orders/{work_order_id}/start: 开始工单
- POST /work-orders/{work_order_id}/complete: 完成工单
- POST /work-orders/{work_order_id}/cancel: 取消工单
- POST /work-orders/{work_order_id}/assign: 分配工单给工程师
- GET /work-orders/available-materials/list: 获取可用物料列表

任务管理端点:
- GET /work-orders/{work_order_id}/tasks: 获取工单下所有任务
- POST /work-orders/{work_order_id}/tasks: 创建任务
- PUT /work-orders/{work_order_id}/tasks/{task_id}: 更新任务
- POST /work-orders/{work_order_id}/tasks/{task_id}/start: 开始任务
- POST /work-orders/{work_order_id}/tasks/{task_id}/complete: 完成任务
- POST /work-orders/{work_order_id}/tasks/{task_id}/assign: 分配任务给技术员
- GET /work-orders/{work_order_id}/tasks/{task_id}/eligible-technicians: 获取符合资质的技术员

物料消耗端点:
- POST /work-orders/{work_order_id}/tasks/{task_id}/consumptions: 批量记录物料消耗
- GET /work-orders/{work_order_id}/consumptions: 获取工单物料消耗记录
- POST /work-orders/{work_order_id}/consumptions/{consumption_id}/void: 作废消耗记录

导出端点:
- GET /work-orders/export: 导出工单数据为CSV

权限要求:
- 查询操作：所有已登录用户
- 创建/更新工单：Engineer及以上角色
- 删除工单：Manager及以上角色
- 任务分配：Engineer及以上角色

业务规则:
- 工单编号自动生成，格式：WO-{时间戳}-{随机码}
- 工单状态流转：PENDING → IN_PROGRESS → COMPLETED
- SLA截止时间用于计算优先级评分
- 任务分配时自动匹配技术员技能资质
- 物料消耗记录支持正反向流程和作废
"""
from typing import Optional
from datetime import datetime, timezone
import uuid
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import case

from app.core.database import get_db
from app.models.work_order import WorkOrder, WorkOrderType, WorkOrderStatus, WorkOrderTask, TaskStatus
from app.models.laboratory import Laboratory
from app.models.personnel import Personnel
from app.models.method import Method
from app.models.material import Material, MaterialStatus, MaterialType, MaterialConsumption, ConsumptionStatus, MaterialReplenishment, NonSapSource, MaterialHistory
from app.schemas.work_order import (
    WorkOrderCreate, WorkOrderUpdate, WorkOrderResponse, WorkOrderListResponse,
    TaskCreate, TaskUpdate, TaskResponse, WorkOrderAssign, TaskAssign,
    EligibleTechniciansListResponse, EligibleTechnicianResponse, SkillMatchDetail, RequiredSkillInfo
)
from app.schemas.material import (
    ConsumptionBatchCreate, ConsumptionVoid, ConsumptionResponse, ConsumptionListResponse
)
from app.api.deps import get_current_active_user, require_manager_or_above, require_engineer_or_above
from app.models.user import User
from app.models.equipment import Equipment, EquipmentSkillRequirement, EquipmentSchedule, EquipmentType
from app.services.skill_matching import find_qualified_for_equipment, PROFICIENCY_ORDER
from app.services.audit_service import audit_service
from app.services.capacity_service import validate_capacity, get_available_capacity
from app.models.audit_log import AuditAction

router = APIRouter(prefix="/work-orders", tags=["Work Orders"])


def generate_order_number() -> str:
    """Generate unique order number."""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    return f"WO-{timestamp}-{unique_suffix}"


@router.get("", response_model=WorkOrderListResponse)
def list_work_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    work_order_id: Optional[int] = Query(None, description="按工单ID过滤"),
    work_order_type: Optional[WorkOrderType] = None,
    status_filter: Optional[WorkOrderStatus] = Query(None, alias="status"),
    laboratory_id: Optional[int] = None,
    client_id: Optional[int] = None,
    assigned_engineer_id: Optional[int] = None,
    priority_level: Optional[int] = Query(None, ge=1, le=5, description="按优先级等级过滤(1-5)"),
    sort_by: Optional[str] = Query(None, description="排序字段: priority_score, sla_deadline, created_at"),
    sort_order: Optional[str] = Query("desc", description="排序顺序: asc, desc"),
    overdue_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all work orders with pagination and filtering."""
    query = db.query(WorkOrder)
    
    if work_order_id:
        query = query.filter(WorkOrder.id == work_order_id)
    if search:
        query = query.filter(
            (WorkOrder.order_number.ilike(f"%{search}%")) |
            (WorkOrder.title.ilike(f"%{search}%"))
        )
    if work_order_type:
        query = query.filter(WorkOrder.work_order_type == work_order_type)
    if status_filter:
        query = query.filter(WorkOrder.status == status_filter)
    if laboratory_id:
        query = query.filter(WorkOrder.laboratory_id == laboratory_id)
    if client_id:
        query = query.filter(WorkOrder.client_id == client_id)
    if assigned_engineer_id:
        query = query.filter(WorkOrder.assigned_engineer_id == assigned_engineer_id)
    if priority_level:
        query = query.filter(WorkOrder.priority_level == priority_level)
    if overdue_only:
        now = datetime.now(timezone.utc)
        query = query.filter(
            WorkOrder.sla_deadline < now,
            ~WorkOrder.status.in_([WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED])
        )
    
    total = query.count()
    offset = (page - 1) * page_size
    
    # Dynamic sorting with MySQL-compatible NULL handling
    sort_column = WorkOrder.priority_score  # default
    if sort_by == "sla_deadline":
        sort_column = WorkOrder.sla_deadline
    elif sort_by == "created_at":
        sort_column = WorkOrder.created_at
    elif sort_by == "priority_score":
        sort_column = WorkOrder.priority_score
    
    # MySQL doesn't support NULLS LAST/FIRST syntax
    # Use CASE expression to handle NULL values: NULL values go to the end
    null_sort = case((sort_column.is_(None), 1), else_=0)
    
    if sort_order == "asc":
        work_orders = query.order_by(null_sort, sort_column.asc()).offset(offset).limit(page_size).all()
    else:
        work_orders = query.order_by(null_sort, sort_column.desc()).offset(offset).limit(page_size).all()
    
    # 构建响应，包含material_ids
    items = []
    for wo in work_orders:
        response = WorkOrderResponse.model_validate(wo)
        response.material_ids = [m.id for m in wo.selected_materials]
        items.append(response)
    
    return WorkOrderListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{work_order_id}", response_model=WorkOrderResponse)
def get_work_order(
    work_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific work order by ID."""
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not work_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")
    
    # 构建响应，包含material_ids
    response = WorkOrderResponse.model_validate(work_order)
    response.material_ids = [m.id for m in work_order.selected_materials]
    return response


@router.get("/available-materials/list")
def get_available_materials(
    search: Optional[str] = None,
    site_id: Optional[int] = Query(None, description="按站点ID过滤"),
    client_id: Optional[int] = Query(None, description="按客户ID过滤"),
    product_id: Optional[int] = Query(None, description="按产品ID过滤"),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    获取可选的样品列表。
    仅返回样品类型材料（material_type = SAMPLE）。
    排除状态为"已返还"、"遗失"、"已处置"的样品。
    可按站点ID、客户ID、产品ID过滤。
    """
    # 排除的状态
    excluded_statuses = [MaterialStatus.RETURNED, MaterialStatus.LOST, MaterialStatus.DISPOSED]
    
    # 只查询样品类型
    query = db.query(Material).filter(
        Material.material_type == MaterialType.SAMPLE,
        ~Material.status.in_(excluded_statuses)
    )
    
    # 按站点过滤
    if site_id:
        query = query.filter(Material.site_id == site_id)
    
    # 按客户过滤
    if client_id:
        query = query.filter(Material.client_id == client_id)
    
    # 按产品过滤
    if product_id:
        query = query.filter(Material.product_id == product_id)
    
    if search:
        query = query.filter(
            (Material.material_code.ilike(f"%{search}%")) |
            (Material.name.ilike(f"%{search}%"))
        )
    
    total = query.count()
    offset = (page - 1) * page_size
    materials = query.order_by(Material.name).offset(offset).limit(page_size).all()
    
    return {
        "items": [
            {
                "id": m.id,
                "material_code": m.material_code,
                "name": m.name,
                "status": m.status.value if m.status else None,
                "material_type": m.material_type.value if m.material_type else None,
                "storage_location": m.storage_location,
                "quantity": m.quantity,
                "unit": m.unit,
                "client_id": m.client_id,
                "product_id": m.product_id
            }
            for m in materials
        ],
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.post("", response_model=WorkOrderResponse, status_code=status.HTTP_201_CREATED)
def create_work_order(
    data: WorkOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer_or_above)
):
    """Create new work order. Requires engineer or above role."""
    lab = db.query(Laboratory).filter(Laboratory.id == data.laboratory_id).first()
    if not lab:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Laboratory not found")
    
    # 提取material_ids
    work_order_data = data.model_dump()
    material_ids = work_order_data.pop('material_ids', []) or []
    
    work_order = WorkOrder(
        order_number=generate_order_number(),
        created_by_id=current_user.id,
        **work_order_data
    )
    
    # Calculate priority score
    work_order.priority_score = work_order.calculate_priority_score()
    
    db.add(work_order)
    db.flush()  # 获取work_order.id
    
    # 添加选择的样品
    if material_ids:
        materials = db.query(Material).filter(Material.id.in_(material_ids)).all()
        work_order.selected_materials = materials
    
    db.commit()
    db.refresh(work_order)
    
    # Audit log
    audit_service.log_create(
        db=db,
        entity_type="work_order",
        entity_id=work_order.id,
        entity_name=work_order.order_number,
        user=current_user,
        laboratory_id=work_order.laboratory_id,
        new_values={"title": work_order.title, "work_order_type": work_order.work_order_type.value}
    )
    
    # 构建响应，包含material_ids
    response = WorkOrderResponse.model_validate(work_order)
    response.material_ids = [m.id for m in work_order.selected_materials]
    return response


@router.put("/{work_order_id}", response_model=WorkOrderResponse)
def update_work_order(
    work_order_id: int,
    data: WorkOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer_or_above)
):
    """Update work order. Requires engineer or above role."""
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not work_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")
    
    update_data = data.model_dump(exclude_unset=True)
    old_status = work_order.status.value if work_order.status else None
    
    # 提取material_ids单独处理
    material_ids = update_data.pop('material_ids', None)
    
    for field, value in update_data.items():
        setattr(work_order, field, value)
    
    # 更新选择的样品
    if material_ids is not None:
        materials = db.query(Material).filter(Material.id.in_(material_ids)).all() if material_ids else []
        work_order.selected_materials = materials
    
    # Recalculate priority if relevant fields changed
    if any(f in update_data for f in ["sla_deadline", "testing_source", "client_id"]):
        work_order.priority_score = work_order.calculate_priority_score()
    
    # Update timestamps based on status changes
    if "status" in update_data:
        if update_data["status"] == WorkOrderStatus.IN_PROGRESS and not work_order.started_at:
            work_order.started_at = datetime.now(timezone.utc)
        elif update_data["status"] == WorkOrderStatus.COMPLETED:
            work_order.completed_at = datetime.now(timezone.utc)
            # Calculate actual cycle hours
            if work_order.started_at:
                delta = work_order.completed_at - work_order.started_at
                work_order.actual_cycle_hours = delta.total_seconds() / 3600
    
    db.commit()
    db.refresh(work_order)
    
    # Audit log for status changes
    if "status" in update_data:
        audit_service.log_status_change(
            db=db,
            entity_type="work_order",
            entity_id=work_order.id,
            entity_name=work_order.order_number,
            old_status=old_status,
            new_status=work_order.status.value,
            user=current_user,
            laboratory_id=work_order.laboratory_id
        )
    else:
        audit_service.log_update(
            db=db,
            entity_type="work_order",
            entity_id=work_order.id,
            entity_name=work_order.order_number,
            user=current_user,
            laboratory_id=work_order.laboratory_id,
            new_values=update_data
        )
    
    # 构建响应，包含material_ids
    response = WorkOrderResponse.model_validate(work_order)
    response.material_ids = [m.id for m in work_order.selected_materials]
    return response


@router.post("/{work_order_id}/assign", response_model=WorkOrderResponse)
def assign_work_order(
    work_order_id: int,
    data: WorkOrderAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Assign work order to an engineer. Requires manager or above role."""
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not work_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")
    
    engineer = db.query(Personnel).filter(Personnel.id == data.engineer_id).first()
    if not engineer:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Engineer not found")
    
    work_order.assigned_engineer_id = data.engineer_id
    work_order.assigned_at = datetime.now(timezone.utc)
    work_order.status = WorkOrderStatus.ASSIGNED
    
    db.commit()
    db.refresh(work_order)
    
    # Audit log
    audit_service.log_assignment(
        db=db,
        entity_type="work_order",
        entity_id=work_order.id,
        entity_name=work_order.order_number,
        assignee_id=engineer.id,
        assignee_name=engineer.user.full_name if engineer.user else engineer.employee_id,
        user=current_user,
        laboratory_id=work_order.laboratory_id
    )
    
    return WorkOrderResponse.model_validate(work_order)


@router.delete("/{work_order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_work_order(
    work_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Delete work order. Requires manager or above role."""
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not work_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")
    
    if work_order.status not in [WorkOrderStatus.DRAFT, WorkOrderStatus.CANCELLED]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only delete draft or cancelled work orders")
    
    # Capture info before deletion
    order_number = work_order.order_number
    lab_id = work_order.laboratory_id
    
    db.delete(work_order)
    db.commit()
    
    # Audit log
    audit_service.log_delete(
        db=db,
        entity_type="work_order",
        entity_id=work_order_id,
        entity_name=order_number,
        user=current_user,
        laboratory_id=lab_id
    )


# Task endpoints
@router.get("/{work_order_id}/tasks", response_model=list[TaskResponse])
def list_tasks(
    work_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all tasks for a work order."""
    from sqlalchemy.orm import joinedload
    from app.schemas.work_order import PersonnelBrief, EquipmentBrief
    
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not work_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")
    
    tasks = db.query(WorkOrderTask).options(
        joinedload(WorkOrderTask.method),
        joinedload(WorkOrderTask.assigned_technician).joinedload(Personnel.user),
        joinedload(WorkOrderTask.required_equipment)
    ).filter(
        WorkOrderTask.work_order_id == work_order_id
    ).order_by(WorkOrderTask.sequence).all()
    
    # Build response with nested objects
    result = []
    for t in tasks:
        # Build task data dict manually to avoid Pydantic validation issues with relationships
        task_data = {
            "id": t.id,
            "work_order_id": t.work_order_id,
            "task_number": t.task_number,
            "title": t.title,
            "description": t.description,
            "sequence": t.sequence,
            "method_id": t.method_id,
            "method": None,
            "assigned_technician_id": t.assigned_technician_id,
            "assigned_technician": None,
            "required_equipment_id": t.required_equipment_id,
            "required_equipment": None,
            "scheduled_equipment_id": t.scheduled_equipment_id,
            "required_capacity": t.required_capacity,
            "status": t.status,
            "standard_cycle_hours": t.standard_cycle_hours,
            "actual_cycle_hours": t.actual_cycle_hours,
            "notes": t.notes,
            "results": t.results,
            "created_at": t.created_at,
            "updated_at": t.updated_at,
            "assigned_at": t.assigned_at,
            "started_at": t.started_at,
            "completed_at": t.completed_at,
        }
        
        # Add method brief info
        if t.method:
            from app.schemas.work_order import MethodBrief
            task_data["method"] = MethodBrief(
                id=t.method.id,
                name=t.method.name,
                code=t.method.code,
                method_type=t.method.method_type.value if t.method.method_type else "other",
                standard_cycle_hours=t.method.standard_cycle_hours
            )
        
        # Add technician brief info
        if t.assigned_technician:
            tech = t.assigned_technician
            task_data["assigned_technician"] = PersonnelBrief(
                id=tech.id,
                employee_id=tech.employee_id,
                name=tech.user.full_name if tech.user else tech.employee_id,
                job_title=tech.job_title
            )
        
        # Add equipment brief info
        if t.required_equipment:
            equip = t.required_equipment
            task_data["required_equipment"] = EquipmentBrief(
                id=equip.id,
                name=equip.name,
                code=equip.code
            )
        
        result.append(TaskResponse(**task_data))
    
    return result


@router.post("/{work_order_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    work_order_id: int,
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer_or_above)
):
    """Create new task for work order. Requires engineer or above role."""
    from sqlalchemy import and_
    from app.core.cache import gantt_cache
    
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not work_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")
    
    # Generate task number
    task_count = db.query(WorkOrderTask).filter(WorkOrderTask.work_order_id == work_order_id).count()
    task_number = f"T{task_count + 1:03d}"
    
    task_data = data.model_dump()
    
    # 提取调度时间字段（不作为 WorkOrderTask 的字段）
    schedule_start_time = task_data.pop('schedule_start_time', None)
    schedule_end_time = task_data.pop('schedule_end_time', None)
    
    # If method_id provided, auto-populate from method
    if task_data.get('method_id'):
        method = db.query(Method).filter(Method.id == task_data['method_id']).first()
        if method:
            # Auto-populate standard_cycle_hours if not provided
            if not task_data.get('standard_cycle_hours') and method.standard_cycle_hours:
                task_data['standard_cycle_hours'] = method.standard_cycle_hours
            # Auto-populate required_equipment_id if not provided and method has default equipment
            if not task_data.get('required_equipment_id') and method.default_equipment_id:
                task_data['required_equipment_id'] = method.default_equipment_id
    
    # Validate capacity if equipment and capacity are specified
    if task_data.get('required_equipment_id') and task_data.get('required_capacity'):
        is_valid, error_msg, _, _ = validate_capacity(
            db=db,
            equipment_id=task_data['required_equipment_id'],
            required_capacity=task_data['required_capacity']
        )
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
    
    task = WorkOrderTask(
        work_order_id=work_order_id,
        task_number=task_number,
        **task_data
    )
    db.add(task)
    db.flush()  # 获取 task.id
    
    # 如果提供了调度时间，自动创建设备调度记录（关键设备场景）
    if schedule_start_time and schedule_end_time and task.required_equipment_id:
        # 验证时间有效性
        if schedule_start_time >= schedule_end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="调度结束时间必须晚于开始时间"
            )
        
        # 获取设备信息
        equipment = db.query(Equipment).filter(Equipment.id == task.required_equipment_id).first()
        if not equipment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="所需设备不存在"
            )
        
        # 检测调度冲突
        conflicting = db.query(EquipmentSchedule).filter(
            EquipmentSchedule.equipment_id == task.required_equipment_id,
            EquipmentSchedule.status.in_(["scheduled", "in_progress"]),
            and_(
                EquipmentSchedule.start_time < schedule_end_time,
                EquipmentSchedule.end_time > schedule_start_time
            )
        ).first()
        
        if conflicting:
            # 对于自主运行型设备，检查并发任务限制
            if equipment.equipment_type == EquipmentType.AUTONOMOUS:
                concurrent_count = db.query(EquipmentSchedule).filter(
                    EquipmentSchedule.equipment_id == task.required_equipment_id,
                    EquipmentSchedule.status.in_(["scheduled", "in_progress"]),
                    and_(
                        EquipmentSchedule.start_time < schedule_end_time,
                        EquipmentSchedule.end_time > schedule_start_time
                    )
                ).count()
                
                if concurrent_count >= equipment.max_concurrent_tasks:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"设备已达到最大并发任务数 ({equipment.max_concurrent_tasks})"
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="设备调度时间冲突"
                )
        
        # 创建设备调度记录
        schedule = EquipmentSchedule(
            equipment_id=task.required_equipment_id,
            start_time=schedule_start_time,
            end_time=schedule_end_time,
            work_order_id=work_order_id,
            task_id=task.id,
            title=f"{work_order.order_number} - {task.title}",
            status="scheduled"
        )
        db.add(schedule)
        
        # 失效甘特图缓存
        gantt_cache.invalidate_pattern("gantt:")
    
    db.commit()
    db.refresh(task)
    
    return TaskResponse.model_validate(task)


@router.put("/{work_order_id}/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    work_order_id: int,
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer_or_above)
):
    """Update task. Requires engineer or above role."""
    from sqlalchemy import and_
    from app.core.cache import gantt_cache
    
    task = db.query(WorkOrderTask).filter(
        WorkOrderTask.id == task_id,
        WorkOrderTask.work_order_id == work_order_id
    ).first()
    
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # 提取调度相关字段
    update_schedule = update_data.pop('update_schedule', False)
    schedule_start_time = update_data.pop('schedule_start_time', None)
    schedule_end_time = update_data.pop('schedule_end_time', None)
    
    for field, value in update_data.items():
        setattr(task, field, value)
    
    # Update timestamps based on status
    if "status" in update_data:
        if update_data["status"] == TaskStatus.IN_PROGRESS and not task.started_at:
            task.started_at = datetime.now(timezone.utc)
        elif update_data["status"] == TaskStatus.COMPLETED:
            task.completed_at = datetime.now(timezone.utc)
            if task.started_at:
                delta = task.completed_at - task.started_at
                task.actual_cycle_hours = delta.total_seconds() / 3600
    
    # 处理设备调度更新
    if update_schedule and schedule_start_time and schedule_end_time:
        # 验证时间有效性
        if schedule_start_time >= schedule_end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="调度结束时间必须晚于开始时间"
            )
        
        # 获取任务使用的设备
        equipment_id = task.required_equipment_id
        if not equipment_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="任务未指定设备，无法更新调度"
            )
        
        equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
        if not equipment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="所需设备不存在"
            )
        
        # 删除该任务的旧调度记录
        db.query(EquipmentSchedule).filter(EquipmentSchedule.task_id == task_id).delete()
        
        # 检测新时间段的冲突（排除刚删除的记录）
        conflicting = db.query(EquipmentSchedule).filter(
            EquipmentSchedule.equipment_id == equipment_id,
            EquipmentSchedule.status.in_(["scheduled", "in_progress"]),
            and_(
                EquipmentSchedule.start_time < schedule_end_time,
                EquipmentSchedule.end_time > schedule_start_time
            )
        ).first()
        
        if conflicting:
            if equipment.equipment_type == EquipmentType.AUTONOMOUS:
                concurrent_count = db.query(EquipmentSchedule).filter(
                    EquipmentSchedule.equipment_id == equipment_id,
                    EquipmentSchedule.status.in_(["scheduled", "in_progress"]),
                    and_(
                        EquipmentSchedule.start_time < schedule_end_time,
                        EquipmentSchedule.end_time > schedule_start_time
                    )
                ).count()
                
                if concurrent_count >= equipment.max_concurrent_tasks:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"设备已达到最大并发任务数 ({equipment.max_concurrent_tasks})"
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="设备调度时间冲突"
                )
        
        # 获取工单信息用于标题
        work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
        
        # 创建新的设备调度记录
        schedule = EquipmentSchedule(
            equipment_id=equipment_id,
            start_time=schedule_start_time,
            end_time=schedule_end_time,
            work_order_id=work_order_id,
            task_id=task_id,
            title=f"{work_order.order_number} - {task.title}" if work_order else task.title,
            status="scheduled"
        )
        db.add(schedule)
        
        # 失效甘特图缓存
        gantt_cache.invalidate_pattern("gantt:")
    
    db.commit()
    db.refresh(task)
    
    return TaskResponse.model_validate(task)


@router.post("/{work_order_id}/tasks/{task_id}/assign", response_model=TaskResponse)
def assign_task(
    work_order_id: int,
    task_id: int,
    data: TaskAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer_or_above)
):
    """Assign task to technician. Requires engineer or above role."""
    task = db.query(WorkOrderTask).filter(
        WorkOrderTask.id == task_id,
        WorkOrderTask.work_order_id == work_order_id
    ).first()
    
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    technician = db.query(Personnel).filter(Personnel.id == data.technician_id).first()
    if not technician:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Technician not found")
    
    task.assigned_technician_id = data.technician_id
    task.assigned_at = datetime.now(timezone.utc)
    task.status = TaskStatus.ASSIGNED
    
    if data.equipment_id:
        task.scheduled_equipment_id = data.equipment_id
        
        # Re-validate capacity when scheduling equipment
        if task.required_capacity:
            is_valid, error_msg, _, _ = validate_capacity(
                db=db,
                equipment_id=data.equipment_id,
                required_capacity=task.required_capacity,
                exclude_task_id=task.id
            )
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=error_msg
                )
    
    db.commit()
    db.refresh(task)
    
    return TaskResponse.model_validate(task)


@router.delete("/{work_order_id}/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    work_order_id: int,
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer_or_above)
):
    """Delete a task. Requires engineer or above role."""
    from app.core.cache import gantt_cache
    
    task = db.query(WorkOrderTask).filter(
        WorkOrderTask.id == task_id,
        WorkOrderTask.work_order_id == work_order_id
    ).first()
    
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    # 删除关联的设备调度记录
    db.query(EquipmentSchedule).filter(EquipmentSchedule.task_id == task_id).delete()
    
    db.delete(task)
    db.commit()
    
    # 失效甘特图缓存
    gantt_cache.invalidate_pattern("gantt:")


@router.get("/equipment/{equipment_id}/capacity")
def get_equipment_capacity(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current capacity status for equipment."""
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")
    
    if equipment.capacity is None:
        return {
            "equipment_id": equipment_id,
            "equipment_name": equipment.name,
            "has_capacity_limit": False,
            "total_capacity": None,
            "available_capacity": None,
            "used_capacity": None,
            "utilization_percentage": None
        }
    
    total_capacity, available_capacity = get_available_capacity(db, equipment_id)
    used_capacity = total_capacity - available_capacity
    utilization_percentage = (used_capacity / total_capacity * 100) if total_capacity > 0 else 0
    
    return {
        "equipment_id": equipment_id,
        "equipment_name": equipment.name,
        "has_capacity_limit": True,
        "total_capacity": total_capacity,
        "available_capacity": available_capacity,
        "used_capacity": used_capacity,
        "utilization_percentage": round(utilization_percentage, 1)
    }


@router.get("/{work_order_id}/tasks/{task_id}/eligible-technicians", response_model=EligibleTechniciansListResponse)
def get_eligible_technicians(
    work_order_id: int,
    task_id: int,
    status_filter: Optional[str] = Query("available", alias="status"),
    min_match_score: float = Query(0, ge=0, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Find technicians qualified for a task's required equipment.
    Returns personnel who meet the equipment's skill requirements.
    """
    from sqlalchemy.orm import joinedload
    from app.models.personnel import PersonnelStatus
    
    # Get task and verify work_order_id
    task = db.query(WorkOrderTask).filter(
        WorkOrderTask.id == task_id,
        WorkOrderTask.work_order_id == work_order_id
    ).first()
    
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    # If no required equipment, return empty list
    if not task.required_equipment_id:
        return EligibleTechniciansListResponse(
            task_id=task_id,
            required_equipment_id=None,
            required_equipment_name=None,
            required_skills=[],
            eligible_technicians=[]
        )
    
    # Get equipment with skill requirements
    equipment = db.query(Equipment).options(
        joinedload(Equipment.required_skills).joinedload(EquipmentSkillRequirement.skill)
    ).filter(Equipment.id == task.required_equipment_id).first()
    
    if not equipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Required equipment not found")
    
    # Build required skills info
    required_skills = []
    for req in equipment.required_skills:
        required_skills.append(RequiredSkillInfo(
            skill_id=req.skill_id,
            skill_name=req.skill.name if req.skill else "Unknown",
            min_proficiency=req.minimum_proficiency,
            certification_required=req.certification_required
        ))
    
    # Parse status filter
    personnel_status = None
    if status_filter:
        try:
            personnel_status = PersonnelStatus(status_filter.lower())
        except ValueError:
            pass
    
    # Find qualified personnel
    qualified_results = find_qualified_for_equipment(
        db=db,
        equipment_id=task.required_equipment_id,
        status=personnel_status
    )
    
    # Build response with additional details
    eligible_technicians = []
    for result in qualified_results:
        person = result['personnel']
        match_score = result['match_score']
        matched_skills = result['matched_skills']
        
        # Filter by min match score (normalize score)
        max_possible_score = len(equipment.required_skills) * 5  # Max 4 proficiency + 1 cert
        if max_possible_score > 0:
            normalized_score = (match_score / max_possible_score) * 100
        else:
            normalized_score = 100
        
        if normalized_score < min_match_score:
            continue
        
        # Get current workload (assigned + in_progress tasks)
        workload = db.query(WorkOrderTask).filter(
            WorkOrderTask.assigned_technician_id == person.id,
            WorkOrderTask.status.in_([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS])
        ).count()
        
        # Build skill details
        skill_details = []
        matched_skill_ids = {ps.skill_id for ps in matched_skills}
        for req in equipment.required_skills:
            ps = next((s for s in matched_skills if s.skill_id == req.skill_id), None)
            if ps:
                skill_details.append(SkillMatchDetail(
                    skill_id=req.skill_id,
                    skill_name=req.skill.name if req.skill else "Unknown",
                    proficiency_level=ps.proficiency_level.value if ps.proficiency_level else "unknown",
                    is_certified=ps.is_certified,
                    meets_requirement=True
                ))
        
        eligible_technicians.append(EligibleTechnicianResponse(
            personnel_id=person.id,
            employee_id=person.employee_id,
            name=person.user.full_name if person.user else person.employee_id,
            job_title=person.job_title,
            status=person.status.value if person.status else "unknown",
            match_score=round(normalized_score, 1),
            current_workload=workload,
            skill_details=skill_details
        ))
    
    # Sort by match score DESC, then workload ASC
    eligible_technicians.sort(key=lambda x: (-x.match_score, x.current_workload))
    
    return EligibleTechniciansListResponse(
        task_id=task_id,
        required_equipment_id=equipment.id,
        required_equipment_name=equipment.name,
        required_skills=required_skills,
        eligible_technicians=eligible_technicians
    )


# Export endpoints
@router.get("/export/csv")
def export_work_orders_csv(
    work_order_type: Optional[WorkOrderType] = None,
    status_filter: Optional[WorkOrderStatus] = Query(None, alias="status"),
    laboratory_id: Optional[int] = None,
    client_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer_or_above)
):
    """Export work orders to CSV file."""
    from sqlalchemy.orm import joinedload
    
    query = db.query(WorkOrder).options(
        joinedload(WorkOrder.laboratory),
        joinedload(WorkOrder.client),
        joinedload(WorkOrder.assigned_engineer)
    )
    
    # Apply filters
    if work_order_type:
        query = query.filter(WorkOrder.work_order_type == work_order_type)
    if status_filter:
        query = query.filter(WorkOrder.status == status_filter)
    if laboratory_id:
        query = query.filter(WorkOrder.laboratory_id == laboratory_id)
    if client_id:
        query = query.filter(WorkOrder.client_id == client_id)
    if start_date:
        query = query.filter(WorkOrder.created_at >= start_date)
    if end_date:
        query = query.filter(WorkOrder.created_at <= end_date)
    
    work_orders = query.order_by(WorkOrder.created_at.desc()).all()
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        '工单编号', '标题', '类型', '状态', '实验室', '客户',
        '负责工程师', '优先分数', 'SLA截止时间', '标准周期(小时)',
        '实际周期(小时)', '创建时间', '开始时间', '完成时间'
    ])
    
    # Write data
    for wo in work_orders:
        writer.writerow([
            wo.order_number,
            wo.title,
            '失效分析' if wo.work_order_type == WorkOrderType.FAILURE_ANALYSIS else '可靠性测试',
            wo.status.value if wo.status else '',
            wo.laboratory.name if wo.laboratory else '',
            wo.client.name if wo.client else '',
            wo.assigned_engineer.user.full_name if wo.assigned_engineer and wo.assigned_engineer.user else '',
            wo.priority_score or '',
            wo.sla_deadline.strftime('%Y-%m-%d %H:%M') if wo.sla_deadline else '',
            wo.standard_cycle_hours or '',
            f"{wo.actual_cycle_hours:.2f}" if wo.actual_cycle_hours else '',
            wo.created_at.strftime('%Y-%m-%d %H:%M') if wo.created_at else '',
            wo.started_at.strftime('%Y-%m-%d %H:%M') if wo.started_at else '',
            wo.completed_at.strftime('%Y-%m-%d %H:%M') if wo.completed_at else '',
        ])
    
    # Audit log
    audit_service.log(
        db=db,
        action=AuditAction.EXPORT,
        entity_type="work_order",
        user=current_user,
        description=f"Exported {len(work_orders)} work orders to CSV",
        extra_data={"count": len(work_orders), "format": "csv"}
    )
    
    output.seek(0)
    
    filename = f"work_orders_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{work_order_id}/tasks/export/csv")
def export_tasks_csv(
    work_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Export tasks of a work order to CSV file."""
    from sqlalchemy.orm import joinedload
    
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not work_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")
    
    tasks = db.query(WorkOrderTask).options(
        joinedload(WorkOrderTask.assigned_technician),
        joinedload(WorkOrderTask.method),
        joinedload(WorkOrderTask.required_equipment)
    ).filter(
        WorkOrderTask.work_order_id == work_order_id
    ).order_by(WorkOrderTask.sequence).all()
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        '任务编号', '任务名称', '序号', '状态', '分析方法', '所需设备',
        '分配技术员', '标准周期(小时)', '实际周期(小时)',
        '分配时间', '开始时间', '完成时间'
    ])
    
    # Write data
    for task in tasks:
        writer.writerow([
            task.task_number,
            task.title,
            task.sequence,
            task.status.value if task.status else '',
            task.method.name if task.method else '',
            task.required_equipment.name if task.required_equipment else '',
            task.assigned_technician.user.full_name if task.assigned_technician and task.assigned_technician.user else '',
            task.standard_cycle_hours or '',
            f"{task.actual_cycle_hours:.2f}" if task.actual_cycle_hours else '',
            task.assigned_at.strftime('%Y-%m-%d %H:%M') if task.assigned_at else '',
            task.started_at.strftime('%Y-%m-%d %H:%M') if task.started_at else '',
            task.completed_at.strftime('%Y-%m-%d %H:%M') if task.completed_at else '',
        ])
    
    output.seek(0)
    
    filename = f"tasks_{work_order.order_number}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# Material Consumption endpoints
@router.post("/{work_order_id}/tasks/{task_id}/consumptions", response_model=list[ConsumptionResponse], status_code=status.HTTP_201_CREATED)
def create_task_consumptions(
    work_order_id: int,
    task_id: int,
    data: ConsumptionBatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer_or_above)
):
    """
    批量创建任务材料消耗记录。
    仅支持非样品类型材料（consumable/reagent/tool/other）。
    自动扣减库存并设置状态为"已登记"。
    """
    from sqlalchemy.orm import joinedload
    from decimal import Decimal
    
    # 验证任务存在且属于指定工单
    task = db.query(WorkOrderTask).filter(
        WorkOrderTask.id == task_id,
        WorkOrderTask.work_order_id == work_order_id
    ).first()
    
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="任务不存在")
    
    created_consumptions = []
    
    for item in data.consumptions:
        # 获取材料并验证
        material = db.query(Material).filter(Material.id == item.material_id).first()
        if not material:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"材料ID {item.material_id} 不存在"
            )
        
        # 验证非样品类型
        if material.material_type == MaterialType.SAMPLE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"材料 {material.name} 是样品类型，不支持消耗登记"
            )
        
        # 验证库存充足
        if material.quantity < item.quantity_consumed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"材料 {material.name} 库存不足 (当前: {material.quantity}, 需要: {item.quantity_consumed})"
            )
        
        # 计算总成本
        total_cost = None
        if item.unit_price is not None:
            total_cost = Decimal(str(item.unit_price)) * item.quantity_consumed
        
        # 创建消耗记录
        consumption = MaterialConsumption(
            material_id=item.material_id,
            task_id=task_id,
            quantity_consumed=item.quantity_consumed,
            unit_price=Decimal(str(item.unit_price)) if item.unit_price is not None else None,
            total_cost=total_cost,
            status=ConsumptionStatus.REGISTERED,
            notes=item.notes,
            created_by_id=current_user.id
        )
        db.add(consumption)
        
        # 扣减库存
        material.quantity -= item.quantity_consumed
        
        # 记录库存变动历史
        history = MaterialHistory(
            material_id=material.id,
            action="consumption",
            old_status=material.status.value if material.status else None,
            new_status=material.status.value if material.status else None,
            notes=f"消耗登记: 任务 {task.task_number}, 数量 {item.quantity_consumed}",
            performed_by_id=current_user.id
        )
        db.add(history)
        
        created_consumptions.append(consumption)
    
    db.commit()
    
    # 刷新获取关联数据
    result = []
    for c in created_consumptions:
        db.refresh(c)
        # 加载关联数据
        consumption = db.query(MaterialConsumption).options(
            joinedload(MaterialConsumption.material),
            joinedload(MaterialConsumption.created_by)
        ).filter(MaterialConsumption.id == c.id).first()
        result.append(ConsumptionResponse.model_validate(consumption))
    
    return result


@router.get("/{work_order_id}/tasks/{task_id}/consumptions", response_model=ConsumptionListResponse)
def list_task_consumptions(
    work_order_id: int,
    task_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[ConsumptionStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    查询任务的材料消耗记录列表。
    支持按状态筛选和分页。
    """
    from sqlalchemy.orm import joinedload
    
    # 验证任务存在且属于指定工单
    task = db.query(WorkOrderTask).filter(
        WorkOrderTask.id == task_id,
        WorkOrderTask.work_order_id == work_order_id
    ).first()
    
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="任务不存在")
    
    # 构建查询
    query = db.query(MaterialConsumption).filter(MaterialConsumption.task_id == task_id)
    
    if status_filter:
        query = query.filter(MaterialConsumption.status == status_filter)
    
    total = query.count()
    offset = (page - 1) * page_size
    
    consumptions = query.options(
        joinedload(MaterialConsumption.material),
        joinedload(MaterialConsumption.created_by),
        joinedload(MaterialConsumption.voided_by)
    ).order_by(MaterialConsumption.consumed_at.desc()).offset(offset).limit(page_size).all()
    
    return ConsumptionListResponse(
        items=[ConsumptionResponse.model_validate(c) for c in consumptions],
        total=total,
        page=page,
        page_size=page_size
    )


# 创建独立路由器用于消耗记录作废（不带 work_order_id 前缀）
consumption_router = APIRouter(prefix="/consumptions", tags=["Material Consumptions"])


@consumption_router.post("/{consumption_id}/void", response_model=ConsumptionResponse)
def void_consumption(
    consumption_id: int,
    data: ConsumptionVoid,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer_or_above)
):
    """
    作废材料消耗记录。
    自动创建补充记录恢复库存，并设置状态为"已作废"。
    消耗记录不可删除或修改，只能作废。
    """
    from sqlalchemy.orm import joinedload
    
    # 获取消耗记录
    consumption = db.query(MaterialConsumption).options(
        joinedload(MaterialConsumption.material),
        joinedload(MaterialConsumption.task)
    ).filter(MaterialConsumption.id == consumption_id).first()
    
    if not consumption:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="消耗记录不存在")
    
    # 验证状态为已登记
    if consumption.status != ConsumptionStatus.REGISTERED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="只能作废状态为'已登记'的消耗记录"
        )
    
    # 创建补充记录恢复库存
    replenishment = MaterialReplenishment(
        material_id=consumption.material_id,
        received_date=datetime.now(timezone.utc),
        quantity_added=consumption.quantity_consumed,
        non_sap_source=NonSapSource.INVENTORY_ADJUSTMENT,
        notes=f"作废消耗记录: CON-{consumption_id} - {data.void_reason}",
        created_by_id=current_user.id
    )
    db.add(replenishment)
    db.flush()  # 获取 replenishment.id
    
    # 恢复库存
    material = consumption.material
    material.quantity += consumption.quantity_consumed
    
    # 更新消耗记录状态
    consumption.status = ConsumptionStatus.VOIDED
    consumption.voided_at = datetime.now(timezone.utc)
    consumption.voided_by_id = current_user.id
    consumption.void_reason = data.void_reason
    consumption.replenishment_id = replenishment.id
    
    # 记录库存变动历史
    history = MaterialHistory(
        material_id=material.id,
        action="void_consumption",
        old_status=material.status.value if material.status else None,
        new_status=material.status.value if material.status else None,
        notes=f"作废消耗: CON-{consumption_id}, 恢复数量 {consumption.quantity_consumed}, 原因: {data.void_reason}",
        performed_by_id=current_user.id
    )
    db.add(history)
    
    db.commit()
    db.refresh(consumption)
    
    # 重新加载关联数据
    consumption = db.query(MaterialConsumption).options(
        joinedload(MaterialConsumption.material),
        joinedload(MaterialConsumption.created_by),
        joinedload(MaterialConsumption.voided_by)
    ).filter(MaterialConsumption.id == consumption_id).first()
    
    return ConsumptionResponse.model_validate(consumption)

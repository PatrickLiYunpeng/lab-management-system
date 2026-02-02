"""
Work Order management API endpoints.
"""
from typing import Optional
from datetime import datetime, timezone
import uuid
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.work_order import WorkOrder, WorkOrderType, WorkOrderStatus, WorkOrderTask, TaskStatus
from app.models.laboratory import Laboratory
from app.models.personnel import Personnel
from app.models.method import Method
from app.schemas.work_order import (
    WorkOrderCreate, WorkOrderUpdate, WorkOrderResponse, WorkOrderListResponse,
    TaskCreate, TaskUpdate, TaskResponse, WorkOrderAssign, TaskAssign,
    EligibleTechniciansListResponse, EligibleTechnicianResponse, SkillMatchDetail, RequiredSkillInfo
)
from app.api.deps import get_current_active_user, require_manager_or_above, require_engineer_or_above
from app.models.user import User
from app.models.equipment import Equipment, EquipmentSkillRequirement
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
    work_order_type: Optional[WorkOrderType] = None,
    status_filter: Optional[WorkOrderStatus] = Query(None, alias="status"),
    laboratory_id: Optional[int] = None,
    client_id: Optional[int] = None,
    assigned_engineer_id: Optional[int] = None,
    overdue_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all work orders with pagination and filtering."""
    query = db.query(WorkOrder)
    
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
    if overdue_only:
        now = datetime.now(timezone.utc)
        query = query.filter(
            WorkOrder.sla_deadline < now,
            ~WorkOrder.status.in_([WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED])
        )
    
    total = query.count()
    offset = (page - 1) * page_size
    # Sort by priority score descending (higher priority first)
    work_orders = query.order_by(WorkOrder.priority_score.desc()).offset(offset).limit(page_size).all()
    
    return WorkOrderListResponse(
        items=[WorkOrderResponse.model_validate(wo) for wo in work_orders],
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
    return WorkOrderResponse.model_validate(work_order)


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
    
    work_order = WorkOrder(
        order_number=generate_order_number(),
        created_by_id=current_user.id,
        **data.model_dump()
    )
    
    # Calculate priority score
    work_order.priority_score = work_order.calculate_priority_score()
    
    db.add(work_order)
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
    
    return WorkOrderResponse.model_validate(work_order)


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
    
    for field, value in update_data.items():
        setattr(work_order, field, value)
    
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
    
    return WorkOrderResponse.model_validate(work_order)


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
    
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not work_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")
    
    tasks = db.query(WorkOrderTask).options(
        joinedload(WorkOrderTask.method)
    ).filter(
        WorkOrderTask.work_order_id == work_order_id
    ).order_by(WorkOrderTask.sequence).all()
    
    return [TaskResponse.model_validate(t) for t in tasks]


@router.post("/{work_order_id}/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    work_order_id: int,
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer_or_above)
):
    """Create new task for work order. Requires engineer or above role."""
    work_order = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not work_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")
    
    # Generate task number
    task_count = db.query(WorkOrderTask).filter(WorkOrderTask.work_order_id == work_order_id).count()
    task_number = f"T{task_count + 1:03d}"
    
    task_data = data.model_dump()
    
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
    task = db.query(WorkOrderTask).filter(
        WorkOrderTask.id == task_id,
        WorkOrderTask.work_order_id == work_order_id
    ).first()
    
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
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
    task = db.query(WorkOrderTask).filter(
        WorkOrderTask.id == task_id,
        WorkOrderTask.work_order_id == work_order_id
    ).first()
    
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    db.delete(task)
    db.commit()


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

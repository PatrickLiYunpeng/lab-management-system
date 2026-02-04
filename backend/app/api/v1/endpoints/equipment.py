"""
设备管理API端点 - Equipment Management API Endpoints

本模块提供实验室设备管理的API接口，包括设备信息管理、调度管理和甘特图数据获取。
支持自主运行型设备（如烤箱）和操作员依赖型设备两种类型。

API端点列表:
- GET /equipment: 分页获取设备列表，支持按类型、实验室、状态筛选
- GET /equipment/{equipment_id}: 获取单个设备详情
- POST /equipment: 创建新设备（需要Manager及以上权限）
- PUT /equipment/{equipment_id}: 更新设备信息（需要Manager及以上权限）
- DELETE /equipment/{equipment_id}: 删除设备（需要Manager及以上权限）
- GET /equipment/{equipment_id}/schedules: 获取设备调度列表
- POST /equipment/{equipment_id}/schedules: 创建设备调度（需要Engineer及以上权限）
- DELETE /equipment/{equipment_id}/schedules/{schedule_id}: 删除设备调度（需要Engineer及以上权限）
- GET /equipment/schedules/gantt: 获取甘特图数据

权限要求:
- 查询操作：所有已登录用户
- 设备管理：Manager及以上角色
- 调度管理：Engineer及以上角色

业务规则:
- 设备代码必须唯一
- 必须关联有效的实验室和站点
- 自主运行型设备支持并发任务（根据max_concurrent_tasks配置）
- 操作员依赖型设备同一时间只能分配给一个任务
- 调度时会检测时间冲突
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.core.database import get_db
from app.models.equipment import Equipment, EquipmentType, EquipmentStatus, EquipmentSchedule, EquipmentCategory
from app.models.laboratory import Laboratory
from app.models.site import Site
from app.models.work_order import WorkOrder
from app.schemas.equipment import (
    EquipmentCreate, EquipmentUpdate, EquipmentResponse, EquipmentListResponse,
    EquipmentScheduleCreate, EquipmentScheduleResponse
)
from app.api.deps import get_current_active_user, require_manager_or_above, require_engineer_or_above
from app.models.user import User

router = APIRouter(prefix="/equipment", tags=["Equipment"])


@router.get("", response_model=EquipmentListResponse)
def list_equipment(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    equipment_type: Optional[EquipmentType] = None,
    laboratory_id: Optional[int] = None,
    site_id: Optional[int] = None,
    status_filter: Optional[EquipmentStatus] = Query(None, alias="status"),
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all equipment with pagination and filtering."""
    query = db.query(Equipment)
    
    if search:
        query = query.filter(
            (Equipment.name.ilike(f"%{search}%")) |
            (Equipment.code.ilike(f"%{search}%")) |
            (Equipment.model.ilike(f"%{search}%"))
        )
    if equipment_type:
        query = query.filter(Equipment.equipment_type == equipment_type)
    if laboratory_id:
        query = query.filter(Equipment.laboratory_id == laboratory_id)
    if site_id:
        query = query.filter(Equipment.site_id == site_id)
    if status_filter:
        query = query.filter(Equipment.status == status_filter)
    if is_active is not None:
        query = query.filter(Equipment.is_active == is_active)
    
    total = query.count()
    offset = (page - 1) * page_size
    equipment_list = query.order_by(Equipment.name).offset(offset).limit(page_size).all()
    
    return EquipmentListResponse(
        items=[EquipmentResponse.model_validate(e) for e in equipment_list],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{equipment_id}", response_model=EquipmentResponse)
def get_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific equipment by ID."""
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")
    return EquipmentResponse.model_validate(equipment)


@router.post("", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
def create_equipment(
    data: EquipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Create new equipment. Requires manager or above role."""
    existing = db.query(Equipment).filter(Equipment.code == data.code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Equipment code already exists")
    
    lab = db.query(Laboratory).filter(Laboratory.id == data.laboratory_id).first()
    if not lab:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Laboratory not found")
    
    site = db.query(Site).filter(Site.id == data.site_id).first()
    if not site:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Site not found")
    
    equipment = Equipment(**data.model_dump())
    db.add(equipment)
    db.commit()
    db.refresh(equipment)
    
    return EquipmentResponse.model_validate(equipment)


@router.put("/{equipment_id}", response_model=EquipmentResponse)
def update_equipment(
    equipment_id: int,
    data: EquipmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Update equipment. Requires manager or above role."""
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    if "code" in update_data and update_data["code"] != equipment.code:
        existing = db.query(Equipment).filter(Equipment.code == update_data["code"]).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Equipment code already exists")
    
    for field, value in update_data.items():
        setattr(equipment, field, value)
    
    db.commit()
    db.refresh(equipment)
    
    return EquipmentResponse.model_validate(equipment)


@router.delete("/{equipment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Delete equipment. Requires manager or above role."""
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")
    
    db.delete(equipment)
    db.commit()


# Equipment scheduling endpoints
@router.get("/{equipment_id}/schedules", response_model=list[EquipmentScheduleResponse])
def get_equipment_schedules(
    equipment_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get schedules for a specific equipment."""
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")
    
    query = db.query(EquipmentSchedule).filter(EquipmentSchedule.equipment_id == equipment_id)
    
    if start_date:
        query = query.filter(EquipmentSchedule.end_time >= start_date)
    if end_date:
        query = query.filter(EquipmentSchedule.start_time <= end_date)
    
    schedules = query.order_by(EquipmentSchedule.start_time).all()
    return [EquipmentScheduleResponse.model_validate(s) for s in schedules]


@router.post("/{equipment_id}/schedules", response_model=EquipmentScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_equipment_schedule(
    equipment_id: int,
    data: EquipmentScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer_or_above)
):
    """Create equipment schedule. Requires engineer or above role."""
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")
    
    if data.start_time >= data.end_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End time must be after start time")
    
    # Check for scheduling conflicts
    conflicting = db.query(EquipmentSchedule).filter(
        EquipmentSchedule.equipment_id == equipment_id,
        EquipmentSchedule.status.in_(["scheduled", "in_progress"]),
        and_(
            EquipmentSchedule.start_time < data.end_time,
            EquipmentSchedule.end_time > data.start_time
        )
    ).first()
    
    if conflicting:
        # For autonomous equipment, check concurrent task limit
        if equipment.equipment_type == EquipmentType.AUTONOMOUS:
            concurrent_count = db.query(EquipmentSchedule).filter(
                EquipmentSchedule.equipment_id == equipment_id,
                EquipmentSchedule.status.in_(["scheduled", "in_progress"]),
                and_(
                    EquipmentSchedule.start_time < data.end_time,
                    EquipmentSchedule.end_time > data.start_time
                )
            ).count()
            
            if concurrent_count >= equipment.max_concurrent_tasks:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Equipment has reached maximum concurrent tasks ({equipment.max_concurrent_tasks})"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Scheduling conflict detected"
            )
    
    schedule = EquipmentSchedule(
        equipment_id=equipment_id,
        start_time=data.start_time,
        end_time=data.end_time,
        work_order_id=data.work_order_id,
        task_id=data.task_id,
        operator_id=data.operator_id,
        title=data.title,
        notes=data.notes
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    
    return EquipmentScheduleResponse.model_validate(schedule)


@router.delete("/{equipment_id}/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_equipment_schedule(
    equipment_id: int,
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer_or_above)
):
    """Delete equipment schedule. Requires engineer or above role."""
    schedule = db.query(EquipmentSchedule).filter(
        EquipmentSchedule.id == schedule_id,
        EquipmentSchedule.equipment_id == equipment_id
    ).first()
    
    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    
    db.delete(schedule)
    db.commit()


# Gantt chart data endpoint
@router.get("/schedules/gantt")
def get_gantt_data(
    start_date: datetime,
    end_date: datetime,
    laboratory_id: Optional[int] = None,
    site_id: Optional[int] = None,
    equipment_type: Optional[EquipmentType] = None,
    category: Optional[EquipmentCategory] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get equipment schedules formatted for Gantt chart display."""
    from sqlalchemy.orm import joinedload
    
    # Build equipment query
    eq_query = db.query(Equipment).filter(Equipment.is_active == True)
    
    if laboratory_id:
        eq_query = eq_query.filter(Equipment.laboratory_id == laboratory_id)
    if site_id:
        eq_query = eq_query.filter(Equipment.site_id == site_id)
    if equipment_type:
        eq_query = eq_query.filter(Equipment.equipment_type == equipment_type)
    if category:
        eq_query = eq_query.filter(Equipment.category == category)
    
    equipment_list = eq_query.order_by(Equipment.name).all()
    equipment_ids = [e.id for e in equipment_list]
    
    # Get schedules for these equipment within date range
    schedules = db.query(EquipmentSchedule).options(
        joinedload(EquipmentSchedule.equipment),
        joinedload(EquipmentSchedule.operator)
    ).filter(
        EquipmentSchedule.equipment_id.in_(equipment_ids),
        EquipmentSchedule.end_time >= start_date,
        EquipmentSchedule.start_time <= end_date
    ).order_by(EquipmentSchedule.start_time).all()
    
    # Build work_order_id to priority_level mapping
    work_order_ids = [s.work_order_id for s in schedules if s.work_order_id]
    priority_map = {}
    if work_order_ids:
        work_orders = db.query(WorkOrder.id, WorkOrder.priority_level).filter(
            WorkOrder.id.in_(work_order_ids)
        ).all()
        priority_map = {wo.id: wo.priority_level for wo in work_orders}
    
    # Format response for Gantt chart
    equipment_data = []
    for eq in equipment_list:
        eq_schedules = [s for s in schedules if s.equipment_id == eq.id]
        equipment_data.append({
            "id": eq.id,
            "name": eq.name,
            "code": eq.code,
            "equipment_type": eq.equipment_type.value,
            "category": eq.category.value if eq.category else "other",
            "status": eq.status.value,
            "laboratory_id": eq.laboratory_id,
            "schedules": [
                {
                    "id": s.id,
                    "start_time": s.start_time.isoformat(),
                    "end_time": s.end_time.isoformat(),
                    "title": s.title or f"Task #{s.task_id}" if s.task_id else "Scheduled",
                    "status": s.status,
                    "work_order_id": s.work_order_id,
                    "task_id": s.task_id,
                    "operator_name": s.operator.user.full_name if s.operator and s.operator.user else None,
                    "priority_level": priority_map.get(s.work_order_id, 3) if s.work_order_id else 3,
                }
                for s in eq_schedules
            ]
        })
    
    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "equipment": equipment_data,
        "total_equipment": len(equipment_data),
        "total_schedules": len(schedules)
    }

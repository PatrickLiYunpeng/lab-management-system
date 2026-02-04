"""
设备容量验证和计算服务

提供设备容量的查询和验证功能，用于任务分配时的容量检查。
"""
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.equipment import Equipment
from app.models.work_order import WorkOrderTask, TaskStatus


def get_available_capacity(db: Session, equipment_id: int) -> tuple[int, int]:
    """
    计算设备可用容量
    
    Returns:
        tuple: (total_capacity, available_capacity)
        - total_capacity: 设备最大容量
        - available_capacity: 可用容量 = 最大容量 - 已占用容量
    """
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment or equipment.capacity is None:
        return (0, 0)
    
    # 显式转换为int类型
    total_capacity: int = int(equipment.capacity)
    
    # 计算已占用容量（状态为ASSIGNED或IN_PROGRESS的任务）
    used_capacity_result = db.query(func.coalesce(func.sum(WorkOrderTask.required_capacity), 0)).filter(
        WorkOrderTask.scheduled_equipment_id == equipment_id,
        WorkOrderTask.status.in_([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]),
        WorkOrderTask.required_capacity.isnot(None)
    ).scalar()
    used_capacity: int = int(used_capacity_result) if used_capacity_result else 0
    
    available_capacity: int = total_capacity - used_capacity
    return (total_capacity, max(0, available_capacity))


def validate_capacity(
    db: Session, 
    equipment_id: int, 
    required_capacity: int,
    exclude_task_id: Optional[int] = None
) -> tuple[bool, str, int, int]:
    """
    验证设备是否有足够容量
    
    Args:
        db: 数据库会话
        equipment_id: 设备ID
        required_capacity: 所需容量
        exclude_task_id: 排除的任务ID（用于更新/重新分配时）
    
    Returns:
        tuple: (is_valid, error_message, total_capacity, available_capacity)
    """
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    
    if not equipment:
        return (False, "设备不存在", 0, 0)
    
    if equipment.capacity is None:
        # 设备无容量限制 - 允许任何容量需求
        return (True, "", 0, required_capacity)
    
    # 显式转换为int类型
    total_capacity: int = int(equipment.capacity)
    
    if required_capacity > total_capacity:
        return (
            False, 
            f"所需容量({required_capacity})超过设备最大容量({total_capacity})",
            total_capacity,
            0
        )
    
    # 计算已占用容量，排除正在更新的任务
    query = db.query(func.coalesce(func.sum(WorkOrderTask.required_capacity), 0)).filter(
        WorkOrderTask.scheduled_equipment_id == equipment_id,
        WorkOrderTask.status.in_([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]),
        WorkOrderTask.required_capacity.isnot(None)
    )
    
    if exclude_task_id:
        query = query.filter(WorkOrderTask.id != exclude_task_id)
    
    used_capacity_result = query.scalar()
    used_capacity: int = int(used_capacity_result) if used_capacity_result else 0
    
    available_capacity: int = total_capacity - used_capacity
    
    if required_capacity > available_capacity:
        return (
            False,
            f"容量不足。所需: {required_capacity}, 可用: {available_capacity}/{total_capacity}",
            total_capacity,
            available_capacity
        )
    
    return (True, "", total_capacity, available_capacity)

"""
工单数据模式 - 请求/响应验证

本模块定义工单相关的Pydantic模式，用于API请求验证和响应序列化。

模式分类:
- WorkOrder: 工单的创建、更新和响应
- Task: 工单任务的创建、更新和响应
- 分配相关: 工单分配给工程师、任务分配给技术员
- 技术员匹配: 根据技能要求查询符合条件的技术员
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

from app.models.work_order import WorkOrderType, WorkOrderStatus, TaskStatus


class WorkOrderBase(BaseModel):
    """Base work order schema."""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    work_order_type: WorkOrderType
    laboratory_id: int
    site_id: int
    client_id: Optional[int] = None
    product_id: Optional[int] = None
    testing_source: Optional[str] = Field(None, max_length=50)
    sla_deadline: Optional[datetime] = None
    standard_cycle_hours: Optional[float] = None
    material_ids: Optional[List[int]] = []  # 选择的样品ID列表


class WorkOrderCreate(WorkOrderBase):
    """Schema for creating a work order."""
    pass


class WorkOrderUpdate(BaseModel):
    """Schema for updating a work order."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    client_id: Optional[int] = None
    product_id: Optional[int] = None
    testing_source: Optional[str] = Field(None, max_length=50)
    sla_deadline: Optional[datetime] = None
    assigned_engineer_id: Optional[int] = None
    status: Optional[WorkOrderStatus] = None
    standard_cycle_hours: Optional[float] = None
    priority_level: Optional[int] = Field(None, ge=1, le=5)
    material_ids: Optional[List[int]] = None  # 选择的样品ID列表


class WorkOrderResponse(WorkOrderBase):
    """Schema for work order response."""
    id: int
    order_number: str
    product_id: Optional[int] = None
    assigned_engineer_id: Optional[int] = None
    status: WorkOrderStatus
    priority_score: float
    priority_level: int
    actual_cycle_hours: Optional[float] = None
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    assigned_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    material_ids: Optional[List[int]] = []  # 选择的样品ID列表

    class Config:
        from_attributes = True


class WorkOrderListResponse(BaseModel):
    """Schema for paginated work order list response."""
    items: list[WorkOrderResponse]
    total: int
    page: int
    page_size: int


# Task schemas
class MethodBrief(BaseModel):
    """Brief method info for task response."""
    id: int
    name: str
    code: str
    method_type: str
    standard_cycle_hours: Optional[float] = None

    class Config:
        from_attributes = True


class PersonnelBrief(BaseModel):
    """Brief personnel info for task response."""
    id: int
    employee_id: str
    name: str
    job_title: Optional[str] = None

    class Config:
        from_attributes = True


class EquipmentBrief(BaseModel):
    """Brief equipment info for task response."""
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True


class TaskBase(BaseModel):
    """Base task schema."""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    sequence: int = 1
    method_id: Optional[int] = None
    required_equipment_id: Optional[int] = None
    required_capacity: Optional[int] = Field(None, ge=1, description="Number of sample slots required")
    standard_cycle_hours: Optional[float] = None


class TaskCreate(TaskBase):
    """Schema for creating a task."""
    schedule_start_time: Optional[datetime] = None  # 关键设备调度起始时间
    schedule_end_time: Optional[datetime] = None    # 关键设备调度结束时间


class TaskUpdate(BaseModel):
    """Schema for updating a task."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    sequence: Optional[int] = None
    method_id: Optional[int] = None
    assigned_technician_id: Optional[int] = None
    scheduled_equipment_id: Optional[int] = None
    status: Optional[TaskStatus] = None
    notes: Optional[str] = None
    results: Optional[str] = None
    # 关键设备调度更新
    update_schedule: Optional[bool] = False  # 是否更新设备调度
    schedule_start_time: Optional[datetime] = None  # 新的调度起始时间
    schedule_end_time: Optional[datetime] = None    # 新的调度结束时间


class TaskResponse(BaseModel):
    """Schema for task response."""
    id: int
    work_order_id: int
    task_number: str
    title: str
    description: Optional[str] = None
    sequence: int
    method_id: Optional[int] = None
    method: Optional[MethodBrief] = None
    assigned_technician_id: Optional[int] = None
    assigned_technician: Optional[PersonnelBrief] = None
    required_equipment_id: Optional[int] = None
    required_equipment: Optional[EquipmentBrief] = None
    scheduled_equipment_id: Optional[int] = None
    required_capacity: Optional[int] = None
    status: TaskStatus
    standard_cycle_hours: Optional[float] = None
    actual_cycle_hours: Optional[float] = None
    notes: Optional[str] = None
    results: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    assigned_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WorkOrderAssign(BaseModel):
    """Schema for assigning work order to engineer."""
    engineer_id: int


class TaskAssign(BaseModel):
    """Schema for assigning task to technician."""
    technician_id: int
    equipment_id: Optional[int] = None


# Eligible technicians schemas
class SkillMatchDetail(BaseModel):
    """Skill match detail for a technician."""
    skill_id: int
    skill_name: str
    proficiency_level: str
    is_certified: bool
    meets_requirement: bool


class RequiredSkillInfo(BaseModel):
    """Required skill information."""
    skill_id: int
    skill_name: str
    min_proficiency: Optional[str] = None
    certification_required: bool


class EligibleTechnicianResponse(BaseModel):
    """Eligible technician with match details."""
    personnel_id: int
    employee_id: str
    name: str
    job_title: Optional[str] = None
    status: str
    match_score: float
    current_workload: int
    skill_details: list[SkillMatchDetail]


class EligibleTechniciansListResponse(BaseModel):
    """Response for eligible technicians list."""
    task_id: int
    required_equipment_id: Optional[int] = None
    required_equipment_name: Optional[str] = None
    required_skills: list[RequiredSkillInfo]
    eligible_technicians: list[EligibleTechnicianResponse]

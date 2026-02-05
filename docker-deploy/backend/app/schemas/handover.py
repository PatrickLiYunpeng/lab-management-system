"""
交接班数据模式 - 请求/响应验证

本模块定义交接班相关的Pydantic模式，用于API请求验证和响应序列化。
包括交接班创建、接受、拒绝及交接备注等操作。
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

from app.models.handover import HandoverStatus, HandoverPriority


# ============== 基础模式 ==============

class HandoverBase(BaseModel):
    """交接班基础模式 - 包含通用字段"""
    task_id: int = Field(..., description="任务ID")
    priority: HandoverPriority = Field(HandoverPriority.NORMAL, description="优先级")
    progress_summary: Optional[str] = Field(None, description="进度摘要")
    pending_items: Optional[str] = Field(None, description="待办事项")
    special_instructions: Optional[str] = Field(None, description="特殊说明")


class HandoverCreate(HandoverBase):
    """交接班创建模式"""
    to_technician_id: Optional[int] = Field(None, description="接班技术员ID（可后续分配）")
    from_shift_id: Optional[int] = Field(None, description="交班班次ID")
    to_shift_id: Optional[int] = Field(None, description="接班班次ID")


class HandoverUpdate(BaseModel):
    """交接班更新模式"""
    to_technician_id: Optional[int] = Field(None, description="接班技术员ID")
    priority: Optional[HandoverPriority] = Field(None, description="优先级")
    progress_summary: Optional[str] = Field(None, description="进度摘要")
    pending_items: Optional[str] = Field(None, description="待办事项")
    special_instructions: Optional[str] = Field(None, description="特殊说明")


class HandoverAccept(BaseModel):
    """交接班接受模式"""
    acceptance_notes: Optional[str] = Field(None, description="接受备注")


class HandoverReject(BaseModel):
    """交接班拒绝模式"""
    rejection_reason: str = Field(..., min_length=1, description="拒绝原因")


# ============== 响应模式（嵌套简要信息） ==============

class PersonnelBrief(BaseModel):
    """人员简要信息（用于交接班响应）"""
    id: int = Field(..., description="人员ID")
    employee_id: str = Field(..., description="员工编号")
    name: str = Field(..., description="姓名")
    job_title: Optional[str] = Field(None, description="职位")

    class Config:
        from_attributes = True


class TaskBrief(BaseModel):
    """任务简要信息（用于交接班响应）"""
    id: int = Field(..., description="任务ID")
    task_number: str = Field(..., description="任务编号")
    title: str = Field(..., description="任务标题")
    status: str = Field(..., description="任务状态")

    class Config:
        from_attributes = True


class WorkOrderBrief(BaseModel):
    """工单简要信息（用于交接班响应）"""
    id: int = Field(..., description="工单ID")
    order_number: str = Field(..., description="工单编号")
    title: str = Field(..., description="工单标题")

    class Config:
        from_attributes = True


class ShiftBrief(BaseModel):
    """班次简要信息（用于交接班响应）"""
    id: int = Field(..., description="班次ID")
    name: str = Field(..., description="班次名称")
    code: str = Field(..., description="班次编码")

    class Config:
        from_attributes = True


class HandoverNoteResponse(BaseModel):
    """交接备注响应模式"""
    id: int = Field(..., description="备注ID")
    handover_id: int = Field(..., description="交接班ID")
    author_id: int = Field(..., description="作者ID")
    content: str = Field(..., description="备注内容")
    is_important: bool = Field(..., description="是否重要")
    created_at: datetime = Field(..., description="创建时间")
    author: Optional[PersonnelBrief] = Field(None, description="作者信息")

    class Config:
        from_attributes = True


class HandoverResponse(BaseModel):
    """交接班响应模式"""
    id: int = Field(..., description="交接班ID")
    task_id: int = Field(..., description="任务ID")
    work_order_id: int = Field(..., description="工单ID")
    from_technician_id: int = Field(..., description="交班技术员ID")
    to_technician_id: Optional[int] = Field(None, description="接班技术员ID")
    from_shift_id: Optional[int] = Field(None, description="交班班次ID")
    to_shift_id: Optional[int] = Field(None, description="接班班次ID")
    status: HandoverStatus = Field(..., description="交接状态")
    priority: HandoverPriority = Field(..., description="优先级")
    task_status_at_handover: Optional[str] = Field(None, description="交接时任务状态")
    progress_summary: Optional[str] = Field(None, description="进度摘要")
    pending_items: Optional[str] = Field(None, description="待办事项")
    special_instructions: Optional[str] = Field(None, description="特殊说明")
    rejection_reason: Optional[str] = Field(None, description="拒绝原因")
    acceptance_notes: Optional[str] = Field(None, description="接受备注")
    created_at: datetime = Field(..., description="创建时间")
    accepted_at: Optional[datetime] = Field(None, description="接受时间")
    rejected_at: Optional[datetime] = Field(None, description="拒绝时间")
    
    # 关联实体
    task: Optional[TaskBrief] = Field(None, description="任务信息")
    work_order: Optional[WorkOrderBrief] = Field(None, description="工单信息")
    from_technician: Optional[PersonnelBrief] = Field(None, description="交班技术员")
    to_technician: Optional[PersonnelBrief] = Field(None, description="接班技术员")
    from_shift: Optional[ShiftBrief] = Field(None, description="交班班次")
    to_shift: Optional[ShiftBrief] = Field(None, description="接班班次")
    notes: list[HandoverNoteResponse] = Field(default_factory=list, description="交接备注列表")

    class Config:
        from_attributes = True


class HandoverListResponse(BaseModel):
    """分页交接班列表响应模式"""
    items: list[HandoverResponse] = Field(..., description="交接班列表")
    total: int = Field(..., description="总数")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页数量")


# ============== 交接备注模式 ==============

class HandoverNoteCreate(BaseModel):
    """交接备注创建模式"""
    content: str = Field(..., min_length=1, description="备注内容")
    is_important: bool = Field(False, description="是否重要")


class HandoverNoteUpdate(BaseModel):
    """交接备注更新模式"""
    content: Optional[str] = Field(None, min_length=1, description="备注内容")
    is_important: Optional[bool] = Field(None, description="是否重要")

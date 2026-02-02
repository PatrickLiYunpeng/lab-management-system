"""
Schemas for handover management.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

from app.models.handover import HandoverStatus, HandoverPriority


# Base schemas
class HandoverBase(BaseModel):
    """Base handover schema."""
    task_id: int
    priority: HandoverPriority = HandoverPriority.NORMAL
    progress_summary: Optional[str] = None
    pending_items: Optional[str] = None
    special_instructions: Optional[str] = None


class HandoverCreate(HandoverBase):
    """Schema for creating a new handover."""
    to_technician_id: Optional[int] = None  # Can be assigned later
    from_shift_id: Optional[int] = None
    to_shift_id: Optional[int] = None


class HandoverUpdate(BaseModel):
    """Schema for updating a handover."""
    to_technician_id: Optional[int] = None
    priority: Optional[HandoverPriority] = None
    progress_summary: Optional[str] = None
    pending_items: Optional[str] = None
    special_instructions: Optional[str] = None


class HandoverAccept(BaseModel):
    """Schema for accepting a handover."""
    acceptance_notes: Optional[str] = None


class HandoverReject(BaseModel):
    """Schema for rejecting a handover."""
    rejection_reason: str = Field(..., min_length=1)


# Response schemas
class PersonnelBrief(BaseModel):
    """Brief personnel info for handover responses."""
    id: int
    employee_id: str
    name: str
    job_title: Optional[str] = None

    class Config:
        from_attributes = True


class TaskBrief(BaseModel):
    """Brief task info for handover responses."""
    id: int
    task_number: str
    title: str
    status: str

    class Config:
        from_attributes = True


class WorkOrderBrief(BaseModel):
    """Brief work order info for handover responses."""
    id: int
    order_number: str
    title: str

    class Config:
        from_attributes = True


class ShiftBrief(BaseModel):
    """Brief shift info for handover responses."""
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True


class HandoverNoteResponse(BaseModel):
    """Response schema for handover note."""
    id: int
    handover_id: int
    author_id: int
    content: str
    is_important: bool
    created_at: datetime
    author: Optional[PersonnelBrief] = None

    class Config:
        from_attributes = True


class HandoverResponse(BaseModel):
    """Response schema for handover."""
    id: int
    task_id: int
    work_order_id: int
    from_technician_id: int
    to_technician_id: Optional[int]
    from_shift_id: Optional[int]
    to_shift_id: Optional[int]
    status: HandoverStatus
    priority: HandoverPriority
    task_status_at_handover: Optional[str]
    progress_summary: Optional[str]
    pending_items: Optional[str]
    special_instructions: Optional[str]
    rejection_reason: Optional[str]
    acceptance_notes: Optional[str]
    created_at: datetime
    accepted_at: Optional[datetime]
    rejected_at: Optional[datetime]
    
    # Related entities
    task: Optional[TaskBrief] = None
    work_order: Optional[WorkOrderBrief] = None
    from_technician: Optional[PersonnelBrief] = None
    to_technician: Optional[PersonnelBrief] = None
    from_shift: Optional[ShiftBrief] = None
    to_shift: Optional[ShiftBrief] = None
    notes: list[HandoverNoteResponse] = []

    class Config:
        from_attributes = True


class HandoverListResponse(BaseModel):
    """Response schema for paginated handover list."""
    items: list[HandoverResponse]
    total: int
    page: int
    page_size: int


# Handover note schemas
class HandoverNoteCreate(BaseModel):
    """Schema for creating a handover note."""
    content: str = Field(..., min_length=1)
    is_important: bool = False


class HandoverNoteUpdate(BaseModel):
    """Schema for updating a handover note."""
    content: Optional[str] = Field(None, min_length=1)
    is_important: Optional[bool] = None

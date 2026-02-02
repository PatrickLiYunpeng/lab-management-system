"""
Shift schemas for request/response validation.
"""
from datetime import datetime, date, time
from typing import Optional
from pydantic import BaseModel, Field


class ShiftBase(BaseModel):
    """Base shift schema with common fields."""
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=20)
    start_time: time
    end_time: time
    laboratory_id: Optional[int] = None


class ShiftCreate(ShiftBase):
    """Schema for creating a new shift."""
    pass


class ShiftUpdate(BaseModel):
    """Schema for updating a shift."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=20)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    laboratory_id: Optional[int] = None
    is_active: Optional[bool] = None


class LaboratoryBrief(BaseModel):
    """Brief laboratory info for nested responses."""
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True


class ShiftResponse(ShiftBase):
    """Schema for shift response."""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    laboratory: Optional[LaboratoryBrief] = None

    class Config:
        from_attributes = True


class ShiftListResponse(BaseModel):
    """Schema for paginated shift list response."""
    items: list[ShiftResponse]
    total: int
    page: int
    page_size: int


# Personnel shift schemas
class PersonnelShiftCreate(BaseModel):
    """Schema for assigning a shift to personnel."""
    shift_id: int
    effective_date: date
    end_date: Optional[date] = None


class PersonnelShiftUpdate(BaseModel):
    """Schema for updating a personnel shift assignment."""
    effective_date: Optional[date] = None
    end_date: Optional[date] = None


class PersonnelBrief(BaseModel):
    """Brief personnel info for nested responses."""
    id: int
    employee_id: str
    user: Optional[dict] = None  # Contains full_name

    class Config:
        from_attributes = True


class PersonnelShiftResponse(BaseModel):
    """Schema for personnel shift response."""
    id: int
    personnel_id: int
    shift_id: int
    effective_date: date
    end_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    shift: Optional[ShiftResponse] = None
    personnel: Optional[PersonnelBrief] = None

    class Config:
        from_attributes = True

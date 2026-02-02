"""
Personnel schemas for request/response validation.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

from app.models.personnel import PersonnelStatus
from app.schemas.user import UserResponse
from app.schemas.site import SiteResponse
from app.schemas.laboratory import LaboratoryResponse


class PersonnelBase(BaseModel):
    """Base personnel schema with common fields."""
    employee_id: str = Field(..., min_length=1, max_length=50)
    user_id: int
    primary_laboratory_id: int
    primary_site_id: int
    job_title: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    hire_date: Optional[datetime] = None


class PersonnelCreate(PersonnelBase):
    """Schema for creating new personnel."""
    pass


class PersonnelUpdate(BaseModel):
    """Schema for updating personnel."""
    employee_id: Optional[str] = Field(None, min_length=1, max_length=50)
    primary_laboratory_id: Optional[int] = None
    primary_site_id: Optional[int] = None
    current_laboratory_id: Optional[int] = None
    current_site_id: Optional[int] = None
    job_title: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    status: Optional[PersonnelStatus] = None
    hire_date: Optional[datetime] = None


class PersonnelResponse(BaseModel):
    """Schema for personnel response."""
    id: int
    employee_id: str
    user_id: int
    primary_laboratory_id: int
    primary_site_id: int
    current_laboratory_id: Optional[int] = None
    current_site_id: Optional[int] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    status: PersonnelStatus
    hire_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PersonnelDetailResponse(PersonnelResponse):
    """Schema for personnel response with related details."""
    user: Optional[UserResponse] = None
    primary_laboratory: Optional[LaboratoryResponse] = None
    primary_site: Optional[SiteResponse] = None


class PersonnelListResponse(BaseModel):
    """Schema for paginated personnel list response."""
    items: list["PersonnelDetailResponse"]
    total: int
    page: int
    page_size: int


# Staff borrowing schemas
class StaffBorrowRequestCreate(BaseModel):
    """Schema for creating a staff borrow request."""
    personnel_id: int
    to_laboratory_id: int
    reason: Optional[str] = None
    start_date: datetime
    end_date: datetime


class StaffBorrowRequestUpdate(BaseModel):
    """Schema for updating a staff borrow request."""
    reason: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class StaffBorrowRequestApproval(BaseModel):
    """Schema for approving/rejecting a borrow request."""
    approved: bool
    rejection_reason: Optional[str] = None


class StaffBorrowRequestResponse(BaseModel):
    """Schema for staff borrow request response."""
    id: int
    personnel_id: int
    from_laboratory_id: int
    to_laboratory_id: int
    reason: Optional[str] = None
    start_date: datetime
    end_date: datetime
    status: str
    requested_by_id: int
    approved_by_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    # Relationship data
    personnel: Optional[PersonnelDetailResponse] = None
    from_laboratory: Optional[LaboratoryResponse] = None
    to_laboratory: Optional[LaboratoryResponse] = None

    class Config:
        from_attributes = True


class StaffBorrowRequestListResponse(BaseModel):
    """Schema for paginated borrow request list response."""
    items: list[StaffBorrowRequestResponse]
    total: int
    page: int
    page_size: int

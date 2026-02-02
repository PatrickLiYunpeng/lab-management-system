"""
Laboratory schemas for request/response validation.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr

from app.models.laboratory import LaboratoryType
from app.schemas.site import SiteResponse


class LaboratoryBase(BaseModel):
    """Base laboratory schema with common fields."""
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=20)
    lab_type: LaboratoryType
    description: Optional[str] = None
    site_id: int
    max_capacity: Optional[int] = None
    manager_name: Optional[str] = Field(None, max_length=100)
    manager_email: Optional[EmailStr] = None


class LaboratoryCreate(LaboratoryBase):
    """Schema for creating a new laboratory."""
    pass


class LaboratoryUpdate(BaseModel):
    """Schema for updating a laboratory."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=20)
    lab_type: Optional[LaboratoryType] = None
    description: Optional[str] = None
    site_id: Optional[int] = None
    max_capacity: Optional[int] = None
    manager_name: Optional[str] = Field(None, max_length=100)
    manager_email: Optional[EmailStr] = None
    is_active: Optional[bool] = None


class LaboratoryResponse(LaboratoryBase):
    """Schema for laboratory response."""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LaboratoryWithSiteResponse(LaboratoryResponse):
    """Schema for laboratory response with site details."""
    site: Optional[SiteResponse] = None


class LaboratoryListResponse(BaseModel):
    """Schema for paginated laboratory list response."""
    items: list["LaboratoryWithSiteResponse"]
    total: int
    page: int
    page_size: int

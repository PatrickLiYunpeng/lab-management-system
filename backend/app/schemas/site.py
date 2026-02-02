"""
Site schemas for request/response validation.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr


class SiteBase(BaseModel):
    """Base site schema with common fields."""
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=20)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    timezone: str = Field(default="UTC", max_length=50)
    contact_name: Optional[str] = Field(None, max_length=100)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(None, max_length=50)


class SiteCreate(SiteBase):
    """Schema for creating a new site."""
    pass


class SiteUpdate(BaseModel):
    """Schema for updating a site."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=20)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    timezone: Optional[str] = Field(None, max_length=50)
    contact_name: Optional[str] = Field(None, max_length=100)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None


class SiteResponse(SiteBase):
    """Schema for site response."""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SiteListResponse(BaseModel):
    """Schema for paginated site list response."""
    items: list[SiteResponse]
    total: int
    page: int
    page_size: int

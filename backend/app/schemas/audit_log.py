"""
Audit Log Schemas - Request/Response models for audit log API.
"""
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel


class AuditLogBase(BaseModel):
    """Base schema for audit log."""
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    entity_name: Optional[str] = None
    description: Optional[str] = None


class AuditLogResponse(BaseModel):
    """Response schema for audit log entries."""
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    user_role: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    entity_name: Optional[str] = None
    laboratory_id: Optional[int] = None
    site_id: Optional[int] = None
    ip_address: Optional[str] = None
    request_method: Optional[str] = None
    request_path: Optional[str] = None
    old_values: Optional[dict] = None
    new_values: Optional[dict] = None
    description: Optional[str] = None
    extra_data: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    """Paginated list response for audit logs."""
    items: list[AuditLogResponse]
    total: int
    page: int
    page_size: int


class AuditLogFilter(BaseModel):
    """Filter parameters for audit log queries."""
    user_id: Optional[int] = None
    action: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    laboratory_id: Optional[int] = None
    site_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

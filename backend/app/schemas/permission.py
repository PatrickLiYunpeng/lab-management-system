"""
Permission schemas for role permission management.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class RolePermissionBase(BaseModel):
    """Base schema for role permission."""
    role: str
    permission: str
    is_enabled: bool = True


class RolePermissionCreate(RolePermissionBase):
    """Schema for creating a role permission."""
    pass


class RolePermissionUpdate(BaseModel):
    """Schema for updating a role permission."""
    is_enabled: bool
    reason: Optional[str] = Field(None, max_length=500)


class RolePermissionResponse(RolePermissionBase):
    """Schema for role permission response."""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PermissionMatrixItem(BaseModel):
    """Single permission item in the matrix."""
    permission: str
    permission_label: str
    is_enabled: bool


class RolePermissionsResponse(BaseModel):
    """Response containing all permissions for a role."""
    role: str
    role_label: str
    permissions: list[PermissionMatrixItem]


class PermissionMatrixResponse(BaseModel):
    """Complete permission matrix response."""
    roles: list[RolePermissionsResponse]


class BulkPermissionUpdate(BaseModel):
    """Schema for bulk updating permissions."""
    updates: list[dict]  # List of {role, permission, is_enabled}
    reason: Optional[str] = Field(None, max_length=500)


class PermissionChangeLogResponse(BaseModel):
    """Schema for permission change log entry."""
    id: int
    role: str
    permission: str
    old_value: Optional[bool]
    new_value: bool
    changed_by_id: int
    changed_at: datetime
    reason: Optional[str]

    class Config:
        from_attributes = True


class PermissionDefinition(BaseModel):
    """Schema for permission definition with labels."""
    code: str
    label: str
    category: str
    category_label: str

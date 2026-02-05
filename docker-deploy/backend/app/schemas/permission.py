"""
权限数据模式 - 角色权限管理

本模块定义角色权限相关的Pydantic模式，用于API请求验证和响应序列化。
支持权限矩阵管理、批量更新和变更日志记录。
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class RolePermissionBase(BaseModel):
    """角色权限基础模式"""
    role: str = Field(..., description="角色标识")
    permission: str = Field(..., description="权限标识")
    is_enabled: bool = Field(True, description="是否启用")


class RolePermissionCreate(RolePermissionBase):
    """角色权限创建模式"""
    pass


class RolePermissionUpdate(BaseModel):
    """角色权限更新模式"""
    is_enabled: bool = Field(..., description="是否启用")
    reason: Optional[str] = Field(None, max_length=500, description="变更原因")


class RolePermissionResponse(RolePermissionBase):
    """角色权限响应模式"""
    id: int = Field(..., description="记录ID")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        from_attributes = True


class PermissionMatrixItem(BaseModel):
    """权限矩阵单项"""
    permission: str = Field(..., description="权限标识")
    permission_label: str = Field(..., description="权限显示名称")
    is_enabled: bool = Field(..., description="是否启用")


class RolePermissionsResponse(BaseModel):
    """单个角色的所有权限响应"""
    role: str = Field(..., description="角色标识")
    role_label: str = Field(..., description="角色显示名称")
    permissions: list[PermissionMatrixItem] = Field(..., description="权限列表")


class PermissionMatrixResponse(BaseModel):
    """完整权限矩阵响应"""
    roles: list[RolePermissionsResponse] = Field(..., description="所有角色的权限")


class BulkPermissionUpdate(BaseModel):
    """批量更新权限模式"""
    updates: list[dict] = Field(..., description="更新列表，格式: [{role, permission, is_enabled}]")
    reason: Optional[str] = Field(None, max_length=500, description="变更原因")


class PermissionChangeLogResponse(BaseModel):
    """权限变更日志响应模式"""
    id: int = Field(..., description="日志ID")
    role: str = Field(..., description="角色标识")
    permission: str = Field(..., description="权限标识")
    old_value: Optional[bool] = Field(None, description="变更前的值")
    new_value: bool = Field(..., description="变更后的值")
    changed_by_id: int = Field(..., description="操作人ID")
    changed_at: datetime = Field(..., description="变更时间")
    reason: Optional[str] = Field(None, description="变更原因")

    class Config:
        from_attributes = True


class PermissionDefinition(BaseModel):
    """权限定义模式（带标签）"""
    code: str = Field(..., description="权限编码")
    label: str = Field(..., description="权限标签")
    category: str = Field(..., description="权限分类编码")
    category_label: str = Field(..., description="权限分类标签")

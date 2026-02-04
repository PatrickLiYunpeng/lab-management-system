"""
Module Permission Schemas - 模块权限相关的Pydantic Schema
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ModuleDefinitionResponse(BaseModel):
    """模块定义响应"""
    code: str
    label: str
    route: str
    icon: Optional[str] = None
    category: str
    description: Optional[str] = None
    display_order: int = 0
    
    class Config:
        from_attributes = True


class ModulePermissionBase(BaseModel):
    """模块权限基础Schema"""
    role: str
    module_code: str
    can_access: bool = False


class ModulePermissionCreate(ModulePermissionBase):
    """创建模块权限"""
    pass


class ModulePermissionUpdate(BaseModel):
    """更新模块权限"""
    can_access: bool
    reason: Optional[str] = None


class ModulePermissionResponse(ModulePermissionBase):
    """模块权限响应"""
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class RoleModulePermission(BaseModel):
    """单个角色的模块权限"""
    module_code: str
    module_label: str
    category: str
    can_access: bool


class RoleModulePermissionsResponse(BaseModel):
    """角色的所有模块权限"""
    role: str
    role_label: str
    modules: List[RoleModulePermission]


class ModuleMatrixResponse(BaseModel):
    """完整模块权限矩阵"""
    roles: List[RoleModulePermissionsResponse]


class BulkModulePermissionUpdateItem(BaseModel):
    """批量更新单个模块权限项"""
    role: str
    module_code: str
    can_access: bool


class BulkModulePermissionUpdate(BaseModel):
    """批量更新模块权限"""
    updates: List[BulkModulePermissionUpdateItem]
    reason: Optional[str] = None


class ModulePermissionChangeLog(BaseModel):
    """模块权限变更日志"""
    id: int
    changed_by: str
    role: str
    module_code: str
    module_label: str
    old_value: bool
    new_value: bool
    reason: Optional[str]
    changed_at: datetime


class UserEffectiveModulesResponse(BaseModel):
    """用户有效模块权限响应"""
    user_id: int
    username: str
    role: str
    role_label: str
    accessible_modules: List[ModuleDefinitionResponse]

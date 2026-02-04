"""
权限管理API端点 - Permission Management API Endpoints

本模块提供角色权限和模块权限的管理接口，仅限Admin角色访问。
支持动态配置角色的功能权限和模块访问权限，所有变更记录完整的审计日志。

API端点列表:

权限定义与矩阵:
- GET /permissions/definitions: 获取所有权限定义（权限代码、标签、分类）
- GET /permissions/matrix: 获取完整的权限矩阵（所有角色的所有权限）
- GET /permissions/role/{role}: 获取指定角色的权限列表

单项权限更新:
- PUT /permissions/role/{role}/{permission}: 更新指定角色的单项权限

批量权限管理:
- POST /permissions/bulk-update: 批量更新多项权限
- POST /permissions/reset-to-defaults: 重置权限为默认值（可指定角色）

权限变更日志:
- GET /permissions/change-logs: 获取权限变更历史记录

用户有效权限:
- GET /permissions/user/{user_id}/effective: 获取指定用户的有效权限

模块权限管理:
- GET /permissions/modules: 获取所有模块定义
- GET /permissions/module-matrix: 获取完整的模块权限矩阵
- PUT /permissions/module/{role}/{module_code}: 更新指定角色的模块权限
- POST /permissions/module-bulk-update: 批量更新模块权限
- POST /permissions/module-reset-defaults: 重置模块权限为默认值
- GET /permissions/user/{user_id}/effective-modules: 获取用户可访问的模块
- GET /permissions/my-modules: 获取当前用户可访问的模块

权限分类:
- system: 系统管理（用户、站点、实验室、位置）
- clients: 客户与SLA（客户管理、SLA配置、来源类别）
- skills: 技能管理（技能分类、技能、人员技能分配）
- personnel: 人员管理（借调、班次）
- equipment: 设备与方法（设备管理、分析方法）
- work_orders: 工单管理（创建、分配、执行、验收、交接）
- materials: 材料管理（物料管理、分配、归还、提醒）
- reports: 仪表板与报表（实验室仪表板、报告、审计日志）

角色层级:
- admin: 系统管理员（拥有所有权限，不可修改）
- manager: 经理
- engineer: 工程师
- technician: 技术员
- viewer: 访客（仅查看权限）

安全说明:
- 所有端点均需要Admin角色权限
- Admin角色权限不可修改
- 所有权限变更自动记录审计日志
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.core.database import get_db
from app.schemas.permission import (
    RolePermissionUpdate, RolePermissionResponse, PermissionMatrixResponse,
    RolePermissionsResponse, PermissionMatrixItem, PermissionChangeLogResponse,
    BulkPermissionUpdate, PermissionDefinition
)
from app.schemas.module_permission import (
    ModuleDefinitionResponse, ModulePermissionUpdate, ModuleMatrixResponse,
    RoleModulePermissionsResponse, RoleModulePermission, BulkModulePermissionUpdate,
    UserEffectiveModulesResponse, BulkModulePermissionUpdateItem
)
from app.api.deps import require_admin
from app.models.user import User, UserRole
from app.models.permission import RolePermission, PermissionChangeLog
from app.models.module_permission import (
    ModulePermission, ModuleCode, MODULE_DEFINITIONS, DEFAULT_MODULE_PERMISSIONS,
    get_all_module_definitions, get_default_permissions_for_role
)

router = APIRouter(prefix="/permissions", tags=["Permission Management"])

# Permission labels in Chinese
PERMISSION_LABELS = {
    "manage_users": "管理用户",
    "manage_sites": "管理站点",
    "manage_laboratories": "管理实验室",
    "manage_locations": "管理位置",
    "manage_clients": "管理客户",
    "manage_client_sla": "管理客户SLA",
    "manage_source_categories": "管理测试来源类别",
    "manage_skill_categories": "管理技能分类",
    "manage_skills": "管理技能",
    "assign_personnel_skills": "分配人员技能",
    "initiate_borrow": "发起人员借调",
    "approve_borrow": "审批人员借调",
    "manage_shifts": "管理班次",
    "manage_equipment": "管理设备",
    "manage_methods": "管理分析/测试方法",
    "create_work_order": "创建工单",
    "assign_lead_engineer": "指派主管工程师",
    "create_subtask": "创建子任务",
    "assign_technician": "分配技术员",
    "execute_subtask": "执行子任务",
    "verify_results": "验收签核结果",
    "initiate_handover": "发起交接",
    "manage_materials": "管理材料",
    "allocate_materials": "分配材料到任务",
    "handle_material_return": "处理材料归还/报废",
    "confirm_material_alerts": "确认材料提醒",
    "view_lab_dashboard": "查看本实验室仪表板",
    "view_all_dashboards": "查看所有实验室仪表板",
    "view_cycle_time_report": "查看周期时间报告",
    "view_skills_matrix": "查看技能矩阵",
    "view_reports": "查看报表",
    "view_audit_logs": "查看审计日志",
    "view_work_order_query": "查看工单查询",  # Viewer-specific permission
}

# Role labels in Chinese
ROLE_LABELS = {
    "admin": "系统管理员",
    "manager": "经理",
    "engineer": "工程师",
    "technician": "技术员",
    "viewer": "访客",
}

# Permission categories
PERMISSION_CATEGORIES = {
    "system": {
        "label": "系统管理",
        "permissions": ["manage_users", "manage_sites", "manage_laboratories", "manage_locations"],
    },
    "clients": {
        "label": "客户与SLA",
        "permissions": ["manage_clients", "manage_client_sla", "manage_source_categories"],
    },
    "skills": {
        "label": "技能管理",
        "permissions": ["manage_skill_categories", "manage_skills", "assign_personnel_skills"],
    },
    "personnel": {
        "label": "人员管理",
        "permissions": ["initiate_borrow", "approve_borrow", "manage_shifts"],
    },
    "equipment": {
        "label": "设备与方法",
        "permissions": ["manage_equipment", "manage_methods"],
    },
    "work_orders": {
        "label": "工单管理",
        "permissions": [
            "create_work_order", "assign_lead_engineer", "create_subtask",
            "assign_technician", "execute_subtask", "verify_results", "initiate_handover",
            "view_work_order_query"
        ],
    },
    "materials": {
        "label": "材料管理",
        "permissions": ["manage_materials", "allocate_materials", "handle_material_return", "confirm_material_alerts"],
    },
    "reports": {
        "label": "仪表板与报表",
        "permissions": [
            "view_lab_dashboard", "view_all_dashboards", "view_cycle_time_report",
            "view_skills_matrix", "view_reports", "view_audit_logs"
        ],
    },
}

# Default permissions for each role
DEFAULT_ROLE_PERMISSIONS = {
    "admin": list(PERMISSION_LABELS.keys()),  # Admin has all permissions
    "manager": [
        "manage_locations", "manage_clients", "manage_client_sla", "manage_source_categories",
        "manage_skill_categories", "manage_skills", "assign_personnel_skills",
        "initiate_borrow", "approve_borrow", "manage_shifts",
        "manage_equipment", "manage_methods",
        "create_work_order", "assign_lead_engineer", "create_subtask", "assign_technician",
        "execute_subtask", "verify_results", "initiate_handover", "view_work_order_query",
        "manage_materials", "allocate_materials", "handle_material_return", "confirm_material_alerts",
        "view_lab_dashboard", "view_all_dashboards", "view_cycle_time_report",
        "view_skills_matrix", "view_reports", "view_audit_logs",
    ],
    "engineer": [
        "assign_personnel_skills", "manage_methods",
        "create_work_order", "create_subtask", "assign_technician",
        "execute_subtask", "verify_results", "initiate_handover", "view_work_order_query",
        "allocate_materials", "handle_material_return", "confirm_material_alerts",
        "view_lab_dashboard", "view_cycle_time_report", "view_skills_matrix", "view_reports",
    ],
    "technician": [
        "execute_subtask", "initiate_handover", "view_work_order_query",
        "handle_material_return", "confirm_material_alerts",
        "view_lab_dashboard", "view_cycle_time_report", "view_skills_matrix", "view_reports",
    ],
    "viewer": [
        "view_work_order_query",  # Viewer can only access work order query
    ],
}


def get_permission_category(permission: str) -> tuple[str, str]:
    """Get category code and label for a permission."""
    for cat_code, cat_info in PERMISSION_CATEGORIES.items():
        if permission in cat_info["permissions"]:
            return cat_code, cat_info["label"]
    return "other", "其他"


def initialize_default_permissions(db: Session):
    """Initialize default permissions if not already set."""
    for role, permissions in DEFAULT_ROLE_PERMISSIONS.items():
        for permission in PERMISSION_LABELS.keys():
            existing = db.query(RolePermission).filter(
                RolePermission.role == role,
                RolePermission.permission == permission
            ).first()
            
            if not existing:
                is_enabled = permission in permissions
                db.add(RolePermission(
                    role=role,
                    permission=permission,
                    is_enabled=is_enabled
                ))
    
    db.commit()


@router.get("/definitions", response_model=list[PermissionDefinition])
def get_permission_definitions(
    _: User = Depends(require_admin),
):
    """Get all permission definitions with labels and categories."""
    definitions = []
    for permission, label in PERMISSION_LABELS.items():
        cat_code, cat_label = get_permission_category(permission)
        definitions.append(PermissionDefinition(
            code=permission,
            label=label,
            category=cat_code,
            category_label=cat_label
        ))
    return definitions


@router.get("/matrix", response_model=PermissionMatrixResponse)
def get_permission_matrix(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Get the complete permission matrix for all roles."""
    # Initialize defaults if needed
    initialize_default_permissions(db)
    
    roles_data = []
    for role in ["admin", "manager", "engineer", "technician", "viewer"]:
        permissions_list = []
        
        for permission in PERMISSION_LABELS.keys():
            role_perm = db.query(RolePermission).filter(
                RolePermission.role == role,
                RolePermission.permission == permission
            ).first()
            
            # For admin, always show as enabled
            if role == "admin":
                is_enabled = True
            else:
                is_enabled = role_perm.is_enabled if role_perm else False
            
            permissions_list.append(PermissionMatrixItem(
                permission=permission,
                permission_label=PERMISSION_LABELS[permission],
                is_enabled=is_enabled
            ))
        
        roles_data.append(RolePermissionsResponse(
            role=role,
            role_label=ROLE_LABELS[role],
            permissions=permissions_list
        ))
    
    return PermissionMatrixResponse(roles=roles_data)


@router.get("/role/{role}", response_model=RolePermissionsResponse)
def get_role_permissions(
    role: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Get all permissions for a specific role."""
    if role not in ROLE_LABELS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {role}"
        )
    
    # Initialize defaults if needed
    initialize_default_permissions(db)
    
    permissions_list = []
    for permission in PERMISSION_LABELS.keys():
        role_perm = db.query(RolePermission).filter(
            RolePermission.role == role,
            RolePermission.permission == permission
        ).first()
        
        # For admin, always show as enabled
        if role == "admin":
            is_enabled = True
        else:
            is_enabled = role_perm.is_enabled if role_perm else False
        
        permissions_list.append(PermissionMatrixItem(
            permission=permission,
            permission_label=PERMISSION_LABELS[permission],
            is_enabled=is_enabled
        ))
    
    return RolePermissionsResponse(
        role=role,
        role_label=ROLE_LABELS[role],
        permissions=permissions_list
    )


@router.put("/role/{role}/{permission}")
def update_role_permission(
    role: str,
    permission: str,
    update_data: RolePermissionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update a specific permission for a role."""
    # Validate role
    if role not in ROLE_LABELS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {role}"
        )
    
    # Cannot modify admin permissions
    if role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify admin permissions"
        )
    
    # Validate permission
    if permission not in PERMISSION_LABELS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid permission: {permission}"
        )
    
    # Get or create role permission
    role_perm = db.query(RolePermission).filter(
        RolePermission.role == role,
        RolePermission.permission == permission
    ).first()
    
    old_value = role_perm.is_enabled if role_perm else None
    
    if role_perm:
        role_perm.is_enabled = update_data.is_enabled
    else:
        role_perm = RolePermission(
            role=role,
            permission=permission,
            is_enabled=update_data.is_enabled
        )
        db.add(role_perm)
    
    # Log the change
    change_log = PermissionChangeLog(
        role=role,
        permission=permission,
        old_value=old_value,
        new_value=update_data.is_enabled,
        changed_by_id=current_user.id,
        reason=update_data.reason
    )
    db.add(change_log)
    
    db.commit()
    
    return {
        "message": "Permission updated successfully",
        "role": role,
        "permission": permission,
        "is_enabled": update_data.is_enabled
    }


@router.post("/bulk-update")
def bulk_update_permissions(
    update_data: BulkPermissionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Bulk update multiple permissions."""
    updated_count = 0
    
    for item in update_data.updates:
        role = item.get("role")
        permission = item.get("permission")
        is_enabled = item.get("is_enabled")
        
        # Skip invalid entries
        if not role or not permission or is_enabled is None:
            continue
        
        # Skip admin role
        if role == "admin":
            continue
        
        # Skip invalid roles/permissions
        if role not in ROLE_LABELS or permission not in PERMISSION_LABELS:
            continue
        
        # Get or create role permission
        role_perm = db.query(RolePermission).filter(
            RolePermission.role == role,
            RolePermission.permission == permission
        ).first()
        
        old_value = role_perm.is_enabled if role_perm else None
        
        if role_perm:
            if role_perm.is_enabled != is_enabled:
                role_perm.is_enabled = is_enabled
                updated_count += 1
                
                # Log the change
                db.add(PermissionChangeLog(
                    role=role,
                    permission=permission,
                    old_value=old_value,
                    new_value=is_enabled,
                    changed_by_id=current_user.id,
                    reason=update_data.reason
                ))
        else:
            db.add(RolePermission(
                role=role,
                permission=permission,
                is_enabled=is_enabled
            ))
            updated_count += 1
            
            # Log the change
            db.add(PermissionChangeLog(
                role=role,
                permission=permission,
                old_value=None,
                new_value=is_enabled,
                changed_by_id=current_user.id,
                reason=update_data.reason
            ))
    
    db.commit()
    
    return {
        "message": f"Updated {updated_count} permissions",
        "updated_count": updated_count
    }


@router.get("/change-logs", response_model=list[PermissionChangeLogResponse])
def get_permission_change_logs(
    role: Optional[str] = Query(None),
    permission: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Get permission change history logs."""
    query = db.query(PermissionChangeLog).order_by(PermissionChangeLog.changed_at.desc())
    
    if role:
        query = query.filter(PermissionChangeLog.role == role)
    
    if permission:
        query = query.filter(PermissionChangeLog.permission == permission)
    
    logs = query.limit(limit).all()
    
    return [PermissionChangeLogResponse.model_validate(log) for log in logs]


@router.post("/reset-to-defaults")
def reset_permissions_to_defaults(
    role: Optional[str] = Query(None, description="Reset specific role or all if not specified"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Reset permissions to default values."""
    roles_to_reset = [role] if role else list(ROLE_LABELS.keys())
    
    # Skip admin
    roles_to_reset = [r for r in roles_to_reset if r != "admin"]
    
    reset_count = 0
    
    for r in roles_to_reset:
        if r not in DEFAULT_ROLE_PERMISSIONS:
            continue
        
        default_perms = DEFAULT_ROLE_PERMISSIONS[r]
        
        for permission in PERMISSION_LABELS.keys():
            should_be_enabled = permission in default_perms
            
            role_perm = db.query(RolePermission).filter(
                RolePermission.role == r,
                RolePermission.permission == permission
            ).first()
            
            if role_perm:
                if role_perm.is_enabled != should_be_enabled:
                    old_value = role_perm.is_enabled
                    role_perm.is_enabled = should_be_enabled
                    reset_count += 1
                    
                    db.add(PermissionChangeLog(
                        role=r,
                        permission=permission,
                        old_value=old_value,
                        new_value=should_be_enabled,
                        changed_by_id=current_user.id,
                        reason="Reset to default"
                    ))
            else:
                db.add(RolePermission(
                    role=r,
                    permission=permission,
                    is_enabled=should_be_enabled
                ))
                reset_count += 1
    
    db.commit()
    
    return {
        "message": f"Reset {reset_count} permissions to defaults",
        "reset_count": reset_count,
        "roles_affected": roles_to_reset
    }


@router.get("/user/{user_id}/effective")
def get_user_effective_permissions(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Get effective permissions for a specific user based on their role."""
    from app.models.user import User as UserModel
    
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    role = user.role.value if hasattr(user.role, 'value') else str(user.role)
    
    # Initialize defaults if needed
    initialize_default_permissions(db)
    
    effective_permissions = []
    
    for permission in PERMISSION_LABELS.keys():
        if role == "admin":
            is_enabled = True
        else:
            role_perm = db.query(RolePermission).filter(
                RolePermission.role == role,
                RolePermission.permission == permission
            ).first()
            is_enabled = role_perm.is_enabled if role_perm else False
        
        if is_enabled:
            effective_permissions.append(permission)
    
    return {
        "user_id": user_id,
        "username": user.username,
        "role": role,
        "role_label": ROLE_LABELS.get(role, role),
        "permissions": effective_permissions
    }


# ==============================================================================
# Module Permission Management Endpoints
# ==============================================================================

def initialize_default_module_permissions(db: Session):
    """Initialize default module permissions if not already set."""
    for role in ["admin", "manager", "engineer", "technician", "viewer"]:
        default_modules = get_default_permissions_for_role(role)
        
        for module_def in get_all_module_definitions():
            module_code = module_def["code"]
            existing = db.query(ModulePermission).filter(
                ModulePermission.role == role,
                ModulePermission.module_code == module_code
            ).first()
            
            if not existing:
                can_access = module_code in default_modules
                db.add(ModulePermission(
                    role=role,
                    module_code=module_code,
                    can_access=can_access
                ))
    
    db.commit()


@router.get("/modules", response_model=List[ModuleDefinitionResponse])
def get_module_definitions(
    _: User = Depends(require_admin),
):
    """Get all module definitions with labels and categories."""
    modules = get_all_module_definitions()
    return [ModuleDefinitionResponse(**m) for m in modules]


@router.get("/module-matrix", response_model=ModuleMatrixResponse)
def get_module_permission_matrix(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Get the complete module permission matrix for all roles."""
    # Initialize defaults if needed
    initialize_default_module_permissions(db)
    
    roles_data = []
    all_modules = get_all_module_definitions()
    
    for role in ["admin", "manager", "engineer", "technician", "viewer"]:
        modules_list = []
        
        for module_def in all_modules:
            module_code = module_def["code"]
            
            role_perm = db.query(ModulePermission).filter(
                ModulePermission.role == role,
                ModulePermission.module_code == module_code
            ).first()
            
            # For admin, always show as enabled
            if role == "admin":
                can_access = True
            else:
                can_access = role_perm.can_access if role_perm else False
            
            modules_list.append(RoleModulePermission(
                module_code=module_code,
                module_label=module_def["label"],
                category=module_def["category"],
                can_access=can_access
            ))
        
        roles_data.append(RoleModulePermissionsResponse(
            role=role,
            role_label=ROLE_LABELS[role],
            modules=modules_list
        ))
    
    return ModuleMatrixResponse(roles=roles_data)


@router.put("/module/{role}/{module_code}")
def update_module_permission(
    role: str,
    module_code: str,
    update_data: ModulePermissionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update a specific module permission for a role."""
    # Validate role
    if role not in ROLE_LABELS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无效角色: {role}"
        )
    
    # Cannot modify admin permissions
    if role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能修改管理员权限"
        )
    
    # Validate module code
    valid_modules = [m["code"] for m in get_all_module_definitions()]
    if module_code not in valid_modules:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无效模块代码: {module_code}"
        )
    
    # Get or create module permission
    module_perm = db.query(ModulePermission).filter(
        ModulePermission.role == role,
        ModulePermission.module_code == module_code
    ).first()
    
    old_value = module_perm.can_access if module_perm else None
    
    if module_perm:
        module_perm.can_access = update_data.can_access
    else:
        module_perm = ModulePermission(
            role=role,
            module_code=module_code,
            can_access=update_data.can_access
        )
        db.add(module_perm)
    
    # Log the change
    change_log = PermissionChangeLog(
        role=role,
        permission=f"module:{module_code}",
        old_value=old_value,
        new_value=update_data.can_access,
        changed_by_id=current_user.id,
        reason=update_data.reason or "模块权限更新"
    )
    db.add(change_log)
    
    db.commit()
    
    # Get module label for response
    module_label = next((m["label"] for m in get_all_module_definitions() if m["code"] == module_code), module_code)
    
    return {
        "message": "模块权限更新成功",
        "role": role,
        "role_label": ROLE_LABELS[role],
        "module_code": module_code,
        "module_label": module_label,
        "can_access": update_data.can_access
    }


@router.post("/module-bulk-update")
def bulk_update_module_permissions(
    update_data: BulkModulePermissionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Bulk update multiple module permissions."""
    updated_count = 0
    valid_modules = [m["code"] for m in get_all_module_definitions()]
    
    for item in update_data.updates:
        role = item.role
        module_code = item.module_code
        can_access = item.can_access
        
        # Skip admin role
        if role == "admin":
            continue
        
        # Skip invalid roles/modules
        if role not in ROLE_LABELS or module_code not in valid_modules:
            continue
        
        # Get or create module permission
        module_perm = db.query(ModulePermission).filter(
            ModulePermission.role == role,
            ModulePermission.module_code == module_code
        ).first()
        
        old_value = module_perm.can_access if module_perm else None
        
        if module_perm:
            if module_perm.can_access != can_access:
                module_perm.can_access = can_access
                updated_count += 1
                
                # Log the change
                db.add(PermissionChangeLog(
                    role=role,
                    permission=f"module:{module_code}",
                    old_value=old_value,
                    new_value=can_access,
                    changed_by_id=current_user.id,
                    reason=update_data.reason or "批量模块权限更新"
                ))
        else:
            db.add(ModulePermission(
                role=role,
                module_code=module_code,
                can_access=can_access
            ))
            updated_count += 1
            
            # Log the change
            db.add(PermissionChangeLog(
                role=role,
                permission=f"module:{module_code}",
                old_value=None,
                new_value=can_access,
                changed_by_id=current_user.id,
                reason=update_data.reason or "批量模块权限更新"
            ))
    
    db.commit()
    
    return {
        "message": f"已更新 {updated_count} 个模块权限",
        "updated_count": updated_count
    }


@router.post("/module-reset-defaults")
def reset_module_permissions_to_defaults(
    role: Optional[str] = Query(None, description="重置特定角色或全部(不指定时)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Reset module permissions to default values."""
    roles_to_reset = [role] if role else list(ROLE_LABELS.keys())
    
    # Skip admin
    roles_to_reset = [r for r in roles_to_reset if r != "admin"]
    
    reset_count = 0
    all_modules = get_all_module_definitions()
    
    for r in roles_to_reset:
        default_modules = get_default_permissions_for_role(r)
        
        for module_def in all_modules:
            module_code = module_def["code"]
            should_have_access = module_code in default_modules
            
            module_perm = db.query(ModulePermission).filter(
                ModulePermission.role == r,
                ModulePermission.module_code == module_code
            ).first()
            
            if module_perm:
                if module_perm.can_access != should_have_access:
                    old_value = module_perm.can_access
                    module_perm.can_access = should_have_access
                    reset_count += 1
                    
                    db.add(PermissionChangeLog(
                        role=r,
                        permission=f"module:{module_code}",
                        old_value=old_value,
                        new_value=should_have_access,
                        changed_by_id=current_user.id,
                        reason="重置为默认模块权限"
                    ))
            else:
                db.add(ModulePermission(
                    role=r,
                    module_code=module_code,
                    can_access=should_have_access
                ))
                reset_count += 1
    
    db.commit()
    
    return {
        "message": f"已重置 {reset_count} 个模块权限为默认值",
        "reset_count": reset_count,
        "roles_affected": roles_to_reset
    }


@router.get("/user/{user_id}/effective-modules", response_model=UserEffectiveModulesResponse)
def get_user_effective_modules(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Get effective module permissions for a specific user based on their role."""
    from app.models.user import User as UserModel
    
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户未找到"
        )
    
    role = user.role.value if hasattr(user.role, 'value') else str(user.role)
    
    # Initialize defaults if needed
    initialize_default_module_permissions(db)
    
    accessible_modules = []
    all_modules = get_all_module_definitions()
    
    for module_def in all_modules:
        module_code = module_def["code"]
        
        if role == "admin":
            can_access = True
        else:
            module_perm = db.query(ModulePermission).filter(
                ModulePermission.role == role,
                ModulePermission.module_code == module_code
            ).first()
            can_access = module_perm.can_access if module_perm else False
        
        if can_access:
            accessible_modules.append(ModuleDefinitionResponse(
                code=module_code,
                label=module_def["label"],
                route=module_def["route"],
                icon=module_def.get("icon"),
                category=module_def["category"],
                description=module_def.get("description"),
                display_order=module_def.get("display_order", 0)
            ))
    
    return UserEffectiveModulesResponse(
        user_id=user_id,
        username=user.username,
        role=role,
        role_label=ROLE_LABELS.get(role, role),
        accessible_modules=accessible_modules
    )


@router.get("/my-modules", response_model=UserEffectiveModulesResponse)
def get_my_modules(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get current user's accessible modules based on their role.
    Note: This endpoint is accessible to any authenticated user, not just admins.
    """
    role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    
    # Initialize defaults if needed
    initialize_default_module_permissions(db)
    
    accessible_modules = []
    all_modules = get_all_module_definitions()
    
    for module_def in all_modules:
        module_code = module_def["code"]
        
        if role == "admin":
            can_access = True
        else:
            module_perm = db.query(ModulePermission).filter(
                ModulePermission.role == role,
                ModulePermission.module_code == module_code
            ).first()
            can_access = module_perm.can_access if module_perm else False
        
        if can_access:
            accessible_modules.append(ModuleDefinitionResponse(
                code=module_code,
                label=module_def["label"],
                route=module_def["route"],
                icon=module_def.get("icon"),
                category=module_def["category"],
                description=module_def.get("description"),
                display_order=module_def.get("display_order", 0)
            ))
    
    return UserEffectiveModulesResponse(
        user_id=current_user.id,
        username=current_user.username,
        role=role,
        role_label=ROLE_LABELS.get(role, role),
        accessible_modules=accessible_modules
    )

"""
Permission Management API endpoints - Admin only.
Provides CRUD operations for dynamic role permissions.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.schemas.permission import (
    RolePermissionUpdate, RolePermissionResponse, PermissionMatrixResponse,
    RolePermissionsResponse, PermissionMatrixItem, PermissionChangeLogResponse,
    BulkPermissionUpdate, PermissionDefinition
)
from app.api.deps import require_admin
from app.models.user import User, UserRole
from app.models.permission import RolePermission, PermissionChangeLog

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

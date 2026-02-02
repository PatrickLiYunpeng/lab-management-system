"""
用户管理API端点 - User Management API Endpoints

本模块提供用户账户管理的API接口，仅限Admin角色访问。
包括用户的CRUD操作、角色管理和密码重置功能。

API端点列表:
- GET /users: 分页获取用户列表，支持搜索和筛选
- GET /users/{user_id}: 获取单个用户详情
- POST /users: 创建新用户
- PUT /users/{user_id}: 更新用户信息
- POST /users/{user_id}/reset-password: 重置用户密码（无需旧密码）
- POST /users/{user_id}/activate: 激活用户账号
- POST /users/{user_id}/deactivate: 停用用户账号
- DELETE /users/{user_id}: 删除用户
- GET /users/roles/list: 获取所有角色列表

权限要求:
- 所有端点均需要Admin角色权限

安全说明:
- 管理员不能停用或删除自己的账号
- 用户名和邮箱必须唯一
- 密码使用bcrypt加密存储
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.schemas.user import (
    UserCreate, UserResponse, UserUpdate, UserListResponse,
    UserDetailResponse, AdminPasswordReset
)
from app.services.auth_service import (
    create_user, get_user_by_username, get_user_by_email,
    get_user_by_id, update_user_password, activate_user, deactivate_user
)
from app.api.deps import require_admin
from app.models.user import User, UserRole

router = APIRouter(prefix="/users", tags=["User Management"])


@router.get("", response_model=UserListResponse)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str = Query(None),
    role: UserRole = Query(None),
    is_active: bool = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """List all users with pagination and filtering. Admin only."""
    query = db.query(User).options(
        joinedload(User.primary_laboratory),
        joinedload(User.primary_site)
    )
    
    # Apply filters
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (User.username.ilike(search_pattern)) |
            (User.email.ilike(search_pattern)) |
            (User.full_name.ilike(search_pattern))
        )
    
    if role:
        query = query.filter(User.role == role)
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    users = query.order_by(User.id.desc()).offset(offset).limit(page_size).all()
    
    # Build response with additional fields
    items = []
    for user in users:
        user_dict = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "primary_laboratory_id": user.primary_laboratory_id,
            "primary_site_id": user.primary_site_id,
            "is_active": user.is_active,
            "created_at": user.created_at,
        }
        items.append(UserResponse(**user_dict))
    
    return UserListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{user_id}", response_model=UserDetailResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Get a single user by ID. Admin only."""
    user = db.query(User).options(
        joinedload(User.primary_laboratory),
        joinedload(User.primary_site)
    ).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserDetailResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        primary_laboratory_id=user.primary_laboratory_id,
        primary_site_id=user.primary_site_id,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        created_at=user.created_at,
        updated_at=user.updated_at,
        last_login=user.last_login,
        primary_laboratory_name=user.primary_laboratory.name if user.primary_laboratory else None,
        primary_site_name=user.primary_site.name if user.primary_site else None,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_new_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Create a new user. Admin only."""
    # Check if username already exists
    if get_user_by_username(db, user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    if get_user_by_email(db, user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user = create_user(
        db=db,
        username=user_data.username,
        email=user_data.email,
        password=user_data.password,
        full_name=user_data.full_name,
        role=user_data.role,
        primary_laboratory_id=user_data.primary_laboratory_id,
        primary_site_id=user_data.primary_site_id,
    )
    
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update a user. Admin only."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent admin from deactivating themselves
    if user.id == current_user.id and user_data.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    # Check if username is being changed and already exists
    if user_data.username and user_data.username != user.username:
        existing = get_user_by_username(db, user_data.username)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
    
    # Check if email is being changed and already exists
    if user_data.email and user_data.email != user.email:
        existing = get_user_by_email(db, user_data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Update fields
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(user, field):
            setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.post("/{user_id}/reset-password")
def reset_user_password(
    user_id: int,
    password_data: AdminPasswordReset,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Reset a user's password. Admin only - no current password required."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    update_user_password(db, user, password_data.new_password)
    
    return {"message": "Password reset successfully"}


@router.post("/{user_id}/activate")
def activate_user_account(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Activate a user account. Admin only."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    activate_user(db, user)
    
    return {"message": "User activated successfully"}


@router.post("/{user_id}/deactivate")
def deactivate_user_account(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Deactivate a user account. Admin only."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent admin from deactivating themselves
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    deactivate_user(db, user)
    
    return {"message": "User deactivated successfully"}


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Delete a user. Admin only."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent admin from deleting themselves
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    db.delete(user)
    db.commit()
    
    return None


@router.get("/roles/list", response_model=list[dict])
def list_roles(
    _: User = Depends(require_admin),
):
    """List all available user roles. Admin only."""
    return [
        {"value": UserRole.ADMIN, "label": "管理员", "label_en": "Admin"},
        {"value": UserRole.MANAGER, "label": "经理", "label_en": "Manager"},
        {"value": UserRole.ENGINEER, "label": "工程师", "label_en": "Engineer"},
        {"value": UserRole.TECHNICIAN, "label": "技术员", "label_en": "Technician"},
        {"value": UserRole.VIEWER, "label": "访客", "label_en": "Viewer"},
    ]

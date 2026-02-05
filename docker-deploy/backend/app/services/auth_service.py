"""
认证服务 - Authentication Service

本模块提供用户身份认证相关的核心功能，包括登录验证、用户创建、令牌管理等。
是系统安全的基础模块，所有需要身份认证的操作都依赖本服务。

主要功能:
- authenticate_user(): 验证用户名密码，返回用户对象
- create_user(): 创建新用户，密码自动哈希存储
- get_user_by_username(): 根据用户名查询用户
- get_user_by_email(): 根据邮箱查询用户
- get_user_by_id(): 根据ID查询用户
- update_user_password(): 更新用户密码
- activate_user(): 激活用户账号
- deactivate_user(): 停用用户账号

安全说明:
- 密码使用bcrypt算法哈希存储
- 登录失败不返回具体原因（防止用户名枚举）
- 令牌使用JWT格式，包含用户ID和过期时间

依赖:
- app.core.security: 密码哈希和令牌生成
- app.models.user: 用户数据模型
"""
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session

from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User, UserRole


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """Authenticate user by username and password."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_user(
    db: Session,
    username: str,
    email: str,
    password: str,
    full_name: Optional[str] = None,
    role: UserRole = UserRole.VIEWER,
    primary_laboratory_id: Optional[int] = None,
    primary_site_id: Optional[int] = None,
    is_superuser: bool = False,
) -> User:
    """Create a new user."""
    hashed_password = get_password_hash(password)
    user = User(
        username=username,
        email=email,
        hashed_password=hashed_password,
        full_name=full_name,
        role=role,
        primary_laboratory_id=primary_laboratory_id,
        primary_site_id=primary_site_id,
        is_superuser=is_superuser,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_last_login(db: Session, user: User) -> User:
    """Update user's last login timestamp."""
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Get user by username."""
    return db.query(User).filter(User.username == username).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email."""
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get user by ID."""
    return db.query(User).filter(User.id == user_id).first()


def update_user_password(db: Session, user: User, new_password: str) -> User:
    """Update user's password."""
    user.hashed_password = get_password_hash(new_password)
    db.commit()
    db.refresh(user)
    return user


def deactivate_user(db: Session, user: User) -> User:
    """Deactivate a user account."""
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


def activate_user(db: Session, user: User) -> User:
    """Activate a user account."""
    user.is_active = True
    db.commit()
    db.refresh(user)
    return user

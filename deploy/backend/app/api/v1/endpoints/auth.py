"""
认证API端点 - Authentication API Endpoints

本模块提供用户身份认证相关的API接口，包括登录、注册、修改密码等功能。
使用JWT（JSON Web Token）进行身份认证，令牌有效期为24小时。

API端点列表:
- POST /auth/login: 用户登录，返回访问令牌
- POST /auth/token: OAuth2兼容的令牌获取端点
- POST /auth/register: 用户注册
- GET /auth/me: 获取当前登录用户信息
- PUT /auth/me: 更新当前用户资料
- POST /auth/change-password: 修改密码

安全说明:
- 密码使用bcrypt加密存储
- JWT令牌有效期24小时
- 停用账号无法登录
- 认证端点受速率限制保护，防止暴力攻击
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token
from app.core.rate_limit import limiter, RateLimits, get_client_ip
from app.core.logging_service import log_service
from app.schemas.user import (
    UserCreate, UserResponse, Token, LoginRequest, LoginResponse,
    PasswordChange, UserUpdate
)
from app.services.auth_service import (
    authenticate_user, create_user, update_last_login,
    get_user_by_username, get_user_by_email, update_user_password
)
from app.api.deps import get_current_user, get_current_active_user
from app.models.user import User

# 创建认证路由器，所有端点前缀为 /auth
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
@limiter.limit(RateLimits.AUTH_LOGIN)
def login(
    request: Request,
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    用户登录
    
    验证用户名和密码，成功后返回JWT访问令牌和用户信息。
    
    Args:
        credentials: 登录凭据（用户名和密码）
        db: 数据库会话
    
    Returns:
        LoginResponse: 包含access_token、token_type和用户信息
    
    Raises:
        401 Unauthorized: 用户名或密码错误
        403 Forbidden: 用户账号已停用
    """
    # 验证用户凭据
    user = authenticate_user(db, credentials.username, credentials.password)
    client_ip = get_client_ip(request)
    
    if not user:
        log_service.log_auth(
            action="login",
            username=credentials.username,
            success=False,
            ip_address=client_ip,
            reason="Invalid credentials"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",  # 用户名或密码错误
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 检查账号是否激活
    if not user.is_active:
        log_service.log_auth(
            action="login",
            username=credentials.username,
            success=False,
            ip_address=client_ip,
            reason="Account disabled"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"  # 用户账号已停用
        )
    
    # 更新最后登录时间
    update_last_login(db, user)
    
    # 创建JWT访问令牌
    access_token = create_access_token(subject=str(user.id))
    
    log_service.log_auth(
        action="login",
        username=credentials.username,
        success=True,
        ip_address=client_ip
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.post("/token", response_model=Token)
@limiter.limit(RateLimits.AUTH_LOGIN)
def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    OAuth2兼容令牌获取端点
    
    使用标准OAuth2表单格式进行身份验证，兼容Swagger UI测试。
    
    Args:
        form_data: OAuth2表单数据（username和password）
        db: 数据库会话
    
    Returns:
        Token: 包含access_token和token_type
    
    Raises:
        401 Unauthorized: 用户名或密码错误
        403 Forbidden: 用户账号已停用
    """
    user = authenticate_user(db, form_data.username, form_data.password)
    client_ip = get_client_ip(request)
    
    if not user:
        log_service.log_auth(
            action="token",
            username=form_data.username,
            success=False,
            ip_address=client_ip,
            reason="Invalid credentials"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        log_service.log_auth(
            action="token",
            username=form_data.username,
            success=False,
            ip_address=client_ip,
            reason="Account disabled"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    update_last_login(db, user)
    access_token = create_access_token(subject=str(user.id))
    
    log_service.log_auth(
        action="token",
        username=form_data.username,
        success=True,
        ip_address=client_ip
    )
    
    return Token(access_token=access_token, token_type="bearer")


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(RateLimits.AUTH_REGISTER)
def register(
    request: Request,
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    用户注册
    
    创建新用户账号。用户名和邮箱必须唯一。
    
    Args:
        user_data: 用户注册信息（用户名、邮箱、密码等）
        db: 数据库会话
    
    Returns:
        UserResponse: 创建成功的用户信息
    
    Raises:
        400 Bad Request: 用户名或邮箱已存在
    """
    client_ip = get_client_ip(request)
    
    # 检查用户名是否已存在
    if get_user_by_username(db, user_data.username):
        log_service.log_auth(
            action="register",
            username=user_data.username,
            success=False,
            ip_address=client_ip,
            reason="Username already exists"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"  # 用户名已被注册
        )
    
    # 检查邮箱是否已存在
    if get_user_by_email(db, user_data.email):
        log_service.log_auth(
            action="register",
            username=user_data.username,
            success=False,
            ip_address=client_ip,
            reason="Email already exists"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"  # 邮箱已被注册
        )
    
    # 创建用户
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
    
    log_service.log_auth(
        action="register",
        username=user_data.username,
        success=True,
        ip_address=client_ip
    )
    
    return UserResponse.model_validate(user)


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """
    获取当前登录用户信息
    
    返回当前已认证用户的详细信息。
    
    Args:
        current_user: 当前登录用户（通过JWT令牌获取）
    
    Returns:
        UserResponse: 用户信息
    
    Requires:
        有效的JWT访问令牌
    """
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    更新当前用户资料
    
    允许用户更新自己的基本信息（不包括密码和角色）。
    
    Args:
        user_data: 要更新的用户信息
        current_user: 当前登录用户
        db: 数据库会话
    
    Returns:
        UserResponse: 更新后的用户信息
    
    Raises:
        400 Bad Request: 新邮箱已被其他用户使用
    """
    # 检查邮箱是否被其他用户使用
    if user_data.email and user_data.email != current_user.email:
        existing = get_user_by_email(db, user_data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # 更新字段
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(current_user, field) and field != "password":
            setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    
    return UserResponse.model_validate(current_user)


@router.post("/change-password")
@limiter.limit(RateLimits.AUTH_PASSWORD_RESET)
def change_password(
    request: Request,
    password_data: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    修改密码
    
    用户修改自己的密码，需要验证当前密码。
    
    Args:
        password_data: 包含当前密码和新密码
        current_user: 当前登录用户
        db: 数据库会话
    
    Returns:
        成功消息
    
    Raises:
        400 Bad Request: 当前密码错误
    """
    client_ip = get_client_ip(request)
    
    # 验证当前密码
    user = authenticate_user(db, current_user.username, password_data.current_password)
    if not user:
        log_service.log_auth(
            action="change_password",
            username=current_user.username,
            success=False,
            ip_address=client_ip,
            reason="Invalid current password"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"  # 当前密码错误
        )
    
    # 更新密码
    update_user_password(db, current_user, password_data.new_password)
    
    log_service.log_auth(
        action="change_password",
        username=current_user.username,
        success=True,
        ip_address=client_ip
    )
    
    return {"message": "Password changed successfully"}  # 密码修改成功

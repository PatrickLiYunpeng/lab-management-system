"""
用户数据模式 - 请求/响应验证

本模块定义用户相关的Pydantic模式，用于API请求验证和响应序列化。
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


# 基础模式
class UserBase(BaseModel):
    """用户基础模式 - 包含通用字段"""
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    email: EmailStr = Field(..., description="电子邮箱")
    full_name: Optional[str] = Field(None, max_length=100, description="全名")
    role: UserRole = Field(UserRole.VIEWER, description="用户角色")
    primary_laboratory_id: Optional[int] = Field(None, description="主要实验室ID")
    primary_site_id: Optional[int] = Field(None, description="主要站点ID")


class UserCreate(UserBase):
    """用户创建模式"""
    password: str = Field(..., min_length=8, max_length=100, description="密码")


class UserUpdate(BaseModel):
    """用户更新模式"""
    username: Optional[str] = Field(None, min_length=3, max_length=50, description="用户名")
    email: Optional[EmailStr] = Field(None, description="电子邮箱")
    full_name: Optional[str] = Field(None, max_length=100, description="全名")
    role: Optional[UserRole] = Field(None, description="用户角色")
    primary_laboratory_id: Optional[int] = Field(None, description="主要实验室ID")
    primary_site_id: Optional[int] = Field(None, description="主要站点ID")
    is_active: Optional[bool] = Field(None, description="是否激活")


class UserInDB(UserBase):
    """数据库用户模式 - 包含存储的完整信息"""
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserResponse(UserBase):
    """用户响应模式 - 仅包含公开字段"""
    id: int
    is_active: bool
    is_superuser: bool = False
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


# 认证模式
class Token(BaseModel):
    """JWT令牌响应模式"""
    access_token: str = Field(..., description="访问令牌")
    token_type: str = Field("bearer", description="令牌类型")


class TokenPayload(BaseModel):
    """JWT令牌载荷模式"""
    sub: str = Field(..., description="令牌主题（用户ID）")
    exp: datetime = Field(..., description="过期时间")


class LoginRequest(BaseModel):
    """登录请求模式"""
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")


class LoginResponse(BaseModel):
    """登录响应模式 - 包含令牌和用户信息"""
    access_token: str = Field(..., description="访问令牌")
    token_type: str = Field("bearer", description="令牌类型")
    user: UserResponse = Field(..., description="用户信息")


class PasswordChange(BaseModel):
    """密码修改请求模式"""
    current_password: str = Field(..., description="当前密码")
    new_password: str = Field(..., min_length=8, max_length=100, description="新密码")


class AdminPasswordReset(BaseModel):
    """管理员重置密码模式 - 无需当前密码"""
    new_password: str = Field(..., min_length=8, max_length=100, description="新密码")


class UserListResponse(BaseModel):
    """分页用户列表响应模式"""
    items: List[UserResponse] = Field(..., description="用户列表")
    total: int = Field(..., description="总数")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页数量")


class UserDetailResponse(UserResponse):
    """用户详情响应模式 - 包含额外字段"""
    is_superuser: bool = Field(..., description="是否超级管理员")
    updated_at: datetime = Field(..., description="更新时间")
    last_login: Optional[datetime] = Field(None, description="最后登录时间")
    primary_laboratory_name: Optional[str] = Field(None, description="主要实验室名称")
    primary_site_name: Optional[str] = Field(None, description="主要站点名称")

    class Config:
        from_attributes = True

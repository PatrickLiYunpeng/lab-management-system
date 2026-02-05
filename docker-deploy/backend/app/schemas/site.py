"""
站点数据模式 - 请求/响应验证

本模块定义站点相关的Pydantic模式，用于API请求验证和响应序列化。
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr


class SiteBase(BaseModel):
    """站点基础模式 - 包含通用字段"""
    name: str = Field(..., min_length=1, max_length=100, description="站点名称")
    code: str = Field(..., min_length=1, max_length=20, description="站点编码")
    address: Optional[str] = Field(None, description="地址")
    city: Optional[str] = Field(None, max_length=100, description="城市")
    country: Optional[str] = Field(None, max_length=100, description="国家")
    timezone: str = Field(default="UTC", max_length=50, description="时区")
    contact_name: Optional[str] = Field(None, max_length=100, description="联系人姓名")
    contact_email: Optional[EmailStr] = Field(None, description="联系人邮箱")
    contact_phone: Optional[str] = Field(None, max_length=50, description="联系电话")


class SiteCreate(SiteBase):
    """站点创建模式"""
    pass


class SiteUpdate(BaseModel):
    """站点更新模式"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="站点名称")
    code: Optional[str] = Field(None, min_length=1, max_length=20, description="站点编码")
    address: Optional[str] = Field(None, description="地址")
    city: Optional[str] = Field(None, max_length=100, description="城市")
    country: Optional[str] = Field(None, max_length=100, description="国家")
    timezone: Optional[str] = Field(None, max_length=50, description="时区")
    contact_name: Optional[str] = Field(None, max_length=100, description="联系人姓名")
    contact_email: Optional[EmailStr] = Field(None, description="联系人邮箱")
    contact_phone: Optional[str] = Field(None, max_length=50, description="联系电话")
    is_active: Optional[bool] = Field(None, description="是否激活")


class SiteResponse(SiteBase):
    """站点响应模式"""
    id: int = Field(..., description="站点ID")
    is_active: bool = Field(..., description="是否激活")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        from_attributes = True


class SiteListResponse(BaseModel):
    """分页站点列表响应模式"""
    items: list[SiteResponse] = Field(..., description="站点列表")
    total: int = Field(..., description="总数")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页数量")

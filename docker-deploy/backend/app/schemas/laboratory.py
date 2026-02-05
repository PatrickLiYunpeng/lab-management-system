"""
实验室数据模式 - 请求/响应验证

本模块定义实验室相关的Pydantic模式，用于API请求验证和响应序列化。
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr

from app.models.laboratory import LaboratoryType
from app.schemas.site import SiteResponse


class LaboratoryBase(BaseModel):
    """实验室基础模式 - 包含通用字段"""
    name: str = Field(..., min_length=1, max_length=100, description="实验室名称")
    code: str = Field(..., min_length=1, max_length=20, description="实验室编码")
    lab_type: LaboratoryType = Field(..., description="实验室类型")
    description: Optional[str] = Field(None, description="描述")
    site_id: int = Field(..., description="所属站点ID")
    max_capacity: Optional[int] = Field(None, description="最大容量")
    manager_name: Optional[str] = Field(None, max_length=100, description="负责人姓名")
    manager_email: Optional[EmailStr] = Field(None, description="负责人邮箱")


class LaboratoryCreate(LaboratoryBase):
    """实验室创建模式"""
    pass


class LaboratoryUpdate(BaseModel):
    """实验室更新模式"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="实验室名称")
    code: Optional[str] = Field(None, min_length=1, max_length=20, description="实验室编码")
    lab_type: Optional[LaboratoryType] = Field(None, description="实验室类型")
    description: Optional[str] = Field(None, description="描述")
    site_id: Optional[int] = Field(None, description="所属站点ID")
    max_capacity: Optional[int] = Field(None, description="最大容量")
    manager_name: Optional[str] = Field(None, max_length=100, description="负责人姓名")
    manager_email: Optional[EmailStr] = Field(None, description="负责人邮箱")
    is_active: Optional[bool] = Field(None, description="是否激活")


class LaboratoryResponse(LaboratoryBase):
    """实验室响应模式"""
    id: int = Field(..., description="实验室ID")
    is_active: bool = Field(..., description="是否激活")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        from_attributes = True


class LaboratoryWithSiteResponse(LaboratoryResponse):
    """实验室响应模式（包含站点详情）"""
    site: Optional[SiteResponse] = Field(None, description="所属站点信息")


class LaboratoryListResponse(BaseModel):
    """分页实验室列表响应模式"""
    items: list["LaboratoryWithSiteResponse"] = Field(..., description="实验室列表")
    total: int = Field(..., description="总数")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页数量")

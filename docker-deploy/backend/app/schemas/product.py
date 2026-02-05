"""
产品管理数据模式 - 请求/响应验证

本模块定义产品管理相关的Pydantic模式，用于API请求验证和响应序列化。
包括以下实体:
- PackageFormOption: 封装形式配置
- PackageTypeOption: 封装产品类型配置
- ApplicationScenario: 产品应用场景配置
- Product: 产品信息
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


# ============================================================================
# 嵌套响应用简要模式
# ============================================================================

class ClientBrief(BaseModel):
    """客户简要信息（用于嵌套响应）"""
    id: int = Field(..., description="客户ID")
    name: str = Field(..., description="客户名称")
    code: str = Field(..., description="客户编码")

    class Config:
        from_attributes = True


class PackageFormOptionBrief(BaseModel):
    """封装形式简要信息（用于嵌套响应）"""
    id: int = Field(..., description="ID")
    name: str = Field(..., description="名称")
    code: str = Field(..., description="编码")

    class Config:
        from_attributes = True


class PackageTypeOptionBrief(BaseModel):
    """封装类型简要信息（用于嵌套响应）"""
    id: int = Field(..., description="ID")
    name: str = Field(..., description="名称")
    code: str = Field(..., description="编码")

    class Config:
        from_attributes = True


class ApplicationScenarioBrief(BaseModel):
    """应用场景简要信息（用于嵌套响应）"""
    id: int = Field(..., description="ID")
    name: str = Field(..., description="名称")
    code: str = Field(..., description="编码")
    color: Optional[str] = Field(None, description="显示颜色")

    class Config:
        from_attributes = True


# ============================================================================
# 封装形式模式 (PackageFormOption)
# ============================================================================

class PackageFormOptionBase(BaseModel):
    """封装形式基础模式"""
    name: str = Field(..., min_length=1, max_length=100, description="封装形式名称")
    code: str = Field(..., min_length=1, max_length=50, description="封装形式编码")
    display_order: int = Field(default=0, ge=0, description="显示顺序")
    description: Optional[str] = Field(None, max_length=500, description="描述")


class PackageFormOptionCreate(PackageFormOptionBase):
    """封装形式创建模式"""
    is_default: bool = Field(default=False, description="是否为默认选项")


class PackageFormOptionUpdate(BaseModel):
    """封装形式更新模式"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    display_order: Optional[int] = Field(None, ge=0)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class PackageFormOptionResponse(PackageFormOptionBase):
    """封装形式响应模式"""
    id: int = Field(..., description="ID")
    is_active: bool = Field(..., description="是否激活")
    is_default: bool = Field(..., description="是否为默认选项")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        from_attributes = True


class PackageFormOptionListResponse(BaseModel):
    """分页封装形式列表响应模式"""
    items: List[PackageFormOptionResponse] = Field(..., description="列表")
    total: int = Field(..., description="总数")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页数量")


# ============================================================================
# 封装产品类型模式 (PackageTypeOption)
# ============================================================================

class PackageTypeOptionBase(BaseModel):
    """封装类型基础模式"""
    name: str = Field(..., min_length=1, max_length=100, description="封装类型名称")
    code: str = Field(..., min_length=1, max_length=50, description="封装类型编码")
    display_order: int = Field(default=0, ge=0, description="显示顺序")
    description: Optional[str] = Field(None, max_length=500, description="描述")


class PackageTypeOptionCreate(PackageTypeOptionBase):
    """封装类型创建模式"""
    is_default: bool = Field(default=False, description="是否为默认选项")


class PackageTypeOptionUpdate(BaseModel):
    """封装类型更新模式"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    display_order: Optional[int] = Field(None, ge=0)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class PackageTypeOptionResponse(PackageTypeOptionBase):
    """封装类型响应模式"""
    id: int = Field(..., description="ID")
    is_active: bool = Field(..., description="是否激活")
    is_default: bool = Field(..., description="是否为默认选项")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        from_attributes = True


class PackageTypeOptionListResponse(BaseModel):
    """分页封装类型列表响应模式"""
    items: List[PackageTypeOptionResponse] = Field(..., description="列表")
    total: int = Field(..., description="总数")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页数量")


# ============================================================================
# 产品应用场景模式 (ApplicationScenario)
# ============================================================================

class ApplicationScenarioBase(BaseModel):
    """应用场景基础模式"""
    name: str = Field(..., min_length=1, max_length=100, description="应用场景名称")
    code: str = Field(..., min_length=1, max_length=50, description="应用场景编码")
    display_order: int = Field(default=0, ge=0, description="显示顺序")
    description: Optional[str] = Field(None, max_length=500, description="描述")
    color: Optional[str] = Field(None, max_length=20, description="显示颜色，用于前端标签")


class ApplicationScenarioCreate(ApplicationScenarioBase):
    """应用场景创建模式"""
    is_default: bool = Field(default=False, description="是否为默认选项")


class ApplicationScenarioUpdate(BaseModel):
    """应用场景更新模式"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    display_order: Optional[int] = Field(None, ge=0)
    description: Optional[str] = Field(None, max_length=500)
    color: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class ApplicationScenarioResponse(ApplicationScenarioBase):
    """应用场景响应模式"""
    id: int = Field(..., description="ID")
    is_active: bool = Field(..., description="是否激活")
    is_default: bool = Field(..., description="是否为默认选项")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        from_attributes = True


class ApplicationScenarioListResponse(BaseModel):
    """分页应用场景列表响应模式"""
    items: List[ApplicationScenarioResponse] = Field(..., description="列表")
    total: int = Field(..., description="总数")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页数量")


# ============================================================================
# 产品模式 (Product)
# ============================================================================

class ProductBase(BaseModel):
    """产品基础模式"""
    name: str = Field(..., min_length=1, max_length=200, description="产品名称")
    code: Optional[str] = Field(None, max_length=50, description="产品编码")
    client_id: int = Field(..., description="所属客户ID")
    package_form_id: Optional[int] = Field(None, description="封装形式ID")
    package_type_id: Optional[int] = Field(None, description="封装类型ID")
    custom_info: Optional[List[str]] = Field(
        default=None,
        max_length=5,
        description="自定义产品信息，最多5条，每条不超过200字符"
    )

    @field_validator('custom_info')
    @classmethod
    def validate_custom_info(cls, v):
        """验证自定义信息列表"""
        if v is None:
            return v
        if len(v) > 5:
            raise ValueError('自定义信息最多5条')
        for i, item in enumerate(v):
            if len(item) > 200:
                raise ValueError(f'第{i+1}条自定义信息不能超过200字符')
        return v


class ProductCreate(ProductBase):
    """产品创建模式"""
    scenario_ids: Optional[List[int]] = Field(
        default=None,
        description="应用场景ID列表"
    )


class ProductUpdate(BaseModel):
    """产品更新模式"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    code: Optional[str] = Field(None, max_length=50)
    client_id: Optional[int] = None
    package_form_id: Optional[int] = None
    package_type_id: Optional[int] = None
    custom_info: Optional[List[str]] = None
    scenario_ids: Optional[List[int]] = Field(
        default=None,
        description="应用场景ID列表，传入则完全替换"
    )
    is_active: Optional[bool] = None

    @field_validator('custom_info')
    @classmethod
    def validate_custom_info(cls, v):
        """验证自定义信息列表"""
        if v is None:
            return v
        if len(v) > 5:
            raise ValueError('自定义信息最多5条')
        for i, item in enumerate(v):
            if len(item) > 200:
                raise ValueError(f'第{i+1}条自定义信息不能超过200字符')
        return v


class ProductResponse(ProductBase):
    """产品响应模式"""
    id: int = Field(..., description="产品ID")
    is_active: bool = Field(..., description="是否激活")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    client: Optional[ClientBrief] = Field(None, description="所属客户")
    package_form: Optional[PackageFormOptionBrief] = Field(None, description="封装形式")
    package_type: Optional[PackageTypeOptionBrief] = Field(None, description="封装类型")
    scenarios: List[ApplicationScenarioBrief] = Field(default_factory=list, description="应用场景列表")

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    """分页产品列表响应模式"""
    items: List[ProductResponse] = Field(..., description="产品列表")
    total: int = Field(..., description="总数")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页数量")


# ============================================================================
# 产品配置综合响应
# ============================================================================

class ProductConfigResponse(BaseModel):
    """产品配置选项综合响应"""
    package_forms: List[PackageFormOptionResponse] = Field(..., description="封装形式列表")
    package_types: List[PackageTypeOptionResponse] = Field(..., description="封装类型列表")
    application_scenarios: List[ApplicationScenarioResponse] = Field(..., description="应用场景列表")

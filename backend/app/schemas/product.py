"""
Product management schemas for request/response validation.

This module defines Pydantic schemas for:
- PackageFormOption: 封装形式配置
- PackageTypeOption: 封装产品类型配置
- ApplicationScenario: 产品应用场景配置
- Product: 产品信息
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


# ============================================================================
# Brief schemas for nested responses
# ============================================================================

class ClientBrief(BaseModel):
    """Brief client info for nested response."""
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True


class PackageFormOptionBrief(BaseModel):
    """Brief package form option for nested response."""
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True


class PackageTypeOptionBrief(BaseModel):
    """Brief package type option for nested response."""
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True


class ApplicationScenarioBrief(BaseModel):
    """Brief application scenario for nested response."""
    id: int
    name: str
    code: str
    color: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================================================
# PackageFormOption schemas (封装形式)
# ============================================================================

class PackageFormOptionBase(BaseModel):
    """Base schema for PackageFormOption."""
    name: str = Field(..., min_length=1, max_length=100, description="封装形式名称")
    code: str = Field(..., min_length=1, max_length=50, description="封装形式编码")
    display_order: int = Field(default=0, ge=0, description="显示顺序")
    description: Optional[str] = Field(None, max_length=500, description="描述")


class PackageFormOptionCreate(PackageFormOptionBase):
    """Schema for creating a new PackageFormOption."""
    is_default: bool = Field(default=False, description="是否为默认选项")


class PackageFormOptionUpdate(BaseModel):
    """Schema for updating a PackageFormOption."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    display_order: Optional[int] = Field(None, ge=0)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class PackageFormOptionResponse(PackageFormOptionBase):
    """Schema for PackageFormOption response."""
    id: int
    is_active: bool
    is_default: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PackageFormOptionListResponse(BaseModel):
    """Schema for paginated PackageFormOption list response."""
    items: List[PackageFormOptionResponse]
    total: int
    page: int
    page_size: int


# ============================================================================
# PackageTypeOption schemas (封装产品类型)
# ============================================================================

class PackageTypeOptionBase(BaseModel):
    """Base schema for PackageTypeOption."""
    name: str = Field(..., min_length=1, max_length=100, description="封装类型名称")
    code: str = Field(..., min_length=1, max_length=50, description="封装类型编码")
    display_order: int = Field(default=0, ge=0, description="显示顺序")
    description: Optional[str] = Field(None, max_length=500, description="描述")


class PackageTypeOptionCreate(PackageTypeOptionBase):
    """Schema for creating a new PackageTypeOption."""
    is_default: bool = Field(default=False, description="是否为默认选项")


class PackageTypeOptionUpdate(BaseModel):
    """Schema for updating a PackageTypeOption."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    display_order: Optional[int] = Field(None, ge=0)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class PackageTypeOptionResponse(PackageTypeOptionBase):
    """Schema for PackageTypeOption response."""
    id: int
    is_active: bool
    is_default: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PackageTypeOptionListResponse(BaseModel):
    """Schema for paginated PackageTypeOption list response."""
    items: List[PackageTypeOptionResponse]
    total: int
    page: int
    page_size: int


# ============================================================================
# ApplicationScenario schemas (产品应用场景)
# ============================================================================

class ApplicationScenarioBase(BaseModel):
    """Base schema for ApplicationScenario."""
    name: str = Field(..., min_length=1, max_length=100, description="应用场景名称")
    code: str = Field(..., min_length=1, max_length=50, description="应用场景编码")
    display_order: int = Field(default=0, ge=0, description="显示顺序")
    description: Optional[str] = Field(None, max_length=500, description="描述")
    color: Optional[str] = Field(None, max_length=20, description="显示颜色，用于前端标签")


class ApplicationScenarioCreate(ApplicationScenarioBase):
    """Schema for creating a new ApplicationScenario."""
    is_default: bool = Field(default=False, description="是否为默认选项")


class ApplicationScenarioUpdate(BaseModel):
    """Schema for updating an ApplicationScenario."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    display_order: Optional[int] = Field(None, ge=0)
    description: Optional[str] = Field(None, max_length=500)
    color: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class ApplicationScenarioResponse(ApplicationScenarioBase):
    """Schema for ApplicationScenario response."""
    id: int
    is_active: bool
    is_default: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ApplicationScenarioListResponse(BaseModel):
    """Schema for paginated ApplicationScenario list response."""
    items: List[ApplicationScenarioResponse]
    total: int
    page: int
    page_size: int


# ============================================================================
# Product schemas (产品)
# ============================================================================

class ProductBase(BaseModel):
    """Base schema for Product."""
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
        """Validate custom_info list."""
        if v is None:
            return v
        if len(v) > 5:
            raise ValueError('自定义信息最多5条')
        for i, item in enumerate(v):
            if len(item) > 200:
                raise ValueError(f'第{i+1}条自定义信息不能超过200字符')
        return v


class ProductCreate(ProductBase):
    """Schema for creating a new Product."""
    scenario_ids: Optional[List[int]] = Field(
        default=None,
        description="应用场景ID列表"
    )


class ProductUpdate(BaseModel):
    """Schema for updating a Product."""
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
        """Validate custom_info list."""
        if v is None:
            return v
        if len(v) > 5:
            raise ValueError('自定义信息最多5条')
        for i, item in enumerate(v):
            if len(item) > 200:
                raise ValueError(f'第{i+1}条自定义信息不能超过200字符')
        return v


class ProductResponse(ProductBase):
    """Schema for Product response."""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    client: Optional[ClientBrief] = None
    package_form: Optional[PackageFormOptionBrief] = None
    package_type: Optional[PackageTypeOptionBrief] = None
    scenarios: List[ApplicationScenarioBrief] = Field(default_factory=list)

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    """Schema for paginated Product list response."""
    items: List[ProductResponse]
    total: int
    page: int
    page_size: int


# ============================================================================
# Product configuration combined response
# ============================================================================

class ProductConfigResponse(BaseModel):
    """Combined response for all product configuration options."""
    package_forms: List[PackageFormOptionResponse]
    package_types: List[PackageTypeOptionResponse]
    application_scenarios: List[ApplicationScenarioResponse]

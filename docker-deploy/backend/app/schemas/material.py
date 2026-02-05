"""
物料/样品数据模式 - 请求/响应验证

本模块定义物料管理相关的Pydantic模式，用于API请求验证和响应序列化。

模式分类:
- Material: 物料/样品的创建、更新和响应
- Client: 客户的创建、更新和响应
- ClientSLA: 客户SLA配置的创建、更新和响应
- TestingSourceCategory: 测试来源类别的创建、更新和响应
- Replenishment: 物料补充记录的创建和响应
- Consumption: 物料消耗记录的创建和响应
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

from app.models.material import MaterialType, MaterialStatus, DisposalMethod, NonSapSource, ConsumptionStatus
from app.models.method import MethodType


class MaterialBase(BaseModel):
    """Base material schema with common fields."""
    material_code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=200)
    material_type: MaterialType
    description: Optional[str] = None
    laboratory_id: int
    site_id: int
    storage_location: Optional[str] = Field(None, max_length=100)
    client_id: Optional[int] = None
    client_reference: Optional[str] = Field(None, max_length=100)
    quantity: int = 1
    unit: str = Field(default="piece", max_length=20)


class MaterialCreate(MaterialBase):
    """Schema for creating new material."""
    storage_deadline: Optional[datetime] = None
    processing_deadline: Optional[datetime] = None


class MaterialUpdate(BaseModel):
    """Schema for updating material."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    storage_location: Optional[str] = Field(None, max_length=100)
    quantity: Optional[int] = None
    unit: Optional[str] = Field(None, max_length=20)
    status: Optional[MaterialStatus] = None
    storage_deadline: Optional[datetime] = None
    processing_deadline: Optional[datetime] = None
    current_work_order_id: Optional[int] = None
    current_task_id: Optional[int] = None
    current_equipment_id: Optional[int] = None


class MaterialResponse(MaterialBase):
    """Schema for material response."""
    id: int
    status: MaterialStatus
    received_at: datetime
    storage_deadline: Optional[datetime] = None
    processing_deadline: Optional[datetime] = None
    current_work_order_id: Optional[int] = None
    current_task_id: Optional[int] = None
    current_equipment_id: Optional[int] = None
    disposal_method: Optional[DisposalMethod] = None
    disposed_at: Optional[datetime] = None
    returned_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MaterialListResponse(BaseModel):
    """Schema for paginated material list response."""
    items: list[MaterialResponse]
    total: int
    page: int
    page_size: int


class MaterialDispose(BaseModel):
    """Schema for disposing material."""
    disposal_method: DisposalMethod
    disposal_notes: Optional[str] = None


class MaterialReturn(BaseModel):
    """Schema for returning material to client."""
    return_tracking_number: Optional[str] = Field(None, max_length=100)
    return_notes: Optional[str] = None


# Replenishment schemas
class UserBrief(BaseModel):
    """Brief user info for nested response."""
    id: int
    username: str
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


class ReplenishmentCreate(BaseModel):
    """Schema for creating material replenishment."""
    received_date: datetime
    quantity_added: int = Field(..., ge=1, description="增加数量，必须大于0")
    sap_order_no: Optional[str] = Field(None, max_length=100, description="SAP订单号")
    non_sap_source: Optional[NonSapSource] = Field(None, description="非SAP来源")
    notes: Optional[str] = Field(None, description="备注")


class ReplenishmentResponse(BaseModel):
    """Schema for replenishment response."""
    id: int
    material_id: int
    received_date: datetime
    quantity_added: int
    sap_order_no: Optional[str] = None
    non_sap_source: Optional[NonSapSource] = None
    notes: Optional[str] = None
    created_by_id: int
    created_at: datetime
    created_by: Optional[UserBrief] = None

    class Config:
        from_attributes = True


class ReplenishmentListResponse(BaseModel):
    """Schema for paginated replenishment list response."""
    items: list[ReplenishmentResponse]
    total: int
    page: int
    page_size: int


# Client schemas
class ClientBase(BaseModel):
    """Base client schema."""
    name: str = Field(..., min_length=1, max_length=200)
    code: str = Field(..., min_length=1, max_length=50)
    contact_name: Optional[str] = Field(None, max_length=100)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    default_sla_days: int = 7
    priority_level: int = Field(default=3, ge=1, le=5)
    source_category: str = Field(default="external", max_length=50)


class ClientCreate(ClientBase):
    """Schema for creating a new client."""
    pass


class ClientUpdate(BaseModel):
    """Schema for updating a client."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    contact_name: Optional[str] = Field(None, max_length=100)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    default_sla_days: Optional[int] = None
    priority_level: Optional[int] = Field(None, ge=1, le=5)
    source_category: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None


class ClientResponse(ClientBase):
    """Schema for client response."""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClientListResponse(BaseModel):
    """Schema for paginated client list response."""
    items: list[ClientResponse]
    total: int
    page: int
    page_size: int


# ClientSLA schemas
class ClientSLABase(BaseModel):
    """Base schema for ClientSLA."""
    client_id: int
    laboratory_id: Optional[int] = None
    method_type: Optional[MethodType] = None
    source_category_id: Optional[int] = None
    commitment_hours: int = Field(..., ge=1)
    max_hours: Optional[int] = Field(None, ge=1)
    priority_weight: int = Field(default=0, ge=0, le=30)
    description: Optional[str] = None


class ClientSLACreate(ClientSLABase):
    """Schema for creating a new ClientSLA."""
    pass


class ClientSLAUpdate(BaseModel):
    """Schema for updating a ClientSLA."""
    laboratory_id: Optional[int] = None
    method_type: Optional[MethodType] = None
    source_category_id: Optional[int] = None
    commitment_hours: Optional[int] = Field(None, ge=1)
    max_hours: Optional[int] = Field(None, ge=1)
    priority_weight: Optional[int] = Field(None, ge=0, le=30)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class LaboratoryBrief(BaseModel):
    """Brief laboratory info for nested response."""
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True


class ClientBrief(BaseModel):
    """Brief client info for nested response."""
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True


class SourceCategoryBrief(BaseModel):
    """Brief source category info for nested response."""
    id: int
    name: str
    code: str
    color: Optional[str] = None

    class Config:
        from_attributes = True


class ClientSLAResponse(BaseModel):
    """Schema for ClientSLA response."""
    id: int
    client_id: int
    laboratory_id: Optional[int] = None
    method_type: Optional[MethodType] = None
    source_category_id: Optional[int] = None
    commitment_hours: int
    max_hours: Optional[int] = None
    priority_weight: int
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    client: Optional[ClientBrief] = None
    laboratory: Optional[LaboratoryBrief] = None
    source_category: Optional[SourceCategoryBrief] = None

    class Config:
        from_attributes = True


class ClientSLAListResponse(BaseModel):
    """Schema for paginated ClientSLA list response."""
    items: list[ClientSLAResponse]
    total: int
    page: int
    page_size: int


# TestingSourceCategory schemas
class TestingSourceCategoryBase(BaseModel):
    """Base schema for TestingSourceCategory."""
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=50)
    priority_weight: int = Field(default=10, ge=0, le=30)
    display_order: int = Field(default=0, ge=0)
    description: Optional[str] = None
    color: Optional[str] = Field(None, max_length=20)


class TestingSourceCategoryCreate(TestingSourceCategoryBase):
    """Schema for creating a new TestingSourceCategory."""
    is_default: bool = False


class TestingSourceCategoryUpdate(BaseModel):
    """Schema for updating a TestingSourceCategory."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    priority_weight: Optional[int] = Field(None, ge=0, le=30)
    display_order: Optional[int] = Field(None, ge=0)
    description: Optional[str] = None
    color: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class TestingSourceCategoryResponse(TestingSourceCategoryBase):
    """Schema for TestingSourceCategory response."""
    id: int
    is_active: bool
    is_default: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TestingSourceCategoryListResponse(BaseModel):
    """Schema for paginated TestingSourceCategory list response."""
    items: list[TestingSourceCategoryResponse]
    total: int
    page: int
    page_size: int


# Consumption schemas
class MaterialBrief(BaseModel):
    """Brief material info for nested response."""
    id: int
    material_code: str
    name: str
    material_type: MaterialType
    quantity: int
    unit: str

    class Config:
        from_attributes = True


class ConsumptionCreate(BaseModel):
    """Schema for creating a single consumption record."""
    material_id: int = Field(..., description="物料ID")
    quantity_consumed: int = Field(..., ge=1, description="消耗数量，必须大于0")
    unit_price: Optional[float] = Field(None, ge=0, description="单价")
    notes: Optional[str] = Field(None, description="备注")


class ConsumptionBatchCreate(BaseModel):
    """Schema for batch creating consumption records."""
    consumptions: list[ConsumptionCreate] = Field(..., min_length=1, description="消耗记录列表")


class ConsumptionVoid(BaseModel):
    """Schema for voiding a consumption record."""
    void_reason: str = Field(..., min_length=1, max_length=500, description="作废原因")


class ConsumptionResponse(BaseModel):
    """Schema for consumption response."""
    id: int
    material_id: int
    task_id: int
    quantity_consumed: int
    unit_price: Optional[float] = None
    total_cost: Optional[float] = None
    status: ConsumptionStatus
    notes: Optional[str] = None
    consumed_at: datetime
    created_by_id: int
    voided_at: Optional[datetime] = None
    voided_by_id: Optional[int] = None
    void_reason: Optional[str] = None
    replenishment_id: Optional[int] = None
    material: Optional[MaterialBrief] = None
    created_by: Optional[UserBrief] = None
    voided_by: Optional[UserBrief] = None

    class Config:
        from_attributes = True


class ConsumptionListResponse(BaseModel):
    """Schema for paginated consumption list response."""
    items: list[ConsumptionResponse]
    total: int
    page: int
    page_size: int

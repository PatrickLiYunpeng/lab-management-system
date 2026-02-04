"""
设备类别和设备名Schema - Equipment Category and Equipment Name Schemas

本模块定义设备类别和设备名称的Pydantic Schema，用于API数据验证和序列化。
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ============== Equipment Category Schemas ==============

class EquipmentCategoryBase(BaseModel):
    """设备类别基础Schema"""
    name: str = Field(..., min_length=1, max_length=100, description="类别名称（中文）")
    code: str = Field(..., min_length=1, max_length=50, description="类别代码（英文）")
    description: Optional[str] = Field(None, description="类别描述")
    display_order: int = Field(default=0, description="显示顺序")
    is_active: bool = Field(default=True, description="是否启用")


class EquipmentCategoryCreate(EquipmentCategoryBase):
    """创建设备类别Schema"""
    pass


class EquipmentCategoryUpdate(BaseModel):
    """更新设备类别Schema"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="类别名称（中文）")
    code: Optional[str] = Field(None, min_length=1, max_length=50, description="类别代码（英文）")
    description: Optional[str] = Field(None, description="类别描述")
    display_order: Optional[int] = Field(None, description="显示顺序")
    is_active: Optional[bool] = Field(None, description="是否启用")


class EquipmentCategoryResponse(EquipmentCategoryBase):
    """设备类别响应Schema"""
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EquipmentCategoryWithNames(EquipmentCategoryResponse):
    """设备类别响应Schema（包含设备名列表）"""
    equipment_names: List["EquipmentNameResponse"] = []

    class Config:
        from_attributes = True


# ============== Equipment Name Schemas ==============

class EquipmentNameBase(BaseModel):
    """设备名称基础Schema"""
    category_id: int = Field(..., description="所属类别ID")
    name: str = Field(..., min_length=1, max_length=100, description="设备名称（不含编号）")
    description: Optional[str] = Field(None, description="设备描述")
    display_order: int = Field(default=0, description="显示顺序")
    is_active: bool = Field(default=True, description="是否启用")


class EquipmentNameCreate(EquipmentNameBase):
    """创建设备名称Schema"""
    pass


class EquipmentNameUpdate(BaseModel):
    """更新设备名称Schema"""
    category_id: Optional[int] = Field(None, description="所属类别ID")
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="设备名称（不含编号）")
    description: Optional[str] = Field(None, description="设备描述")
    display_order: Optional[int] = Field(None, description="显示顺序")
    is_active: Optional[bool] = Field(None, description="是否启用")


class EquipmentNameResponse(BaseModel):
    """设备名称响应Schema"""
    id: int
    category_id: int
    name: str
    description: Optional[str]
    display_order: int
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EquipmentNameWithCategory(EquipmentNameResponse):
    """设备名称响应Schema（包含类别信息）"""
    category: Optional[EquipmentCategoryResponse] = None

    class Config:
        from_attributes = True


# 更新forward reference
EquipmentCategoryWithNames.model_rebuild()

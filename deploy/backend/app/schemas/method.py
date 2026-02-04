"""
分析/测试方法数据模式 - 请求/响应验证

本模块定义分析方法和测试方法相关的Pydantic模式，用于API请求验证和响应序列化。
包括方法定义、技能要求等。
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

from app.models.method import MethodType


# ============== 方法技能要求模式 ==============

class MethodSkillRequirementBase(BaseModel):
    """方法技能要求基础模式"""
    skill_id: int = Field(..., description="技能ID")
    min_proficiency_level: str = Field("intermediate", description="最低熟练度要求")
    requires_certification: bool = Field(False, description="是否需要认证")


class MethodSkillRequirementCreate(MethodSkillRequirementBase):
    """方法技能要求创建模式"""
    pass


class SkillBrief(BaseModel):
    """技能简要信息（用于方法响应）"""
    id: int = Field(..., description="技能ID")
    name: str = Field(..., description="技能名称")
    code: str = Field(..., description="技能编码")
    category: str = Field(..., description="技能类别")

    class Config:
        from_attributes = True


class MethodSkillRequirementResponse(BaseModel):
    """方法技能要求响应模式"""
    id: int = Field(..., description="记录ID")
    method_id: int = Field(..., description="方法ID")
    skill_id: int = Field(..., description="技能ID")
    min_proficiency_level: str = Field(..., description="最低熟练度要求")
    requires_certification: bool = Field(..., description="是否需要认证")
    created_at: datetime = Field(..., description="创建时间")
    skill: Optional[SkillBrief] = Field(None, description="技能信息")

    class Config:
        from_attributes = True


# ============== 方法模式 ==============

class MethodBase(BaseModel):
    """方法基础模式 - 包含通用字段"""
    name: str = Field(..., min_length=1, max_length=100, description="方法名称")
    code: str = Field(..., min_length=1, max_length=30, description="方法编码")
    method_type: MethodType = Field(..., description="方法类型")
    category: Optional[str] = Field(None, max_length=50, description="方法类别")
    description: Optional[str] = Field(None, description="描述")
    procedure_summary: Optional[str] = Field(None, description="操作步骤摘要")
    laboratory_id: Optional[int] = Field(None, description="所属实验室ID")
    standard_cycle_hours: Optional[float] = Field(None, description="标准周期（小时）")
    min_cycle_hours: Optional[float] = Field(None, description="最短周期（小时）")
    max_cycle_hours: Optional[float] = Field(None, description="最长周期（小时）")
    requires_equipment: bool = Field(True, description="是否需要设备")
    default_equipment_id: Optional[int] = Field(None, description="默认设备ID")


class MethodCreate(MethodBase):
    """方法创建模式"""
    pass


class MethodUpdate(BaseModel):
    """方法更新模式"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="方法名称")
    category: Optional[str] = Field(None, max_length=50, description="方法类别")
    description: Optional[str] = Field(None, description="描述")
    procedure_summary: Optional[str] = Field(None, description="操作步骤摘要")
    laboratory_id: Optional[int] = Field(None, description="所属实验室ID")
    standard_cycle_hours: Optional[float] = Field(None, description="标准周期（小时）")
    min_cycle_hours: Optional[float] = Field(None, description="最短周期（小时）")
    max_cycle_hours: Optional[float] = Field(None, description="最长周期（小时）")
    requires_equipment: Optional[bool] = Field(None, description="是否需要设备")
    default_equipment_id: Optional[int] = Field(None, description="默认设备ID")
    is_active: Optional[bool] = Field(None, description="是否激活")


class LaboratoryBrief(BaseModel):
    """实验室简要信息（用于方法响应）"""
    id: int = Field(..., description="实验室ID")
    name: str = Field(..., description="实验室名称")
    code: str = Field(..., description="实验室编码")

    class Config:
        from_attributes = True


class EquipmentBrief(BaseModel):
    """设备简要信息（用于方法响应）"""
    id: int = Field(..., description="设备ID")
    name: str = Field(..., description="设备名称")
    code: str = Field(..., description="设备编码")

    class Config:
        from_attributes = True


class MethodResponse(BaseModel):
    """方法响应模式"""
    id: int = Field(..., description="方法ID")
    name: str = Field(..., description="方法名称")
    code: str = Field(..., description="方法编码")
    method_type: MethodType = Field(..., description="方法类型")
    category: Optional[str] = Field(None, description="方法类别")
    description: Optional[str] = Field(None, description="描述")
    procedure_summary: Optional[str] = Field(None, description="操作步骤摘要")
    laboratory_id: Optional[int] = Field(None, description="所属实验室ID")
    standard_cycle_hours: Optional[float] = Field(None, description="标准周期（小时）")
    min_cycle_hours: Optional[float] = Field(None, description="最短周期（小时）")
    max_cycle_hours: Optional[float] = Field(None, description="最长周期（小时）")
    requires_equipment: bool = Field(..., description="是否需要设备")
    default_equipment_id: Optional[int] = Field(None, description="默认设备ID")
    is_active: bool = Field(..., description="是否激活")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    laboratory: Optional[LaboratoryBrief] = Field(None, description="所属实验室")
    default_equipment: Optional[EquipmentBrief] = Field(None, description="默认设备")
    skill_requirements: list[MethodSkillRequirementResponse] = Field(default_factory=list, description="技能要求列表")

    class Config:
        from_attributes = True


class MethodListResponse(BaseModel):
    """分页方法列表响应模式"""
    items: list[MethodResponse] = Field(..., description="方法列表")
    total: int = Field(..., description="总数")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页数量")

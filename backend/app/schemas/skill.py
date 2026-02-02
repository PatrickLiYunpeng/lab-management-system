"""
技能数据模式 - 请求/响应验证

本模块定义技能相关的Pydantic模式，用于API请求验证和响应序列化。
"""
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field

from app.models.skill import ProficiencyLevel, SkillCategory


class SkillBase(BaseModel):
    """技能基础模式 - 包含通用字段"""
    name: str = Field(..., min_length=1, max_length=100, description="技能名称")
    code: str = Field(..., min_length=1, max_length=20, description="技能代码")
    category: SkillCategory = Field(..., description="技能类别")
    description: Optional[str] = Field(None, description="技能描述")
    requires_certification: bool = Field(False, description="是否需要认证")
    certification_validity_days: Optional[int] = Field(None, description="认证有效期（天）")
    lab_type: Optional[str] = Field(None, description="实验室类型")


class SkillCreate(SkillBase):
    """技能创建模式"""
    pass


class SkillUpdate(BaseModel):
    """技能更新模式"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="技能名称")
    code: Optional[str] = Field(None, min_length=1, max_length=20, description="技能代码")
    category: Optional[SkillCategory] = Field(None, description="技能类别")
    description: Optional[str] = Field(None, description="技能描述")
    requires_certification: Optional[bool] = Field(None, description="是否需要认证")
    certification_validity_days: Optional[int] = Field(None, description="认证有效期（天）")
    lab_type: Optional[str] = Field(None, description="实验室类型")
    is_active: Optional[bool] = Field(None, description="是否激活")


class SkillResponse(SkillBase):
    """技能响应模式"""
    id: int = Field(..., description="技能ID")
    is_active: bool = Field(..., description="是否激活")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        from_attributes = True


class SkillListResponse(BaseModel):
    """分页技能列表响应模式"""
    items: List[SkillResponse] = Field(..., description="技能列表")
    total: int = Field(..., description="总数")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页数量")


# 人员技能模式
class PersonnelSkillCreate(BaseModel):
    """人员技能分配模式"""
    skill_id: int = Field(..., description="技能ID")
    proficiency_level: ProficiencyLevel = Field(ProficiencyLevel.BEGINNER, description="熟练程度")
    is_certified: bool = Field(False, description="是否已认证")
    certification_date: Optional[date] = Field(None, description="认证日期")
    certification_expiry: Optional[date] = Field(None, description="认证过期日期")
    certificate_number: Optional[str] = Field(None, description="证书编号")
    notes: Optional[str] = Field(None, description="备注")


class PersonnelSkillUpdate(BaseModel):
    """人员技能更新模式"""
    proficiency_level: Optional[ProficiencyLevel] = Field(None, description="熟练程度")
    is_certified: Optional[bool] = Field(None, description="是否已认证")
    certification_date: Optional[date] = Field(None, description="认证日期")
    certification_expiry: Optional[date] = Field(None, description="认证过期日期")
    certificate_number: Optional[str] = Field(None, description="证书编号")
    assessment_score: Optional[int] = Field(None, ge=0, le=100, description="评估分数")
    notes: Optional[str] = Field(None, description="备注")


class PersonnelSkillResponse(BaseModel):
    """人员技能响应模式"""
    id: int = Field(..., description="记录ID")
    personnel_id: int = Field(..., description="人员ID")
    skill_id: int = Field(..., description="技能ID")
    proficiency_level: ProficiencyLevel = Field(..., description="熟练程度")
    is_certified: bool = Field(..., description="是否已认证")
    certification_date: Optional[date] = Field(None, description="认证日期")
    certification_expiry: Optional[date] = Field(None, description="认证过期日期")
    certificate_number: Optional[str] = Field(None, description="证书编号")
    last_assessment_date: Optional[date] = Field(None, description="最后评估日期")
    assessment_score: Optional[int] = Field(None, description="评估分数")
    notes: Optional[str] = Field(None, description="备注")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    skill: Optional[SkillResponse] = Field(None, description="技能详情")

    class Config:
        from_attributes = True

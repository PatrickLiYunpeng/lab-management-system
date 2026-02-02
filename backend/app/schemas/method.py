"""
Schemas for analysis/test method management.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

from app.models.method import MethodType


# Skill requirement schemas
class MethodSkillRequirementBase(BaseModel):
    """Base schema for method skill requirement."""
    skill_id: int
    min_proficiency_level: str = "intermediate"
    requires_certification: bool = False


class MethodSkillRequirementCreate(MethodSkillRequirementBase):
    """Schema for creating a method skill requirement."""
    pass


class SkillBrief(BaseModel):
    """Brief skill info for method responses."""
    id: int
    name: str
    code: str
    category: str

    class Config:
        from_attributes = True


class MethodSkillRequirementResponse(BaseModel):
    """Response schema for method skill requirement."""
    id: int
    method_id: int
    skill_id: int
    min_proficiency_level: str
    requires_certification: bool
    created_at: datetime
    skill: Optional[SkillBrief] = None

    class Config:
        from_attributes = True


# Method schemas
class MethodBase(BaseModel):
    """Base schema for method."""
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=30)
    method_type: MethodType
    category: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    procedure_summary: Optional[str] = None
    laboratory_id: Optional[int] = None
    standard_cycle_hours: Optional[float] = None
    min_cycle_hours: Optional[float] = None
    max_cycle_hours: Optional[float] = None
    requires_equipment: bool = True
    default_equipment_id: Optional[int] = None


class MethodCreate(MethodBase):
    """Schema for creating a new method."""
    pass


class MethodUpdate(BaseModel):
    """Schema for updating a method."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    procedure_summary: Optional[str] = None
    laboratory_id: Optional[int] = None
    standard_cycle_hours: Optional[float] = None
    min_cycle_hours: Optional[float] = None
    max_cycle_hours: Optional[float] = None
    requires_equipment: Optional[bool] = None
    default_equipment_id: Optional[int] = None
    is_active: Optional[bool] = None


class LaboratoryBrief(BaseModel):
    """Brief laboratory info for method responses."""
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True


class EquipmentBrief(BaseModel):
    """Brief equipment info for method responses."""
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True


class MethodResponse(BaseModel):
    """Response schema for method."""
    id: int
    name: str
    code: str
    method_type: MethodType
    category: Optional[str]
    description: Optional[str]
    procedure_summary: Optional[str]
    laboratory_id: Optional[int]
    standard_cycle_hours: Optional[float]
    min_cycle_hours: Optional[float]
    max_cycle_hours: Optional[float]
    requires_equipment: bool
    default_equipment_id: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    laboratory: Optional[LaboratoryBrief] = None
    default_equipment: Optional[EquipmentBrief] = None
    skill_requirements: list[MethodSkillRequirementResponse] = []

    class Config:
        from_attributes = True


class MethodListResponse(BaseModel):
    """Response schema for paginated method list."""
    items: list[MethodResponse]
    total: int
    page: int
    page_size: int

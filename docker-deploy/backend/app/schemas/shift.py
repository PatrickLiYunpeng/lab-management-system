"""
班次数据模式 - 请求/响应验证

本模块定义班次和人员班次分配相关的Pydantic模式，用于API请求验证和响应序列化。
"""
from datetime import datetime, date, time
from typing import Optional
from pydantic import BaseModel, Field


class ShiftBase(BaseModel):
    """班次基础模式 - 包含通用字段"""
    name: str = Field(..., min_length=1, max_length=100, description="班次名称")
    code: str = Field(..., min_length=1, max_length=20, description="班次编码")
    start_time: time = Field(..., description="开始时间")
    end_time: time = Field(..., description="结束时间")
    laboratory_id: Optional[int] = Field(None, description="所属实验室ID")


class ShiftCreate(ShiftBase):
    """班次创建模式"""
    pass


class ShiftUpdate(BaseModel):
    """班次更新模式"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="班次名称")
    code: Optional[str] = Field(None, min_length=1, max_length=20, description="班次编码")
    start_time: Optional[time] = Field(None, description="开始时间")
    end_time: Optional[time] = Field(None, description="结束时间")
    laboratory_id: Optional[int] = Field(None, description="所属实验室ID")
    is_active: Optional[bool] = Field(None, description="是否激活")


class LaboratoryBrief(BaseModel):
    """实验室简要信息（用于嵌套响应）"""
    id: int = Field(..., description="实验室ID")
    name: str = Field(..., description="实验室名称")
    code: str = Field(..., description="实验室编码")

    class Config:
        from_attributes = True


class ShiftResponse(ShiftBase):
    """班次响应模式"""
    id: int = Field(..., description="班次ID")
    is_active: bool = Field(..., description="是否激活")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    laboratory: Optional[LaboratoryBrief] = Field(None, description="所属实验室")

    class Config:
        from_attributes = True


class ShiftListResponse(BaseModel):
    """分页班次列表响应模式"""
    items: list[ShiftResponse] = Field(..., description="班次列表")
    total: int = Field(..., description="总数")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页数量")


# ============== 人员班次模式 ==============

class PersonnelShiftCreate(BaseModel):
    """人员班次分配创建模式"""
    shift_id: int = Field(..., description="班次ID")
    effective_date: date = Field(..., description="生效日期")
    end_date: Optional[date] = Field(None, description="结束日期")


class PersonnelShiftUpdate(BaseModel):
    """人员班次分配更新模式"""
    effective_date: Optional[date] = Field(None, description="生效日期")
    end_date: Optional[date] = Field(None, description="结束日期")


class PersonnelBrief(BaseModel):
    """人员简要信息（用于嵌套响应）"""
    id: int = Field(..., description="人员ID")
    employee_id: str = Field(..., description="员工编号")
    user: Optional[dict] = Field(None, description="用户信息（包含full_name）")

    class Config:
        from_attributes = True


class PersonnelShiftResponse(BaseModel):
    """人员班次分配响应模式"""
    id: int = Field(..., description="记录ID")
    personnel_id: int = Field(..., description="人员ID")
    shift_id: int = Field(..., description="班次ID")
    effective_date: date = Field(..., description="生效日期")
    end_date: Optional[date] = Field(None, description="结束日期")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    shift: Optional[ShiftResponse] = Field(None, description="班次信息")
    personnel: Optional[PersonnelBrief] = Field(None, description="人员信息")

    class Config:
        from_attributes = True

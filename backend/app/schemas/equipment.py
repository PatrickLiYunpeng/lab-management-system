"""
设备数据模式 - 请求/响应验证

本模块定义设备相关的Pydantic模式，用于API请求验证和响应序列化。
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

from app.models.equipment import EquipmentType, EquipmentStatus, EquipmentCategory


class EquipmentBase(BaseModel):
    """设备基础模式 - 包含通用字段"""
    name: str = Field(..., min_length=1, max_length=100, description="设备名称")
    code: str = Field(..., min_length=1, max_length=50, description="设备编码")
    equipment_type: EquipmentType = Field(..., description="设备类型")
    category: Optional[EquipmentCategory] = Field(None, description="设备类别")
    laboratory_id: int = Field(..., description="所属实验室ID")
    site_id: int = Field(..., description="所属站点ID")
    model: Optional[str] = Field(None, max_length=100, description="型号")
    manufacturer: Optional[str] = Field(None, max_length=100, description="制造商")
    serial_number: Optional[str] = Field(None, max_length=100, description="序列号")
    description: Optional[str] = Field(None, description="描述")
    capacity: Optional[int] = Field(None, description="容量（样品槽位数）")
    uph: Optional[float] = Field(None, description="每小时产能")
    max_concurrent_tasks: int = Field(1, description="最大并行任务数")
    maintenance_interval_days: Optional[int] = Field(None, description="维护周期（天）")
    calibration_interval_days: Optional[int] = Field(None, description="校准周期（天）")


class EquipmentCreate(EquipmentBase):
    """设备创建模式"""
    purchase_date: Optional[datetime] = Field(None, description="采购日期")
    warranty_expiry: Optional[datetime] = Field(None, description="保修到期日期")


class EquipmentUpdate(BaseModel):
    """设备更新模式"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="设备名称")
    code: Optional[str] = Field(None, min_length=1, max_length=50, description="设备编码")
    equipment_type: Optional[EquipmentType] = Field(None, description="设备类型")
    category: Optional[EquipmentCategory] = Field(None, description="设备类别")
    laboratory_id: Optional[int] = Field(None, description="所属实验室ID")
    site_id: Optional[int] = Field(None, description="所属站点ID")
    model: Optional[str] = Field(None, max_length=100, description="型号")
    manufacturer: Optional[str] = Field(None, max_length=100, description="制造商")
    serial_number: Optional[str] = Field(None, max_length=100, description="序列号")
    description: Optional[str] = Field(None, description="描述")
    capacity: Optional[int] = Field(None, description="容量")
    uph: Optional[float] = Field(None, description="每小时产能")
    max_concurrent_tasks: Optional[int] = Field(None, description="最大并行任务数")
    status: Optional[EquipmentStatus] = Field(None, description="设备状态")
    last_maintenance_date: Optional[datetime] = Field(None, description="上次维护日期")
    next_maintenance_date: Optional[datetime] = Field(None, description="下次维护日期")
    maintenance_interval_days: Optional[int] = Field(None, description="维护周期（天）")
    last_calibration_date: Optional[datetime] = Field(None, description="上次校准日期")
    next_calibration_date: Optional[datetime] = Field(None, description="下次校准日期")
    calibration_interval_days: Optional[int] = Field(None, description="校准周期（天）")
    is_active: Optional[bool] = Field(None, description="是否激活")


class EquipmentResponse(EquipmentBase):
    """设备响应模式"""
    id: int = Field(..., description="设备ID")
    status: EquipmentStatus = Field(..., description="设备状态")
    last_maintenance_date: Optional[datetime] = Field(None, description="上次维护日期")
    next_maintenance_date: Optional[datetime] = Field(None, description="下次维护日期")
    last_calibration_date: Optional[datetime] = Field(None, description="上次校准日期")
    next_calibration_date: Optional[datetime] = Field(None, description="下次校准日期")
    purchase_date: Optional[datetime] = Field(None, description="采购日期")
    warranty_expiry: Optional[datetime] = Field(None, description="保修到期日期")
    is_active: bool = Field(..., description="是否激活")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        from_attributes = True


class EquipmentListResponse(BaseModel):
    """分页设备列表响应模式"""
    items: List[EquipmentResponse] = Field(..., description="设备列表")
    total: int = Field(..., description="总数")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页数量")


# 设备调度模式
class EquipmentScheduleCreate(BaseModel):
    """设备调度创建模式"""
    equipment_id: int = Field(..., description="设备ID")
    start_time: datetime = Field(..., description="开始时间")
    end_time: datetime = Field(..., description="结束时间")
    work_order_id: Optional[int] = Field(None, description="工单ID")
    task_id: Optional[int] = Field(None, description="任务ID")
    operator_id: Optional[int] = Field(None, description="操作员ID")
    title: Optional[str] = Field(None, max_length=200, description="标题")
    notes: Optional[str] = Field(None, description="备注")


class EquipmentScheduleResponse(BaseModel):
    """设备调度响应模式"""
    id: int = Field(..., description="调度ID")
    equipment_id: int = Field(..., description="设备ID")
    start_time: datetime = Field(..., description="开始时间")
    end_time: datetime = Field(..., description="结束时间")
    work_order_id: Optional[int] = Field(None, description="工单ID")
    task_id: Optional[int] = Field(None, description="任务ID")
    operator_id: Optional[int] = Field(None, description="操作员ID")
    title: Optional[str] = Field(None, description="标题")
    notes: Optional[str] = Field(None, description="备注")
    status: str = Field(..., description="状态")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        from_attributes = True

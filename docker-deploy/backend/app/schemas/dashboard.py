"""
仪表盘数据模式 - 统计与KPI

本模块定义仪表盘相关的Pydantic模式，用于展示实时统计数据、
设备利用率、人员效率、任务完成情况等关键绩效指标。
"""
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field


class DashboardSummary(BaseModel):
    """实时仪表盘摘要"""
    total_personnel: int = Field(..., description="总人员数")
    available_personnel: int = Field(..., description="可用人员数")
    total_equipment: int = Field(..., description="总设备数")
    available_equipment: int = Field(..., description="可用设备数")
    active_work_orders: int = Field(..., description="进行中工单数")
    overdue_work_orders: int = Field(..., description="逾期工单数")
    pending_materials: int = Field(..., description="待处理物料数")
    overdue_materials: int = Field(..., description="逾期物料数")


class EquipmentUtilization(BaseModel):
    """设备利用率统计"""
    equipment_id: int = Field(..., description="设备ID")
    equipment_name: str = Field(..., description="设备名称")
    equipment_type: str = Field(..., description="设备类型")
    total_hours: float = Field(..., description="总小时数")
    scheduled_hours: float = Field(..., description="预约小时数")
    utilization_rate: float = Field(..., description="利用率（百分比）")


class PersonnelEfficiency(BaseModel):
    """人员效率统计"""
    personnel_id: int = Field(..., description="人员ID")
    employee_id: str = Field(..., description="员工编号")
    total_tasks: int = Field(..., description="总任务数")
    completed_tasks: int = Field(..., description="已完成任务数")
    average_cycle_variance: Optional[float] = Field(None, description="平均周期偏差（小时）")
    efficiency_rate: float = Field(..., description="效率（百分比）")


class TaskCompletionStats(BaseModel):
    """任务完成统计"""
    total_tasks: int = Field(..., description="总任务数")
    completed_tasks: int = Field(..., description="已完成任务数")
    on_time_tasks: int = Field(..., description="按时完成任务数")
    delayed_tasks: int = Field(..., description="延迟任务数")
    completion_rate: float = Field(..., description="完成率")
    on_time_rate: float = Field(..., description="按时完成率")


class CyclePerformance(BaseModel):
    """周期时间性能统计"""
    task_category: str = Field(..., description="任务类别")
    standard_hours: float = Field(..., description="标准小时数")
    average_actual_hours: float = Field(..., description="平均实际小时数")
    min_hours: float = Field(..., description="最短小时数")
    max_hours: float = Field(..., description="最长小时数")
    variance: float = Field(..., description="与标准的偏差")
    sample_count: int = Field(..., description="样本数量")


class WorkloadAnalysis(BaseModel):
    """每日工作量分析"""
    analysis_date: date = Field(..., alias="date", description="日期")
    total_work_hours: float = Field(..., description="总工作小时数")
    personnel_count: int = Field(..., description="人员数量")
    average_hours_per_person: float = Field(..., description="人均工作小时数")
    tasks_completed: int = Field(..., description="完成任务数")
    
    model_config = {"populate_by_name": True}


class SLAPerformance(BaseModel):
    """SLA性能统计"""
    total_work_orders: int = Field(..., description="总工单数")
    on_time_count: int = Field(..., description="按时完成数")
    overdue_count: int = Field(..., description="逾期数")
    sla_compliance_rate: float = Field(..., description="SLA达标率")
    average_days_to_complete: Optional[float] = Field(None, description="平均完成天数")


class EquipmentCategoryStats(BaseModel):
    """按类别的设备统计"""
    category: str = Field(..., description="类别编码")
    category_name_zh: str = Field(..., description="类别中文名")
    category_name_en: str = Field(..., description="类别英文名")
    total_count: int = Field(..., description="总数")
    available_count: int = Field(..., description="可用数")
    in_use_count: int = Field(..., description="使用中数量")
    maintenance_count: int = Field(..., description="维护中数量")
    utilization_rate: float = Field(..., description="利用率")


class EquipmentDashboardResponse(BaseModel):
    """设备仪表盘响应"""
    total_equipment: int = Field(..., description="总设备数")
    available_equipment: int = Field(..., description="可用设备数")
    by_category: list[EquipmentCategoryStats] = Field(..., description="按类别统计")
    by_status: dict[str, int] = Field(..., description="按状态统计")
    by_type: dict[str, int] = Field(..., description="按类型统计")
    utilization_by_category: list[dict] = Field(..., description="按类别利用率")
    generated_at: datetime = Field(..., description="生成时间")


class DashboardHistoricalQuery(BaseModel):
    """历史数据查询参数"""
    start_date: date = Field(..., description="开始日期")
    end_date: date = Field(..., description="结束日期")
    laboratory_id: Optional[int] = Field(None, description="实验室ID")
    site_id: Optional[int] = Field(None, description="站点ID")


class DashboardResponse(BaseModel):
    """完整仪表盘响应"""
    summary: DashboardSummary = Field(..., description="摘要信息")
    equipment_utilization: list[EquipmentUtilization] = Field(..., description="设备利用率列表")
    personnel_efficiency: list[PersonnelEfficiency] = Field(..., description="人员效率列表")
    task_completion: TaskCompletionStats = Field(..., description="任务完成统计")
    sla_performance: SLAPerformance = Field(..., description="SLA性能")
    generated_at: datetime = Field(..., description="生成时间")

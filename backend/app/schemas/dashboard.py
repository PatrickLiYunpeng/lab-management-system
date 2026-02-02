"""
Dashboard schemas for statistics and KPIs.
"""
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel


class DashboardSummary(BaseModel):
    """Real-time dashboard summary."""
    total_personnel: int
    available_personnel: int
    total_equipment: int
    available_equipment: int
    active_work_orders: int
    overdue_work_orders: int
    pending_materials: int
    overdue_materials: int


class EquipmentUtilization(BaseModel):
    """Equipment utilization statistics."""
    equipment_id: int
    equipment_name: str
    equipment_type: str
    total_hours: float
    scheduled_hours: float
    utilization_rate: float  # Percentage


class PersonnelEfficiency(BaseModel):
    """Personnel efficiency statistics."""
    personnel_id: int
    employee_id: str
    total_tasks: int
    completed_tasks: int
    average_cycle_variance: Optional[float] = None  # Hours deviation from standard
    efficiency_rate: float  # Percentage


class TaskCompletionStats(BaseModel):
    """Task completion statistics."""
    total_tasks: int
    completed_tasks: int
    on_time_tasks: int
    delayed_tasks: int
    completion_rate: float
    on_time_rate: float


class CyclePerformance(BaseModel):
    """Cycle time performance statistics."""
    task_category: str
    standard_hours: float
    average_actual_hours: float
    min_hours: float
    max_hours: float
    variance: float  # Average variance from standard
    sample_count: int


class WorkloadAnalysis(BaseModel):
    """Daily workload analysis."""
    date: date
    total_work_hours: float
    personnel_count: int
    average_hours_per_person: float
    tasks_completed: int


class SLAPerformance(BaseModel):
    """SLA performance statistics."""
    total_work_orders: int
    on_time_count: int
    overdue_count: int
    sla_compliance_rate: float
    average_days_to_complete: Optional[float] = None


class EquipmentCategoryStats(BaseModel):
    """Equipment statistics by category."""
    category: str
    category_name_zh: str
    category_name_en: str
    total_count: int
    available_count: int
    in_use_count: int
    maintenance_count: int
    utilization_rate: float


class EquipmentDashboardResponse(BaseModel):
    """Equipment dashboard response."""
    total_equipment: int
    available_equipment: int
    by_category: list[EquipmentCategoryStats]
    by_status: dict[str, int]
    by_type: dict[str, int]
    utilization_by_category: list[dict]
    generated_at: datetime


class DashboardHistoricalQuery(BaseModel):
    """Query parameters for historical dashboard data."""
    start_date: date
    end_date: date
    laboratory_id: Optional[int] = None
    site_id: Optional[int] = None


class DashboardResponse(BaseModel):
    """Complete dashboard response."""
    summary: DashboardSummary
    equipment_utilization: list[EquipmentUtilization]
    personnel_efficiency: list[PersonnelEfficiency]
    task_completion: TaskCompletionStats
    sla_performance: SLAPerformance
    generated_at: datetime

"""
Dashboard API endpoints for statistics and KPIs.
"""
from typing import Optional
from datetime import datetime, timezone, date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.core.database import get_db
from app.models.personnel import Personnel, PersonnelStatus
from app.models.equipment import Equipment, EquipmentStatus, EquipmentSchedule, EquipmentCategory
from app.models.work_order import WorkOrder, WorkOrderStatus, WorkOrderTask, TaskStatus
from app.models.material import Material, MaterialStatus
from app.schemas.dashboard import (
    DashboardSummary, DashboardResponse, EquipmentUtilization,
    PersonnelEfficiency, TaskCompletionStats, SLAPerformance,
    CyclePerformance, WorkloadAnalysis, EquipmentCategoryStats, EquipmentDashboardResponse
)
from app.api.deps import get_current_active_user
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# Category name translations
CATEGORY_NAMES = {
    'thermal': {'zh': '热学设备', 'en': 'Thermal'},
    'mechanical': {'zh': '机械设备', 'en': 'Mechanical'},
    'electrical': {'zh': '电学设备', 'en': 'Electrical'},
    'optical': {'zh': '光学设备', 'en': 'Optical'},
    'analytical': {'zh': '分析设备', 'en': 'Analytical'},
    'environmental': {'zh': '环境设备', 'en': 'Environmental'},
    'measurement': {'zh': '测量设备', 'en': 'Measurement'},
    'other': {'zh': '其他设备', 'en': 'Other'},
}


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    laboratory_id: Optional[int] = None,
    site_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get real-time dashboard summary."""
    # Personnel counts
    personnel_query = db.query(Personnel)
    if laboratory_id:
        personnel_query = personnel_query.filter(Personnel.primary_laboratory_id == laboratory_id)
    if site_id:
        personnel_query = personnel_query.filter(Personnel.primary_site_id == site_id)
    
    total_personnel = personnel_query.count()
    available_personnel = personnel_query.filter(Personnel.status == PersonnelStatus.AVAILABLE).count()
    
    # Equipment counts
    equipment_query = db.query(Equipment).filter(Equipment.is_active == True)
    if laboratory_id:
        equipment_query = equipment_query.filter(Equipment.laboratory_id == laboratory_id)
    if site_id:
        equipment_query = equipment_query.filter(Equipment.site_id == site_id)
    
    total_equipment = equipment_query.count()
    available_equipment = equipment_query.filter(Equipment.status == EquipmentStatus.AVAILABLE).count()
    
    # Work order counts
    wo_query = db.query(WorkOrder)
    if laboratory_id:
        wo_query = wo_query.filter(WorkOrder.laboratory_id == laboratory_id)
    if site_id:
        wo_query = wo_query.filter(WorkOrder.site_id == site_id)
    
    active_statuses = [WorkOrderStatus.PENDING, WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS]
    active_work_orders = wo_query.filter(WorkOrder.status.in_(active_statuses)).count()
    
    now = datetime.now(timezone.utc)
    overdue_work_orders = wo_query.filter(
        WorkOrder.sla_deadline < now,
        ~WorkOrder.status.in_([WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED])
    ).count()
    
    # Material counts
    material_query = db.query(Material)
    if laboratory_id:
        material_query = material_query.filter(Material.laboratory_id == laboratory_id)
    if site_id:
        material_query = material_query.filter(Material.site_id == site_id)
    
    pending_statuses = [MaterialStatus.RECEIVED, MaterialStatus.IN_STORAGE, MaterialStatus.ALLOCATED]
    pending_materials = material_query.filter(Material.status.in_(pending_statuses)).count()
    
    overdue_materials = material_query.filter(
        ((Material.storage_deadline < now) & (Material.status == MaterialStatus.IN_STORAGE)) |
        ((Material.processing_deadline < now) & (~Material.status.in_([MaterialStatus.RETURNED, MaterialStatus.DISPOSED])))
    ).count()
    
    return DashboardSummary(
        total_personnel=total_personnel,
        available_personnel=available_personnel,
        total_equipment=total_equipment,
        available_equipment=available_equipment,
        active_work_orders=active_work_orders,
        overdue_work_orders=overdue_work_orders,
        pending_materials=pending_materials,
        overdue_materials=overdue_materials
    )


@router.get("/equipment-dashboard", response_model=EquipmentDashboardResponse)
def get_equipment_dashboard(
    laboratory_id: Optional[int] = None,
    site_id: Optional[int] = None,
    start_date: date = Query(default_factory=lambda: date.today() - timedelta(days=7)),
    end_date: date = Query(default_factory=date.today),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get equipment dashboard with statistics by category."""
    # Base query
    equipment_query = db.query(Equipment).filter(Equipment.is_active == True)
    if laboratory_id:
        equipment_query = equipment_query.filter(Equipment.laboratory_id == laboratory_id)
    if site_id:
        equipment_query = equipment_query.filter(Equipment.site_id == site_id)
    
    equipment_list = equipment_query.all()
    
    total_equipment = len(equipment_list)
    available_equipment = sum(1 for e in equipment_list if e.status == EquipmentStatus.AVAILABLE)
    
    # Group by category
    category_stats = {}
    for eq in equipment_list:
        cat = eq.category.value if eq.category else 'other'
        if cat not in category_stats:
            category_stats[cat] = {
                'total': 0, 'available': 0, 'in_use': 0, 'maintenance': 0
            }
        category_stats[cat]['total'] += 1
        if eq.status == EquipmentStatus.AVAILABLE:
            category_stats[cat]['available'] += 1
        elif eq.status == EquipmentStatus.IN_USE:
            category_stats[cat]['in_use'] += 1
        elif eq.status == EquipmentStatus.MAINTENANCE:
            category_stats[cat]['maintenance'] += 1
    
    # Build category stats list
    by_category = []
    for cat, stats in category_stats.items():
        names = CATEGORY_NAMES.get(cat, {'zh': cat, 'en': cat})
        utilization = ((stats['in_use'] / stats['total']) * 100) if stats['total'] > 0 else 0
        by_category.append(EquipmentCategoryStats(
            category=cat,
            category_name_zh=names['zh'],
            category_name_en=names['en'],
            total_count=stats['total'],
            available_count=stats['available'],
            in_use_count=stats['in_use'],
            maintenance_count=stats['maintenance'],
            utilization_rate=round(utilization, 2)
        ))
    
    # Sort by total count
    by_category.sort(key=lambda x: x.total_count, reverse=True)
    
    # Group by status
    by_status = {}
    for eq in equipment_list:
        status = eq.status.value if eq.status else 'unknown'
        by_status[status] = by_status.get(status, 0) + 1
    
    # Group by type
    by_type = {}
    for eq in equipment_list:
        eq_type = eq.equipment_type.value if eq.equipment_type else 'unknown'
        by_type[eq_type] = by_type.get(eq_type, 0) + 1
    
    # Get utilization by category over time
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())
    total_hours = (end_dt - start_dt).total_seconds() / 3600
    
    utilization_by_category = []
    for cat, stats in category_stats.items():
        cat_equipment = [e for e in equipment_list if (e.category.value if e.category else 'other') == cat]
        
        total_scheduled = 0
        for eq in cat_equipment:
            schedules = db.query(EquipmentSchedule).filter(
                EquipmentSchedule.equipment_id == eq.id,
                EquipmentSchedule.start_time >= start_dt,
                EquipmentSchedule.end_time <= end_dt,
                EquipmentSchedule.status.in_(["scheduled", "in_progress", "completed"])
            ).all()
            
            for s in schedules:
                total_scheduled += (min(s.end_time, end_dt) - max(s.start_time, start_dt)).total_seconds() / 3600
        
        cat_total_hours = total_hours * len(cat_equipment) if cat_equipment else 0
        utilization = (total_scheduled / cat_total_hours * 100) if cat_total_hours > 0 else 0
        
        names = CATEGORY_NAMES.get(cat, {'zh': cat, 'en': cat})
        utilization_by_category.append({
            'category': cat,
            'category_name_zh': names['zh'],
            'category_name_en': names['en'],
            'utilization_rate': round(utilization, 2),
            'total_hours': round(cat_total_hours, 2),
            'scheduled_hours': round(total_scheduled, 2)
        })
    
    return EquipmentDashboardResponse(
        total_equipment=total_equipment,
        available_equipment=available_equipment,
        by_category=by_category,
        by_status=by_status,
        by_type=by_type,
        utilization_by_category=utilization_by_category,
        generated_at=datetime.now(timezone.utc)
    )


@router.get("/equipment-utilization", response_model=list[EquipmentUtilization])
def get_equipment_utilization(
    start_date: date = Query(default_factory=lambda: date.today() - timedelta(days=7)),
    end_date: date = Query(default_factory=date.today),
    laboratory_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get equipment utilization statistics for a date range."""
    equipment_query = db.query(Equipment).filter(Equipment.is_active == True)
    if laboratory_id:
        equipment_query = equipment_query.filter(Equipment.laboratory_id == laboratory_id)
    
    equipment_list = equipment_query.all()
    
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())
    total_hours = (end_dt - start_dt).total_seconds() / 3600
    
    results = []
    for eq in equipment_list:
        # Get scheduled hours for this equipment
        schedules = db.query(EquipmentSchedule).filter(
            EquipmentSchedule.equipment_id == eq.id,
            EquipmentSchedule.start_time >= start_dt,
            EquipmentSchedule.end_time <= end_dt,
            EquipmentSchedule.status.in_(["scheduled", "in_progress", "completed"])
        ).all()
        
        scheduled_hours = sum(
            (min(s.end_time, end_dt) - max(s.start_time, start_dt)).total_seconds() / 3600
            for s in schedules
        )
        
        utilization = (scheduled_hours / total_hours * 100) if total_hours > 0 else 0
        
        results.append(EquipmentUtilization(
            equipment_id=eq.id,
            equipment_name=eq.name,
            equipment_type=eq.equipment_type.value,
            total_hours=total_hours,
            scheduled_hours=scheduled_hours,
            utilization_rate=round(utilization, 2)
        ))
    
    return sorted(results, key=lambda x: x.utilization_rate, reverse=True)


@router.get("/personnel-efficiency", response_model=list[PersonnelEfficiency])
def get_personnel_efficiency(
    start_date: date = Query(default_factory=lambda: date.today() - timedelta(days=30)),
    end_date: date = Query(default_factory=date.today),
    laboratory_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get personnel efficiency statistics for a date range."""
    personnel_query = db.query(Personnel)
    if laboratory_id:
        personnel_query = personnel_query.filter(Personnel.primary_laboratory_id == laboratory_id)
    
    personnel_list = personnel_query.all()
    
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())
    
    results = []
    for p in personnel_list:
        # Get tasks assigned to this person
        tasks = db.query(WorkOrderTask).filter(
            WorkOrderTask.assigned_technician_id == p.id,
            WorkOrderTask.created_at >= start_dt,
            WorkOrderTask.created_at <= end_dt
        ).all()
        
        total_tasks = len(tasks)
        completed_tasks = sum(1 for t in tasks if t.status == TaskStatus.COMPLETED)
        
        # Calculate cycle variance
        variances = []
        for t in tasks:
            if t.status == TaskStatus.COMPLETED and t.standard_cycle_hours and t.actual_cycle_hours:
                variances.append(t.actual_cycle_hours - t.standard_cycle_hours)
        
        avg_variance = sum(variances) / len(variances) if variances else None
        efficiency = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 100
        
        results.append(PersonnelEfficiency(
            personnel_id=p.id,
            employee_id=p.employee_id,
            total_tasks=total_tasks,
            completed_tasks=completed_tasks,
            average_cycle_variance=round(avg_variance, 2) if avg_variance else None,
            efficiency_rate=round(efficiency, 2)
        ))
    
    return sorted(results, key=lambda x: x.efficiency_rate, reverse=True)


@router.get("/task-completion", response_model=TaskCompletionStats)
def get_task_completion_stats(
    start_date: date = Query(default_factory=lambda: date.today() - timedelta(days=30)),
    end_date: date = Query(default_factory=date.today),
    laboratory_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get task completion statistics for a date range."""
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())
    
    query = db.query(WorkOrderTask).filter(
        WorkOrderTask.created_at >= start_dt,
        WorkOrderTask.created_at <= end_dt
    )
    
    if laboratory_id:
        query = query.join(WorkOrder).filter(WorkOrder.laboratory_id == laboratory_id)
    
    tasks = query.all()
    
    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == TaskStatus.COMPLETED)
    
    on_time = 0
    delayed = 0
    for t in tasks:
        if t.status == TaskStatus.COMPLETED and t.standard_cycle_hours and t.actual_cycle_hours:
            if t.actual_cycle_hours <= t.standard_cycle_hours * 1.1:  # 10% tolerance
                on_time += 1
            else:
                delayed += 1
    
    return TaskCompletionStats(
        total_tasks=total,
        completed_tasks=completed,
        on_time_tasks=on_time,
        delayed_tasks=delayed,
        completion_rate=round(completed / total * 100, 2) if total > 0 else 0,
        on_time_rate=round(on_time / completed * 100, 2) if completed > 0 else 0
    )


@router.get("/sla-performance", response_model=SLAPerformance)
def get_sla_performance(
    start_date: date = Query(default_factory=lambda: date.today() - timedelta(days=30)),
    end_date: date = Query(default_factory=date.today),
    laboratory_id: Optional[int] = None,
    client_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get SLA performance statistics for a date range."""
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time())
    
    query = db.query(WorkOrder).filter(
        WorkOrder.created_at >= start_dt,
        WorkOrder.created_at <= end_dt,
        WorkOrder.sla_deadline.isnot(None)
    )
    
    if laboratory_id:
        query = query.filter(WorkOrder.laboratory_id == laboratory_id)
    if client_id:
        query = query.filter(WorkOrder.client_id == client_id)
    
    work_orders = query.all()
    
    total = len(work_orders)
    on_time = 0
    overdue = 0
    completion_days = []
    
    for wo in work_orders:
        if wo.status == WorkOrderStatus.COMPLETED:
            if wo.completed_at and wo.sla_deadline:
                if wo.completed_at <= wo.sla_deadline:
                    on_time += 1
                else:
                    overdue += 1
                # Calculate days to complete
                if wo.created_at:
                    days = (wo.completed_at - wo.created_at).total_seconds() / 86400
                    completion_days.append(days)
        elif wo.status not in [WorkOrderStatus.CANCELLED]:
            # Check if currently overdue
            if wo.sla_deadline:
                # Handle timezone-naive datetime from database
                deadline = wo.sla_deadline
                if deadline.tzinfo is None:
                    deadline = deadline.replace(tzinfo=timezone.utc)
                if datetime.now(timezone.utc) > deadline:
                    overdue += 1
    
    avg_days = sum(completion_days) / len(completion_days) if completion_days else None
    
    return SLAPerformance(
        total_work_orders=total,
        on_time_count=on_time,
        overdue_count=overdue,
        sla_compliance_rate=round(on_time / total * 100, 2) if total > 0 else 100,
        average_days_to_complete=round(avg_days, 2) if avg_days else None
    )


@router.get("/workload-analysis", response_model=list[WorkloadAnalysis])
def get_workload_analysis(
    start_date: date = Query(default_factory=lambda: date.today() - timedelta(days=7)),
    end_date: date = Query(default_factory=date.today),
    laboratory_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get daily workload analysis for a date range."""
    results = []
    current = start_date
    
    while current <= end_date:
        day_start = datetime.combine(current, datetime.min.time())
        day_end = datetime.combine(current, datetime.max.time())
        
        # Get tasks completed on this day
        task_query = db.query(WorkOrderTask).filter(
            WorkOrderTask.completed_at >= day_start,
            WorkOrderTask.completed_at <= day_end
        )
        
        if laboratory_id:
            task_query = task_query.join(WorkOrder).filter(WorkOrder.laboratory_id == laboratory_id)
        
        completed_tasks = task_query.all()
        
        total_hours = sum(t.actual_cycle_hours or 0 for t in completed_tasks)
        
        # Get unique personnel who worked on tasks
        personnel_ids = set(t.assigned_technician_id for t in completed_tasks if t.assigned_technician_id)
        
        results.append(WorkloadAnalysis(
            date=current,
            total_work_hours=round(total_hours, 2),
            personnel_count=len(personnel_ids),
            average_hours_per_person=round(total_hours / len(personnel_ids), 2) if personnel_ids else 0,
            tasks_completed=len(completed_tasks)
        ))
        
        current += timedelta(days=1)
    
    return results


@router.get("", response_model=DashboardResponse)
def get_full_dashboard(
    laboratory_id: Optional[int] = None,
    site_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get complete dashboard with all statistics."""
    summary = get_dashboard_summary(laboratory_id, site_id, db, current_user)
    equipment_util = get_equipment_utilization(
        start_date=date.today() - timedelta(days=7),
        end_date=date.today(),
        laboratory_id=laboratory_id,
        db=db,
        current_user=current_user
    )
    personnel_eff = get_personnel_efficiency(
        start_date=date.today() - timedelta(days=30),
        end_date=date.today(),
        laboratory_id=laboratory_id,
        db=db,
        current_user=current_user
    )
    task_stats = get_task_completion_stats(
        start_date=date.today() - timedelta(days=30),
        end_date=date.today(),
        laboratory_id=laboratory_id,
        db=db,
        current_user=current_user
    )
    sla_perf = get_sla_performance(
        start_date=date.today() - timedelta(days=30),
        end_date=date.today(),
        laboratory_id=laboratory_id,
        db=db,
        current_user=current_user
    )
    
    return DashboardResponse(
        summary=summary,
        equipment_utilization=equipment_util[:10],  # Top 10
        personnel_efficiency=personnel_eff[:10],  # Top 10
        task_completion=task_stats,
        sla_performance=sla_perf,
        generated_at=datetime.now(timezone.utc)
    )

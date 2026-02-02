"""
Report generation API endpoints for PDF and other export formats.
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models.work_order import WorkOrder, WorkOrderTask, WorkOrderType, WorkOrderStatus
from app.models.personnel import Personnel
from app.models.equipment import Equipment, EquipmentStatus
from app.services.pdf_service import PDFReportService
from app.api.deps import get_current_active_user
from app.models.user import User

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/work-orders/pdf")
def export_work_orders_pdf(
    laboratory_id: Optional[int] = None,
    work_order_type: Optional[WorkOrderType] = None,
    status_filter: Optional[WorkOrderStatus] = Query(None, alias="status"),
    client_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Export work orders list as PDF report."""
    query = db.query(WorkOrder).options(
        joinedload(WorkOrder.client),
        joinedload(WorkOrder.laboratory),
        joinedload(WorkOrder.assigned_engineer)
    )
    
    filters = []
    if laboratory_id:
        query = query.filter(WorkOrder.laboratory_id == laboratory_id)
        filters.append(f"Lab ID: {laboratory_id}")
    if work_order_type:
        query = query.filter(WorkOrder.work_order_type == work_order_type)
        filters.append(f"Type: {work_order_type.value}")
    if status_filter:
        query = query.filter(WorkOrder.status == status_filter)
        filters.append(f"Status: {status_filter.value}")
    if client_id:
        query = query.filter(WorkOrder.client_id == client_id)
        filters.append(f"Client ID: {client_id}")
    if start_date:
        query = query.filter(WorkOrder.created_at >= start_date)
        filters.append(f"From: {start_date.strftime('%Y-%m-%d')}")
    if end_date:
        query = query.filter(WorkOrder.created_at <= end_date)
        filters.append(f"To: {end_date.strftime('%Y-%m-%d')}")
    
    work_orders = query.order_by(WorkOrder.created_at.desc()).limit(500).all()
    
    if not work_orders:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No work orders found")
    
    filters_desc = " | ".join(filters) if filters else "All work orders"
    pdf_buffer = PDFReportService.generate_work_orders_list_report(
        work_orders, 
        title="Work Orders Report",
        filters_description=filters_desc
    )
    
    filename = f"work_orders_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/work-orders/{work_order_id}/pdf")
def export_work_order_detail_pdf(
    work_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Export a single work order detail as PDF report."""
    work_order = db.query(WorkOrder).options(
        joinedload(WorkOrder.client),
        joinedload(WorkOrder.laboratory),
        joinedload(WorkOrder.site),
        joinedload(WorkOrder.assigned_engineer)
    ).filter(WorkOrder.id == work_order_id).first()
    
    if not work_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")
    
    tasks = db.query(WorkOrderTask).options(
        joinedload(WorkOrderTask.assigned_technician).joinedload(Personnel.user),
        joinedload(WorkOrderTask.method)
    ).filter(WorkOrderTask.work_order_id == work_order_id).order_by(WorkOrderTask.sequence).all()
    
    pdf_buffer = PDFReportService.generate_work_order_report(work_order, tasks)
    
    filename = f"work_order_{work_order.order_number}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/personnel/pdf")
def export_personnel_pdf(
    laboratory_id: Optional[int] = None,
    site_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Export personnel list as PDF report."""
    query = db.query(Personnel).options(
        joinedload(Personnel.user),
        joinedload(Personnel.primary_laboratory),
        joinedload(Personnel.primary_site)
    )
    
    if laboratory_id:
        query = query.filter(Personnel.primary_laboratory_id == laboratory_id)
    if site_id:
        query = query.filter(Personnel.primary_site_id == site_id)
    if status_filter:
        query = query.filter(Personnel.status == status_filter)
    
    personnel_list = query.order_by(Personnel.employee_id).limit(500).all()
    
    if not personnel_list:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No personnel found")
    
    pdf_buffer = PDFReportService.generate_personnel_report(personnel_list)
    
    filename = f"personnel_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/equipment/pdf")
def export_equipment_pdf(
    laboratory_id: Optional[int] = None,
    site_id: Optional[int] = None,
    status_filter: Optional[EquipmentStatus] = Query(None, alias="status"),
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Export equipment list as PDF report."""
    query = db.query(Equipment).options(
        joinedload(Equipment.laboratory),
        joinedload(Equipment.site)
    ).filter(Equipment.is_active == True)
    
    if laboratory_id:
        query = query.filter(Equipment.laboratory_id == laboratory_id)
    if site_id:
        query = query.filter(Equipment.site_id == site_id)
    if status_filter:
        query = query.filter(Equipment.status == status_filter)
    if category:
        query = query.filter(Equipment.category == category)
    
    equipment_list = query.order_by(Equipment.code).limit(500).all()
    
    if not equipment_list:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No equipment found")
    
    pdf_buffer = PDFReportService.generate_equipment_report(equipment_list)
    
    filename = f"equipment_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

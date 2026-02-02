"""
Audit Log API endpoints.
Provides endpoints for querying audit logs (read-only).
"""
from typing import Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.audit_log import AuditLog, AuditAction
from app.models.user import User
from app.schemas.audit_log import AuditLogResponse, AuditLogListResponse
from app.api.deps import get_current_active_user, require_manager_or_above

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=AuditLogListResponse)
def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    laboratory_id: Optional[int] = None,
    site_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """
    List audit logs with filtering and pagination.
    Requires manager or above role.
    """
    query = db.query(AuditLog)
    
    # Apply filters
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)
    if laboratory_id:
        query = query.filter(AuditLog.laboratory_id == laboratory_id)
    if site_id:
        query = query.filter(AuditLog.site_id == site_id)
    if start_date:
        query = query.filter(AuditLog.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.filter(AuditLog.created_at <= datetime.combine(end_date, datetime.max.time()))
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (AuditLog.username.ilike(search_pattern)) |
            (AuditLog.entity_name.ilike(search_pattern)) |
            (AuditLog.description.ilike(search_pattern))
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    offset = (page - 1) * page_size
    logs = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(page_size).all()
    
    return AuditLogListResponse(
        items=[AuditLogResponse.model_validate(log) for log in logs],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/actions", response_model=list[str])
def get_audit_actions(
    current_user: User = Depends(require_manager_or_above)
):
    """Get list of available audit action types."""
    return [action.value for action in AuditAction]


@router.get("/entity-types", response_model=list[str])
def get_entity_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Get list of entity types that have been logged."""
    result = db.query(AuditLog.entity_type).distinct().all()
    return sorted([r[0] for r in result if r[0]])


@router.get("/{audit_log_id}", response_model=AuditLogResponse)
def get_audit_log(
    audit_log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Get a specific audit log entry by ID."""
    log = db.query(AuditLog).filter(AuditLog.id == audit_log_id).first()
    if not log:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audit log not found")
    return AuditLogResponse.model_validate(log)


@router.get("/entity/{entity_type}/{entity_id}", response_model=list[AuditLogResponse])
def get_entity_audit_logs(
    entity_type: str,
    entity_id: int,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get audit logs for a specific entity."""
    logs = db.query(AuditLog).filter(
        AuditLog.entity_type == entity_type,
        AuditLog.entity_id == entity_id
    ).order_by(desc(AuditLog.created_at)).limit(limit).all()
    
    return [AuditLogResponse.model_validate(log) for log in logs]

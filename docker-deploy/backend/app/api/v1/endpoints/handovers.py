"""
交接班管理API端点 - Handover Management API Endpoints

本模块提供任务交接班的API接口，处理技术员在班次交替时的任务交接。
支持交接发起、接收、拒绝以及交接备注的管理。

API端点列表:

交接班操作:
- GET /handovers: 分页获取交接班列表
    - 支持按状态、优先级、实验室筛选
    - 支持按交出/接收人员筛选
- GET /handovers/{handover_id}: 获取单个交接班详情
- POST /handovers: 发起新的交接班
- PUT /handovers/{handover_id}: 更新交接班信息
- POST /handovers/{handover_id}/accept: 接收交接班
- POST /handovers/{handover_id}/reject: 拒绝交接班
- DELETE /handovers/{handover_id}: 取消交接班

交接备注:
- GET /handovers/{handover_id}/notes: 获取交接班备注列表
- POST /handovers/{handover_id}/notes: 添加交接班备注

我的交接班:
- GET /handovers/my/outgoing: 获取我发起的交接班
- GET /handovers/my/incoming: 获取需要我接收的交接班

交接班状态:
- PENDING: 待接收
- ACCEPTED: 已接收
- REJECTED: 已拒绝
- CANCELLED: 已取消

优先级:
- LOW: 低优先级
- MEDIUM: 中优先级
- HIGH: 高优先级
- URGENT: 紧急

权限要求:
- 查询操作：所有已登录用户
- 发起交接：任务当前执行人
- 接收/拒绝：交接目标人员

业务规则:
- 只能交接自己负责的任务
- 交接必须指定接收人和班次
- 拒绝时必须填写拒绝原因
- 交接成功后任务自动分配给新技术员
"""
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.core.database import get_db
from app.models.handover import TaskHandover, HandoverNote, HandoverStatus, HandoverPriority
from app.models.work_order import WorkOrderTask, WorkOrder
from app.models.personnel import Personnel
from app.models.shift import Shift
from app.models.user import User
from app.schemas.handover import (
    HandoverCreate, HandoverUpdate, HandoverAccept, HandoverReject,
    HandoverResponse, HandoverListResponse,
    HandoverNoteCreate, HandoverNoteResponse,
    PersonnelBrief, TaskBrief, WorkOrderBrief, ShiftBrief
)
from app.api.deps import get_current_active_user, require_manager_or_above

router = APIRouter(prefix="/handovers", tags=["Handovers"])


def get_personnel_for_user(db: Session, user: User) -> Optional[Personnel]:
    """Get personnel record for current user."""
    return db.query(Personnel).filter(Personnel.user_id == user.id).first()


def build_handover_response(handover: TaskHandover) -> HandoverResponse:
    """Build a complete handover response with related entities."""
    return HandoverResponse(
        id=handover.id,
        task_id=handover.task_id,
        work_order_id=handover.work_order_id,
        from_technician_id=handover.from_technician_id,
        to_technician_id=handover.to_technician_id,
        from_shift_id=handover.from_shift_id,
        to_shift_id=handover.to_shift_id,
        status=handover.status,
        priority=handover.priority,
        task_status_at_handover=handover.task_status_at_handover,
        progress_summary=handover.progress_summary,
        pending_items=handover.pending_items,
        special_instructions=handover.special_instructions,
        rejection_reason=handover.rejection_reason,
        acceptance_notes=handover.acceptance_notes,
        created_at=handover.created_at,
        accepted_at=handover.accepted_at,
        rejected_at=handover.rejected_at,
        task=TaskBrief(
            id=handover.task.id,
            task_number=handover.task.task_number,
            title=handover.task.title,
            status=handover.task.status.value
        ) if handover.task else None,
        work_order=WorkOrderBrief(
            id=handover.work_order.id,
            order_number=handover.work_order.order_number,
            title=handover.work_order.title
        ) if handover.work_order else None,
        from_technician=PersonnelBrief(
            id=handover.from_technician.id,
            employee_id=handover.from_technician.employee_id,
            name=handover.from_technician.user.full_name or handover.from_technician.user.username,
            job_title=handover.from_technician.job_title
        ) if handover.from_technician else None,
        to_technician=PersonnelBrief(
            id=handover.to_technician.id,
            employee_id=handover.to_technician.employee_id,
            name=handover.to_technician.user.full_name or handover.to_technician.user.username,
            job_title=handover.to_technician.job_title
        ) if handover.to_technician else None,
        from_shift=ShiftBrief(
            id=handover.from_shift.id,
            name=handover.from_shift.name,
            code=handover.from_shift.code
        ) if handover.from_shift else None,
        to_shift=ShiftBrief(
            id=handover.to_shift.id,
            name=handover.to_shift.name,
            code=handover.to_shift.code
        ) if handover.to_shift else None,
        notes=[HandoverNoteResponse.model_validate(note) for note in handover.notes]
    )


@router.get("", response_model=HandoverListResponse)
def list_handovers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[HandoverStatus] = Query(None, alias="status"),
    priority: Optional[HandoverPriority] = None,
    from_technician_id: Optional[int] = None,
    to_technician_id: Optional[int] = None,
    work_order_id: Optional[int] = None,
    my_incoming: bool = Query(False, description="Show only handovers incoming to current user"),
    my_outgoing: bool = Query(False, description="Show only handovers from current user"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List handovers with pagination and filtering."""
    query = db.query(TaskHandover).options(
        joinedload(TaskHandover.task),
        joinedload(TaskHandover.work_order),
        joinedload(TaskHandover.from_technician).joinedload(Personnel.user),
        joinedload(TaskHandover.to_technician).joinedload(Personnel.user),
        joinedload(TaskHandover.from_shift),
        joinedload(TaskHandover.to_shift),
        joinedload(TaskHandover.notes)
    )
    
    # Get current user's personnel record for my_* filters
    if my_incoming or my_outgoing:
        personnel = get_personnel_for_user(db, current_user)
        if not personnel:
            return HandoverListResponse(items=[], total=0, page=page, page_size=page_size)
        
        if my_incoming:
            query = query.filter(TaskHandover.to_technician_id == personnel.id)
        if my_outgoing:
            query = query.filter(TaskHandover.from_technician_id == personnel.id)
    
    if status_filter:
        query = query.filter(TaskHandover.status == status_filter)
    if priority:
        query = query.filter(TaskHandover.priority == priority)
    if from_technician_id:
        query = query.filter(TaskHandover.from_technician_id == from_technician_id)
    if to_technician_id:
        query = query.filter(TaskHandover.to_technician_id == to_technician_id)
    if work_order_id:
        query = query.filter(TaskHandover.work_order_id == work_order_id)
    
    total = query.count()
    offset = (page - 1) * page_size
    handovers = query.order_by(TaskHandover.created_at.desc()).offset(offset).limit(page_size).all()
    
    return HandoverListResponse(
        items=[build_handover_response(h) for h in handovers],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/pending", response_model=list[HandoverResponse])
def get_pending_handovers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get pending handovers for the current user (incoming)."""
    personnel = get_personnel_for_user(db, current_user)
    if not personnel:
        return []
    
    handovers = db.query(TaskHandover).options(
        joinedload(TaskHandover.task),
        joinedload(TaskHandover.work_order),
        joinedload(TaskHandover.from_technician).joinedload(Personnel.user),
        joinedload(TaskHandover.to_technician).joinedload(Personnel.user),
        joinedload(TaskHandover.from_shift),
        joinedload(TaskHandover.to_shift),
        joinedload(TaskHandover.notes)
    ).filter(
        TaskHandover.to_technician_id == personnel.id,
        TaskHandover.status == HandoverStatus.PENDING
    ).order_by(
        TaskHandover.priority.desc(),
        TaskHandover.created_at.asc()
    ).all()
    
    return [build_handover_response(h) for h in handovers]


@router.get("/{handover_id}", response_model=HandoverResponse)
def get_handover(
    handover_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific handover by ID."""
    handover = db.query(TaskHandover).options(
        joinedload(TaskHandover.task),
        joinedload(TaskHandover.work_order),
        joinedload(TaskHandover.from_technician).joinedload(Personnel.user),
        joinedload(TaskHandover.to_technician).joinedload(Personnel.user),
        joinedload(TaskHandover.from_shift),
        joinedload(TaskHandover.to_shift),
        joinedload(TaskHandover.notes).joinedload(HandoverNote.author).joinedload(Personnel.user)
    ).filter(TaskHandover.id == handover_id).first()
    
    if not handover:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handover not found")
    
    return build_handover_response(handover)


@router.post("", response_model=HandoverResponse, status_code=status.HTTP_201_CREATED)
def create_handover(
    data: HandoverCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new handover for a task."""
    # Get current user's personnel record
    personnel = get_personnel_for_user(db, current_user)
    if not personnel:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not registered as personnel")
    
    # Verify task exists and is assigned to current user
    task = db.query(WorkOrderTask).filter(WorkOrderTask.id == data.task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    
    if task.assigned_technician_id != personnel.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only hand over tasks assigned to you")
    
    # Check for existing pending handover for this task
    existing = db.query(TaskHandover).filter(
        TaskHandover.task_id == data.task_id,
        TaskHandover.status == HandoverStatus.PENDING
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task already has a pending handover")
    
    # Verify to_technician if provided
    if data.to_technician_id:
        to_tech = db.query(Personnel).filter(Personnel.id == data.to_technician_id).first()
        if not to_tech:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target technician not found")
    
    # Create handover
    handover = TaskHandover(
        task_id=data.task_id,
        work_order_id=task.work_order_id,
        from_technician_id=personnel.id,
        to_technician_id=data.to_technician_id,
        from_shift_id=data.from_shift_id,
        to_shift_id=data.to_shift_id,
        priority=data.priority,
        task_status_at_handover=task.status.value,
        progress_summary=data.progress_summary,
        pending_items=data.pending_items,
        special_instructions=data.special_instructions,
        status=HandoverStatus.PENDING
    )
    
    db.add(handover)
    db.commit()
    db.refresh(handover)
    
    # Reload with relationships
    handover = db.query(TaskHandover).options(
        joinedload(TaskHandover.task),
        joinedload(TaskHandover.work_order),
        joinedload(TaskHandover.from_technician).joinedload(Personnel.user),
        joinedload(TaskHandover.to_technician).joinedload(Personnel.user),
        joinedload(TaskHandover.from_shift),
        joinedload(TaskHandover.to_shift),
        joinedload(TaskHandover.notes)
    ).filter(TaskHandover.id == handover.id).first()
    
    return build_handover_response(handover)


@router.put("/{handover_id}", response_model=HandoverResponse)
def update_handover(
    handover_id: int,
    data: HandoverUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a pending handover."""
    personnel = get_personnel_for_user(db, current_user)
    
    handover = db.query(TaskHandover).filter(TaskHandover.id == handover_id).first()
    if not handover:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handover not found")
    
    if handover.status != HandoverStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only update pending handovers")
    
    if personnel and handover.from_technician_id != personnel.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only update your own handovers")
    
    update_data = data.model_dump(exclude_unset=True)
    
    if "to_technician_id" in update_data and update_data["to_technician_id"]:
        to_tech = db.query(Personnel).filter(Personnel.id == update_data["to_technician_id"]).first()
        if not to_tech:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target technician not found")
    
    for field, value in update_data.items():
        setattr(handover, field, value)
    
    db.commit()
    db.refresh(handover)
    
    # Reload with relationships
    handover = db.query(TaskHandover).options(
        joinedload(TaskHandover.task),
        joinedload(TaskHandover.work_order),
        joinedload(TaskHandover.from_technician).joinedload(Personnel.user),
        joinedload(TaskHandover.to_technician).joinedload(Personnel.user),
        joinedload(TaskHandover.from_shift),
        joinedload(TaskHandover.to_shift),
        joinedload(TaskHandover.notes)
    ).filter(TaskHandover.id == handover.id).first()
    
    return build_handover_response(handover)


@router.post("/{handover_id}/accept", response_model=HandoverResponse)
def accept_handover(
    handover_id: int,
    data: HandoverAccept,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Accept a handover and take ownership of the task."""
    personnel = get_personnel_for_user(db, current_user)
    if not personnel:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not registered as personnel")
    
    handover = db.query(TaskHandover).options(
        joinedload(TaskHandover.task)
    ).filter(TaskHandover.id == handover_id).first()
    
    if not handover:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handover not found")
    
    if handover.status != HandoverStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Handover is not pending")
    
    # Check if handover is assigned to current user, or if unassigned allow any technician
    if handover.to_technician_id and handover.to_technician_id != personnel.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Handover is not assigned to you")
    
    # Update handover status
    handover.status = HandoverStatus.ACCEPTED
    handover.to_technician_id = personnel.id  # Assign if not already
    handover.acceptance_notes = data.acceptance_notes
    handover.accepted_at = datetime.now(timezone.utc)
    
    # Transfer task ownership
    task = handover.task
    task.assigned_technician_id = personnel.id
    task.assigned_at = datetime.now(timezone.utc)
    
    db.commit()
    
    # Reload with relationships
    handover = db.query(TaskHandover).options(
        joinedload(TaskHandover.task),
        joinedload(TaskHandover.work_order),
        joinedload(TaskHandover.from_technician).joinedload(Personnel.user),
        joinedload(TaskHandover.to_technician).joinedload(Personnel.user),
        joinedload(TaskHandover.from_shift),
        joinedload(TaskHandover.to_shift),
        joinedload(TaskHandover.notes)
    ).filter(TaskHandover.id == handover.id).first()
    
    return build_handover_response(handover)


@router.post("/{handover_id}/reject", response_model=HandoverResponse)
def reject_handover(
    handover_id: int,
    data: HandoverReject,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Reject a handover with a reason."""
    personnel = get_personnel_for_user(db, current_user)
    if not personnel:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not registered as personnel")
    
    handover = db.query(TaskHandover).filter(TaskHandover.id == handover_id).first()
    if not handover:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handover not found")
    
    if handover.status != HandoverStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Handover is not pending")
    
    if handover.to_technician_id and handover.to_technician_id != personnel.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Handover is not assigned to you")
    
    handover.status = HandoverStatus.REJECTED
    handover.rejection_reason = data.rejection_reason
    handover.rejected_at = datetime.now(timezone.utc)
    
    db.commit()
    
    # Reload with relationships
    handover = db.query(TaskHandover).options(
        joinedload(TaskHandover.task),
        joinedload(TaskHandover.work_order),
        joinedload(TaskHandover.from_technician).joinedload(Personnel.user),
        joinedload(TaskHandover.to_technician).joinedload(Personnel.user),
        joinedload(TaskHandover.from_shift),
        joinedload(TaskHandover.to_shift),
        joinedload(TaskHandover.notes)
    ).filter(TaskHandover.id == handover.id).first()
    
    return build_handover_response(handover)


@router.post("/{handover_id}/cancel", response_model=HandoverResponse)
def cancel_handover(
    handover_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Cancel a pending handover (by the original technician)."""
    personnel = get_personnel_for_user(db, current_user)
    
    handover = db.query(TaskHandover).filter(TaskHandover.id == handover_id).first()
    if not handover:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handover not found")
    
    if handover.status != HandoverStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only cancel pending handovers")
    
    if personnel and handover.from_technician_id != personnel.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only cancel your own handovers")
    
    handover.status = HandoverStatus.CANCELLED
    
    db.commit()
    
    # Reload with relationships
    handover = db.query(TaskHandover).options(
        joinedload(TaskHandover.task),
        joinedload(TaskHandover.work_order),
        joinedload(TaskHandover.from_technician).joinedload(Personnel.user),
        joinedload(TaskHandover.to_technician).joinedload(Personnel.user),
        joinedload(TaskHandover.from_shift),
        joinedload(TaskHandover.to_shift),
        joinedload(TaskHandover.notes)
    ).filter(TaskHandover.id == handover.id).first()
    
    return build_handover_response(handover)


# Handover notes endpoints
@router.post("/{handover_id}/notes", response_model=HandoverNoteResponse, status_code=status.HTTP_201_CREATED)
def add_handover_note(
    handover_id: int,
    data: HandoverNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a note to a handover."""
    personnel = get_personnel_for_user(db, current_user)
    if not personnel:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not registered as personnel")
    
    handover = db.query(TaskHandover).filter(TaskHandover.id == handover_id).first()
    if not handover:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Handover not found")
    
    note = HandoverNote(
        handover_id=handover_id,
        author_id=personnel.id,
        content=data.content,
        is_important=data.is_important
    )
    
    db.add(note)
    db.commit()
    db.refresh(note)
    
    # Load author relationship
    note = db.query(HandoverNote).options(
        joinedload(HandoverNote.author).joinedload(Personnel.user)
    ).filter(HandoverNote.id == note.id).first()
    
    return HandoverNoteResponse(
        id=note.id,
        handover_id=note.handover_id,
        author_id=note.author_id,
        content=note.content,
        is_important=note.is_important,
        created_at=note.created_at,
        author=PersonnelBrief(
            id=note.author.id,
            employee_id=note.author.employee_id,
            name=note.author.user.full_name or note.author.user.username,
            job_title=note.author.job_title
        ) if note.author else None
    )

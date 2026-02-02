"""
人员管理API端点 - Personnel Management API Endpoints

本模块提供人员管理的API接口，包括人员信息管理、技能匹配、借调管理和CSV导出功能。
人员是与用户账号关联的扩展信息，包含工号、职位、主实验室等。

API端点列表:
- GET /personnel: 分页获取人员列表，支持按实验室、站点、状态筛选
- GET /personnel/find-by-skills: 根据技能要求查找符合条件的人员
- GET /personnel/{personnel_id}: 获取单个人员详情
- POST /personnel: 创建人员记录（需要Manager及以上权限）
- PUT /personnel/{personnel_id}: 更新人员信息（需要Manager及以上权限）
- DELETE /personnel/{personnel_id}: 删除人员记录（需要Manager及以上权限）
- POST /personnel/borrow-requests: 创建借调申请（需要Engineer及以上权限）
- GET /personnel/borrow-requests/: 获取借调申请列表
- POST /personnel/borrow-requests/{request_id}/approve: 审批借调申请（需要Manager及以上权限）
- GET /personnel/export/csv: 导出人员列表为CSV文件（需要Manager及以上权限）

权限要求:
- 查询操作：所有已登录用户
- 人员管理：Manager及以上角色
- 借调申请：Engineer及以上角色
- 借调审批：Manager及以上角色
- CSV导出：Manager及以上角色

业务规则:
- 员工工号必须唯一
- 一个用户只能有一条人员记录
- 必须关联有效的实验室和站点
- 借调审批后会更新人员的当前实验室
"""
from typing import Optional
from datetime import datetime, timezone, timedelta
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models.personnel import Personnel, PersonnelStatus, StaffBorrowRequest
from app.models.laboratory import Laboratory
from app.models.site import Site
from app.models.user import User
from app.schemas.personnel import (
    PersonnelCreate, PersonnelUpdate, PersonnelResponse, PersonnelDetailResponse,
    PersonnelListResponse, StaffBorrowRequestCreate, StaffBorrowRequestUpdate,
    StaffBorrowRequestApproval, StaffBorrowRequestResponse, StaffBorrowRequestListResponse
)
from app.api.deps import get_current_active_user, require_manager_or_above, require_engineer_or_above

router = APIRouter(prefix="/personnel", tags=["Personnel"])


@router.get("", response_model=PersonnelListResponse)
def list_personnel(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    laboratory_id: Optional[int] = None,
    site_id: Optional[int] = None,
    status_filter: Optional[PersonnelStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all personnel with pagination and filtering."""
    query = db.query(Personnel).options(
        joinedload(Personnel.user),
        joinedload(Personnel.primary_laboratory),
        joinedload(Personnel.primary_site)
    )
    
    # Apply filters
    if search:
        query = query.filter(
            (Personnel.employee_id.ilike(f"%{search}%")) |
            (Personnel.job_title.ilike(f"%{search}%"))
        )
    if laboratory_id:
        query = query.filter(Personnel.primary_laboratory_id == laboratory_id)
    if site_id:
        query = query.filter(Personnel.primary_site_id == site_id)
    if status_filter:
        query = query.filter(Personnel.status == status_filter)
    
    # Get total count (without joinedload for efficiency)
    count_query = db.query(Personnel)
    if search:
        count_query = count_query.filter(
            (Personnel.employee_id.ilike(f"%{search}%")) |
            (Personnel.job_title.ilike(f"%{search}%"))
        )
    if laboratory_id:
        count_query = count_query.filter(Personnel.primary_laboratory_id == laboratory_id)
    if site_id:
        count_query = count_query.filter(Personnel.primary_site_id == site_id)
    if status_filter:
        count_query = count_query.filter(Personnel.status == status_filter)
    total = count_query.count()
    
    offset = (page - 1) * page_size
    personnel_list = query.order_by(Personnel.employee_id).offset(offset).limit(page_size).all()
    
    return PersonnelListResponse(
        items=[PersonnelDetailResponse.model_validate(p) for p in personnel_list],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/find-by-skills", response_model=list[PersonnelDetailResponse])
def find_personnel_by_skills(
    skill_ids: str = Query(..., description="Comma-separated skill IDs"),
    min_proficiency: Optional[str] = Query(None, description="Minimum proficiency level"),
    require_certified: bool = Query(False, description="Require certification"),
    status_filter: Optional[PersonnelStatus] = Query(None, alias="status"),
    laboratory_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Find personnel who have all specified skills."""
    from app.services.skill_matching import find_personnel_by_skills as find_by_skills
    from app.models.skill import ProficiencyLevel
    
    # Parse skill IDs
    try:
        skill_id_list = [int(sid.strip()) for sid in skill_ids.split(",") if sid.strip()]
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid skill IDs")
    
    if not skill_id_list:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one skill ID required")
    
    # Parse proficiency level
    proficiency = None
    if min_proficiency:
        try:
            proficiency = ProficiencyLevel(min_proficiency.lower())
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid proficiency level")
    
    results = find_by_skills(
        db=db,
        skill_ids=skill_id_list,
        min_proficiency=proficiency,
        require_certified=require_certified,
        status=status_filter,
        laboratory_id=laboratory_id,
    )
    
    return [PersonnelDetailResponse.model_validate(r['personnel']) for r in results]


@router.get("/{personnel_id}", response_model=PersonnelDetailResponse)
def get_personnel(
    personnel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific personnel by ID with details."""
    personnel = db.query(Personnel).options(
        joinedload(Personnel.user),
        joinedload(Personnel.primary_laboratory),
        joinedload(Personnel.primary_site)
    ).filter(Personnel.id == personnel_id).first()
    
    if not personnel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personnel not found")
    
    return PersonnelDetailResponse.model_validate(personnel)


@router.post("", response_model=PersonnelResponse, status_code=status.HTTP_201_CREATED)
def create_personnel(
    data: PersonnelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Create new personnel. Requires manager or above role."""
    # Check if employee_id already exists
    existing = db.query(Personnel).filter(Personnel.employee_id == data.employee_id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee ID already exists")
    
    # Check if user already has personnel record
    existing = db.query(Personnel).filter(Personnel.user_id == data.user_id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already has personnel record")
    
    # Validate laboratory exists
    lab = db.query(Laboratory).filter(Laboratory.id == data.primary_laboratory_id).first()
    if not lab:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Laboratory not found")
    
    # Validate site exists
    site = db.query(Site).filter(Site.id == data.primary_site_id).first()
    if not site:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Site not found")
    
    personnel = Personnel(**data.model_dump())
    db.add(personnel)
    db.commit()
    db.refresh(personnel)
    
    return PersonnelResponse.model_validate(personnel)


@router.put("/{personnel_id}", response_model=PersonnelResponse)
def update_personnel(
    personnel_id: int,
    data: PersonnelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Update personnel. Requires manager or above role."""
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personnel not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Check employee_id uniqueness
    if "employee_id" in update_data and update_data["employee_id"] != personnel.employee_id:
        existing = db.query(Personnel).filter(Personnel.employee_id == update_data["employee_id"]).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employee ID already exists")
    
    for field, value in update_data.items():
        setattr(personnel, field, value)
    
    db.commit()
    db.refresh(personnel)
    
    return PersonnelResponse.model_validate(personnel)


@router.delete("/{personnel_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_personnel(
    personnel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Delete personnel. Requires manager or above role."""
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personnel not found")
    
    db.delete(personnel)
    db.commit()


# Staff borrowing endpoints
@router.post("/borrow-requests", response_model=StaffBorrowRequestResponse, status_code=status.HTTP_201_CREATED)
def create_borrow_request(
    data: StaffBorrowRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer_or_above)
):
    """Create a staff borrow request. Requires engineer or above role."""
    personnel = db.query(Personnel).options(
        joinedload(Personnel.user)
    ).filter(Personnel.id == data.personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personnel not found")
    
    to_lab = db.query(Laboratory).filter(Laboratory.id == data.to_laboratory_id).first()
    if not to_lab:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target laboratory not found")
    
    if data.start_date >= data.end_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End date must be after start date")
    
    request = StaffBorrowRequest(
        personnel_id=data.personnel_id,
        from_laboratory_id=personnel.primary_laboratory_id,
        to_laboratory_id=data.to_laboratory_id,
        reason=data.reason,
        start_date=data.start_date,
        end_date=data.end_date,
        requested_by_id=current_user.id
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    
    # Load relationships for response
    db.refresh(request, ["personnel", "from_laboratory", "to_laboratory"])
    
    return StaffBorrowRequestResponse.model_validate(request)


@router.get("/borrow-requests/", response_model=StaffBorrowRequestListResponse)
def list_borrow_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    laboratory_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List staff borrow requests with pagination."""
    query = db.query(StaffBorrowRequest).options(
        joinedload(StaffBorrowRequest.personnel).joinedload(Personnel.user),
        joinedload(StaffBorrowRequest.from_laboratory),
        joinedload(StaffBorrowRequest.to_laboratory)
    )
    
    if status_filter:
        query = query.filter(StaffBorrowRequest.status == status_filter)
    if laboratory_id:
        query = query.filter(
            (StaffBorrowRequest.from_laboratory_id == laboratory_id) |
            (StaffBorrowRequest.to_laboratory_id == laboratory_id)
        )
    
    total = query.count()
    offset = (page - 1) * page_size
    requests = query.order_by(StaffBorrowRequest.created_at.desc()).offset(offset).limit(page_size).all()
    
    return StaffBorrowRequestListResponse(
        items=[StaffBorrowRequestResponse.model_validate(r) for r in requests],
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/borrow-requests/{request_id}/approve", response_model=StaffBorrowRequestResponse)
def approve_borrow_request(
    request_id: int,
    approval: StaffBorrowRequestApproval,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Approve or reject a staff borrow request. Requires manager or above role."""
    request = db.query(StaffBorrowRequest).filter(StaffBorrowRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrow request not found")
    
    if request.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request is not pending")
    
    request.approved_by_id = current_user.id
    request.approved_at = datetime.now(timezone.utc)
    
    if approval.approved:
        request.status = "approved"
        # Update personnel status
        personnel = db.query(Personnel).filter(Personnel.id == request.personnel_id).first()
        if personnel:
            personnel.status = PersonnelStatus.BORROWED
            personnel.current_laboratory_id = request.to_laboratory_id
    else:
        request.status = "rejected"
        request.rejection_reason = approval.rejection_reason
    
    db.commit()
    db.refresh(request)
    
    return StaffBorrowRequestResponse.model_validate(request)


# Export endpoints
@router.get("/export/csv")
def export_personnel_csv(
    laboratory_id: Optional[int] = None,
    site_id: Optional[int] = None,
    status_filter: Optional[PersonnelStatus] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Export personnel list to CSV file. Requires manager or above role."""
    from app.models.skill import PersonnelSkill
    from app.models.work_order import WorkOrderTask, TaskStatus
    
    query = db.query(Personnel).options(
        joinedload(Personnel.user),
        joinedload(Personnel.primary_laboratory),
        joinedload(Personnel.primary_site),
        joinedload(Personnel.skills)
    )
    
    # Apply filters
    if laboratory_id:
        query = query.filter(Personnel.primary_laboratory_id == laboratory_id)
    if site_id:
        query = query.filter(Personnel.primary_site_id == site_id)
    if status_filter:
        query = query.filter(Personnel.status == status_filter)
    
    personnel_list = query.order_by(Personnel.employee_id).all()
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        '工号', '姓名', '职位', '状态', '主实验室', '主站点',
        '技能数量', '当前任务数', '邮箱', '入职日期'
    ])
    
    # Write data
    for p in personnel_list:
        # Get current task count
        task_count = db.query(WorkOrderTask).filter(
            WorkOrderTask.assigned_technician_id == p.id,
            WorkOrderTask.status.in_([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS])
        ).count()
        
        writer.writerow([
            p.employee_id,
            p.user.full_name if p.user else '',
            p.job_title or '',
            p.status.value if p.status else '',
            p.primary_laboratory.name if p.primary_laboratory else '',
            p.primary_site.name if p.primary_site else '',
            len(p.skills) if p.skills else 0,
            task_count,
            p.user.email if p.user else '',
            p.hire_date.strftime('%Y-%m-%d') if p.hire_date else '',
        ])
    
    output.seek(0)
    
    filename = f"personnel_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# Personnel scheduling Gantt chart endpoint
@router.get("/schedules/gantt")
def get_personnel_gantt_data(
    start_date: datetime,
    end_date: datetime,
    laboratory_id: Optional[int] = None,
    site_id: Optional[int] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    获取人员调度甘特图数据
    
    Get personnel schedules formatted for Gantt chart display.
    Returns personnel with their assigned tasks within the specified date range.
    """
    from app.models.work_order import WorkOrderTask, WorkOrder
    from app.models.user import UserRole
    
    # Build personnel query
    personnel_query = db.query(Personnel).options(
        joinedload(Personnel.user),
        joinedload(Personnel.primary_laboratory),
        joinedload(Personnel.primary_site)
    )
    
    if laboratory_id:
        personnel_query = personnel_query.filter(Personnel.primary_laboratory_id == laboratory_id)
    if site_id:
        personnel_query = personnel_query.filter(Personnel.primary_site_id == site_id)
    if department:
        personnel_query = personnel_query.filter(Personnel.department == department)
    
    personnel_list = personnel_query.order_by(Personnel.employee_id).all()
    personnel_ids = [p.id for p in personnel_list]
    
    # Get tasks assigned to these personnel within date range
    tasks = db.query(WorkOrderTask).options(
        joinedload(WorkOrderTask.work_order),
        joinedload(WorkOrderTask.scheduled_equipment)
    ).filter(
        WorkOrderTask.assigned_technician_id.in_(personnel_ids),
        # Task is within date range if: started before end AND (not completed OR completed after start)
        ((WorkOrderTask.started_at != None) & (WorkOrderTask.started_at <= end_date)) |
        ((WorkOrderTask.assigned_at != None) & (WorkOrderTask.assigned_at <= end_date))
    ).all()
    
    # Filter tasks that overlap with the date range
    filtered_tasks = []
    for task in tasks:
        task_start = task.started_at or task.assigned_at
        task_end = task.completed_at
        
        if task_start is None:
            continue
            
        # If not completed, estimate end based on standard hours or use end_date
        if task_end is None:
            if task.standard_cycle_hours:
                task_end = task_start + timedelta(hours=task.standard_cycle_hours)
            else:
                task_end = end_date
        
        # Check overlap
        if task_start <= end_date and task_end >= start_date:
            filtered_tasks.append(task)
    
    # Format response for Gantt chart
    personnel_data = []
    for p in personnel_list:
        p_tasks = [t for t in filtered_tasks if t.assigned_technician_id == p.id]
        
        # Determine role from user
        role = p.user.role.value if p.user and p.user.role else "unknown"
        
        personnel_data.append({
            "id": p.id,
            "name": p.user.full_name if p.user else f"Employee #{p.employee_id}",
            "employee_id": p.employee_id,
            "role": role,
            "department": p.department or "",
            "status": p.status.value if p.status else "available",
            "laboratory_id": p.primary_laboratory_id,
            "laboratory_name": p.primary_laboratory.name if p.primary_laboratory else "",
            "schedules": [
                {
                    "id": t.id,
                    "start_time": (t.started_at or t.assigned_at).isoformat(),
                    "end_time": (t.completed_at or (
                        (t.started_at or t.assigned_at) + timedelta(hours=t.standard_cycle_hours or 4)
                    )).isoformat(),
                    "title": t.title or f"Task #{t.task_number}",
                    "status": t.status.value if t.status else "pending",
                    "work_order_id": t.work_order_id,
                    "work_order_number": t.work_order.order_number if t.work_order else None,
                    "task_number": t.task_number,
                    "equipment_name": t.scheduled_equipment.name if t.scheduled_equipment else None,
                }
                for t in p_tasks
            ]
        })
    
    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "personnel": personnel_data,
        "total_personnel": len(personnel_data),
        "total_schedules": len(filtered_tasks)
    }

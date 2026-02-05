"""
班次管理API端点 - Shifts Management API Endpoints

本模块提供班次定义和人员班次分配的API接口。
班次管理是交接班系统的基础，支持定义班次时间、分配人员到特定班次。

API端点列表:

班次定义:
- GET /shifts: 分页获取班次列表，支持按实验室、站点筛选
- GET /shifts/{shift_id}: 获取单个班次详情
- POST /shifts: 创建新班次（Manager及以上角色）
- PUT /shifts/{shift_id}: 更新班次信息（Manager及以上角色）
- DELETE /shifts/{shift_id}: 删除班次（Manager及以上角色）

人员班次分配:
- GET /shifts/personnel-assignments: 获取人员班次分配列表
- POST /shifts/personnel-assignments: 创建人员班次分配
- PUT /shifts/personnel-assignments/{id}: 更新人员班次分配
- DELETE /shifts/personnel-assignments/{id}: 删除人员班次分配

权限要求:
- 查询操作：所有已登录用户
- 创建/更新/删除：Manager及以上角色

业务规则:
- 班次时间不能重叠（同一实验室）
- 人员在同一时间段只能分配一个班次
- 班次分配支持设置生效日期和结束日期
- 系统自动检测人员班次分配冲突
"""
from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.core.database import get_db
from app.models.shift import Shift, PersonnelShift
from app.models.personnel import Personnel
from app.schemas.shift import (
    ShiftCreate, ShiftUpdate, ShiftResponse, ShiftListResponse,
    PersonnelShiftCreate, PersonnelShiftUpdate, PersonnelShiftResponse
)
from app.api.deps import get_current_active_user, require_manager_or_above
from app.models.user import User

router = APIRouter(prefix="/shifts", tags=["Shifts"])


def check_shift_overlap(
    db: Session, 
    personnel_id: int, 
    effective_date: date, 
    end_date: Optional[date], 
    exclude_id: Optional[int] = None
) -> bool:
    """
    Check if a personnel has overlapping shift assignments.
    Returns True if there is an overlap.
    """
    query = db.query(PersonnelShift).filter(
        PersonnelShift.personnel_id == personnel_id,
        or_(
            PersonnelShift.end_date == None,  # Ongoing shifts
            PersonnelShift.end_date >= effective_date
        ),
        PersonnelShift.effective_date <= (end_date or date.max)
    )
    if exclude_id:
        query = query.filter(PersonnelShift.id != exclude_id)
    return query.first() is not None


@router.get("", response_model=ShiftListResponse)
def list_shifts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    laboratory_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all shifts with pagination and filtering."""
    query = db.query(Shift).options(joinedload(Shift.laboratory))
    
    if search:
        query = query.filter(
            (Shift.name.ilike(f"%{search}%")) |
            (Shift.code.ilike(f"%{search}%"))
        )
    if laboratory_id:
        query = query.filter(Shift.laboratory_id == laboratory_id)
    if is_active is not None:
        query = query.filter(Shift.is_active == is_active)
    
    total = query.count()
    offset = (page - 1) * page_size
    shifts = query.order_by(Shift.name).offset(offset).limit(page_size).all()
    
    return ShiftListResponse(
        items=[ShiftResponse.model_validate(s) for s in shifts],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{shift_id}", response_model=ShiftResponse)
def get_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific shift by ID."""
    shift = db.query(Shift).options(
        joinedload(Shift.laboratory)
    ).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
    return ShiftResponse.model_validate(shift)


@router.post("", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
def create_shift(
    data: ShiftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Create a new shift. Requires manager or above role."""
    existing = db.query(Shift).filter(Shift.code == data.code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Shift code already exists")
    
    shift = Shift(**data.model_dump())
    db.add(shift)
    db.commit()
    db.refresh(shift)
    
    return ShiftResponse.model_validate(shift)


@router.put("/{shift_id}", response_model=ShiftResponse)
def update_shift(
    shift_id: int,
    data: ShiftUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Update a shift. Requires manager or above role."""
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    if "code" in update_data and update_data["code"] != shift.code:
        existing = db.query(Shift).filter(Shift.code == update_data["code"]).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Shift code already exists")
    
    for field, value in update_data.items():
        setattr(shift, field, value)
    
    db.commit()
    db.refresh(shift)
    
    # Load laboratory relationship
    db.refresh(shift, ["laboratory"])
    
    return ShiftResponse.model_validate(shift)


@router.delete("/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Delete a shift. Requires manager or above role."""
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
    
    db.delete(shift)
    db.commit()


@router.get("/{shift_id}/personnel", response_model=list[PersonnelShiftResponse])
def get_personnel_by_shift(
    shift_id: int,
    active_on: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all personnel assigned to a specific shift."""
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
    
    query = db.query(PersonnelShift).options(
        joinedload(PersonnelShift.personnel).joinedload(Personnel.user),
        joinedload(PersonnelShift.shift)
    ).filter(PersonnelShift.shift_id == shift_id)
    
    # Filter by date if provided
    if active_on:
        query = query.filter(
            PersonnelShift.effective_date <= active_on,
            or_(
                PersonnelShift.end_date == None,
                PersonnelShift.end_date >= active_on
            )
        )
    
    personnel_shifts = query.order_by(PersonnelShift.effective_date.desc()).all()
    return [PersonnelShiftResponse.model_validate(ps) for ps in personnel_shifts]


# Personnel shift assignment endpoints
@router.get("/personnel/{personnel_id}", response_model=list[PersonnelShiftResponse])
def get_personnel_shifts(
    personnel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all shift assignments for a specific personnel."""
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personnel not found")
    
    shifts = db.query(PersonnelShift).options(
        joinedload(PersonnelShift.shift)
    ).filter(PersonnelShift.personnel_id == personnel_id).order_by(
        PersonnelShift.effective_date.desc()
    ).all()
    
    return [PersonnelShiftResponse.model_validate(ps) for ps in shifts]


@router.post("/personnel/{personnel_id}", response_model=PersonnelShiftResponse, status_code=status.HTTP_201_CREATED)
def assign_shift_to_personnel(
    personnel_id: int,
    data: PersonnelShiftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Assign a shift to personnel. Requires manager or above role."""
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personnel not found")
    
    shift = db.query(Shift).filter(Shift.id == data.shift_id).first()
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
    
    # Validate end_date >= effective_date if end_date is provided
    if data.end_date and data.end_date < data.effective_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="End date must be greater than or equal to effective date"
        )
    
    # Check for overlapping assignments
    if check_shift_overlap(db, personnel_id, data.effective_date, data.end_date):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Personnel already has a shift assignment that overlaps with this date range"
        )
    
    personnel_shift = PersonnelShift(
        personnel_id=personnel_id,
        **data.model_dump()
    )
    db.add(personnel_shift)
    db.commit()
    db.refresh(personnel_shift)
    
    # Load relationships
    db.refresh(personnel_shift, ["shift", "personnel"])
    
    return PersonnelShiftResponse.model_validate(personnel_shift)


@router.put("/personnel/{personnel_id}/shifts/{shift_id}", response_model=PersonnelShiftResponse)
def update_personnel_shift(
    personnel_id: int,
    shift_id: int,
    data: PersonnelShiftUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Update a personnel's shift assignment. Requires manager or above role."""
    personnel_shift = db.query(PersonnelShift).filter(
        PersonnelShift.personnel_id == personnel_id,
        PersonnelShift.shift_id == shift_id
    ).first()
    
    if not personnel_shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personnel shift not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Calculate new date range for overlap check
    new_effective = update_data.get("effective_date", personnel_shift.effective_date)
    new_end = update_data.get("end_date", personnel_shift.end_date)
    
    # Validate end_date >= effective_date
    if new_end and new_end < new_effective:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="End date must be greater than or equal to effective date"
        )
    
    # Check for overlapping assignments (excluding current)
    if check_shift_overlap(db, personnel_id, new_effective, new_end, exclude_id=personnel_shift.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Personnel already has a shift assignment that overlaps with this date range"
        )
    
    for field, value in update_data.items():
        setattr(personnel_shift, field, value)
    
    db.commit()
    db.refresh(personnel_shift)
    
    return PersonnelShiftResponse.model_validate(personnel_shift)


@router.delete("/personnel/{personnel_id}/shifts/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_personnel_shift(
    personnel_id: int,
    shift_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Remove a shift from personnel. Requires manager or above role."""
    personnel_shift = db.query(PersonnelShift).filter(
        PersonnelShift.personnel_id == personnel_id,
        PersonnelShift.shift_id == shift_id
    ).first()
    
    if not personnel_shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personnel shift not found")
    
    db.delete(personnel_shift)
    db.commit()

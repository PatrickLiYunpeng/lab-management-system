"""
实验室管理API端点 - Laboratory Management API Endpoints

本模块提供实验室管理的API接口。
实验室是站点下的二级组织单位，分为FA（失效分析）和Reliability（可靠性测试）两种类型。

API端点列表:
- GET /laboratories: 分页获取实验室列表，支持按类型、站点筛选
- GET /laboratories/{laboratory_id}: 获取单个实验室详情（含站点信息）
- POST /laboratories: 创建新实验室（需要Manager及以上权限）
- PUT /laboratories/{laboratory_id}: 更新实验室信息（需要Manager及以上权限）
- DELETE /laboratories/{laboratory_id}: 删除实验室（需要Manager及以上权限）

权限要求:
- 查询操作：所有已登录用户
- 创建/更新/删除：Manager及以上角色

业务规则:
- 实验室代码必须唯一
- 必须关联有效的站点
- 有关联用户的实验室不能删除
- 实验室类型决定可处理的工单类型
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models.laboratory import Laboratory, LaboratoryType
from app.models.site import Site
from app.schemas.laboratory import (
    LaboratoryCreate, LaboratoryUpdate, LaboratoryResponse,
    LaboratoryWithSiteResponse, LaboratoryListResponse
)
from app.api.deps import get_current_active_user, require_manager_or_above
from app.models.user import User

router = APIRouter(prefix="/laboratories", tags=["Laboratories"])


@router.get("", response_model=LaboratoryListResponse)
def list_laboratories(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    lab_type: Optional[LaboratoryType] = None,
    site_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all laboratories with pagination and filtering."""
    query = db.query(Laboratory).options(joinedload(Laboratory.site))
    
    # Apply filters
    if search:
        query = query.filter(
            (Laboratory.name.ilike(f"%{search}%")) |
            (Laboratory.code.ilike(f"%{search}%"))
        )
    if lab_type:
        query = query.filter(Laboratory.lab_type == lab_type)
    if site_id:
        query = query.filter(Laboratory.site_id == site_id)
    if is_active is not None:
        query = query.filter(Laboratory.is_active == is_active)
    
    # Get total count (without joinedload for efficiency)
    total = db.query(Laboratory).filter(
        *([Laboratory.name.ilike(f"%{search}%") | Laboratory.code.ilike(f"%{search}%")] if search else []),
        *([Laboratory.lab_type == lab_type] if lab_type else []),
        *([Laboratory.site_id == site_id] if site_id else []),
        *([Laboratory.is_active == is_active] if is_active is not None else [])
    ).count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    laboratories = query.order_by(Laboratory.name).offset(offset).limit(page_size).all()
    
    return LaboratoryListResponse(
        items=[LaboratoryWithSiteResponse.model_validate(lab) for lab in laboratories],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{laboratory_id}", response_model=LaboratoryWithSiteResponse)
def get_laboratory(
    laboratory_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific laboratory by ID with site details."""
    laboratory = db.query(Laboratory).options(
        joinedload(Laboratory.site)
    ).filter(Laboratory.id == laboratory_id).first()
    
    if not laboratory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory not found"
        )
    return LaboratoryWithSiteResponse.model_validate(laboratory)


@router.post("", response_model=LaboratoryResponse, status_code=status.HTTP_201_CREATED)
def create_laboratory(
    lab_data: LaboratoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Create a new laboratory. Requires manager or above role."""
    # Check if site exists
    site = db.query(Site).filter(Site.id == lab_data.site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Site not found"
        )
    
    # Check if code already exists
    existing = db.query(Laboratory).filter(Laboratory.code == lab_data.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Laboratory code already exists"
        )
    
    laboratory = Laboratory(**lab_data.model_dump())
    db.add(laboratory)
    db.commit()
    db.refresh(laboratory)
    
    return LaboratoryResponse.model_validate(laboratory)


@router.put("/{laboratory_id}", response_model=LaboratoryResponse)
def update_laboratory(
    laboratory_id: int,
    lab_data: LaboratoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Update a laboratory. Requires manager or above role."""
    laboratory = db.query(Laboratory).filter(Laboratory.id == laboratory_id).first()
    if not laboratory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory not found"
        )
    
    update_data = lab_data.model_dump(exclude_unset=True)
    
    # Check if site exists when changing
    if "site_id" in update_data:
        site = db.query(Site).filter(Site.id == update_data["site_id"]).first()
        if not site:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Site not found"
            )
    
    # Check uniqueness if code is being changed
    if "code" in update_data and update_data["code"] != laboratory.code:
        existing = db.query(Laboratory).filter(Laboratory.code == update_data["code"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Laboratory code already exists"
            )
    
    for field, value in update_data.items():
        setattr(laboratory, field, value)
    
    db.commit()
    db.refresh(laboratory)
    
    return LaboratoryResponse.model_validate(laboratory)


@router.delete("/{laboratory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_laboratory(
    laboratory_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Delete a laboratory. Requires manager or above role."""
    laboratory = db.query(Laboratory).filter(Laboratory.id == laboratory_id).first()
    if not laboratory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Laboratory not found"
        )
    
    # Check if laboratory has associated users
    if laboratory.users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete laboratory with associated users"
        )
    
    db.delete(laboratory)
    db.commit()

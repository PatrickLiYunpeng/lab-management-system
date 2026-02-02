"""
站点管理API端点 - Site Management API Endpoints

本模块提供站点（厂区/物理位置）管理的API接口。
站点是组织层级的顶级单位，实验室归属于站点。

API端点列表:
- GET /sites: 分页获取站点列表，支持搜索和筛选
- GET /sites/{site_id}: 获取单个站点详情
- POST /sites: 创建新站点（需要Manager及以上权限）
- PUT /sites/{site_id}: 更新站点信息（需要Manager及以上权限）
- DELETE /sites/{site_id}: 删除站点（需要Manager及以上权限）

权限要求:
- 查询操作：所有已登录用户
- 创建/更新/删除：Manager及以上角色

业务规则:
- 站点代码和名称必须唯一
- 有关联实验室的站点不能删除
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.site import Site
from app.schemas.site import SiteCreate, SiteUpdate, SiteResponse, SiteListResponse
from app.api.deps import get_current_active_user, require_manager_or_above
from app.models.user import User

router = APIRouter(prefix="/sites", tags=["Sites"])


@router.get("", response_model=SiteListResponse)
def list_sites(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all sites with pagination and filtering."""
    query = db.query(Site)
    
    # Apply filters
    if search:
        query = query.filter(
            (Site.name.ilike(f"%{search}%")) |
            (Site.code.ilike(f"%{search}%")) |
            (Site.city.ilike(f"%{search}%"))
        )
    if is_active is not None:
        query = query.filter(Site.is_active == is_active)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    sites = query.order_by(Site.name).offset(offset).limit(page_size).all()
    
    return SiteListResponse(
        items=[SiteResponse.model_validate(s) for s in sites],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{site_id}", response_model=SiteResponse)
def get_site(
    site_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific site by ID."""
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found"
        )
    return SiteResponse.model_validate(site)


@router.post("", response_model=SiteResponse, status_code=status.HTTP_201_CREATED)
def create_site(
    site_data: SiteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Create a new site. Requires manager or above role."""
    # Check if code already exists
    existing = db.query(Site).filter(Site.code == site_data.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Site code already exists"
        )
    
    # Check if name already exists
    existing = db.query(Site).filter(Site.name == site_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Site name already exists"
        )
    
    site = Site(**site_data.model_dump())
    db.add(site)
    db.commit()
    db.refresh(site)
    
    return SiteResponse.model_validate(site)


@router.put("/{site_id}", response_model=SiteResponse)
def update_site(
    site_id: int,
    site_data: SiteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Update a site. Requires manager or above role."""
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found"
        )
    
    update_data = site_data.model_dump(exclude_unset=True)
    
    # Check uniqueness if code is being changed
    if "code" in update_data and update_data["code"] != site.code:
        existing = db.query(Site).filter(Site.code == update_data["code"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Site code already exists"
            )
    
    # Check uniqueness if name is being changed
    if "name" in update_data and update_data["name"] != site.name:
        existing = db.query(Site).filter(Site.name == update_data["name"]).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Site name already exists"
            )
    
    for field, value in update_data.items():
        setattr(site, field, value)
    
    db.commit()
    db.refresh(site)
    
    return SiteResponse.model_validate(site)


@router.delete("/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_site(
    site_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Delete a site. Requires manager or above role."""
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Site not found"
        )
    
    # Check if site has associated laboratories
    if site.laboratories:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete site with associated laboratories"
        )
    
    db.delete(site)
    db.commit()

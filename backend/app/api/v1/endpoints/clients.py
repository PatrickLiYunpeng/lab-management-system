"""
Client SLA and Testing Source Category management API endpoints.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models.material import Client, ClientSLA, TestingSourceCategory
from app.models.laboratory import Laboratory
from app.models.method import MethodType
from app.schemas.material import (
    ClientSLACreate, ClientSLAUpdate, ClientSLAResponse, ClientSLAListResponse,
    TestingSourceCategoryCreate, TestingSourceCategoryUpdate, 
    TestingSourceCategoryResponse, TestingSourceCategoryListResponse
)
from app.api.deps import get_current_active_user, require_manager_or_above
from app.models.user import User

router = APIRouter(prefix="/clients", tags=["Clients & SLA"])


# ============== Client SLA Endpoints ==============

@router.get("/slas", response_model=ClientSLAListResponse)
def list_client_slas(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    client_id: Optional[int] = None,
    laboratory_id: Optional[int] = None,
    method_type: Optional[MethodType] = None,
    source_category_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all client SLA configurations with filtering."""
    query = db.query(ClientSLA).options(
        joinedload(ClientSLA.client),
        joinedload(ClientSLA.laboratory),
        joinedload(ClientSLA.source_category)
    )
    
    if client_id:
        query = query.filter(ClientSLA.client_id == client_id)
    if laboratory_id:
        query = query.filter(ClientSLA.laboratory_id == laboratory_id)
    if method_type:
        query = query.filter(ClientSLA.method_type == method_type)
    if source_category_id:
        query = query.filter(ClientSLA.source_category_id == source_category_id)
    if is_active is not None:
        query = query.filter(ClientSLA.is_active == is_active)
    
    total = query.count()
    offset = (page - 1) * page_size
    items = query.order_by(ClientSLA.client_id, ClientSLA.method_type).offset(offset).limit(page_size).all()
    
    return ClientSLAListResponse(
        items=[ClientSLAResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/slas/{sla_id}", response_model=ClientSLAResponse)
def get_client_sla(
    sla_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific client SLA by ID."""
    sla = db.query(ClientSLA).options(
        joinedload(ClientSLA.client),
        joinedload(ClientSLA.laboratory),
        joinedload(ClientSLA.source_category)
    ).filter(ClientSLA.id == sla_id).first()
    
    if not sla:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client SLA not found")
    return ClientSLAResponse.model_validate(sla)


@router.post("/slas", response_model=ClientSLAResponse, status_code=status.HTTP_201_CREATED)
def create_client_sla(
    data: ClientSLACreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Create a new client SLA configuration. Requires manager or above role."""
    # Verify client exists
    client = db.query(Client).filter(Client.id == data.client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Client not found")
    
    # Verify laboratory exists (if specified)
    if data.laboratory_id:
        lab = db.query(Laboratory).filter(Laboratory.id == data.laboratory_id).first()
        if not lab:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Laboratory not found")
    
    # Verify source category exists (if specified)
    if data.source_category_id:
        source_cat = db.query(TestingSourceCategory).filter(
            TestingSourceCategory.id == data.source_category_id
        ).first()
        if not source_cat:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Source category not found")
    
    # Check for duplicate (same client, lab, method_type, source_category)
    existing = db.query(ClientSLA).filter(
        ClientSLA.client_id == data.client_id,
        ClientSLA.laboratory_id == data.laboratory_id,
        ClientSLA.method_type == data.method_type,
        ClientSLA.source_category_id == data.source_category_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="SLA configuration already exists for this client/laboratory/method type/source category combination"
        )
    
    sla = ClientSLA(**data.model_dump())
    db.add(sla)
    db.commit()
    db.refresh(sla)
    
    # Reload with relationships
    sla = db.query(ClientSLA).options(
        joinedload(ClientSLA.client),
        joinedload(ClientSLA.laboratory),
        joinedload(ClientSLA.source_category)
    ).filter(ClientSLA.id == sla.id).first()
    
    return ClientSLAResponse.model_validate(sla)


@router.put("/slas/{sla_id}", response_model=ClientSLAResponse)
def update_client_sla(
    sla_id: int,
    data: ClientSLAUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Update a client SLA configuration. Requires manager or above role."""
    sla = db.query(ClientSLA).filter(ClientSLA.id == sla_id).first()
    if not sla:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client SLA not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Verify laboratory if being updated
    if "laboratory_id" in update_data and update_data["laboratory_id"]:
        lab = db.query(Laboratory).filter(Laboratory.id == update_data["laboratory_id"]).first()
        if not lab:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Laboratory not found")
    
    # Verify source category if being updated
    if "source_category_id" in update_data and update_data["source_category_id"]:
        source_cat = db.query(TestingSourceCategory).filter(
            TestingSourceCategory.id == update_data["source_category_id"]
        ).first()
        if not source_cat:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Source category not found")
    
    for field, value in update_data.items():
        setattr(sla, field, value)
    
    db.commit()
    db.refresh(sla)
    
    # Reload with relationships
    sla = db.query(ClientSLA).options(
        joinedload(ClientSLA.client),
        joinedload(ClientSLA.laboratory),
        joinedload(ClientSLA.source_category)
    ).filter(ClientSLA.id == sla.id).first()
    
    return ClientSLAResponse.model_validate(sla)


@router.delete("/slas/{sla_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client_sla(
    sla_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Delete a client SLA configuration. Requires manager or above role."""
    sla = db.query(ClientSLA).filter(ClientSLA.id == sla_id).first()
    if not sla:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client SLA not found")
    
    db.delete(sla)
    db.commit()


# ============== Testing Source Category Endpoints ==============

@router.get("/source-categories", response_model=TestingSourceCategoryListResponse)
def list_source_categories(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all testing source categories."""
    query = db.query(TestingSourceCategory)
    
    if search:
        query = query.filter(
            (TestingSourceCategory.name.ilike(f"%{search}%")) |
            (TestingSourceCategory.code.ilike(f"%{search}%"))
        )
    if is_active is not None:
        query = query.filter(TestingSourceCategory.is_active == is_active)
    
    total = query.count()
    offset = (page - 1) * page_size
    items = query.order_by(TestingSourceCategory.display_order, TestingSourceCategory.name).offset(offset).limit(page_size).all()
    
    return TestingSourceCategoryListResponse(
        items=[TestingSourceCategoryResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/source-categories/all")
def get_all_source_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all active testing source categories (for dropdowns)."""
    items = db.query(TestingSourceCategory).filter(
        TestingSourceCategory.is_active == True
    ).order_by(TestingSourceCategory.display_order, TestingSourceCategory.name).all()
    
    return [TestingSourceCategoryResponse.model_validate(item) for item in items]


@router.get("/source-categories/{category_id}", response_model=TestingSourceCategoryResponse)
def get_source_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific testing source category by ID."""
    category = db.query(TestingSourceCategory).filter(TestingSourceCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Testing source category not found")
    return TestingSourceCategoryResponse.model_validate(category)


@router.post("/source-categories", response_model=TestingSourceCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_source_category(
    data: TestingSourceCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Create a new testing source category. Requires manager or above role."""
    # Check for duplicate code
    existing = db.query(TestingSourceCategory).filter(TestingSourceCategory.code == data.code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category code already exists")
    
    # If this is marked as default, unset other defaults
    if data.is_default:
        db.query(TestingSourceCategory).filter(TestingSourceCategory.is_default == True).update({"is_default": False})
    
    category = TestingSourceCategory(**data.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    
    return TestingSourceCategoryResponse.model_validate(category)


@router.put("/source-categories/{category_id}", response_model=TestingSourceCategoryResponse)
def update_source_category(
    category_id: int,
    data: TestingSourceCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Update a testing source category. Requires manager or above role."""
    category = db.query(TestingSourceCategory).filter(TestingSourceCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Testing source category not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Check for duplicate code if being updated
    if "code" in update_data and update_data["code"] != category.code:
        existing = db.query(TestingSourceCategory).filter(TestingSourceCategory.code == update_data["code"]).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category code already exists")
    
    # If setting as default, unset other defaults
    if update_data.get("is_default"):
        db.query(TestingSourceCategory).filter(
            TestingSourceCategory.id != category_id,
            TestingSourceCategory.is_default == True
        ).update({"is_default": False})
    
    for field, value in update_data.items():
        setattr(category, field, value)
    
    db.commit()
    db.refresh(category)
    
    return TestingSourceCategoryResponse.model_validate(category)


@router.delete("/source-categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Delete a testing source category. Requires manager or above role."""
    category = db.query(TestingSourceCategory).filter(TestingSourceCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Testing source category not found")
    
    if category.is_default:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Cannot delete the default category. Set another category as default first."
        )
    
    db.delete(category)
    db.commit()

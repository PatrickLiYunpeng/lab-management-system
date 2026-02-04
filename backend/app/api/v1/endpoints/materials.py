"""
Material management API endpoints.
"""
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.material import Material, MaterialType, MaterialStatus, DisposalMethod, MaterialHistory, MaterialReplenishment, Client
from app.models.laboratory import Laboratory
from app.models.site import Site
from app.schemas.material import (
    MaterialCreate, MaterialUpdate, MaterialResponse, MaterialListResponse,
    MaterialDispose, MaterialReturn,
    ReplenishmentCreate, ReplenishmentResponse, ReplenishmentListResponse,
    ClientCreate, ClientUpdate, ClientResponse, ClientListResponse
)
from app.api.deps import get_current_active_user, require_manager_or_above, require_engineer_or_above
from app.models.user import User

router = APIRouter(prefix="/materials", tags=["Materials"])


@router.get("", response_model=MaterialListResponse)
def list_materials(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    material_type: Optional[MaterialType] = None,
    status_filter: Optional[MaterialStatus] = Query(None, alias="status"),
    laboratory_id: Optional[int] = None,
    client_id: Optional[int] = None,
    overdue_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all materials with pagination and filtering."""
    query = db.query(Material)
    
    if search:
        query = query.filter(
            (Material.material_code.ilike(f"%{search}%")) |
            (Material.name.ilike(f"%{search}%"))
        )
    if material_type:
        query = query.filter(Material.material_type == material_type)
    if status_filter:
        query = query.filter(Material.status == status_filter)
    if laboratory_id:
        query = query.filter(Material.laboratory_id == laboratory_id)
    if client_id:
        query = query.filter(Material.client_id == client_id)
    if overdue_only:
        now = datetime.now(timezone.utc)
        query = query.filter(
            ((Material.storage_deadline < now) & (Material.status == MaterialStatus.IN_STORAGE)) |
            ((Material.processing_deadline < now) & (~Material.status.in_([MaterialStatus.RETURNED, MaterialStatus.DISPOSED])))
        )
    
    total = query.count()
    offset = (page - 1) * page_size
    materials = query.order_by(Material.created_at.desc()).offset(offset).limit(page_size).all()
    
    return MaterialListResponse(
        items=[MaterialResponse.model_validate(m) for m in materials],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{material_id}", response_model=MaterialResponse)
def get_material(
    material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific material by ID."""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
    return MaterialResponse.model_validate(material)


@router.post("", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
def create_material(
    data: MaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer_or_above)
):
    """Create new material. Requires engineer or above role."""
    existing = db.query(Material).filter(Material.material_code == data.material_code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Material code already exists")
    
    lab = db.query(Laboratory).filter(Laboratory.id == data.laboratory_id).first()
    if not lab:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Laboratory not found")
    
    material = Material(**data.model_dump())
    db.add(material)
    db.commit()
    db.refresh(material)
    
    return MaterialResponse.model_validate(material)


@router.put("/{material_id}", response_model=MaterialResponse)
def update_material(
    material_id: int,
    data: MaterialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer_or_above)
):
    """Update material. Requires engineer or above role."""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
    
    update_data = data.model_dump(exclude_unset=True)
    old_status = material.status
    
    for field, value in update_data.items():
        setattr(material, field, value)
    
    # Record status change in history
    if "status" in update_data and update_data["status"] != old_status:
        history = MaterialHistory(
            material_id=material_id,
            from_status=old_status,
            to_status=update_data["status"],
            changed_by_id=current_user.id
        )
        db.add(history)
    
    db.commit()
    db.refresh(material)
    
    return MaterialResponse.model_validate(material)


@router.post("/{material_id}/dispose", response_model=MaterialResponse)
def dispose_material(
    material_id: int,
    data: MaterialDispose,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer_or_above)
):
    """Dispose material. Requires engineer or above role."""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
    
    if material.status in [MaterialStatus.DISPOSED, MaterialStatus.RETURNED]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Material already disposed or returned")
    
    old_status = material.status
    material.status = MaterialStatus.DISPOSED
    material.disposal_method = data.disposal_method
    material.disposal_notes = data.disposal_notes
    material.disposed_at = datetime.now(timezone.utc)
    material.disposed_by_id = current_user.id
    
    # Record in history
    history = MaterialHistory(
        material_id=material_id,
        from_status=old_status,
        to_status=MaterialStatus.DISPOSED,
        changed_by_id=current_user.id,
        notes=f"Disposed via {data.disposal_method.value}"
    )
    db.add(history)
    
    db.commit()
    db.refresh(material)
    
    return MaterialResponse.model_validate(material)


@router.post("/{material_id}/return", response_model=MaterialResponse)
def return_material(
    material_id: int,
    data: MaterialReturn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer_or_above)
):
    """Return material to client. Requires engineer or above role."""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
    
    if material.status in [MaterialStatus.DISPOSED, MaterialStatus.RETURNED]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Material already disposed or returned")
    
    old_status = material.status
    material.status = MaterialStatus.RETURNED
    material.disposal_method = DisposalMethod.RETURN_TO_CLIENT
    material.return_tracking_number = data.return_tracking_number
    material.return_notes = data.return_notes
    material.returned_at = datetime.now(timezone.utc)
    
    history = MaterialHistory(
        material_id=material_id,
        from_status=old_status,
        to_status=MaterialStatus.RETURNED,
        changed_by_id=current_user.id,
        notes="Returned to client"
    )
    db.add(history)
    
    db.commit()
    db.refresh(material)
    
    return MaterialResponse.model_validate(material)


# Material replenishment endpoints
@router.post("/{material_id}/replenish", response_model=MaterialResponse)
def replenish_material(
    material_id: int,
    data: ReplenishmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer_or_above)
):
    """
    Replenish material (add stock). Requires engineer or above role.
    Only non-sample materials can be replenished.
    Either sap_order_no or non_sap_source must be provided.
    """
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
    
    # Only allow replenishment for non-sample materials
    if material.material_type == MaterialType.SAMPLE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sample materials cannot be replenished. Use create material instead."
        )
    
    # Validate that at least one source is provided
    if not data.sap_order_no and not data.non_sap_source:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either SAP order number or non-SAP source must be provided"
        )
    
    # Create replenishment record
    replenishment = MaterialReplenishment(
        material_id=material_id,
        received_date=data.received_date,
        quantity_added=data.quantity_added,
        sap_order_no=data.sap_order_no,
        non_sap_source=data.non_sap_source,
        notes=data.notes,
        created_by_id=current_user.id
    )
    db.add(replenishment)
    
    # Update material quantity
    old_quantity = material.quantity
    material.quantity += data.quantity_added
    
    # Create history record for quantity change
    source_info = data.sap_order_no or (data.non_sap_source.value if data.non_sap_source else "unknown")
    history = MaterialHistory(
        material_id=material_id,
        from_status=material.status,
        to_status=material.status,
        changed_by_id=current_user.id,
        notes=f"Replenished: +{data.quantity_added} (from {old_quantity} to {material.quantity}). Source: {source_info}"
    )
    db.add(history)
    
    db.commit()
    db.refresh(material)
    
    return MaterialResponse.model_validate(material)


@router.get("/{material_id}/replenishments", response_model=ReplenishmentListResponse)
def get_material_replenishments(
    material_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get replenishment history for a specific material."""
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
    
    query = db.query(MaterialReplenishment).filter(MaterialReplenishment.material_id == material_id)
    
    total = query.count()
    offset = (page - 1) * page_size
    replenishments = query.order_by(MaterialReplenishment.created_at.desc()).offset(offset).limit(page_size).all()
    
    return ReplenishmentListResponse(
        items=[ReplenishmentResponse.model_validate(r) for r in replenishments],
        total=total,
        page=page,
        page_size=page_size
    )


# Client management endpoints
@router.get("/clients/", response_model=ClientListResponse)
def list_clients(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all clients."""
    query = db.query(Client)
    
    if search:
        query = query.filter(
            (Client.name.ilike(f"%{search}%")) |
            (Client.code.ilike(f"%{search}%"))
        )
    if is_active is not None:
        query = query.filter(Client.is_active == is_active)
    
    total = query.count()
    offset = (page - 1) * page_size
    clients = query.order_by(Client.name).offset(offset).limit(page_size).all()
    
    return ClientListResponse(
        items=[ClientResponse.model_validate(c) for c in clients],
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/clients/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    data: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Create new client. Requires manager or above role."""
    existing = db.query(Client).filter(Client.code == data.code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Client code already exists")
    
    client = Client(**data.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    
    return ClientResponse.model_validate(client)


@router.get("/clients/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific client by ID."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return ClientResponse.model_validate(client)


@router.put("/clients/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int,
    data: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Update client. Requires manager or above role."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    if "code" in update_data and update_data["code"] != client.code:
        existing = db.query(Client).filter(Client.code == update_data["code"]).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Client code already exists")
    
    for field, value in update_data.items():
        setattr(client, field, value)
    
    db.commit()
    db.refresh(client)
    
    return ClientResponse.model_validate(client)

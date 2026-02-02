"""
Method management API endpoints.
Handles analysis methods (FA lab) and test methods (Reliability lab).
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models.method import Method, MethodType, MethodSkillRequirement
from app.models.skill import Skill
from app.models.user import User
from app.schemas.method import (
    MethodCreate, MethodUpdate, MethodResponse, MethodListResponse,
    MethodSkillRequirementCreate, MethodSkillRequirementResponse,
    LaboratoryBrief, EquipmentBrief, SkillBrief
)
from app.api.deps import get_current_active_user, require_manager_or_above

router = APIRouter(prefix="/methods", tags=["Methods"])


def build_method_response(method: Method) -> MethodResponse:
    """Build a complete method response with related entities."""
    skill_reqs = []
    for sr in method.skill_requirements:
        skill_reqs.append(MethodSkillRequirementResponse(
            id=sr.id,
            method_id=sr.method_id,
            skill_id=sr.skill_id,
            min_proficiency_level=sr.min_proficiency_level,
            requires_certification=sr.requires_certification,
            created_at=sr.created_at,
            skill=SkillBrief(
                id=sr.skill.id,
                name=sr.skill.name,
                code=sr.skill.code,
                category=sr.skill.category
            ) if sr.skill else None
        ))
    
    return MethodResponse(
        id=method.id,
        name=method.name,
        code=method.code,
        method_type=method.method_type,
        category=method.category,
        description=method.description,
        procedure_summary=method.procedure_summary,
        laboratory_id=method.laboratory_id,
        standard_cycle_hours=method.standard_cycle_hours,
        min_cycle_hours=method.min_cycle_hours,
        max_cycle_hours=method.max_cycle_hours,
        requires_equipment=method.requires_equipment,
        default_equipment_id=method.default_equipment_id,
        is_active=method.is_active,
        created_at=method.created_at,
        updated_at=method.updated_at,
        laboratory=LaboratoryBrief(
            id=method.laboratory.id,
            name=method.laboratory.name,
            code=method.laboratory.code
        ) if method.laboratory else None,
        default_equipment=EquipmentBrief(
            id=method.default_equipment.id,
            name=method.default_equipment.name,
            code=method.default_equipment.code
        ) if method.default_equipment else None,
        skill_requirements=skill_reqs
    )


@router.get("", response_model=MethodListResponse)
def list_methods(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    method_type: Optional[MethodType] = None,
    category: Optional[str] = None,
    laboratory_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List methods with pagination and filtering."""
    query = db.query(Method).options(
        joinedload(Method.laboratory),
        joinedload(Method.default_equipment),
        joinedload(Method.skill_requirements).joinedload(MethodSkillRequirement.skill)
    )
    
    if search:
        query = query.filter(
            (Method.name.ilike(f"%{search}%")) |
            (Method.code.ilike(f"%{search}%"))
        )
    if method_type:
        query = query.filter(Method.method_type == method_type)
    if category:
        query = query.filter(Method.category == category)
    if laboratory_id:
        query = query.filter(Method.laboratory_id == laboratory_id)
    if is_active is not None:
        query = query.filter(Method.is_active == is_active)
    
    total = query.count()
    offset = (page - 1) * page_size
    methods = query.order_by(Method.method_type, Method.name).offset(offset).limit(page_size).all()
    
    return MethodListResponse(
        items=[build_method_response(m) for m in methods],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{method_id}", response_model=MethodResponse)
def get_method(
    method_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific method by ID."""
    method = db.query(Method).options(
        joinedload(Method.laboratory),
        joinedload(Method.default_equipment),
        joinedload(Method.skill_requirements).joinedload(MethodSkillRequirement.skill)
    ).filter(Method.id == method_id).first()
    
    if not method:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Method not found")
    
    return build_method_response(method)


@router.post("", response_model=MethodResponse, status_code=status.HTTP_201_CREATED)
def create_method(
    data: MethodCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Create a new method. Requires manager or above role."""
    # Check for duplicate code
    existing = db.query(Method).filter(Method.code == data.code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Method code already exists")
    
    method = Method(**data.model_dump())
    db.add(method)
    db.commit()
    db.refresh(method)
    
    # Reload with relationships
    method = db.query(Method).options(
        joinedload(Method.laboratory),
        joinedload(Method.default_equipment),
        joinedload(Method.skill_requirements).joinedload(MethodSkillRequirement.skill)
    ).filter(Method.id == method.id).first()
    
    return build_method_response(method)


@router.put("/{method_id}", response_model=MethodResponse)
def update_method(
    method_id: int,
    data: MethodUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Update a method. Requires manager or above role."""
    method = db.query(Method).filter(Method.id == method_id).first()
    if not method:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Method not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(method, field, value)
    
    db.commit()
    db.refresh(method)
    
    # Reload with relationships
    method = db.query(Method).options(
        joinedload(Method.laboratory),
        joinedload(Method.default_equipment),
        joinedload(Method.skill_requirements).joinedload(MethodSkillRequirement.skill)
    ).filter(Method.id == method.id).first()
    
    return build_method_response(method)


@router.delete("/{method_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_method(
    method_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Delete a method. Requires manager or above role."""
    method = db.query(Method).filter(Method.id == method_id).first()
    if not method:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Method not found")
    
    db.delete(method)
    db.commit()


# Skill requirements endpoints
@router.get("/{method_id}/skills", response_model=list[MethodSkillRequirementResponse])
def get_method_skills(
    method_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get skill requirements for a method."""
    method = db.query(Method).filter(Method.id == method_id).first()
    if not method:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Method not found")
    
    requirements = db.query(MethodSkillRequirement).options(
        joinedload(MethodSkillRequirement.skill)
    ).filter(MethodSkillRequirement.method_id == method_id).all()
    
    return [
        MethodSkillRequirementResponse(
            id=sr.id,
            method_id=sr.method_id,
            skill_id=sr.skill_id,
            min_proficiency_level=sr.min_proficiency_level,
            requires_certification=sr.requires_certification,
            created_at=sr.created_at,
            skill=SkillBrief(
                id=sr.skill.id,
                name=sr.skill.name,
                code=sr.skill.code,
                category=sr.skill.category
            ) if sr.skill else None
        )
        for sr in requirements
    ]


@router.post("/{method_id}/skills", response_model=MethodSkillRequirementResponse, status_code=status.HTTP_201_CREATED)
def add_method_skill(
    method_id: int,
    data: MethodSkillRequirementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Add a skill requirement to a method."""
    method = db.query(Method).filter(Method.id == method_id).first()
    if not method:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Method not found")
    
    skill = db.query(Skill).filter(Skill.id == data.skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    
    # Check for duplicate
    existing = db.query(MethodSkillRequirement).filter(
        MethodSkillRequirement.method_id == method_id,
        MethodSkillRequirement.skill_id == data.skill_id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Skill requirement already exists")
    
    requirement = MethodSkillRequirement(
        method_id=method_id,
        skill_id=data.skill_id,
        min_proficiency_level=data.min_proficiency_level,
        requires_certification=data.requires_certification
    )
    db.add(requirement)
    db.commit()
    db.refresh(requirement)
    
    # Load skill relationship
    requirement = db.query(MethodSkillRequirement).options(
        joinedload(MethodSkillRequirement.skill)
    ).filter(MethodSkillRequirement.id == requirement.id).first()
    
    return MethodSkillRequirementResponse(
        id=requirement.id,
        method_id=requirement.method_id,
        skill_id=requirement.skill_id,
        min_proficiency_level=requirement.min_proficiency_level,
        requires_certification=requirement.requires_certification,
        created_at=requirement.created_at,
        skill=SkillBrief(
            id=requirement.skill.id,
            name=requirement.skill.name,
            code=requirement.skill.code,
            category=requirement.skill.category
        ) if requirement.skill else None
    )


@router.delete("/{method_id}/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_method_skill(
    method_id: int,
    skill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Remove a skill requirement from a method."""
    requirement = db.query(MethodSkillRequirement).filter(
        MethodSkillRequirement.method_id == method_id,
        MethodSkillRequirement.skill_id == skill_id
    ).first()
    
    if not requirement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill requirement not found")
    
    db.delete(requirement)
    db.commit()

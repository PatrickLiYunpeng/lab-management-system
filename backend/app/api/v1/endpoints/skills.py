"""
Skills management API endpoints.
"""
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models.skill import Skill, PersonnelSkill, SkillCategory
from app.models.personnel import Personnel
from app.schemas.skill import (
    SkillCreate, SkillUpdate, SkillResponse, SkillListResponse,
    PersonnelSkillCreate, PersonnelSkillUpdate, PersonnelSkillResponse
)
from app.api.deps import get_current_active_user, require_manager_or_above
from app.models.user import User

router = APIRouter(prefix="/skills", tags=["Skills"])


@router.get("", response_model=SkillListResponse)
def list_skills(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[SkillCategory] = None,
    lab_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all skills with pagination and filtering."""
    query = db.query(Skill)
    
    if search:
        query = query.filter(
            (Skill.name.ilike(f"%{search}%")) |
            (Skill.code.ilike(f"%{search}%"))
        )
    if category:
        query = query.filter(Skill.category == category)
    if lab_type:
        query = query.filter(Skill.lab_type == lab_type)
    if is_active is not None:
        query = query.filter(Skill.is_active == is_active)
    
    total = query.count()
    offset = (page - 1) * page_size
    skills = query.order_by(Skill.name).offset(offset).limit(page_size).all()
    
    return SkillListResponse(
        items=[SkillResponse.model_validate(s) for s in skills],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{skill_id}", response_model=SkillResponse)
def get_skill(
    skill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific skill by ID."""
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    return SkillResponse.model_validate(skill)


@router.post("", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
def create_skill(
    data: SkillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Create a new skill. Requires manager or above role."""
    existing = db.query(Skill).filter(Skill.code == data.code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Skill code already exists")
    
    skill = Skill(**data.model_dump())
    db.add(skill)
    db.commit()
    db.refresh(skill)
    
    return SkillResponse.model_validate(skill)


@router.put("/{skill_id}", response_model=SkillResponse)
def update_skill(
    skill_id: int,
    data: SkillUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Update a skill. Requires manager or above role."""
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    if "code" in update_data and update_data["code"] != skill.code:
        existing = db.query(Skill).filter(Skill.code == update_data["code"]).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Skill code already exists")
    
    for field, value in update_data.items():
        setattr(skill, field, value)
    
    db.commit()
    db.refresh(skill)
    
    return SkillResponse.model_validate(skill)


@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_skill(
    skill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Delete a skill. Requires manager or above role."""
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    
    db.delete(skill)
    db.commit()


@router.get("/{skill_id}/personnel", response_model=list[PersonnelSkillResponse])
def get_personnel_by_skill(
    skill_id: int,
    proficiency_level: Optional[str] = None,
    is_certified: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all personnel with a specific skill."""
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    
    query = db.query(PersonnelSkill).options(
        joinedload(PersonnelSkill.personnel),
        joinedload(PersonnelSkill.skill)
    ).filter(PersonnelSkill.skill_id == skill_id)
    
    if proficiency_level:
        from app.models.skill import ProficiencyLevel
        try:
            level = ProficiencyLevel(proficiency_level.lower())
            query = query.filter(PersonnelSkill.proficiency_level == level)
        except ValueError:
            pass
    
    if is_certified is not None:
        query = query.filter(PersonnelSkill.is_certified == is_certified)
    
    personnel_skills = query.all()
    return [PersonnelSkillResponse.model_validate(ps) for ps in personnel_skills]


# Personnel skill assignment endpoints
@router.get("/personnel/{personnel_id}", response_model=list[PersonnelSkillResponse])
def get_personnel_skills(
    personnel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all skills for a specific personnel."""
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personnel not found")
    
    skills = db.query(PersonnelSkill).options(
        joinedload(PersonnelSkill.skill)
    ).filter(PersonnelSkill.personnel_id == personnel_id).all()
    
    return [PersonnelSkillResponse.model_validate(ps) for ps in skills]


@router.post("/personnel/{personnel_id}", response_model=PersonnelSkillResponse, status_code=status.HTTP_201_CREATED)
def assign_skill_to_personnel(
    personnel_id: int,
    data: PersonnelSkillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Assign a skill to personnel. Requires manager or above role."""
    personnel = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not personnel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personnel not found")
    
    skill = db.query(Skill).filter(Skill.id == data.skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    
    existing = db.query(PersonnelSkill).filter(
        PersonnelSkill.personnel_id == personnel_id,
        PersonnelSkill.skill_id == data.skill_id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Skill already assigned to personnel")
    
    personnel_skill = PersonnelSkill(
        personnel_id=personnel_id,
        **data.model_dump()
    )
    db.add(personnel_skill)
    db.commit()
    db.refresh(personnel_skill)
    
    # Load skill relationship
    db.refresh(personnel_skill, ["skill"])
    
    return PersonnelSkillResponse.model_validate(personnel_skill)


@router.put("/personnel/{personnel_id}/skills/{skill_id}", response_model=PersonnelSkillResponse)
def update_personnel_skill(
    personnel_id: int,
    skill_id: int,
    data: PersonnelSkillUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Update a personnel's skill. Requires manager or above role."""
    personnel_skill = db.query(PersonnelSkill).filter(
        PersonnelSkill.personnel_id == personnel_id,
        PersonnelSkill.skill_id == skill_id
    ).first()
    
    if not personnel_skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personnel skill not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Update last assessment date if score is provided
    if "assessment_score" in update_data:
        personnel_skill.last_assessment_date = datetime.now(timezone.utc).date()
        personnel_skill.assessed_by_id = current_user.id
    
    for field, value in update_data.items():
        setattr(personnel_skill, field, value)
    
    db.commit()
    db.refresh(personnel_skill)
    
    return PersonnelSkillResponse.model_validate(personnel_skill)


@router.delete("/personnel/{personnel_id}/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_personnel_skill(
    personnel_id: int,
    skill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Remove a skill from personnel. Requires manager or above role."""
    personnel_skill = db.query(PersonnelSkill).filter(
        PersonnelSkill.personnel_id == personnel_id,
        PersonnelSkill.skill_id == skill_id
    ).first()
    
    if not personnel_skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Personnel skill not found")
    
    db.delete(personnel_skill)
    db.commit()

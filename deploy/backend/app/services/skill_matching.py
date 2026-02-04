"""
Skill matching service for finding qualified personnel.
"""
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload

from app.models.personnel import Personnel, PersonnelStatus
from app.models.skill import Skill, PersonnelSkill, ProficiencyLevel
from app.models.equipment import Equipment, EquipmentSkillRequirement


# Proficiency level ordering for comparison
PROFICIENCY_ORDER = {
    ProficiencyLevel.BEGINNER: 1,
    ProficiencyLevel.INTERMEDIATE: 2,
    ProficiencyLevel.ADVANCED: 3,
    ProficiencyLevel.EXPERT: 4,
}


def find_personnel_by_skills(
    db: Session,
    skill_ids: List[int],
    min_proficiency: Optional[ProficiencyLevel] = None,
    require_certified: bool = False,
    status: Optional[PersonnelStatus] = None,
    laboratory_id: Optional[int] = None,
) -> List[dict]:
    """
    Find personnel who have ALL of the specified skills.
    
    Args:
        db: Database session
        skill_ids: List of required skill IDs
        min_proficiency: Minimum proficiency level required
        require_certified: Whether certification is required for skills
        status: Filter by personnel status
        laboratory_id: Filter by laboratory
    
    Returns:
        List of personnel with match score, sorted by score descending
    """
    if not skill_ids:
        return []
    
    # Build base query for personnel
    query = db.query(Personnel).options(
        joinedload(Personnel.user),
        joinedload(Personnel.skills).joinedload(PersonnelSkill.skill),
        joinedload(Personnel.primary_laboratory),
    )
    
    # Apply filters
    if status:
        query = query.filter(Personnel.status == status)
    
    if laboratory_id:
        query = query.filter(
            (Personnel.primary_laboratory_id == laboratory_id) |
            (Personnel.current_laboratory_id == laboratory_id)
        )
    
    personnel_list = query.all()
    
    # Filter and score personnel
    results = []
    min_level = PROFICIENCY_ORDER.get(min_proficiency, 0) if min_proficiency else 0
    
    for person in personnel_list:
        # Get person's skills as a dict for quick lookup
        person_skills = {ps.skill_id: ps for ps in person.skills}
        
        # Check if person has all required skills
        has_all_skills = True
        total_score = 0
        matched_skills = []
        
        for skill_id in skill_ids:
            if skill_id not in person_skills:
                has_all_skills = False
                break
            
            ps = person_skills[skill_id]
            
            # Check proficiency level
            if min_proficiency:
                person_level = PROFICIENCY_ORDER.get(ps.proficiency_level, 0)
                if person_level < min_level:
                    has_all_skills = False
                    break
            
            # Check certification
            if require_certified and not ps.is_certified:
                has_all_skills = False
                break
            
            # Check certification validity
            if require_certified and ps.certification_expiry:
                from datetime import date
                if ps.certification_expiry < date.today():
                    has_all_skills = False
                    break
            
            # Calculate score for this skill
            skill_score = PROFICIENCY_ORDER.get(ps.proficiency_level, 0)
            if ps.is_certified:
                skill_score += 1
            total_score += skill_score
            matched_skills.append(ps)
        
        if has_all_skills:
            results.append({
                'personnel': person,
                'match_score': total_score,
                'matched_skills': matched_skills,
            })
    
    # Sort by score descending
    results.sort(key=lambda x: x['match_score'], reverse=True)
    
    return results


def find_qualified_for_equipment(
    db: Session,
    equipment_id: int,
    status: Optional[PersonnelStatus] = None,
) -> List[dict]:
    """
    Find personnel qualified to operate a specific piece of equipment.
    
    Args:
        db: Database session
        equipment_id: Equipment ID to find qualified personnel for
        status: Filter by personnel status
    
    Returns:
        List of qualified personnel with match scores
    """
    # Get equipment with skill requirements
    equipment = db.query(Equipment).options(
        joinedload(Equipment.required_skills).joinedload(EquipmentSkillRequirement.skill)
    ).filter(Equipment.id == equipment_id).first()
    
    if not equipment:
        return []
    
    # No skill requirements means anyone can operate
    if not equipment.required_skills:
        query = db.query(Personnel).options(
            joinedload(Personnel.user),
            joinedload(Personnel.primary_laboratory),
        )
        if status:
            query = query.filter(Personnel.status == status)
        return [{'personnel': p, 'match_score': 100, 'matched_skills': []} for p in query.all()]
    
    # Build list of required skills with requirements
    required_skills = []
    for req in equipment.required_skills:
        required_skills.append({
            'skill_id': req.skill_id,
            'min_proficiency': req.minimum_proficiency,
            'require_certified': req.certification_required,
        })
    
    # Get all personnel with their skills
    query = db.query(Personnel).options(
        joinedload(Personnel.user),
        joinedload(Personnel.skills).joinedload(PersonnelSkill.skill),
        joinedload(Personnel.primary_laboratory),
    )
    
    if status:
        query = query.filter(Personnel.status == status)
    
    personnel_list = query.all()
    
    # Filter and score personnel
    results = []
    
    for person in personnel_list:
        person_skills = {ps.skill_id: ps for ps in person.skills}
        
        qualified = True
        total_score = 0
        matched_skills = []
        
        for req in required_skills:
            skill_id = req['skill_id']
            
            if skill_id not in person_skills:
                qualified = False
                break
            
            ps = person_skills[skill_id]
            
            # Check proficiency
            if req['min_proficiency']:
                min_level = PROFICIENCY_ORDER.get(req['min_proficiency'], 0)
                person_level = PROFICIENCY_ORDER.get(ps.proficiency_level, 0)
                if person_level < min_level:
                    qualified = False
                    break
            
            # Check certification
            if req['require_certified'] and not ps.is_certified:
                qualified = False
                break
            
            # Check certification validity
            if req['require_certified'] and ps.certification_expiry:
                from datetime import date
                if ps.certification_expiry < date.today():
                    qualified = False
                    break
            
            skill_score = PROFICIENCY_ORDER.get(ps.proficiency_level, 0)
            if ps.is_certified:
                skill_score += 1
            total_score += skill_score
            matched_skills.append(ps)
        
        if qualified:
            results.append({
                'personnel': person,
                'match_score': total_score,
                'matched_skills': matched_skills,
            })
    
    results.sort(key=lambda x: x['match_score'], reverse=True)
    
    return results


def calculate_skill_match_score(
    db: Session,
    personnel_id: int,
    required_skill_ids: List[int],
) -> dict:
    """
    Calculate how well a personnel matches a set of required skills.
    
    Args:
        db: Database session
        personnel_id: Personnel ID to evaluate
        required_skill_ids: List of required skill IDs
    
    Returns:
        Dict with match percentage and details
    """
    if not required_skill_ids:
        return {'match_percentage': 100, 'matched': [], 'missing': []}
    
    # Get personnel with skills
    personnel = db.query(Personnel).options(
        joinedload(Personnel.skills).joinedload(PersonnelSkill.skill)
    ).filter(Personnel.id == personnel_id).first()
    
    if not personnel:
        return {'match_percentage': 0, 'matched': [], 'missing': required_skill_ids}
    
    person_skill_ids = {ps.skill_id for ps in personnel.skills}
    
    matched = [sid for sid in required_skill_ids if sid in person_skill_ids]
    missing = [sid for sid in required_skill_ids if sid not in person_skill_ids]
    
    match_percentage = (len(matched) / len(required_skill_ids)) * 100
    
    return {
        'match_percentage': round(match_percentage, 1),
        'matched': matched,
        'missing': missing,
    }

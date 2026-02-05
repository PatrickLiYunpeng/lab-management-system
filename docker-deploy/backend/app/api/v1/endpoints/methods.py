"""
分析/测试方法管理API端点 - Method Management API Endpoints

本模块提供分析方法（FA实验室）和测试方法（Reliability实验室）的管理API。
方法定义了工单任务的具体执行规范，包括所需技能、标准周期时间等。

API端点列表:

方法管理:
- GET /methods: 分页获取方法列表
    - 支持按类型、类别、实验室、关键词搜索
- GET /methods/{method_id}: 获取单个方法详情（含技能要求）
- POST /methods: 创建新方法（Manager及以上角色）
- PUT /methods/{method_id}: 更新方法信息（Manager及以上角色）
- DELETE /methods/{method_id}: 删除方法（Manager及以上角色）

方法技能要求:
- GET /methods/{method_id}/skill-requirements: 获取方法的技能要求列表
- POST /methods/{method_id}/skill-requirements: 添加技能要求
- PUT /methods/skill-requirements/{id}: 更新技能要求
- DELETE /methods/skill-requirements/{id}: 删除技能要求

方法类型:
- ANALYSIS: 分析方法（FA实验室）
- TESTING: 测试方法（Reliability实验室）

方法属性:
- name: 方法名称
- code: 方法代码（唯一）
- method_type: 方法类型
- category: 方法类别
- description: 方法描述
- standard_cycle_hours: 标准周期时间（小时）
- requires_equipment: 是否需要设备
- equipment_id: 关联设备ID
- laboratory_id: 关联实验室ID
- is_active: 是否启用

技能要求:
- skill_id: 技能ID
- min_proficiency_level: 最低熟练度要求
- requires_certification: 是否需要证书

权限要求:
- 查询操作：所有已登录用户
- 创建/更新/删除：Manager及以上角色

业务规则:
- 方法代码必须唯一
- 方法类型必须与关联实验室类型匹配
- 任务分配时系统根据方法技能要求匹配合适人员
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.core.database import get_db
from app.models.method import Method, MethodType, MethodSkillRequirement
from app.models.laboratory import Laboratory
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
    site_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List methods with pagination and filtering.
    
    Args:
        site_id: Filter methods by site. Returns methods that either:
            - Have no laboratory_id (global methods available to all sites)
            - Belong to a laboratory in the specified site
    """
    query = db.query(Method).options(
        joinedload(Method.laboratory),
        joinedload(Method.default_equipment),
        joinedload(Method.skill_requirements).joinedload(MethodSkillRequirement.skill)
    )
    
    # site_id 筛选：返回全局方法（无 laboratory_id）或该站点的方法
    if site_id is not None:
        query = query.outerjoin(Laboratory, Method.laboratory_id == Laboratory.id)
        query = query.filter(
            or_(
                Method.laboratory_id.is_(None),  # 全局方法
                Laboratory.site_id == site_id    # 该站点的实验室方法
            )
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

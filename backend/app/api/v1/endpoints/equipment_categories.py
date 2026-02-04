"""
设备类别和设备名API端点 - Equipment Categories and Equipment Names API Endpoints

本模块提供设备类别和设备名称的CRUD操作API。
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.core.database import get_db
from app.models.equipment_category import EquipmentCategoryModel, EquipmentNameModel
from app.models.equipment import Equipment
from app.schemas.equipment_category import (
    EquipmentCategoryCreate,
    EquipmentCategoryUpdate,
    EquipmentCategoryResponse,
    EquipmentCategoryWithNames,
    EquipmentNameCreate,
    EquipmentNameUpdate,
    EquipmentNameResponse,
    EquipmentNameWithCategory,
)

router = APIRouter()


# ============== Equipment Category Endpoints ==============

@router.get("/equipment-categories", response_model=List[EquipmentCategoryResponse])
def get_equipment_categories(
    is_active: Optional[bool] = Query(None, description="按启用状态筛选"),
    db: Session = Depends(get_db)
):
    """
    获取所有设备类别
    
    - **is_active**: 可选，按启用状态筛选
    """
    query = db.query(EquipmentCategoryModel)
    
    if is_active is not None:
        query = query.filter(EquipmentCategoryModel.is_active == is_active)
    
    categories = query.order_by(EquipmentCategoryModel.display_order).all()
    return categories


@router.get("/equipment-categories/{category_id}", response_model=EquipmentCategoryWithNames)
def get_equipment_category(
    category_id: int,
    db: Session = Depends(get_db)
):
    """
    获取单个设备类别（包含设备名列表）
    """
    category = db.query(EquipmentCategoryModel).filter(
        EquipmentCategoryModel.id == category_id
    ).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="设备类别不存在")
    
    return category


@router.post("/equipment-categories", response_model=EquipmentCategoryResponse, status_code=201)
def create_equipment_category(
    category: EquipmentCategoryCreate,
    db: Session = Depends(get_db)
):
    """
    创建设备类别
    """
    # 检查名称是否已存在
    existing = db.query(EquipmentCategoryModel).filter(
        (EquipmentCategoryModel.name == category.name) | 
        (EquipmentCategoryModel.code == category.code)
    ).first()
    
    if existing:
        if existing.name == category.name:
            raise HTTPException(status_code=400, detail="类别名称已存在")
        else:
            raise HTTPException(status_code=400, detail="类别代码已存在")
    
    db_category = EquipmentCategoryModel(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category


@router.put("/equipment-categories/{category_id}", response_model=EquipmentCategoryResponse)
def update_equipment_category(
    category_id: int,
    category: EquipmentCategoryUpdate,
    db: Session = Depends(get_db)
):
    """
    更新设备类别
    """
    db_category = db.query(EquipmentCategoryModel).filter(
        EquipmentCategoryModel.id == category_id
    ).first()
    
    if not db_category:
        raise HTTPException(status_code=404, detail="设备类别不存在")
    
    # 检查名称或代码是否与其他记录冲突
    update_data = category.model_dump(exclude_unset=True)
    
    if 'name' in update_data:
        existing = db.query(EquipmentCategoryModel).filter(
            EquipmentCategoryModel.name == update_data['name'],
            EquipmentCategoryModel.id != category_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="类别名称已存在")
    
    if 'code' in update_data:
        existing = db.query(EquipmentCategoryModel).filter(
            EquipmentCategoryModel.code == update_data['code'],
            EquipmentCategoryModel.id != category_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="类别代码已存在")
    
    for key, value in update_data.items():
        setattr(db_category, key, value)
    
    db.commit()
    db.refresh(db_category)
    return db_category


@router.delete("/equipment-categories/{category_id}", status_code=204)
def delete_equipment_category(
    category_id: int,
    db: Session = Depends(get_db)
):
    """
    删除设备类别（需检查关联）
    """
    db_category = db.query(EquipmentCategoryModel).filter(
        EquipmentCategoryModel.id == category_id
    ).first()
    
    if not db_category:
        raise HTTPException(status_code=404, detail="设备类别不存在")
    
    # 检查是否有关联的设备名
    name_count = db.query(func.count(EquipmentNameModel.id)).filter(
        EquipmentNameModel.category_id == category_id
    ).scalar()
    
    if name_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"无法删除：该类别下有 {name_count} 个设备名，请先删除或转移设备名"
        )
    
    # 检查是否有直接关联的设备
    equipment_count = db.query(func.count(Equipment.id)).filter(
        Equipment.category_id == category_id
    ).scalar()
    
    if equipment_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"无法删除：该类别下有 {equipment_count} 台设备，请先转移设备"
        )
    
    db.delete(db_category)
    db.commit()
    return None


@router.get("/equipment-categories/{category_id}/names", response_model=List[EquipmentNameResponse])
def get_equipment_names_by_category(
    category_id: int,
    is_active: Optional[bool] = Query(None, description="按启用状态筛选"),
    db: Session = Depends(get_db)
):
    """
    获取指定类别下的所有设备名
    """
    # 检查类别是否存在
    category = db.query(EquipmentCategoryModel).filter(
        EquipmentCategoryModel.id == category_id
    ).first()
    
    if not category:
        raise HTTPException(status_code=404, detail="设备类别不存在")
    
    query = db.query(EquipmentNameModel).filter(
        EquipmentNameModel.category_id == category_id
    )
    
    if is_active is not None:
        query = query.filter(EquipmentNameModel.is_active == is_active)
    
    names = query.order_by(EquipmentNameModel.display_order).all()
    return names


# ============== Equipment Name Endpoints ==============

@router.get("/equipment-names", response_model=List[EquipmentNameWithCategory])
def get_equipment_names(
    category_id: Optional[int] = Query(None, description="按类别ID筛选"),
    is_active: Optional[bool] = Query(None, description="按启用状态筛选"),
    search: Optional[str] = Query(None, description="搜索设备名"),
    db: Session = Depends(get_db)
):
    """
    获取所有设备名
    
    - **category_id**: 可选，按类别ID筛选
    - **is_active**: 可选，按启用状态筛选
    - **search**: 可选，按名称搜索
    """
    query = db.query(EquipmentNameModel).options(
        joinedload(EquipmentNameModel.category)
    )
    
    if category_id is not None:
        query = query.filter(EquipmentNameModel.category_id == category_id)
    
    if is_active is not None:
        query = query.filter(EquipmentNameModel.is_active == is_active)
    
    if search:
        query = query.filter(EquipmentNameModel.name.ilike(f"%{search}%"))
    
    names = query.order_by(
        EquipmentNameModel.category_id,
        EquipmentNameModel.display_order
    ).all()
    return names


@router.get("/equipment-names/{name_id}", response_model=EquipmentNameWithCategory)
def get_equipment_name(
    name_id: int,
    db: Session = Depends(get_db)
):
    """
    获取单个设备名（包含类别信息）
    """
    name = db.query(EquipmentNameModel).filter(
        EquipmentNameModel.id == name_id
    ).first()
    
    if not name:
        raise HTTPException(status_code=404, detail="设备名不存在")
    
    return name


@router.post("/equipment-names", response_model=EquipmentNameResponse, status_code=201)
def create_equipment_name(
    name: EquipmentNameCreate,
    db: Session = Depends(get_db)
):
    """
    创建设备名
    """
    # 检查类别是否存在
    category = db.query(EquipmentCategoryModel).filter(
        EquipmentCategoryModel.id == name.category_id
    ).first()
    
    if not category:
        raise HTTPException(status_code=400, detail="设备类别不存在")
    
    # 检查同一类别下名称是否已存在
    existing = db.query(EquipmentNameModel).filter(
        EquipmentNameModel.category_id == name.category_id,
        EquipmentNameModel.name == name.name
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="该类别下已存在同名设备名")
    
    db_name = EquipmentNameModel(**name.model_dump())
    db.add(db_name)
    db.commit()
    db.refresh(db_name)
    return db_name


@router.put("/equipment-names/{name_id}", response_model=EquipmentNameResponse)
def update_equipment_name(
    name_id: int,
    name: EquipmentNameUpdate,
    db: Session = Depends(get_db)
):
    """
    更新设备名
    """
    db_name = db.query(EquipmentNameModel).filter(
        EquipmentNameModel.id == name_id
    ).first()
    
    if not db_name:
        raise HTTPException(status_code=404, detail="设备名不存在")
    
    update_data = name.model_dump(exclude_unset=True)
    
    # 如果要更新类别，检查新类别是否存在
    if 'category_id' in update_data:
        category = db.query(EquipmentCategoryModel).filter(
            EquipmentCategoryModel.id == update_data['category_id']
        ).first()
        if not category:
            raise HTTPException(status_code=400, detail="设备类别不存在")
    
    # 检查同一类别下名称是否冲突
    target_category_id = update_data.get('category_id', db_name.category_id)
    target_name = update_data.get('name', db_name.name)
    
    existing = db.query(EquipmentNameModel).filter(
        EquipmentNameModel.category_id == target_category_id,
        EquipmentNameModel.name == target_name,
        EquipmentNameModel.id != name_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="该类别下已存在同名设备名")
    
    for key, value in update_data.items():
        setattr(db_name, key, value)
    
    db.commit()
    db.refresh(db_name)
    return db_name


@router.delete("/equipment-names/{name_id}", status_code=204)
def delete_equipment_name(
    name_id: int,
    db: Session = Depends(get_db)
):
    """
    删除设备名（需检查关联）
    """
    db_name = db.query(EquipmentNameModel).filter(
        EquipmentNameModel.id == name_id
    ).first()
    
    if not db_name:
        raise HTTPException(status_code=404, detail="设备名不存在")
    
    # 检查是否有关联的设备
    equipment_count = db.query(func.count(Equipment.id)).filter(
        Equipment.equipment_name_id == name_id
    ).scalar()
    
    if equipment_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"无法删除：该设备名下有 {equipment_count} 台设备，请先转移设备"
        )
    
    db.delete(db_name)
    db.commit()
    return None

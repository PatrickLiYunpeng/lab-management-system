"""
产品管理API端点 - Product Management API Endpoints

本模块提供产品及其配置选项的CRUD操作API。
产品是工单处理的核心对象，关联封装形式、封装类型和应用场景等配置。

API端点列表:

产品配置（综合查询）:
- GET /products/config: 获取所有产品配置选项（用于表单下拉）

产品管理:
- GET /products: 分页获取产品列表，支持搜索和客户筛选
- GET /products/{product_id}: 获取单个产品详情
- POST /products: 创建新产品（Manager及以上角色）
- PUT /products/{product_id}: 更新产品信息（Manager及以上角色）
- DELETE /products/{product_id}: 删除产品（Manager及以上角色）

封装形式选项 (PackageFormOptions):
- GET /products/package-forms: 获取封装形式选项列表
- POST /products/package-forms: 创建封装形式选项
- PUT /products/package-forms/{id}: 更新封装形式选项
- DELETE /products/package-forms/{id}: 删除封装形式选项

封装产品类型选项 (PackageTypeOptions):
- GET /products/package-types: 获取封装类型选项列表
- POST /products/package-types: 创建封装类型选项
- PUT /products/package-types/{id}: 更新封装类型选项
- DELETE /products/package-types/{id}: 删除封装类型选项

应用场景 (ApplicationScenarios):
- GET /products/application-scenarios: 获取应用场景列表
- POST /products/application-scenarios: 创建应用场景
- PUT /products/application-scenarios/{id}: 更新应用场景
- DELETE /products/application-scenarios/{id}: 删除应用场景

产品应用场景关联:
- POST /products/{product_id}/scenarios: 为产品添加应用场景
- DELETE /products/{product_id}/scenarios/{scenario_id}: 移除产品应用场景

权限要求:
- 查询操作：所有已登录用户
- 创建/更新/删除：Manager及以上角色

业务规则:
- 产品必须关联客户
- 封装形式、类型、场景代码必须唯一
- 删除配置选项前需检查是否有产品引用
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.models.product import (
    Product, PackageFormOption, PackageTypeOption,
    ApplicationScenario, ProductApplicationScenario
)
from app.models.material import Client
from app.schemas.product import (
    # Product schemas
    ProductCreate, ProductUpdate, ProductResponse, ProductListResponse,
    # PackageFormOption schemas
    PackageFormOptionCreate, PackageFormOptionUpdate, 
    PackageFormOptionResponse, PackageFormOptionListResponse,
    # PackageTypeOption schemas
    PackageTypeOptionCreate, PackageTypeOptionUpdate,
    PackageTypeOptionResponse, PackageTypeOptionListResponse,
    # ApplicationScenario schemas
    ApplicationScenarioCreate, ApplicationScenarioUpdate,
    ApplicationScenarioResponse, ApplicationScenarioListResponse,
    # Combined config response
    ProductConfigResponse
)
from app.api.deps import get_current_active_user, require_manager_or_above
from app.models.user import User

router = APIRouter(prefix="/products", tags=["Products"])


# ============================================================================
# Product Configuration Endpoints (Combined)
# ============================================================================

@router.get("/config", response_model=ProductConfigResponse)
def get_product_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all product configuration options (for forms)."""
    package_forms = db.query(PackageFormOption).filter(
        PackageFormOption.is_active == True
    ).order_by(PackageFormOption.display_order, PackageFormOption.name).all()
    
    package_types = db.query(PackageTypeOption).filter(
        PackageTypeOption.is_active == True
    ).order_by(PackageTypeOption.display_order, PackageTypeOption.name).all()
    
    scenarios = db.query(ApplicationScenario).filter(
        ApplicationScenario.is_active == True
    ).order_by(ApplicationScenario.display_order, ApplicationScenario.name).all()
    
    return ProductConfigResponse(
        package_forms=[PackageFormOptionResponse.model_validate(item) for item in package_forms],
        package_types=[PackageTypeOptionResponse.model_validate(item) for item in package_types],
        application_scenarios=[ApplicationScenarioResponse.model_validate(item) for item in scenarios]
    )


# ============================================================================
# Product Endpoints
# ============================================================================

@router.get("", response_model=ProductListResponse)
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    client_id: Optional[int] = None,
    package_form_id: Optional[int] = None,
    package_type_id: Optional[int] = None,
    scenario_id: Optional[int] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all products with filtering and pagination."""
    query = db.query(Product).options(
        joinedload(Product.client),
        joinedload(Product.package_form),
        joinedload(Product.package_type),
        joinedload(Product.scenario_associations).joinedload(ProductApplicationScenario.scenario)
    )
    
    if client_id:
        query = query.filter(Product.client_id == client_id)
    if package_form_id:
        query = query.filter(Product.package_form_id == package_form_id)
    if package_type_id:
        query = query.filter(Product.package_type_id == package_type_id)
    if scenario_id:
        query = query.join(ProductApplicationScenario).filter(
            ProductApplicationScenario.scenario_id == scenario_id
        )
    if search:
        query = query.filter(
            (Product.name.ilike(f"%{search}%")) |
            (Product.code.ilike(f"%{search}%"))
        )
    if is_active is not None:
        query = query.filter(Product.is_active == is_active)
    
    # Get unique count (scenario filter may cause duplicates)
    total = query.distinct().count()
    offset = (page - 1) * page_size
    items = query.distinct().order_by(Product.created_at.desc()).offset(offset).limit(page_size).all()
    
    # Transform to response format
    response_items = []
    for product in items:
        product_dict = ProductResponse.model_validate(product).model_dump()
        product_dict['scenarios'] = [
            {
                'id': assoc.scenario.id,
                'name': assoc.scenario.name,
                'code': assoc.scenario.code,
                'color': assoc.scenario.color
            }
            for assoc in product.scenario_associations
            if assoc.scenario and assoc.scenario.is_active
        ]
        response_items.append(product_dict)
    
    return ProductListResponse(
        items=response_items,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific product by ID."""
    product = db.query(Product).options(
        joinedload(Product.client),
        joinedload(Product.package_form),
        joinedload(Product.package_type),
        joinedload(Product.scenario_associations).joinedload(ProductApplicationScenario.scenario)
    ).filter(Product.id == product_id).first()
    
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    
    # Build response with scenarios
    response = ProductResponse.model_validate(product).model_dump()
    response['scenarios'] = [
        {
            'id': assoc.scenario.id,
            'name': assoc.scenario.name,
            'code': assoc.scenario.code,
            'color': assoc.scenario.color
        }
        for assoc in product.scenario_associations
        if assoc.scenario and assoc.scenario.is_active
    ]
    
    return response


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Create a new product. Requires manager or above role."""
    # Verify client exists
    client = db.query(Client).filter(Client.id == data.client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Client not found")
    
    # Verify package_form if specified
    if data.package_form_id:
        package_form = db.query(PackageFormOption).filter(
            PackageFormOption.id == data.package_form_id,
            PackageFormOption.is_active == True
        ).first()
        if not package_form:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Package form not found")
    
    # Verify package_type if specified
    if data.package_type_id:
        package_type = db.query(PackageTypeOption).filter(
            PackageTypeOption.id == data.package_type_id,
            PackageTypeOption.is_active == True
        ).first()
        if not package_type:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Package type not found")
    
    # Create product (exclude scenario_ids from model creation)
    product_data = data.model_dump(exclude={'scenario_ids'})
    product = Product(**product_data)
    db.add(product)
    db.flush()  # Get the product ID
    
    # Add scenario associations
    if data.scenario_ids:
        for scenario_id in data.scenario_ids:
            scenario = db.query(ApplicationScenario).filter(
                ApplicationScenario.id == scenario_id,
                ApplicationScenario.is_active == True
            ).first()
            if scenario:
                assoc = ProductApplicationScenario(
                    product_id=product.id,
                    scenario_id=scenario_id
                )
                db.add(assoc)
    
    db.commit()
    
    # Reload with relationships
    product = db.query(Product).options(
        joinedload(Product.client),
        joinedload(Product.package_form),
        joinedload(Product.package_type),
        joinedload(Product.scenario_associations).joinedload(ProductApplicationScenario.scenario)
    ).filter(Product.id == product.id).first()
    
    # Build response
    response = ProductResponse.model_validate(product).model_dump()
    response['scenarios'] = [
        {
            'id': assoc.scenario.id,
            'name': assoc.scenario.name,
            'code': assoc.scenario.code,
            'color': assoc.scenario.color
        }
        for assoc in product.scenario_associations
        if assoc.scenario and assoc.scenario.is_active
    ]
    
    return response


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Update a product. Requires manager or above role."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Verify client if being updated
    if "client_id" in update_data:
        client = db.query(Client).filter(Client.id == update_data["client_id"]).first()
        if not client:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Client not found")
    
    # Verify package_form if being updated
    if "package_form_id" in update_data and update_data["package_form_id"]:
        package_form = db.query(PackageFormOption).filter(
            PackageFormOption.id == update_data["package_form_id"],
            PackageFormOption.is_active == True
        ).first()
        if not package_form:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Package form not found")
    
    # Verify package_type if being updated
    if "package_type_id" in update_data and update_data["package_type_id"]:
        package_type = db.query(PackageTypeOption).filter(
            PackageTypeOption.id == update_data["package_type_id"],
            PackageTypeOption.is_active == True
        ).first()
        if not package_type:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Package type not found")
    
    # Handle scenario_ids update
    scenario_ids = update_data.pop('scenario_ids', None)
    if scenario_ids is not None:
        # Remove existing associations
        db.query(ProductApplicationScenario).filter(
            ProductApplicationScenario.product_id == product_id
        ).delete()
        
        # Add new associations
        for scenario_id in scenario_ids:
            scenario = db.query(ApplicationScenario).filter(
                ApplicationScenario.id == scenario_id,
                ApplicationScenario.is_active == True
            ).first()
            if scenario:
                assoc = ProductApplicationScenario(
                    product_id=product_id,
                    scenario_id=scenario_id
                )
                db.add(assoc)
    
    # Update other fields
    for field, value in update_data.items():
        setattr(product, field, value)
    
    db.commit()
    
    # Reload with relationships
    product = db.query(Product).options(
        joinedload(Product.client),
        joinedload(Product.package_form),
        joinedload(Product.package_type),
        joinedload(Product.scenario_associations).joinedload(ProductApplicationScenario.scenario)
    ).filter(Product.id == product_id).first()
    
    # Build response
    response = ProductResponse.model_validate(product).model_dump()
    response['scenarios'] = [
        {
            'id': assoc.scenario.id,
            'name': assoc.scenario.name,
            'code': assoc.scenario.code,
            'color': assoc.scenario.color
        }
        for assoc in product.scenario_associations
        if assoc.scenario and assoc.scenario.is_active
    ]
    
    return response


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Delete a product. Requires manager or above role."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    
    db.delete(product)
    db.commit()


# ============================================================================
# Package Form Option Endpoints (封装形式配置)
# ============================================================================

@router.get("/config/package-forms", response_model=PackageFormOptionListResponse)
def list_package_forms(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all package form options with pagination."""
    query = db.query(PackageFormOption)
    
    if search:
        query = query.filter(
            (PackageFormOption.name.ilike(f"%{search}%")) |
            (PackageFormOption.code.ilike(f"%{search}%"))
        )
    if is_active is not None:
        query = query.filter(PackageFormOption.is_active == is_active)
    
    total = query.count()
    offset = (page - 1) * page_size
    items = query.order_by(PackageFormOption.display_order, PackageFormOption.name).offset(offset).limit(page_size).all()
    
    return PackageFormOptionListResponse(
        items=[PackageFormOptionResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/config/package-forms", response_model=PackageFormOptionResponse, status_code=status.HTTP_201_CREATED)
def create_package_form(
    data: PackageFormOptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Create a new package form option. Requires manager or above role."""
    # Check for duplicate code
    existing = db.query(PackageFormOption).filter(PackageFormOption.code == data.code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Package form code already exists")
    
    # If this is marked as default, unset other defaults
    if data.is_default:
        db.query(PackageFormOption).filter(PackageFormOption.is_default == True).update({"is_default": False})
    
    option = PackageFormOption(**data.model_dump())
    db.add(option)
    db.commit()
    db.refresh(option)
    
    return PackageFormOptionResponse.model_validate(option)


@router.put("/config/package-forms/{option_id}", response_model=PackageFormOptionResponse)
def update_package_form(
    option_id: int,
    data: PackageFormOptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Update a package form option. Requires manager or above role."""
    option = db.query(PackageFormOption).filter(PackageFormOption.id == option_id).first()
    if not option:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package form option not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Check for duplicate code if being updated
    if "code" in update_data and update_data["code"] != option.code:
        existing = db.query(PackageFormOption).filter(PackageFormOption.code == update_data["code"]).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Package form code already exists")
    
    # If setting as default, unset other defaults
    if update_data.get("is_default"):
        db.query(PackageFormOption).filter(
            PackageFormOption.id != option_id,
            PackageFormOption.is_default == True
        ).update({"is_default": False})
    
    for field, value in update_data.items():
        setattr(option, field, value)
    
    db.commit()
    db.refresh(option)
    
    return PackageFormOptionResponse.model_validate(option)


@router.delete("/config/package-forms/{option_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_package_form(
    option_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Delete a package form option. Requires manager or above role."""
    option = db.query(PackageFormOption).filter(PackageFormOption.id == option_id).first()
    if not option:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package form option not found")
    
    # Check if in use
    products_using = db.query(Product).filter(Product.package_form_id == option_id).count()
    if products_using > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete: {products_using} products are using this package form"
        )
    
    db.delete(option)
    db.commit()


# ============================================================================
# Package Type Option Endpoints (封装产品类型配置)
# ============================================================================

@router.get("/config/package-types", response_model=PackageTypeOptionListResponse)
def list_package_types(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all package type options with pagination."""
    query = db.query(PackageTypeOption)
    
    if search:
        query = query.filter(
            (PackageTypeOption.name.ilike(f"%{search}%")) |
            (PackageTypeOption.code.ilike(f"%{search}%"))
        )
    if is_active is not None:
        query = query.filter(PackageTypeOption.is_active == is_active)
    
    total = query.count()
    offset = (page - 1) * page_size
    items = query.order_by(PackageTypeOption.display_order, PackageTypeOption.name).offset(offset).limit(page_size).all()
    
    return PackageTypeOptionListResponse(
        items=[PackageTypeOptionResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/config/package-types", response_model=PackageTypeOptionResponse, status_code=status.HTTP_201_CREATED)
def create_package_type(
    data: PackageTypeOptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Create a new package type option. Requires manager or above role."""
    # Check for duplicate code
    existing = db.query(PackageTypeOption).filter(PackageTypeOption.code == data.code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Package type code already exists")
    
    # If this is marked as default, unset other defaults
    if data.is_default:
        db.query(PackageTypeOption).filter(PackageTypeOption.is_default == True).update({"is_default": False})
    
    option = PackageTypeOption(**data.model_dump())
    db.add(option)
    db.commit()
    db.refresh(option)
    
    return PackageTypeOptionResponse.model_validate(option)


@router.put("/config/package-types/{option_id}", response_model=PackageTypeOptionResponse)
def update_package_type(
    option_id: int,
    data: PackageTypeOptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Update a package type option. Requires manager or above role."""
    option = db.query(PackageTypeOption).filter(PackageTypeOption.id == option_id).first()
    if not option:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package type option not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Check for duplicate code if being updated
    if "code" in update_data and update_data["code"] != option.code:
        existing = db.query(PackageTypeOption).filter(PackageTypeOption.code == update_data["code"]).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Package type code already exists")
    
    # If setting as default, unset other defaults
    if update_data.get("is_default"):
        db.query(PackageTypeOption).filter(
            PackageTypeOption.id != option_id,
            PackageTypeOption.is_default == True
        ).update({"is_default": False})
    
    for field, value in update_data.items():
        setattr(option, field, value)
    
    db.commit()
    db.refresh(option)
    
    return PackageTypeOptionResponse.model_validate(option)


@router.delete("/config/package-types/{option_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_package_type(
    option_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Delete a package type option. Requires manager or above role."""
    option = db.query(PackageTypeOption).filter(PackageTypeOption.id == option_id).first()
    if not option:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package type option not found")
    
    # Check if in use
    products_using = db.query(Product).filter(Product.package_type_id == option_id).count()
    if products_using > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete: {products_using} products are using this package type"
        )
    
    db.delete(option)
    db.commit()


# ============================================================================
# Application Scenario Endpoints (应用场景配置)
# ============================================================================

@router.get("/config/scenarios", response_model=ApplicationScenarioListResponse)
def list_scenarios(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all application scenarios with pagination."""
    query = db.query(ApplicationScenario)
    
    if search:
        query = query.filter(
            (ApplicationScenario.name.ilike(f"%{search}%")) |
            (ApplicationScenario.code.ilike(f"%{search}%"))
        )
    if is_active is not None:
        query = query.filter(ApplicationScenario.is_active == is_active)
    
    total = query.count()
    offset = (page - 1) * page_size
    items = query.order_by(ApplicationScenario.display_order, ApplicationScenario.name).offset(offset).limit(page_size).all()
    
    return ApplicationScenarioListResponse(
        items=[ApplicationScenarioResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/config/scenarios", response_model=ApplicationScenarioResponse, status_code=status.HTTP_201_CREATED)
def create_scenario(
    data: ApplicationScenarioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Create a new application scenario. Requires manager or above role."""
    # Check for duplicate code
    existing = db.query(ApplicationScenario).filter(ApplicationScenario.code == data.code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Scenario code already exists")
    
    # If this is marked as default, unset other defaults
    if data.is_default:
        db.query(ApplicationScenario).filter(ApplicationScenario.is_default == True).update({"is_default": False})
    
    scenario = ApplicationScenario(**data.model_dump())
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    
    return ApplicationScenarioResponse.model_validate(scenario)


@router.put("/config/scenarios/{scenario_id}", response_model=ApplicationScenarioResponse)
def update_scenario(
    scenario_id: int,
    data: ApplicationScenarioUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Update an application scenario. Requires manager or above role."""
    scenario = db.query(ApplicationScenario).filter(ApplicationScenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application scenario not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Check for duplicate code if being updated
    if "code" in update_data and update_data["code"] != scenario.code:
        existing = db.query(ApplicationScenario).filter(ApplicationScenario.code == update_data["code"]).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Scenario code already exists")
    
    # If setting as default, unset other defaults
    if update_data.get("is_default"):
        db.query(ApplicationScenario).filter(
            ApplicationScenario.id != scenario_id,
            ApplicationScenario.is_default == True
        ).update({"is_default": False})
    
    for field, value in update_data.items():
        setattr(scenario, field, value)
    
    db.commit()
    db.refresh(scenario)
    
    return ApplicationScenarioResponse.model_validate(scenario)


@router.delete("/config/scenarios/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scenario(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_above)
):
    """Delete an application scenario. Requires manager or above role."""
    scenario = db.query(ApplicationScenario).filter(ApplicationScenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application scenario not found")
    
    # Check if in use
    products_using = db.query(ProductApplicationScenario).filter(
        ProductApplicationScenario.scenario_id == scenario_id
    ).count()
    if products_using > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete: {products_using} products are using this scenario"
        )
    
    db.delete(scenario)
    db.commit()

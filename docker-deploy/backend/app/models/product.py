"""
产品管理模型 - Product Management Models

本模块定义产品管理相关的模型，包括产品主表、封装形式配置、
封装产品类型配置、应用场景配置以及产品-场景关联表。

数据关系:
- Product N:1 Client (多个产品属于一个客户)
- Product N:1 PackageFormOption (产品使用一种封装形式)
- Product N:1 PackageTypeOption (产品使用一种封装类型)
- Product N:M ApplicationScenario (产品可有多个应用场景，通过关联表)

业务说明:
- 封装形式、封装类型、应用场景均为可配置项，支持动态增删改
- 产品可关联客户，便于客户产品管理
- 产品信息支持最多5条自定义字符串，每条不超过200字
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow():
    """获取当前UTC时间（带时区信息）"""
    return datetime.now(timezone.utc)


class PackageFormOption(Base):
    """
    封装形式配置表
    
    存储可选的封装形式选项，如 FC-BGA, FC-LGA, FC-PGA, 231 等。
    支持动态增删改配置项。
    
    Attributes:
        id: 主键ID
        name: 封装形式名称（如 FC-BGA）
        code: 封装形式代码（唯一标识）
        display_order: 显示顺序
        description: 描述说明
        is_active: 是否启用
        is_default: 是否为默认选项
        created_at: 创建时间
        updated_at: 更新时间
    """
    __tablename__ = "package_form_options"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True, comment="封装形式名称")
    code = Column(String(50), nullable=False, unique=True, index=True, comment="封装形式代码")
    display_order = Column(Integer, default=0, comment="显示顺序")
    description = Column(Text, nullable=True, comment="描述说明")
    is_active = Column(Boolean, default=True, comment="是否启用")
    is_default = Column(Boolean, default=False, comment="是否为默认选项")
    created_at = Column(DateTime(timezone=True), default=utcnow, comment="创建时间")
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, comment="更新时间")
    
    # 关联产品
    products = relationship("Product", back_populates="package_form")
    
    def __repr__(self):
        return f"<PackageFormOption(id={self.id}, name='{self.name}', code='{self.code}')>"


class PackageTypeOption(Base):
    """
    封装产品类型配置表
    
    存储可选的封装产品类型选项，如 exposed Die, Lided with TIM 等。
    支持动态增删改配置项。
    
    Attributes:
        id: 主键ID
        name: 封装类型名称
        code: 封装类型代码（唯一标识）
        display_order: 显示顺序
        description: 描述说明
        is_active: 是否启用
        is_default: 是否为默认选项
        created_at: 创建时间
        updated_at: 更新时间
    """
    __tablename__ = "package_type_options"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True, comment="封装类型名称")
    code = Column(String(50), nullable=False, unique=True, index=True, comment="封装类型代码")
    display_order = Column(Integer, default=0, comment="显示顺序")
    description = Column(Text, nullable=True, comment="描述说明")
    is_active = Column(Boolean, default=True, comment="是否启用")
    is_default = Column(Boolean, default=False, comment="是否为默认选项")
    created_at = Column(DateTime(timezone=True), default=utcnow, comment="创建时间")
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, comment="更新时间")
    
    # 关联产品
    products = relationship("Product", back_populates="package_type")
    
    def __repr__(self):
        return f"<PackageTypeOption(id={self.id}, name='{self.name}', code='{self.code}')>"


class ApplicationScenario(Base):
    """
    应用场景配置表
    
    存储可选的产品应用场景选项，如 车载、服务器、算力、AI、消费、工业 等。
    支持动态增删改配置项，产品可多选应用场景。
    
    Attributes:
        id: 主键ID
        name: 应用场景名称
        code: 应用场景代码（唯一标识）
        display_order: 显示顺序
        description: 描述说明
        color: UI显示颜色（如 #1890ff）
        is_active: 是否启用
        is_default: 是否为默认选项
        created_at: 创建时间
        updated_at: 更新时间
    """
    __tablename__ = "application_scenarios"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True, comment="应用场景名称")
    code = Column(String(50), nullable=False, unique=True, index=True, comment="应用场景代码")
    display_order = Column(Integer, default=0, comment="显示顺序")
    description = Column(Text, nullable=True, comment="描述说明")
    color = Column(String(20), nullable=True, comment="UI显示颜色")
    is_active = Column(Boolean, default=True, comment="是否启用")
    is_default = Column(Boolean, default=False, comment="是否为默认选项")
    created_at = Column(DateTime(timezone=True), default=utcnow, comment="创建时间")
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, comment="更新时间")
    
    # 多对多关联产品
    product_associations = relationship("ProductApplicationScenario", back_populates="scenario", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ApplicationScenario(id={self.id}, name='{self.name}', code='{self.code}')>"


class Product(Base):
    """
    产品主表
    
    存储产品基本信息，包括产品名称、代码、所属客户、封装形式、
    封装类型、应用场景（多选）以及自定义产品信息。
    
    Attributes:
        id: 主键ID
        name: 产品名称
        code: 产品代码（唯一标识）
        client_id: 所属客户ID（外键）
        package_form_id: 封装形式ID（外键，可选）
        package_type_id: 封装类型ID（外键，可选）
        custom_info: 自定义产品信息（JSON数组，最多5条，每条不超过200字）
        is_active: 是否启用
        created_at: 创建时间
        updated_at: 更新时间
    
    Relationships:
        client: 所属客户
        package_form: 封装形式
        package_type: 封装类型
        scenario_associations: 应用场景关联（多对多）
    """
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(200), nullable=False, index=True, comment="产品名称")
    code = Column(String(50), nullable=False, unique=True, index=True, comment="产品代码")
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True, comment="所属客户ID")
    package_form_id = Column(Integer, ForeignKey("package_form_options.id"), nullable=True, comment="封装形式ID")
    package_type_id = Column(Integer, ForeignKey("package_type_options.id"), nullable=True, comment="封装类型ID")
    custom_info = Column(JSON, nullable=True, comment="自定义产品信息，JSON数组格式[{key, value}]")
    is_active = Column(Boolean, default=True, comment="是否启用")
    created_at = Column(DateTime(timezone=True), default=utcnow, comment="创建时间")
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, comment="更新时间")
    
    # 关联关系
    client = relationship("Client", back_populates="products")
    package_form = relationship("PackageFormOption", back_populates="products")
    package_type = relationship("PackageTypeOption", back_populates="products")
    scenario_associations = relationship("ProductApplicationScenario", back_populates="product", cascade="all, delete-orphan")
    
    @property
    def scenarios(self):
        """获取产品的所有应用场景"""
        return [assoc.scenario for assoc in self.scenario_associations]
    
    def __repr__(self):
        return f"<Product(id={self.id}, name='{self.name}', code='{self.code}')>"


class ProductApplicationScenario(Base):
    """
    产品-应用场景关联表
    
    多对多关联表，连接产品和应用场景。
    
    Attributes:
        id: 主键ID
        product_id: 产品ID（外键）
        scenario_id: 应用场景ID（外键）
        created_at: 创建时间
    """
    __tablename__ = "product_application_scenarios"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True, comment="产品ID")
    scenario_id = Column(Integer, ForeignKey("application_scenarios.id", ondelete="CASCADE"), nullable=False, index=True, comment="应用场景ID")
    created_at = Column(DateTime(timezone=True), default=utcnow, comment="创建时间")
    
    # 关联关系
    product = relationship("Product", back_populates="scenario_associations")
    scenario = relationship("ApplicationScenario", back_populates="product_associations")
    
    def __repr__(self):
        return f"<ProductApplicationScenario(product_id={self.product_id}, scenario_id={self.scenario_id})>"

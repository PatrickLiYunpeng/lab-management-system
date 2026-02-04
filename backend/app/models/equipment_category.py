"""
设备类别和设备名模型 - Equipment Category and Equipment Name Models

本模块定义设备类别和设备名称管理相关的模型，用于实现：
- 设备类别的动态管理（替代原有枚举方式）
- 设备名称的分类管理（如"万用表"而非"万用表001"）
- 设备编辑时的级联选择（先选类别，再选设备名）

数据关系:
- EquipmentCategoryModel 1:N EquipmentNameModel (一个类别有多个设备名)
- EquipmentNameModel 1:N Equipment (一个设备名对应多台设备)
- EquipmentCategoryModel 1:N Equipment (一个类别有多台设备)

业务说明:
- 系统预置8个设备类别，支持增删改
- 设备名称按类别分类管理
- 删除类别或设备名前需检查关联设备
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow():
    """
    获取当前UTC时间（带时区信息）
    
    Returns:
        datetime: 当前UTC时间，包含时区信息
    """
    return datetime.now(timezone.utc)


class EquipmentCategoryModel(Base):
    """
    设备类别模型
    
    管理设备的分类信息，支持动态增删改。
    
    Attributes:
        id: 主键，自增整数
        name: 类别名称（中文），如"电学分析"
        code: 类别代码（英文），如"electrical_analysis"
        description: 类别描述
        display_order: 显示顺序，用于排序
        is_active: 是否启用
        created_at: 创建时间
        updated_at: 更新时间
    
    Relationships:
        equipment_names: 该类别下的所有设备名
        equipment: 该类别下的所有设备
    """
    __tablename__ = "equipment_categories"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 基本信息
    name = Column(String(100), nullable=False, unique=True, index=True)  # 类别名称（中文）
    code = Column(String(50), nullable=False, unique=True, index=True)   # 类别代码（英文）
    description = Column(Text, nullable=True)                             # 类别描述
    
    # 显示顺序
    display_order = Column(Integer, default=0)  # 显示顺序
    
    # 状态
    is_active = Column(Boolean, default=True)  # 是否启用
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)                     # 创建时间
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)    # 更新时间

    # 关联关系
    equipment_names = relationship(
        "EquipmentNameModel", 
        back_populates="category",
        cascade="all, delete-orphan"
    )  # 该类别下的设备名

    def __repr__(self):
        """返回设备类别对象的字符串表示"""
        return f"<EquipmentCategoryModel(id={self.id}, name='{self.name}', code='{self.code}')>"


class EquipmentNameModel(Base):
    """
    设备名称模型
    
    管理设备名称（不含编号），支持按类别分类管理。
    
    Attributes:
        id: 主键，自增整数
        category_id: 所属类别ID
        name: 设备名称（不含编号），如"万用表"
        description: 设备描述
        display_order: 显示顺序，用于排序
        is_active: 是否启用
        created_at: 创建时间
        updated_at: 更新时间
    
    Relationships:
        category: 所属类别
    """
    __tablename__ = "equipment_names"
    
    # 唯一约束：同一类别下名称唯一
    __table_args__ = (
        UniqueConstraint('category_id', 'name', name='uq_equipment_name_category'),
    )

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 所属类别
    category_id = Column(Integer, ForeignKey("equipment_categories.id"), nullable=False, index=True)
    
    # 基本信息
    name = Column(String(100), nullable=False, index=True)  # 设备名称（不含编号）
    description = Column(Text, nullable=True)                # 设备描述
    
    # 显示顺序
    display_order = Column(Integer, default=0)  # 显示顺序
    
    # 状态
    is_active = Column(Boolean, default=True)  # 是否启用
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)                     # 创建时间
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)    # 更新时间

    # 关联关系
    category = relationship("EquipmentCategoryModel", back_populates="equipment_names")  # 所属类别

    def __repr__(self):
        """返回设备名称对象的字符串表示"""
        return f"<EquipmentNameModel(id={self.id}, name='{self.name}', category_id={self.category_id})>"

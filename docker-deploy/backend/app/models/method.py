"""
方法模型 - Method Model

本模块定义FA和可靠性实验室的分析/测试方法模型。
方法定义标准操作流程、所需技能和预期周期时间。

数据关系:
- Method N:1 Laboratory (多个方法属于一个实验室，或null表示通用)
- Method N:1 Equipment (方法可有默认设备)
- Method 1:N MethodSkillRequirement (一个方法需要多个技能)
- Method 1:N WorkOrderTask (一个方法用于多个任务)

业务说明:
- 方法分两种类型：分析方法(FA实验室)和可靠性方法(可靠性实验室)
- 方法定义标准周期时间，用于任务计划和绩效评估
- 方法可指定设备要求和技能要求，用于任务分配匹配
"""
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow():
    """
    获取当前UTC时间（带时区信息）
    
    Returns:
        datetime: 当前UTC时间，包含时区信息
    """
    return datetime.now(timezone.utc)


class MethodType(str, Enum):
    """
    方法类型枚举
    
    区分不同实验室使用的方法类型。
    
    Values:
        ANALYSIS: 分析方法 - FA实验室使用
        RELIABILITY: 可靠性方法 - 可靠性实验室使用
    """
    ANALYSIS = "analysis"        # 分析方法（FA实验室）
    RELIABILITY = "reliability"  # 可靠性方法


class Method(Base):
    """
    分析/测试方法模型
    
    定义FA和可靠性实验室的标准操作流程、技能要求和预期周期时间。
    
    Attributes:
        id: 主键
        name: 方法名称
        code: 方法代码，唯一标识
        method_type: 方法类型
        category: 分类（如decap、SEM、HTSL、THB）
        description: 方法描述
        procedure_summary: 操作步骤摘要
        laboratory_id: 实验室ID
        standard_cycle_hours: 标准周期时间
        min_cycle_hours: 最小周期时间
        max_cycle_hours: 最大周期时间
        requires_equipment: 是否需要设备
        default_equipment_id: 默认设备ID
        is_active: 是否激活
        created_at: 创建时间
        updated_at: 更新时间
    
    Relationships:
        laboratory: 关联实验室
        default_equipment: 默认设备
        skill_requirements: 技能要求列表
    """
    __tablename__ = "methods"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 标识信息
    name = Column(String(100), nullable=False, index=True)                    # 方法名称
    code = Column(String(30), unique=True, nullable=False, index=True)        # 方法代码
    method_type = Column(SQLEnum(MethodType), nullable=False, index=True)     # 方法类型
    
    # 分类
    category = Column(String(50), nullable=True)  # 如 "decap"/"SEM"/"HTSL"/"THB"
    
    # 描述和说明
    description = Column(Text, nullable=True)         # 方法描述
    procedure_summary = Column(Text, nullable=True)   # 操作步骤摘要
    
    # 实验室关联
    laboratory_id = Column(Integer, ForeignKey("laboratories.id"), nullable=True)
    
    # 周期时间配置
    standard_cycle_hours = Column(Float, nullable=True)  # 标准周期时间
    min_cycle_hours = Column(Float, nullable=True)       # 最小周期时间
    max_cycle_hours = Column(Float, nullable=True)       # 最大周期时间
    
    # 设备要求
    requires_equipment = Column(Boolean, default=True)                         # 是否需要设备
    default_equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=True)  # 默认设备
    
    # 状态
    is_active = Column(Boolean, default=True)  # 是否激活
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)                   # 创建时间
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)  # 更新时间
    
    # 关联关系
    laboratory = relationship("Laboratory", backref="methods")            # 关联实验室
    default_equipment = relationship("Equipment", backref="default_for_methods")  # 默认设备
    skill_requirements = relationship("MethodSkillRequirement", back_populates="method", cascade="all, delete-orphan")


class MethodSkillRequirement(Base):
    """
    方法技能要求模型
    
    定义执行特定方法所需的技能和熟练度要求。
    
    Attributes:
        id: 主键
        method_id: 方法ID
        skill_id: 技能ID
        min_proficiency_level: 最低熟练度要求
        requires_certification: 是否要求认证
        created_at: 创建时间
    
    Relationships:
        method: 关联方法
        skill: 关联技能
    """
    __tablename__ = "method_skill_requirements"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 关联信息
    method_id = Column(Integer, ForeignKey("methods.id", ondelete="CASCADE"), nullable=False, index=True)  # 方法ID
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False, index=True)  # 技能ID
    
    # 熟练度要求
    min_proficiency_level = Column(String(20), default="intermediate")  # 最低熟练度：beginner/intermediate/advanced/expert
    requires_certification = Column(Boolean, default=False)             # 是否要求认证
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)  # 创建时间
    
    # 关联关系
    method = relationship("Method", back_populates="skill_requirements")  # 关联方法
    skill = relationship("Skill")                                          # 关联技能

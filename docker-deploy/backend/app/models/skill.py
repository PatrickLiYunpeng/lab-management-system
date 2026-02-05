"""
技能模型 - Skill Model

本模块定义人员技能管理相关的模型，包括技能定义、熟练度级别和认证追踪。
支持技能分类管理，用于任务分配时的技能匹配。

数据关系:
- Skill 1:N PersonnelSkill (一个技能可被多个人员掌握)
- Skill 1:N EquipmentSkillRequirement (一个技能可被多个设备要求)
- Skill 1:N MethodSkillRequirement (一个技能可被多个方法要求)

业务说明:
- 技能按分类组织：设备操作、测试方法、分析技术、软件工具、安全规程
- 技能可设置是否需要认证及认证有效期
- 技能熟练度分4级：初级、中级、高级、专家
- 技能可关联特定实验室类型(FA/Reliability)或通用
"""
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum, Date
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow():
    """
    获取当前UTC时间（带时区信息）
    
    Returns:
        datetime: 当前UTC时间，包含时区信息
    """
    return datetime.now(timezone.utc)


class ProficiencyLevel(str, Enum):
    """
    技能熟练度级别枚举
    
    定义人员掌握某项技能的熟练程度，用于任务分配时的能力匹配。
    
    Values:
        BEGINNER: 初级 - 基础了解，需要指导
        INTERMEDIATE: 中级 - 可独立操作常规任务
        ADVANCED: 高级 - 可处理复杂任务，能指导他人
        EXPERT: 专家 - 精通该领域，可制定标准
    """
    BEGINNER = "beginner"        # 初级
    INTERMEDIATE = "intermediate"  # 中级
    ADVANCED = "advanced"         # 高级
    EXPERT = "expert"            # 专家


class SkillCategory(str, Enum):
    """
    技能分类枚举
    
    将技能按功能领域分类，便于管理和查询。
    
    Values:
        EQUIPMENT_OPERATION: 设备操作 - 操作实验室设备的技能
        TESTING_METHOD: 测试方法 - 执行测试流程的技能
        ANALYSIS_TECHNIQUE: 分析技术 - 分析测试结果的技能
        SOFTWARE_TOOL: 软件工具 - 使用软件系统的技能
        SAFETY_PROCEDURE: 安全规程 - 安全操作相关的技能
        OTHER: 其他
    """
    EQUIPMENT_OPERATION = "equipment_operation"    # 设备操作
    TESTING_METHOD = "testing_method"              # 测试方法
    ANALYSIS_TECHNIQUE = "analysis_technique"      # 分析技术
    SOFTWARE_TOOL = "software_tool"                # 软件工具
    SAFETY_PROCEDURE = "safety_procedure"          # 安全规程
    OTHER = "other"                                # 其他


class Skill(Base):
    """
    技能定义模型
    
    定义系统中可用的技能，包括名称、分类、认证要求等。
    技能作为任务分配的匹配依据，确保合适的人员执行相应任务。
    
    Attributes:
        id: 主键，自增整数
        name: 技能名称，唯一
        code: 技能代码，唯一标识
        category: 技能分类
        description: 技能描述
        requires_certification: 是否需要认证
        certification_validity_days: 认证有效期（天）
        lab_type: 关联的实验室类型（fa/reliability/null通用）
        is_active: 是否激活
        created_at: 创建时间
        updated_at: 更新时间
    
    Relationships:
        personnel_skills: 掌握此技能的人员列表
    """
    __tablename__ = "skills"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 基本信息
    name = Column(String(100), unique=True, nullable=False, index=True)    # 技能名称
    code = Column(String(20), unique=True, nullable=False, index=True)     # 技能代码
    category = Column(SQLEnum(SkillCategory), nullable=False, index=True)  # 技能分类
    description = Column(Text, nullable=True)                               # 技能描述
    
    # 认证配置 - 某些技能需要认证才能执行相关任务
    requires_certification = Column(Boolean, default=False)                 # 是否需要认证
    certification_validity_days = Column(Integer, nullable=True)            # 认证有效期（天）
    
    # 实验室类型关联 - 技能可以是特定实验室专用或通用
    lab_type = Column(String(20), nullable=True)  # "fa"、"reliability" 或 null（通用）
    
    # 状态
    is_active = Column(Boolean, default=True)  # 是否激活
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)                   # 创建时间
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)  # 更新时间

    # 关联关系
    personnel_skills = relationship("PersonnelSkill", back_populates="skill", cascade="all, delete-orphan")

    def __repr__(self):
        """返回技能对象的字符串表示"""
        return f"<Skill(id={self.id}, name='{self.name}', category='{self.category}')>"


class PersonnelSkill(Base):
    """
    人员技能关联模型
    
    记录人员掌握的技能及其熟练度级别，支持认证信息和评估记录追踪。
    
    Attributes:
        id: 主键
        personnel_id: 人员ID
        skill_id: 技能ID
        proficiency_level: 熟练度级别
        is_certified: 是否已认证
        certification_date: 认证日期
        certification_expiry: 认证到期日期
        certificate_number: 证书编号
        last_assessment_date: 最后评估日期
        assessment_score: 评估分数（0-100）
        assessed_by_id: 评估人ID
        notes: 备注
        created_at: 创建时间
        updated_at: 更新时间
    
    Relationships:
        personnel: 关联的人员
        skill: 关联的技能
        assessed_by: 评估人
    """
    __tablename__ = "personnel_skills"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 关联信息
    personnel_id = Column(Integer, ForeignKey("personnel.id"), nullable=False)  # 人员ID
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)          # 技能ID
    
    # 熟练度
    proficiency_level = Column(SQLEnum(ProficiencyLevel), default=ProficiencyLevel.BEGINNER, nullable=False)
    
    # 认证信息
    is_certified = Column(Boolean, default=False)              # 是否已认证
    certification_date = Column(Date, nullable=True)           # 认证日期
    certification_expiry = Column(Date, nullable=True)         # 认证到期日期
    certificate_number = Column(String(100), nullable=True)    # 证书编号
    
    # 评估信息
    last_assessment_date = Column(Date, nullable=True)                           # 最后评估日期
    assessment_score = Column(Integer, nullable=True)                             # 评估分数（0-100）
    assessed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)       # 评估人ID
    
    # 备注
    notes = Column(Text, nullable=True)
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)                   # 创建时间
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)  # 更新时间

    # 关联关系
    personnel = relationship("Personnel", back_populates="skills")   # 关联人员
    skill = relationship("Skill", back_populates="personnel_skills")  # 关联技能
    assessed_by = relationship("User", foreign_keys=[assessed_by_id])  # 评估人

    def __repr__(self):
        """返回人员技能关联对象的字符串表示"""
        return f"<PersonnelSkill(personnel_id={self.personnel_id}, skill_id={self.skill_id}, level='{self.proficiency_level}')>"

    @property
    def is_certification_valid(self) -> bool:
        """
        检查认证是否仍然有效
        
        Returns:
            bool: 如果已认证且未过期则返回True，否则返回False
        """
        if not self.is_certified or not self.certification_expiry:
            return False
        return self.certification_expiry >= datetime.now().date()

"""
设备模型 - Equipment Model

本模块定义实验室设备管理相关的模型，支持两种设备类型：
- 自主运行型（Autonomous）：启动后可独立运行，如烤箱、老化箱
- 操作员依赖型（Operator Dependent）：需要人员全程操作

数据关系:
- Equipment N:1 Laboratory (多台设备属于一个实验室)
- Equipment N:1 Site (多台设备属于一个站点)
- Equipment 1:N EquipmentSchedule (一台设备有多个调度记录)
- Equipment 1:N EquipmentSkillRequirement (一台设备需要多个技能)
- Equipment 1:N WorkOrderTask (一台设备可用于多个任务)
- Equipment 1:N Material (一台设备可处理多个材料)

业务说明:
- 设备按8种类别分类：热学、机械、电学、光学、分析、环境、测量、其他
- 自主运行型设备支持并行任务（max_concurrent_tasks）
- 设备有维护周期和校准周期管理
- 设备调度时会检查时间冲突和并发限制
"""
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum, Float
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow():
    """
    获取当前UTC时间（带时区信息）
    
    Returns:
        datetime: 当前UTC时间，包含时区信息
    """
    return datetime.now(timezone.utc)


class EquipmentType(str, Enum):
    """
    设备运行类型枚举
    
    区分设备是否需要操作员全程在场，影响任务分配和调度逻辑。
    
    Values:
        AUTONOMOUS: 自主运行型 - 启动后可独立运行（如烤箱、老化箱）
        OPERATOR_DEPENDENT: 操作员依赖型 - 需要人员全程操作
    """
    AUTONOMOUS = "autonomous"              # 自主运行型（可无人值守）
    OPERATOR_DEPENDENT = "operator_dependent"  # 操作员依赖型


class EquipmentCategory(str, Enum):
    """
    设备分类枚举
    
    按设备功能和用途进行分类，用于设备仪表板统计和筛选。
    
    Values:
        THERMAL: 热学设备 - 烤箱、温度箱等
        MECHANICAL: 机械设备 - 振动台、冲击台等
        ELECTRICAL: 电学设备 - ESD测试、电源循环等
        OPTICAL: 光学设备 - 显微镜、相机等
        ANALYTICAL: 分析设备 - XRF、光谱仪等
        ENVIRONMENTAL: 环境设备 - 湿度箱、盐雾箱等
        MEASUREMENT: 测量设备 - 三坐标、量具等
        OTHER: 其他设备
    """
    THERMAL = "thermal"              # 热学设备
    MECHANICAL = "mechanical"        # 机械设备
    ELECTRICAL = "electrical"        # 电学设备
    OPTICAL = "optical"              # 光学设备
    ANALYTICAL = "analytical"        # 分析设备
    ENVIRONMENTAL = "environmental"  # 环境设备
    MEASUREMENT = "measurement"      # 测量设备
    OTHER = "other"                  # 其他设备


class EquipmentStatus(str, Enum):
    """
    设备运行状态枚举
    
    表示设备当前的可用状态，影响任务调度和显示。
    
    Values:
        AVAILABLE: 可用 - 空闲可分配
        IN_USE: 使用中 - 正在执行任务
        MAINTENANCE: 维护中 - 正在维护保养
        OUT_OF_SERVICE: 停用 - 设备停用或故障
        RESERVED: 已预约 - 已被预约但未开始使用
    """
    AVAILABLE = "available"          # 可用
    IN_USE = "in_use"               # 使用中
    MAINTENANCE = "maintenance"      # 维护中
    OUT_OF_SERVICE = "out_of_service"  # 停用
    RESERVED = "reserved"            # 已预约


class Equipment(Base):
    """
    实验室设备模型
    
    存储设备的基本信息、位置、状态、维护和校准信息。
    
    Attributes:
        id: 主键，自增整数
        name: 设备名称
        code: 设备代码，唯一标识
        equipment_type: 设备运行类型（自主/操作员依赖）
        category: 设备分类
        laboratory_id: 所属实验室ID
        site_id: 所属站点ID
        model: 设备型号
        manufacturer: 制造商
        serial_number: 序列号
        description: 设备描述
        capacity: 最大容量（样品数/项目数）
        uph: 单位小时产出
        max_concurrent_tasks: 最大并行任务数（自主运行型设备）
        status: 设备状态
        last_maintenance_date: 上次维护日期
        next_maintenance_date: 下次维护日期
        maintenance_interval_days: 维护周期（天）
        last_calibration_date: 上次校准日期
        next_calibration_date: 下次校准日期
        calibration_interval_days: 校准周期（天）
        is_active: 是否激活
        purchase_date: 购买日期
        warranty_expiry: 保修到期
        created_at: 创建时间
        updated_at: 更新时间
    
    Relationships:
        laboratory: 所属实验室
        site: 所属站点
        schedules: 设备调度记录
        required_skills: 操作所需技能
    """
    __tablename__ = "equipment"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 基本信息
    name = Column(String(100), nullable=False, index=True)                       # 设备名称
    code = Column(String(50), unique=True, nullable=False, index=True)           # 设备代码
    equipment_type = Column(SQLEnum(EquipmentType), nullable=False, index=True)  # 运行类型
    category = Column(SQLEnum(EquipmentCategory), nullable=True, index=True)     # 设备分类
    
    # 位置信息
    laboratory_id = Column(Integer, ForeignKey("laboratories.id"), nullable=False)  # 所属实验室
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)                # 所属站点
    
    # 设备详情
    model = Column(String(100), nullable=True)          # 型号
    manufacturer = Column(String(100), nullable=True)   # 制造商
    serial_number = Column(String(100), nullable=True)  # 序列号
    description = Column(Text, nullable=True)           # 描述
    
    # 容量和性能
    capacity = Column(Integer, nullable=True)  # 最大容量（样品数/项目数）
    uph = Column(Float, nullable=True)         # 单位小时产出（Units Per Hour）
    
    # 自主运行型设备的并行任务配置
    max_concurrent_tasks = Column(Integer, default=1)  # 最大并行任务数
    
    # 状态
    status = Column(SQLEnum(EquipmentStatus), default=EquipmentStatus.AVAILABLE, nullable=False)
    
    # 维护信息
    last_maintenance_date = Column(DateTime, nullable=True)     # 上次维护日期
    next_maintenance_date = Column(DateTime, nullable=True)     # 下次维护日期
    maintenance_interval_days = Column(Integer, nullable=True)  # 维护周期（天）
    
    # 校准信息
    last_calibration_date = Column(DateTime, nullable=True)      # 上次校准日期
    next_calibration_date = Column(DateTime, nullable=True)      # 下次校准日期
    calibration_interval_days = Column(Integer, nullable=True)   # 校准周期（天）
    
    # 状态标志
    is_active = Column(Boolean, default=True)  # 是否激活
    
    # 时间信息
    purchase_date = Column(DateTime, nullable=True)                   # 购买日期
    warranty_expiry = Column(DateTime, nullable=True)                 # 保修到期
    created_at = Column(DateTime, default=utcnow)                     # 创建时间
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)    # 更新时间

    # 关联关系
    laboratory = relationship("Laboratory", backref="equipment")                                          # 所属实验室
    site = relationship("Site", backref="equipment")                                                       # 所属站点
    schedules = relationship("EquipmentSchedule", back_populates="equipment", cascade="all, delete-orphan")  # 调度记录
    required_skills = relationship("EquipmentSkillRequirement", back_populates="equipment", cascade="all, delete-orphan")  # 所需技能

    def __repr__(self):
        """返回设备对象的字符串表示"""
        return f"<Equipment(id={self.id}, name='{self.name}', type='{self.equipment_type}')>"


class EquipmentSchedule(Base):
    """
    设备调度模型
    
    管理设备的使用时间安排，用于任务分配和冲突检测。
    支持与工单、任务和操作员的关联。
    
    Attributes:
        id: 主键
        equipment_id: 设备ID
        start_time: 开始时间
        end_time: 结束时间
        work_order_id: 关联工单ID
        task_id: 关联任务ID
        operator_id: 操作员ID（操作员依赖型设备必填）
        title: 调度标题
        notes: 备注
        status: 调度状态（scheduled/in_progress/completed/cancelled）
        created_at: 创建时间
        updated_at: 更新时间
    
    Relationships:
        equipment: 关联设备
        operator: 关联操作员
    """
    __tablename__ = "equipment_schedules"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 关联设备
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=False)
    
    # 时间段
    start_time = Column(DateTime, nullable=False, index=True)  # 开始时间
    end_time = Column(DateTime, nullable=False, index=True)    # 结束时间
    
    # 关联工单/任务
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=True)     # 关联工单
    task_id = Column(Integer, ForeignKey("work_order_tasks.id"), nullable=True)       # 关联任务
    
    # 操作员（操作员依赖型设备）
    operator_id = Column(Integer, ForeignKey("personnel.id"), nullable=True)  # 操作员
    
    # 调度详情
    title = Column(String(200), nullable=True)  # 标题
    notes = Column(Text, nullable=True)          # 备注
    
    # 状态
    status = Column(String(20), default="scheduled")  # scheduled/in_progress/completed/cancelled
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)                   # 创建时间
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)  # 更新时间

    # 关联关系
    equipment = relationship("Equipment", back_populates="schedules")  # 关联设备
    operator = relationship("Personnel", backref="equipment_schedules")  # 关联操作员

    def __repr__(self):
        """返回设备调度对象的字符串表示"""
        return f"<EquipmentSchedule(id={self.id}, equipment_id={self.equipment_id}, start='{self.start_time}')>"


class EquipmentSkillRequirement(Base):
    """
    设备技能要求模型
    
    定义操作特定设备所需的技能及最低熟练度要求。
    用于任务分配时的人员匹配。
    
    Attributes:
        id: 主键
        equipment_id: 设备ID
        skill_id: 技能ID
        min_proficiency_level: 最低熟练度要求
        requires_certification: 是否要求认证
        created_at: 创建时间
    
    Relationships:
        equipment: 关联设备
        skill: 关联技能
    """
    __tablename__ = "equipment_skill_requirements"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 关联信息
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=False)  # 设备ID
    skill_id = Column(Integer, ForeignKey("skills.id"), nullable=False)          # 技能ID
    
    # 熟练度要求
    min_proficiency_level = Column(String(20), default="intermediate")  # 最低熟练度：beginner/intermediate/advanced/expert
    
    # 认证要求
    requires_certification = Column(Boolean, default=False)  # 是否要求认证
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)  # 创建时间

    # 关联关系
    equipment = relationship("Equipment", back_populates="required_skills")  # 关联设备
    skill = relationship("Skill", backref="equipment_requirements")          # 关联技能

    def __repr__(self):
        """返回设备技能要求对象的字符串表示"""
        return f"<EquipmentSkillRequirement(equipment_id={self.equipment_id}, skill_id={self.skill_id})>"

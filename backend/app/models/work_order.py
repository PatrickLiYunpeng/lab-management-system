"""
工单模型 - Work Order Model

本模块定义FA和可靠性测试工单管理相关的模型，支持客户/SLA优先级计算、
任务分解和周期时间追踪。

数据关系:
- WorkOrder N:1 Laboratory (多个工单属于一个实验室)
- WorkOrder N:1 Site (多个工单属于一个站点)
- WorkOrder N:1 Client (多个工单来自一个客户)
- WorkOrder N:1 Personnel (多个工单分配给一个工程师)
- WorkOrder 1:N WorkOrderTask (一个工单包含多个任务)
- WorkOrder 1:N Material (一个工单关联多个材料)
- WorkOrder 1:N TaskHandover (一个工单有多个交接记录)

业务说明:
- 工单类型分两种：失效分析(FA实验室)和可靠性测试(可靠性实验室)
- 工单优先级由SLA紧急度(0-50) + 来源权重(0-30) + 客户优先级(0-20)计算
- 工单状态流转：草稿→待处理→已分配→进行中→评审→已完成/已取消
- 支持周期时间追踪和SLA超期告警
"""
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum, Float, Table
from sqlalchemy.orm import relationship

from app.core.database import Base


# 工单-样品多对多关联表
work_order_materials = Table(
    "work_order_materials",
    Base.metadata,
    Column("work_order_id", Integer, ForeignKey("work_orders.id"), primary_key=True),
    Column("material_id", Integer, ForeignKey("materials.id"), primary_key=True),
    Column("created_at", DateTime, default=lambda: datetime.now(timezone.utc))
)


def utcnow():
    """
    获取当前UTC时间（带时区信息）
    
    Returns:
        datetime: 当前UTC时间，包含时区信息
    """
    return datetime.now(timezone.utc)


class WorkOrderType(str, Enum):
    """
    工单类型枚举
    
    区分不同实验室处理的工单类型。
    
    Values:
        FAILURE_ANALYSIS: 失效分析 - FA实验室处理
        RELIABILITY_TEST: 可靠性测试 - 可靠性实验室处理
    """
    FAILURE_ANALYSIS = "failure_analysis"  # 失效分析（FA实验室）
    RELIABILITY_TEST = "reliability_test"  # 可靠性测试


class WorkOrderStatus(str, Enum):
    """
    工单状态枚举
    
    追踪工单在生命周期中的状态。
    
    Values:
        DRAFT: 草稿 - 初始创建
        PENDING: 待处理 - 等待分配
        ASSIGNED: 已分配 - 已分配工程师
        IN_PROGRESS: 进行中 - 工作已开始
        ON_HOLD: 暂停 - 临时暂停
        REVIEW: 评审 - 等待评审/验收
        COMPLETED: 已完成 - 工作完成
        CANCELLED: 已取消 - 工单取消
    """
    DRAFT = "draft"              # 草稿
    PENDING = "pending"          # 待处理
    ASSIGNED = "assigned"        # 已分配
    IN_PROGRESS = "in_progress"  # 进行中
    ON_HOLD = "on_hold"          # 暂停
    REVIEW = "review"            # 评审
    COMPLETED = "completed"      # 已完成
    CANCELLED = "cancelled"      # 已取消


class TaskStatus(str, Enum):
    """
    任务状态枚举
    
    追踪工单内任务的执行状态。
    
    Values:
        PENDING: 待处理
        ASSIGNED: 已分配
        IN_PROGRESS: 进行中
        COMPLETED: 已完成
        BLOCKED: 阻塞
        CANCELLED: 已取消
    """
    PENDING = "pending"          # 待处理
    ASSIGNED = "assigned"        # 已分配
    IN_PROGRESS = "in_progress"  # 进行中
    COMPLETED = "completed"      # 已完成
    BLOCKED = "blocked"          # 阻塞
    CANCELLED = "cancelled"      # 已取消


class WorkOrder(Base):
    """
    工单模型
    
    管理FA和可靠性测试工单，支持客户SLA、优先级计算和周期时间追踪。
    
    Attributes:
        id: 主键
        order_number: 工单号，唯一标识
        title: 工单标题
        description: 工单描述
        work_order_type: 工单类型
        laboratory_id: 所属实验室ID
        site_id: 所属站点ID
        client_id: 客户ID
        testing_source: 测试来源
        sla_deadline: SLA截止时间
        priority_score: 优先级分数（0-100）
        priority_level: 优先级等级（1-5）
        assigned_engineer_id: 负责工程师ID
        status: 工单状态
        standard_cycle_hours: 标准周期时间（小时）
        actual_cycle_hours: 实际周期时间（小时）
        created_at: 创建时间
        updated_at: 更新时间
        assigned_at: 分配时间
        started_at: 开始时间
        completed_at: 完成时间
        created_by_id: 创建人ID
    
    Relationships:
        laboratory: 所属实验室
        site: 所属站点
        client: 客户
        assigned_engineer: 负责工程师
        created_by: 创建人
        tasks: 任务列表
        materials: 关联材料
    """
    __tablename__ = "work_orders"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 标识信息
    order_number = Column(String(50), unique=True, nullable=False, index=True)  # 工单号
    title = Column(String(200), nullable=False)                                   # 标题
    description = Column(Text, nullable=True)                                     # 描述
    work_order_type = Column(SQLEnum(WorkOrderType), nullable=False, index=True)  # 工单类型
    
    # 实验室归属
    laboratory_id = Column(Integer, ForeignKey("laboratories.id"), nullable=False)  # 所属实验室
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)                # 所属站点
    
    # 客户和SLA
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)    # 客户ID
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)  # 产品ID
    testing_source = Column(String(50), nullable=True)                       # 测试来源（internal/external/customer等）
    sla_deadline = Column(DateTime, nullable=True)                           # SLA截止时间
    
    # 优先级（根据SLA紧急度 + 来源类别权重计算）
    priority_score = Column(Float, default=50.0)   # 优先级分数（0-100，越高越紧急）
    priority_level = Column(Integer, default=3)    # 优先级等级（1-5，1=最高）
    
    # 分配信息（工程师级别）
    assigned_engineer_id = Column(Integer, ForeignKey("personnel.id"), nullable=True)
    
    # 状态
    status = Column(SQLEnum(WorkOrderStatus), default=WorkOrderStatus.DRAFT, nullable=False, index=True)
    
    # 周期时间追踪
    standard_cycle_hours = Column(Float, nullable=True)  # 标准周期时间（预期）
    actual_cycle_hours = Column(Float, nullable=True)    # 实际周期时间
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)      # 创建时间
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)  # 更新时间
    assigned_at = Column(DateTime, nullable=True)      # 分配时间
    started_at = Column(DateTime, nullable=True)       # 开始时间
    completed_at = Column(DateTime, nullable=True)     # 完成时间
    
    # 创建人
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # 关联关系
    laboratory = relationship("Laboratory", backref="work_orders")                    # 所属实验室
    site = relationship("Site", backref="work_orders")                                 # 所属站点
    client = relationship("Client", backref="work_orders")                             # 客户
    product = relationship("Product", backref="work_orders")                           # 产品
    assigned_engineer = relationship("Personnel", foreign_keys=[assigned_engineer_id], backref="assigned_work_orders")
    created_by = relationship("User", foreign_keys=[created_by_id])                   # 创建人
    tasks = relationship("WorkOrderTask", back_populates="work_order", cascade="all, delete-orphan")  # 任务列表
    materials = relationship("Material", backref="work_order", foreign_keys="Material.current_work_order_id")
    # 多对多关系：工单选择的样品
    selected_materials = relationship("Material", secondary="work_order_materials", backref="selected_work_orders")

    def __repr__(self):
        """返回工单对象的字符串表示"""
        return f"<WorkOrder(id={self.id}, number='{self.order_number}', status='{self.status}')>"

    def calculate_priority_score(self) -> float:
        """
        计算优先级分数
        
        优先级分数由以下三部分组成：
        - SLA紧急度：0-50分（根据截止时间剩余）
        - 来源类别权重：0-30分（VIP/内部/外部/常规）
        - 客户优先级：0-20分（根据客户等级）
        
        Returns:
            float: 优先级分数（0-100）
        """
        score = 50.0  # 基础分数
        
        # SLA紧急度组件（0-50分）
        if self.sla_deadline:
            # 处理带时区和不带时区的datetime
            now = datetime.now(timezone.utc)
            deadline = self.sla_deadline
            if deadline.tzinfo is None:
                # 将naive datetime转换为UTC-aware
                deadline = deadline.replace(tzinfo=timezone.utc)
            hours_remaining = (deadline - now).total_seconds() / 3600
            if hours_remaining <= 0:
                score += 50  # 已逾期
            elif hours_remaining <= 24:
                score += 40  # 24小时内到期
            elif hours_remaining <= 48:
                score += 30  # 48小时内到期
            elif hours_remaining <= 72:
                score += 20  # 72小时内到期
            else:
                score += 10  # 超过72小时
        
        # 来源类别组件（0-30分）
        source_weights = {
            "vip": 30,       # VIP客户
            "internal": 20,  # 内部测试
            "external": 15,  # 外部客户
            "routine": 5,    # 常规测试
        }
        score += source_weights.get(self.testing_source, 10)
        
        # 客户优先级组件（0-20分）
        if self.client and self.client.priority_level:
            # 等级1=20分，等级5=4分
            score += (6 - self.client.priority_level) * 4
        
        return min(100.0, score)

    @property
    def is_overdue(self) -> bool:
        """
        检查工单是否已超过SLA截止时间
        
        Returns:
            bool: 如果未完成/取消且超过SLA截止时间则返回True
        """
        if not self.sla_deadline:
            return False
        now = datetime.now(timezone.utc)
        deadline = self.sla_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        return now > deadline and self.status not in [
            WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED
        ]

    @property
    def cycle_time_variance(self) -> float | None:
        """
        计算实际周期时间与标准周期时间的差异
        
        Returns:
            float | None: 差异值（正数表示超时，负数表示提前），无法计算时返回None
        """
        if self.standard_cycle_hours and self.actual_cycle_hours:
            return self.actual_cycle_hours - self.standard_cycle_hours
        return None


class WorkOrderTask(Base):
    """
    工单任务模型
    
    工单内的具体任务（技术员级别工作），支持方法关联、设备调度和周期时间追踪。
    
    Attributes:
        id: 主键
        work_order_id: 所属工单ID
        task_number: 任务编号（如T001、T002）
        title: 任务标题
        description: 任务描述
        sequence: 顺序号
        method_id: 关联方法ID
        assigned_technician_id: 分配技术员ID
        required_equipment_id: 需求设备ID
        scheduled_equipment_id: 已调度设备ID
        required_capacity: 容量需求
        status: 任务状态
        standard_cycle_hours: 标准周期时间
        actual_cycle_hours: 实际周期时间
        created_at: 创建时间
        updated_at: 更新时间
        assigned_at: 分配时间
        started_at: 开始时间
        completed_at: 完成时间
        notes: 备注
        results: 结果
    
    Relationships:
        work_order: 所属工单
        assigned_technician: 分配的技术员
        required_equipment: 需求设备
        scheduled_equipment: 已调度设备
        method: 关联方法
        materials: 关联材料
    """
    __tablename__ = "work_order_tasks"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 所属工单
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    
    # 任务标识
    task_number = Column(String(20), nullable=False)      # 任务编号（如T001、T002）
    title = Column(String(200), nullable=False)           # 任务标题
    description = Column(Text, nullable=True)             # 任务描述
    
    # 顺序
    sequence = Column(Integer, default=1)  # 工单内的顺序号
    
    # 方法关联（标准流程）
    method_id = Column(Integer, ForeignKey("methods.id"), nullable=True)
    
    # 分配信息（技术员级别）
    assigned_technician_id = Column(Integer, ForeignKey("personnel.id"), nullable=True)
    
    # 设备需求
    required_equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=True)   # 需求设备
    scheduled_equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=True)  # 已调度设备
    
    # 容量需求（针对有样品容量的设备）
    required_capacity = Column(Integer, nullable=True)  # 所需样品槽位数
    
    # 状态
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.PENDING, nullable=False, index=True)
    
    # 周期时间追踪
    standard_cycle_hours = Column(Float, nullable=True)  # 标准周期时间
    actual_cycle_hours = Column(Float, nullable=True)    # 实际周期时间
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)       # 创建时间
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)  # 更新时间
    assigned_at = Column(DateTime, nullable=True)       # 分配时间
    started_at = Column(DateTime, nullable=True)        # 开始时间
    completed_at = Column(DateTime, nullable=True)      # 完成时间
    
    # 备注和结果
    notes = Column(Text, nullable=True)     # 备注
    results = Column(Text, nullable=True)   # 结果

    # 关联关系
    work_order = relationship("WorkOrder", back_populates="tasks")           # 所属工单
    assigned_technician = relationship("Personnel", foreign_keys=[assigned_technician_id], backref="assigned_tasks")
    required_equipment = relationship("Equipment", foreign_keys=[required_equipment_id])  # 需求设备
    scheduled_equipment = relationship("Equipment", foreign_keys=[scheduled_equipment_id])  # 已调度设备
    method = relationship("Method", backref="tasks")                          # 关联方法
    materials = relationship("Material", backref="task", foreign_keys="Material.current_task_id")  # 关联材料

    def __repr__(self):
        """返回工单任务对象的字符串表示"""
        return f"<WorkOrderTask(id={self.id}, number='{self.task_number}', status='{self.status}')>"

    @property
    def cycle_time_variance(self) -> float | None:
        """
        计算实际周期时间与标准周期时间的差异
        
        Returns:
            float | None: 差异值（正数表示超时，负数表示提前），无法计算时返回None
        """
        if self.standard_cycle_hours and self.actual_cycle_hours:
            return self.actual_cycle_hours - self.standard_cycle_hours
        return None


class StandardCycleTime(Base):
    """
    标准周期时间模型
    
    定义不同任务类型的标准周期时间，作为性能基准。
    
    Attributes:
        id: 主键
        task_category: 任务类别（如cross_section、decap）
        work_order_type: 工单类型
        lab_type: 实验室类型
        equipment_type: 设备类型
        standard_hours: 标准时间（小时）
        min_hours: 最小时间
        max_hours: 最大时间
        description: 描述
        is_active: 是否激活
        created_at: 创建时间
        updated_at: 更新时间
    """
    __tablename__ = "standard_cycle_times"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 任务分类
    task_category = Column(String(100), nullable=False, index=True)  # 任务类别（如"cross_section"/"decap"）
    work_order_type = Column(SQLEnum(WorkOrderType), nullable=False)  # 工单类型
    
    # 关联实验室类型
    lab_type = Column(String(20), nullable=True)  # "fa"/"reliability"/null（所有）
    
    # 设备类型（如适用）
    equipment_type = Column(String(50), nullable=True)  # 设备类型
    
    # 标准时间
    standard_hours = Column(Float, nullable=False)  # 标准时间（小时）
    min_hours = Column(Float, nullable=True)        # 最小时间
    max_hours = Column(Float, nullable=True)        # 最大时间
    
    # 描述
    description = Column(Text, nullable=True)
    
    # 状态
    is_active = Column(Boolean, default=True)  # 是否激活
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)                   # 创建时间
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)  # 更新时间

    def __repr__(self):
        """返回标准周期时间对象的字符串表示"""
        return f"<StandardCycleTime(category='{self.task_category}', hours={self.standard_hours})>"

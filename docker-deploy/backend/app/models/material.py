"""
材料模型 - Material Model

本模块定义材料/样品生命周期管理相关的模型，包括材料类型、状态流转、
客户管理和SLA配置。支持任务前绑定、设备关联和任务后返还/处置工作流。

数据关系:
- Material N:1 Laboratory (多个材料属于一个实验室)
- Material N:1 Site (多个材料属于一个站点)
- Material N:1 Client (多个材料来自一个客户)
- Material N:1 WorkOrder (多个材料关联到一个工单)
- Material N:1 Equipment (多个材料可在一台设备上处理)
- Material 1:N MaterialHistory (一个材料有多条历史记录)
- Client 1:N ClientSLA (一个客户有多个SLA配置)

业务说明:
- 材料状态流转：已接收→入库→已分配→使用中→待返还/已处置→已返还
- 样品可关联客户，支持客户优先级和SLA管理
- 材料可设置存储截止和处理截止时间，超期会触发告警
- 处置方式包括：返还客户、归档、回收、危废处理、常规处理
"""
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum, Numeric
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.method import MethodType


def utcnow():
    """
    获取当前UTC时间（带时区信息）
    
    Returns:
        datetime: 当前UTC时间，包含时区信息
    """
    return datetime.now(timezone.utc)


class MaterialType(str, Enum):
    """
    材料类型枚举
    
    区分不同类型的材料，影响处理流程和处置方式。
    
    Values:
        SAMPLE: 样品 - 客户送检样品
        CONSUMABLE: 耗材 - 实验室耗材
        REAGENT: 试剂 - 化学试剂
        TOOL: 工具 - 可重复使用的工具
        OTHER: 其他
    """
    SAMPLE = "sample"          # 样品（客户送检）
    CONSUMABLE = "consumable"  # 耗材
    REAGENT = "reagent"        # 试剂
    TOOL = "tool"              # 工具（可重复使用）
    OTHER = "other"            # 其他


class MaterialStatus(str, Enum):
    """
    材料状态枚举
    
    追踪材料在生命周期中的状态，支持状态流转控制。
    
    Values:
        RECEIVED: 已接收 - 初始接收状态
        IN_STORAGE: 入库 - 已入库存储
        ALLOCATED: 已分配 - 已分配给任务但未使用
        IN_USE: 使用中 - 正在测试使用中
        PENDING_RETURN: 待返还 - 测试完成，等待返还决定
        RETURNED: 已返还 - 已返还给客户
        DISPOSED: 已处置 - 已处置（报废等）
        LOST: 丢失 - 材料丢失或损坏
    """
    RECEIVED = "received"              # 已接收
    IN_STORAGE = "in_storage"          # 入库
    ALLOCATED = "allocated"            # 已分配
    IN_USE = "in_use"                  # 使用中
    PENDING_RETURN = "pending_return"  # 待返还
    RETURNED = "returned"              # 已返还
    DISPOSED = "disposed"              # 已处置
    LOST = "lost"                      # 丢失


class DisposalMethod(str, Enum):
    """
    材料处置方式枚举
    
    定义材料测试完成后的处置方法。
    
    Values:
        RETURN_TO_CLIENT: 返还客户
        ARCHIVE: 归档保存
        RECYCLE: 回收
        HAZARDOUS_DISPOSAL: 危废处理
        STANDARD_DISPOSAL: 常规处理
    """
    RETURN_TO_CLIENT = "return_to_client"     # 返还客户
    ARCHIVE = "archive"                        # 归档保存
    RECYCLE = "recycle"                        # 回收
    HAZARDOUS_DISPOSAL = "hazardous_disposal"  # 危废处理
    STANDARD_DISPOSAL = "standard_disposal"    # 常规处理


class NonSapSource(str, Enum):
    """
    非SAP来源枚举
    
    定义物料补充时的非SAP来源类型。
    
    Values:
        INTERNAL_TRANSFER: 内部转移
        EMERGENCY_PURCHASE: 紧急采购
        GIFT_SAMPLE: 赠品/样品
        INVENTORY_ADJUSTMENT: 库存盘点调整
        OTHER: 其他
    """
    INTERNAL_TRANSFER = "internal_transfer"      # 内部转移
    EMERGENCY_PURCHASE = "emergency_purchase"    # 紧急采购
    GIFT_SAMPLE = "gift_sample"                  # 赠品/样品
    INVENTORY_ADJUSTMENT = "inventory_adjustment" # 库存盘点调整
    OTHER = "other"                               # 其他


class ConsumptionStatus(str, Enum):
    """
    材料消耗状态枚举
    
    追踪消耗记录的状态，用于区分有效记录和已作废记录。
    
    Values:
        REGISTERED: 已登记 - 正常有效的消耗记录
        VOIDED: 已作废 - 已作废的消耗记录，库存已补回
    """
    REGISTERED = "registered"  # 已登记
    VOIDED = "voided"          # 已作废


class Material(Base):
    """
    材料/样品模型
    
    管理材料的库存和生命周期，支持任务关联、设备绑定和处置追踪。
    
    Attributes:
        id: 主键
        material_code: 材料编码，唯一标识
        name: 材料名称
        material_type: 材料类型
        description: 材料描述
        laboratory_id: 所属实验室ID
        site_id: 所属站点ID
        storage_location: 存储位置
        client_id: 客户ID（样品）
        client_reference: 客户参考号
        quantity: 数量
        unit: 单位
        status: 材料状态
        received_at: 接收时间
        storage_deadline: 存储截止时间
        processing_deadline: 处理截止时间
        current_work_order_id: 当前关联工单ID
        current_task_id: 当前关联任务ID
        current_equipment_id: 当前关联设备ID
        disposal_method: 处置方式
        disposed_at: 处置时间
        disposed_by_id: 处置人ID
        disposal_notes: 处置备注
        returned_at: 返还时间
        return_tracking_number: 返还快递单号
        return_notes: 返还备注
        created_at: 创建时间
        updated_at: 更新时间
    
    Relationships:
        laboratory: 所属实验室
        site: 所属站点
        client: 客户
        current_equipment: 当前设备
        disposed_by: 处置人
        history: 历史记录
    """
    __tablename__ = "materials"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 标识信息
    material_code = Column(String(50), unique=True, nullable=False, index=True)  # 材料编码
    name = Column(String(200), nullable=False, index=True)                        # 材料名称
    material_type = Column(SQLEnum(MaterialType), nullable=False, index=True)     # 材料类型
    description = Column(Text, nullable=True)                                      # 描述
    
    # 位置信息
    laboratory_id = Column(Integer, ForeignKey("laboratories.id"), nullable=False)  # 所属实验室
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)                # 所属站点
    storage_location = Column(String(100), nullable=True)                            # 具体存储位置
    
    # 客户/来源信息（样品）
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)     # 客户ID
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)   # 产品ID
    client_reference = Column(String(100), nullable=True)                     # 客户参考号
    
    # 数量追踪
    quantity = Column(Integer, default=1)        # 数量
    unit = Column(String(20), default="piece")   # 单位（piece/ml/g等）
    
    # 状态
    status = Column(SQLEnum(MaterialStatus), default=MaterialStatus.RECEIVED, nullable=False, index=True)
    
    # 时间追踪（用于告警）
    received_at = Column(DateTime, default=utcnow)             # 接收时间
    storage_deadline = Column(DateTime, nullable=True)         # 存储截止时间（超期告警）
    processing_deadline = Column(DateTime, nullable=True)      # 处理截止时间
    
    # 当前分配信息
    current_work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=True)      # 当前工单
    current_task_id = Column(Integer, ForeignKey("work_order_tasks.id"), nullable=True)        # 当前任务
    current_equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=True)          # 当前设备
    
    # 处置信息
    disposal_method = Column(SQLEnum(DisposalMethod), nullable=True)               # 处置方式
    disposed_at = Column(DateTime, nullable=True)                                   # 处置时间
    disposed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)        # 处置人
    disposal_notes = Column(Text, nullable=True)                                    # 处置备注
    
    # 返还信息
    returned_at = Column(DateTime, nullable=True)               # 返还时间
    return_tracking_number = Column(String(100), nullable=True)  # 快递单号
    return_notes = Column(Text, nullable=True)                   # 返还备注
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)                   # 创建时间
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)  # 更新时间

    # 关联关系
    laboratory = relationship("Laboratory", backref="materials")                   # 所属实验室
    site = relationship("Site", backref="materials")                                # 所属站点
    client = relationship("Client", backref="materials")                            # 客户
    product = relationship("Product", backref="materials")                          # 产品
    current_equipment = relationship("Equipment", backref="current_materials")     # 当前设备
    disposed_by = relationship("User", foreign_keys=[disposed_by_id])              # 处置人
    history = relationship("MaterialHistory", back_populates="material", cascade="all, delete-orphan")  # 历史
    replenishments = relationship("MaterialReplenishment", back_populates="material", 
                                  order_by="desc(MaterialReplenishment.created_at)",
                                  cascade="all, delete-orphan")  # 补充记录

    def __repr__(self):
        """返回材料对象的字符串表示"""
        return f"<Material(id={self.id}, code='{self.material_code}', status='{self.status}')>"

    @property
    def is_overdue_storage(self) -> bool:
        """
        检查材料是否超过存储截止时间
        
        Returns:
            bool: 如果在库且超过存储截止时间则返回True
        """
        if not self.storage_deadline:
            return False
        now = datetime.now(timezone.utc)
        deadline = self.storage_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        return now > deadline and self.status == MaterialStatus.IN_STORAGE

    @property
    def is_overdue_processing(self) -> bool:
        """
        检查材料是否超过处理截止时间
        
        Returns:
            bool: 如果未完成处理且超过处理截止时间则返回True
        """
        if not self.processing_deadline:
            return False
        now = datetime.now(timezone.utc)
        deadline = self.processing_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        return now > deadline and self.status not in [
            MaterialStatus.RETURNED, MaterialStatus.DISPOSED
        ]


class MaterialHistory(Base):
    """
    材料历史记录模型
    
    追踪材料状态变更和位置移动，提供完整的审计轨迹。
    
    Attributes:
        id: 主键
        material_id: 材料ID
        from_status: 原状态
        to_status: 新状态
        from_location: 原位置
        to_location: 新位置
        equipment_id: 关联设备ID
        work_order_id: 关联工单ID
        task_id: 关联任务ID
        changed_by_id: 变更人ID
        notes: 备注
        changed_at: 变更时间
    
    Relationships:
        material: 关联材料
        changed_by: 变更人
        equipment: 关联设备
    """
    __tablename__ = "material_history"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 关联材料
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    
    # 状态变更
    from_status = Column(SQLEnum(MaterialStatus), nullable=True)    # 原状态
    to_status = Column(SQLEnum(MaterialStatus), nullable=False)     # 新状态
    
    # 位置变更
    from_location = Column(String(100), nullable=True)  # 原位置
    to_location = Column(String(100), nullable=True)    # 新位置
    
    # 设备关联
    equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=True)
    
    # 工单/任务关联
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=True)  # 关联工单
    task_id = Column(Integer, ForeignKey("work_order_tasks.id"), nullable=True)    # 关联任务
    
    # 变更人
    changed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # 备注
    notes = Column(Text, nullable=True)
    
    # 时间戳
    changed_at = Column(DateTime, default=utcnow)  # 变更时间

    # 关联关系
    material = relationship("Material", back_populates="history")  # 关联材料
    changed_by = relationship("User", foreign_keys=[changed_by_id])  # 变更人
    equipment = relationship("Equipment")                             # 关联设备

    def __repr__(self):
        """返回材料历史记录对象的字符串表示"""
        return f"<MaterialHistory(material_id={self.material_id}, to_status='{self.to_status}')>"


class MaterialReplenishment(Base):
    """
    物料补充记录模型
    
    追踪材料的补充/入库记录，包括SAP订单和非SAP来源。
    
    Attributes:
        id: 主键
        material_id: 物料ID
        received_date: 收货日期
        quantity_added: 增加数量
        sap_order_no: SAP订单号（可选）
        non_sap_source: 非SAP来源（当SAP订单号为空时必填）
        notes: 备注
        created_by_id: 创建人ID
        created_at: 创建时间
    
    Relationships:
        material: 关联物料
        created_by: 创建人
    """
    __tablename__ = "material_replenishments"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 关联物料
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False, index=True)
    
    # 补充信息
    received_date = Column(DateTime, nullable=False)          # 收货日期
    quantity_added = Column(Integer, nullable=False)          # 增加数量
    sap_order_no = Column(String(100), nullable=True)         # SAP订单号
    non_sap_source = Column(SQLEnum(NonSapSource), nullable=True)  # 非SAP来源
    notes = Column(Text, nullable=True)                       # 备注
    
    # 创建信息
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=utcnow)             # 创建时间

    # 关联关系
    material = relationship("Material", back_populates="replenishments")  # 关联物料
    created_by = relationship("User", foreign_keys=[created_by_id])       # 创建人

    def __repr__(self):
        """返回物料补充记录对象的字符串表示"""
        return f"<MaterialReplenishment(id={self.id}, material_id={self.material_id}, quantity={self.quantity_added})>"


class MaterialConsumption(Base):
    """
    材料消耗记录模型
    
    追踪子任务中材料的消耗情况，支持成本记录和作废恢复。
    消耗记录创建后不可修改或删除，只能通过作废来纠正错误。
    
    Attributes:
        id: 主键
        material_id: 物料ID
        task_id: 子任务ID
        quantity_consumed: 消耗数量
        unit_price: 单价（可选）
        total_cost: 总成本（可选）
        status: 消耗状态（已登记/已作废）
        notes: 备注
        consumed_at: 消耗时间
        created_by_id: 创建人ID
        voided_at: 作废时间
        voided_by_id: 作废人ID
        void_reason: 作废原因
        replenishment_id: 作废后关联的补充记录ID
    
    Relationships:
        material: 关联物料
        task: 关联子任务
        created_by: 创建人
        voided_by: 作废人
        replenishment: 作废后关联的补充记录
    """
    __tablename__ = "material_consumptions"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 关联信息
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey("work_order_tasks.id"), nullable=False, index=True)
    
    # 消耗信息
    quantity_consumed = Column(Integer, nullable=False)           # 消耗数量
    unit_price = Column(Numeric(10, 2), nullable=True)            # 单价
    total_cost = Column(Numeric(12, 2), nullable=True)            # 总成本
    
    # 状态
    status = Column(SQLEnum(ConsumptionStatus), default=ConsumptionStatus.REGISTERED, 
                    nullable=False, index=True)
    
    # 备注
    notes = Column(Text, nullable=True)
    
    # 消耗时间和创建人
    consumed_at = Column(DateTime, default=utcnow)                # 消耗时间
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # 作废信息
    voided_at = Column(DateTime, nullable=True)                   # 作废时间
    voided_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # 作废人
    void_reason = Column(Text, nullable=True)                     # 作废原因
    replenishment_id = Column(Integer, ForeignKey("material_replenishments.id"), nullable=True)  # 关联补充记录

    # 关联关系
    material = relationship("Material", backref="consumptions")   # 关联物料
    task = relationship("WorkOrderTask", backref="consumptions")  # 关联子任务
    created_by = relationship("User", foreign_keys=[created_by_id])  # 创建人
    voided_by = relationship("User", foreign_keys=[voided_by_id])    # 作废人
    replenishment = relationship("MaterialReplenishment", backref="voided_consumption")  # 关联补充记录

    def __repr__(self):
        """返回材料消耗记录对象的字符串表示"""
        return f"<MaterialConsumption(id={self.id}, material_id={self.material_id}, quantity={self.quantity_consumed}, status='{self.status}')>"


class Client(Base):
    """
    客户模型
    
    管理样品来源客户信息和SLA配置，影响工单优先级计算。
    
    Attributes:
        id: 主键
        name: 客户名称
        code: 客户代码，唯一标识
        contact_name: 联系人姓名
        contact_email: 联系人邮箱
        contact_phone: 联系人电话
        address: 地址
        default_sla_days: 默认SLA周期（天）
        priority_level: 优先级（1最高，5最低）
        source_category: 来源类别
        is_active: 是否激活
        created_at: 创建时间
        updated_at: 更新时间
    
    Relationships:
        sla_configs: SLA配置列表
    """
    __tablename__ = "clients"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 基本信息
    name = Column(String(200), nullable=False, index=True)                    # 客户名称
    code = Column(String(50), unique=True, nullable=False, index=True)        # 客户代码
    
    # 联系信息
    contact_name = Column(String(100), nullable=True)    # 联系人姓名
    contact_email = Column(String(255), nullable=True)   # 联系人邮箱
    contact_phone = Column(String(50), nullable=True)    # 联系人电话
    address = Column(Text, nullable=True)                 # 地址
    
    # SLA配置
    default_sla_days = Column(Integer, default=7)   # 默认周转天数
    priority_level = Column(Integer, default=3)     # 优先级（1=最高，5=最低）
    
    # 来源类别（影响处理逻辑）
    source_category = Column(String(50), default="external")  # internal/external/vip等
    
    # 状态
    is_active = Column(Boolean, default=True)  # 是否激活
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)                   # 创建时间
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)  # 更新时间
    
    # 关联关系
    sla_configs = relationship("ClientSLA", back_populates="client", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="client", cascade="all, delete-orphan")

    def __repr__(self):
        """返回客户对象的字符串表示"""
        return f"<Client(id={self.id}, name='{self.name}', code='{self.code}')>"


class ClientSLA(Base):
    """
    客户SLA配置模型
    
    为每个客户配置不同实验室/服务类型的SLA参数。
    
    Attributes:
        id: 主键
        client_id: 客户ID
        laboratory_id: 实验室ID（null=适用所有实验室）
        method_type: 分析/测试方法类型（analysis/reliability）
        source_category_id: 来源类别ID
        commitment_hours: 承诺完成时间（小时）
        max_hours: 最大允许时间（小时）
        priority_weight: 优先级权重
        description: 描述
        is_active: 是否激活
        created_at: 创建时间
        updated_at: 更新时间
    
    Relationships:
        client: 关联客户
        laboratory: 关联实验室
        source_category: 关联来源类别
    """
    __tablename__ = "client_slas"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 关联信息
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)           # 客户ID
    laboratory_id = Column(Integer, ForeignKey("laboratories.id"), nullable=True)   # 实验室ID（null=所有实验室）
    
    # 服务类型 - 拆分为两个字段
    method_type = Column(SQLEnum(MethodType), nullable=True, index=True)  # 分析/测试方法类型
    source_category_id = Column(Integer, ForeignKey("testing_source_categories.id"), nullable=True)  # 来源类别ID
    
    # SLA参数
    commitment_hours = Column(Integer, nullable=False)  # 承诺完成时间（小时）
    max_hours = Column(Integer, nullable=True)          # 最大允许时间（小时）
    
    # 优先级影响
    priority_weight = Column(Integer, default=0)  # 额外优先级权重
    
    # 描述
    description = Column(Text, nullable=True)
    
    # 状态
    is_active = Column(Boolean, default=True)  # 是否激活
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)                   # 创建时间
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)  # 更新时间

    # 关联关系
    client = relationship("Client", back_populates="sla_configs")  # 关联客户
    laboratory = relationship("Laboratory", backref="client_slas")  # 关联实验室
    source_category = relationship("TestingSourceCategory", backref="client_slas")  # 关联来源类别

    def __repr__(self):
        """返回客户SLA配置对象的字符串表示"""
        return f"<ClientSLA(id={self.id}, client_id={self.client_id}, method_type='{self.method_type}')>"


class TestingSourceCategory(Base):
    """
    测试来源类别模型
    
    可配置的测试来源类别，带有优先级权重，用于工单优先级计算。
    
    Attributes:
        id: 主键
        name: 类别名称
        code: 类别代码，唯一标识
        priority_weight: 优先级权重（0-30）
        display_order: 显示顺序
        description: 描述
        color: UI显示颜色
        is_active: 是否激活
        is_default: 是否默认
        created_at: 创建时间
        updated_at: 更新时间
    """
    __tablename__ = "testing_source_categories"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 基本信息
    name = Column(String(100), nullable=False, index=True)                    # 类别名称
    code = Column(String(50), unique=True, nullable=False)                    # 类别代码
    
    # 优先级配置
    priority_weight = Column(Integer, default=10)  # 优先级权重（用于优先级分数计算，0-30）
    
    # 显示配置
    display_order = Column(Integer, default=0)     # 显示顺序
    
    # 描述
    description = Column(Text, nullable=True)
    
    # UI显示颜色
    color = Column(String(20), nullable=True)  # 如 "#ff0000"/"red"
    
    # 状态
    is_active = Column(Boolean, default=True)   # 是否激活
    is_default = Column(Boolean, default=False)  # 是否默认
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)                   # 创建时间
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)  # 更新时间

    def __repr__(self):
        """返回测试来源类别对象的字符串表示"""
        return f"<TestingSourceCategory(id={self.id}, name='{self.name}', weight={self.priority_weight})>"

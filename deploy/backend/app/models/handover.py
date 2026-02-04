"""
交接模型 - Handover Model

本模块定义班次交接管理相关的模型，追踪技术员之间的任务交接。
在班次变更时提供审计轨迹和沟通渠道。

数据关系:
- TaskHandover N:1 WorkOrderTask (多个交接属于一个任务)
- TaskHandover N:1 WorkOrder (多个交接属于一个工单)
- TaskHandover N:1 Personnel (交出人/接收人)
- TaskHandover N:1 Shift (交出班次/接收班次)
- TaskHandover 1:N HandoverNote (一个交接有多条备注)

业务说明:
- 交接状态流转：待接收→已接受/已拒绝/已取消
- 交接记录任务进度、待办事项和特殊说明
- 支持优先级标记（普通/紧急/关键）
- 接收人可以接受或拒绝交接
"""
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow():
    """
    获取当前UTC时间（带时区信息）
    
    Returns:
        datetime: 当前UTC时间，包含时区信息
    """
    return datetime.now(timezone.utc)


class HandoverStatus(str, Enum):
    """
    交接状态枚举
    
    追踪交接记录的处理状态。
    
    Values:
        PENDING: 待接收 - 等待接收技术员确认
        ACCEPTED: 已接受 - 交接已被接受
        REJECTED: 已拒绝 - 交接被拒绝（任务退回原技术员）
        CANCELLED: 已取消 - 交出技术员取消交接
    """
    PENDING = "pending"      # 待接收
    ACCEPTED = "accepted"    # 已接受
    REJECTED = "rejected"    # 已拒绝
    CANCELLED = "cancelled"  # 已取消


class HandoverPriority(str, Enum):
    """
    交接优先级枚举
    
    标记交接的紧急程度。
    
    Values:
        NORMAL: 普通
        URGENT: 紧急
        CRITICAL: 关键
    """
    NORMAL = "normal"      # 普通
    URGENT = "urgent"      # 紧急
    CRITICAL = "critical"  # 关键


class TaskHandover(Base):
    """
    任务交接模型
    
    记录班次交接时技术员之间的任务移交，提供审计轨迹和沟通渠道。
    
    Attributes:
        id: 主键
        task_id: 任务ID
        work_order_id: 工单ID
        from_technician_id: 交出技术员ID
        to_technician_id: 接收技术员ID
        from_shift_id: 交出班次ID
        to_shift_id: 接收班次ID
        status: 交接状态
        priority: 优先级
        task_status_at_handover: 交接时的任务状态快照
        progress_summary: 已完成工作摘要
        pending_items: 待办事项
        special_instructions: 特殊说明
        rejection_reason: 拒绝原因
        acceptance_notes: 接受备注
        created_at: 创建时间
        accepted_at: 接受时间
        rejected_at: 拒绝时间
    
    Relationships:
        task: 关联任务
        work_order: 关联工单
        from_technician: 交出技术员
        to_technician: 接收技术员
        from_shift: 交出班次
        to_shift: 接收班次
    """
    __tablename__ = "task_handovers"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 关联任务
    task_id = Column(Integer, ForeignKey("work_order_tasks.id"), nullable=False, index=True)      # 任务ID
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False, index=True)    # 工单ID
    
    # 交接人员
    from_technician_id = Column(Integer, ForeignKey("personnel.id"), nullable=False, index=True)  # 交出技术员
    to_technician_id = Column(Integer, ForeignKey("personnel.id"), nullable=True, index=True)     # 接收技术员（可能初始未指定）
    
    # 班次关联
    from_shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=True)  # 交出班次
    to_shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=True)    # 接收班次
    
    # 交接详情
    status = Column(SQLEnum(HandoverStatus), default=HandoverStatus.PENDING, nullable=False)  # 状态
    priority = Column(SQLEnum(HandoverPriority), default=HandoverPriority.NORMAL, nullable=False)  # 优先级
    
    # 任务状态快照
    task_status_at_handover = Column(String(50), nullable=True)  # 交接时的任务状态
    progress_summary = Column(Text, nullable=True)                # 已完成工作摘要
    pending_items = Column(Text, nullable=True)                   # 待办事项
    special_instructions = Column(Text, nullable=True)            # 特殊说明（给接收技术员）
    
    # 接收响应
    rejection_reason = Column(Text, nullable=True)   # 拒绝原因
    acceptance_notes = Column(Text, nullable=True)   # 接受备注
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)    # 创建时间
    accepted_at = Column(DateTime, nullable=True)    # 接受时间
    rejected_at = Column(DateTime, nullable=True)    # 拒绝时间
    
    # 关联关系
    task = relationship("WorkOrderTask", backref="handovers")                       # 关联任务
    work_order = relationship("WorkOrder", backref="handovers")                      # 关联工单
    from_technician = relationship("Personnel", foreign_keys=[from_technician_id], backref="outgoing_handovers")  # 交出技术员
    to_technician = relationship("Personnel", foreign_keys=[to_technician_id], backref="incoming_handovers")       # 接收技术员
    from_shift = relationship("Shift", foreign_keys=[from_shift_id])                 # 交出班次
    to_shift = relationship("Shift", foreign_keys=[to_shift_id])                     # 接收班次


class HandoverNote(Base):
    """
    交接备注模型
    
    允许在交接过程中添加额外备注/评论，支持持续沟通。
    
    Attributes:
        id: 主键
        handover_id: 交接ID
        author_id: 作者ID（人员）
        content: 备注内容
        is_important: 是否重要
        created_at: 创建时间
    
    Relationships:
        handover: 关联交接
        author: 作者
    """
    __tablename__ = "handover_notes"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 关联交接
    handover_id = Column(Integer, ForeignKey("task_handovers.id"), nullable=False, index=True)
    
    # 作者
    author_id = Column(Integer, ForeignKey("personnel.id"), nullable=False)
    
    # 内容
    content = Column(Text, nullable=False)            # 备注内容
    is_important = Column(Boolean, default=False)     # 是否重要标记
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)  # 创建时间
    
    # 关联关系
    handover = relationship("TaskHandover", backref="notes")  # 关联交接
    author = relationship("Personnel")                         # 作者

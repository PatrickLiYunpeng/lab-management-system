"""
审计日志模型 - Audit Log Model

本模块定义审计日志模型，追踪所有用户操作，用于合规性检查和问题排查。

数据关系:
- AuditLog N:1 User (多条日志属于一个用户)
- AuditLog N:1 Laboratory (多条日志关联一个实验室)
- AuditLog N:1 Site (多条日志关联一个站点)

业务说明:
- 记录谁在什么时间对哪个实体执行了什么操作
- 支持记录操作前后的数据变化（JSON格式）
- 包含请求详情（IP、User-Agent、请求路径等）
- 用于安全审计和操作追溯
"""
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Index, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow():
    """
    获取当前UTC时间（带时区信息）
    
    Returns:
        datetime: 当前UTC时间，包含时区信息
    """
    return datetime.now(timezone.utc)


class AuditAction(str, Enum):
    """
    审计操作类型枚举
    
    定义系统中可追踪的操作类型。
    
    Values:
        CREATE: 创建
        UPDATE: 更新
        DELETE: 删除
        LOGIN: 登录
        LOGOUT: 登出
        VIEW: 查看
        EXPORT: 导出
        APPROVE: 批准
        REJECT: 拒绝
        ASSIGN: 分配
        COMPLETE: 完成
        CANCEL: 取消
    """
    CREATE = "create"      # 创建
    UPDATE = "update"      # 更新
    DELETE = "delete"      # 删除
    LOGIN = "login"        # 登录
    LOGOUT = "logout"      # 登出
    VIEW = "view"          # 查看
    EXPORT = "export"      # 导出
    APPROVE = "approve"    # 批准
    REJECT = "reject"      # 拒绝
    ASSIGN = "assign"      # 分配
    COMPLETE = "complete"  # 完成
    CANCEL = "cancel"      # 取消


class AuditLog(Base):
    """
    审计日志模型
    
    追踪所有用户操作，记录谁在什么时间对哪个实体执行了什么操作，
    提供完整的可追溯性，用于合规性检查和问题排查。
    
    Attributes:
        id: 主键
        user_id: 操作用户ID
        username: 用户名（历史引用，即使用户被删除也保留）
        user_role: 用户角色
        action: 操作类型
        entity_type: 实体类型
        entity_id: 实体ID
        entity_name: 实体名称（便于阅读）
        laboratory_id: 关联实验室ID
        site_id: 关联站点ID
        ip_address: IP地址
        user_agent: 浏览器标识
        request_method: 请求方法
        request_path: 请求路径
        old_values: 操作前的数据（JSON）
        new_values: 操作后的数据（JSON）
        description: 操作描述
        extra_data: 额外上下文数据（JSON）
        created_at: 创建时间
    
    Relationships:
        user: 关联用户
        laboratory: 关联实验室
        site: 关联站点
    """
    __tablename__ = "audit_logs"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 操作人信息
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # 用户ID
    username = Column(String(100), nullable=True)   # 用户名（历史引用）
    user_role = Column(String(50), nullable=True)   # 用户角色
    
    # 操作类型
    action = Column(String(50), nullable=False, index=True)  # 操作类型
    
    # 操作对象
    entity_type = Column(String(100), nullable=False, index=True)  # 实体类型
    entity_id = Column(Integer, nullable=True, index=True)          # 实体ID
    entity_name = Column(String(255), nullable=True)                 # 实体名称（便于阅读）
    
    # 关联上下文
    laboratory_id = Column(Integer, ForeignKey("laboratories.id"), nullable=True, index=True)  # 实验室
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=True, index=True)                # 站点
    
    # 请求详情
    ip_address = Column(String(45), nullable=True)      # IP地址
    user_agent = Column(String(500), nullable=True)     # 浏览器标识
    request_method = Column(String(10), nullable=True)  # 请求方法
    request_path = Column(String(500), nullable=True)   # 请求路径
    
    # 变更追踪（JSON格式）
    old_values = Column(JSON, nullable=True)  # 操作前的数据
    new_values = Column(JSON, nullable=True)  # 操作后的数据
    
    # 描述和元数据
    description = Column(Text, nullable=True)    # 操作描述
    extra_data = Column(JSON, nullable=True)     # 额外上下文数据
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow, index=True)  # 创建时间
    
    # 关联关系
    user = relationship("User", backref="audit_logs")               # 关联用户
    laboratory = relationship("Laboratory", backref="audit_logs")   # 关联实验室
    site = relationship("Site", backref="audit_logs")               # 关联站点

    # 常用查询的索引
    __table_args__ = (
        Index("ix_audit_log_entity", "entity_type", "entity_id"),           # 实体查询索引
        Index("ix_audit_log_user_action", "user_id", "action"),             # 用户操作索引
        Index("ix_audit_log_date_action", "created_at", "action"),          # 时间操作索引
    )

    def __repr__(self):
        """返回审计日志对象的字符串表示"""
        return f"<AuditLog(id={self.id}, user={self.username}, action={self.action}, entity={self.entity_type}:{self.entity_id})>"

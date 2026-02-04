"""
用户模型 - User Model

本模块定义系统用户账户模型，用于身份认证和权限授权。

数据关系:
- User 1:1 Personnel (一个用户对应一个人员档案)
- User N:1 Laboratory (多个用户可属于同一实验室)
- User N:1 Site (多个用户可属于同一站点)
- User 1:N AuditLog (一个用户可产生多条审计日志)

权限说明:
- ADMIN: 系统管理员，拥有所有权限，可管理用户、站点、权限等
- MANAGER: 实验室经理，可管理本实验室资源和审批借调申请
- ENGINEER: 工程师，可创建工单、分配任务、验收结果
- TECHNICIAN: 技术员，可执行任务、发起交接
- VIEWER: 访客，仅可查看工单查询界面
"""
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow():
    """
    获取当前UTC时间（带时区信息）
    
    Returns:
        datetime: 当前UTC时间，包含时区信息
    """
    return datetime.now(timezone.utc)


class UserRole(str, Enum):
    """
    用户角色枚举类型
    
    定义系统中的5种用户角色，每种角色拥有不同的权限级别：
    - ADMIN: 管理员 - 最高权限，可管理系统所有功能
    - MANAGER: 经理 - 可管理实验室资源和审批操作
    - ENGINEER: 工程师 - 可创建和管理工单
    - TECHNICIAN: 技术员 - 可执行具体任务
    - VIEWER: 访客 - 仅有只读权限
    """
    ADMIN = "admin"          # 管理员
    MANAGER = "manager"      # 经理
    ENGINEER = "engineer"    # 工程师
    TECHNICIAN = "technician"  # 技术员
    VIEWER = "viewer"        # 访客


class User(Base):
    """
    用户账户模型
    
    存储系统用户的认证信息和基本资料，是系统身份认证的核心模型。
    每个用户必须有唯一的用户名和邮箱，密码使用bcrypt加密存储。
    
    Attributes:
        id: 主键，自增整数
        username: 用户名，唯一索引，3-50字符
        email: 邮箱地址，唯一索引
        hashed_password: bcrypt加密后的密码哈希值
        full_name: 用户全名/姓名
        role: 用户角色，决定权限级别
        primary_laboratory_id: 主实验室ID，外键关联laboratories表
        primary_site_id: 主站点ID，外键关联sites表
        is_active: 账号是否激活，停用后无法登录
        is_superuser: 是否超级用户（保留字段）
        created_at: 账号创建时间
        updated_at: 账号最后更新时间
        last_login: 最后登录时间
    
    Relationships:
        primary_laboratory: 所属主实验室，用于数据权限过滤
        primary_site: 所属主站点，用于数据权限过滤
    """
    __tablename__ = "users"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 认证信息
    username = Column(String(50), unique=True, index=True, nullable=False)  # 用户名，登录凭证
    email = Column(String(255), unique=True, index=True, nullable=False)    # 邮箱，唯一标识
    hashed_password = Column(String(255), nullable=False)                    # 密码哈希(bcrypt)
    
    # 用户资料
    full_name = Column(String(100), nullable=True)                          # 姓名
    role = Column(SQLEnum(UserRole), default=UserRole.VIEWER, nullable=False)  # 角色
    
    # 归属关系 - 用于数据权限过滤
    primary_laboratory_id = Column(Integer, ForeignKey("laboratories.id"), nullable=True)  # 主实验室
    primary_site_id = Column(Integer, ForeignKey("sites.id"), nullable=True)               # 主站点
    
    # 状态标志
    is_active = Column(Boolean, default=True)      # 是否激活，停用后无法登录
    is_superuser = Column(Boolean, default=False)  # 是否超级用户
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)                    # 创建时间
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)   # 更新时间
    last_login = Column(DateTime, nullable=True)                      # 最后登录时间

    # 关联关系
    primary_laboratory = relationship("Laboratory", back_populates="users", foreign_keys=[primary_laboratory_id])
    primary_site = relationship("Site", back_populates="users", foreign_keys=[primary_site_id])

    def __repr__(self):
        """返回用户对象的字符串表示"""
        return f"<User(id={self.id}, username='{self.username}', role='{self.role}')>"

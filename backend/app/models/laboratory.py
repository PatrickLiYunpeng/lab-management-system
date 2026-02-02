"""
实验室模型 - Laboratory Model

本模块定义实验室模型，支持两种实验室类型：
- FA (Failure Analysis): 失效分析实验室
- RELIABILITY: 可靠性测试实验室

数据关系:
- Laboratory N:1 Site (多个实验室属于一个站点)
- Laboratory 1:N Equipment (一个实验室包含多台设备)
- Laboratory 1:N Personnel (一个实验室有多名人员)
- Laboratory 1:N WorkOrder (一个实验室有多个工单)
- Laboratory 1:N Material (一个实验室管理多种材料)
- Laboratory 1:N Shift (一个实验室定义多个班次)
- Laboratory 1:N Method (一个实验室有多种分析/测试方法)

业务说明:
- 实验室是数据隔离的第二级，不同类型实验室的数据完全隔离
- FA实验室处理失效分析工单，使用分析方法
- 可靠性实验室处理可靠性测试工单，使用测试方法
- 每个实验室可设置最大容量，用于资源调度
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


class LaboratoryType(str, Enum):
    """
    实验室类型枚举
    
    定义系统支持的两种实验室类型，不同类型的实验室
    处理不同类型的工单，使用不同的分析/测试方法。
    
    Values:
        FA: 失效分析实验室 (Failure Analysis)
            - 处理失效分析工单 (FAILURE_ANALYSIS)
            - 使用分析方法 (ANALYSIS type methods)
        RELIABILITY: 可靠性测试实验室
            - 处理可靠性测试工单 (RELIABILITY_TEST)
            - 使用测试方法 (RELIABILITY type methods)
    """
    FA = "fa"                    # 失效分析实验室
    RELIABILITY = "reliability"  # 可靠性测试实验室


class Laboratory(Base):
    """
    实验室模型
    
    代表一个实验室，隶属于某个站点，是资源管理的核心单位。
    每个实验室有独立的设备、人员、工单和材料管理。
    
    Attributes:
        id: 主键，自增整数
        name: 实验室名称，如"深圳FA实验室"
        code: 实验室代码，唯一标识，如"SZ-FA"
        lab_type: 实验室类型 (FA/RELIABILITY)
        description: 实验室描述
        site_id: 所属站点ID，外键
        max_capacity: 最大容量（并行任务/样品数）
        manager_name: 经理姓名
        manager_email: 经理邮箱
        is_active: 是否激活
        created_at: 创建时间
        updated_at: 更新时间
    
    Relationships:
        site: 所属站点
        users: 主实验室为此实验室的用户列表
    """
    __tablename__ = "laboratories"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 基本信息
    name = Column(String(100), nullable=False, index=True)                  # 实验室名称
    code = Column(String(20), unique=True, nullable=False, index=True)      # 实验室代码，如"SZ-FA"
    lab_type = Column(SQLEnum(LaboratoryType), nullable=False, index=True)  # 实验室类型
    description = Column(Text, nullable=True)                                # 描述说明
    
    # 站点归属
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)  # 所属站点
    
    # 容量信息
    max_capacity = Column(Integer, nullable=True)  # 最大容量（并行任务/样品数）
    
    # 管理者信息
    manager_name = Column(String(100), nullable=True)   # 经理姓名
    manager_email = Column(String(255), nullable=True)  # 经理邮箱
    
    # 状态
    is_active = Column(Boolean, default=True)  # 是否激活
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)                   # 创建时间
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)  # 更新时间

    # 关联关系
    site = relationship("Site", back_populates="laboratories")  # 所属站点
    users = relationship("User", back_populates="primary_laboratory", foreign_keys="User.primary_laboratory_id")

    def __repr__(self):
        """返回实验室对象的字符串表示"""
        return f"<Laboratory(id={self.id}, name='{self.name}', type='{self.lab_type}')>"

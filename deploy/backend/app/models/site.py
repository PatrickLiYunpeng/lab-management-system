"""
站点模型 - Site Model

本模块定义物理站点/厂区模型，是组织架构的最顶层实体。
一个站点可以包含多个实验室，代表一个地理位置（如深圳厂区、上海厂区）。

数据关系:
- Site 1:N Laboratory (一个站点包含多个实验室)
- Site 1:N User (多个用户可属于同一站点)
- Site 1:N Personnel (多个人员可属于同一站点)
- Site 1:N Equipment (设备通过实验室间接关联)

业务说明:
- 站点是数据隔离的第一级，不同站点的数据默认互不可见
- 每个站点有唯一的代码(code)用于标识，如"SZ"代表深圳
- 站点可以设置时区信息，用于时间显示和SLA计算
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow():
    """
    获取当前UTC时间（带时区信息）
    
    Returns:
        datetime: 当前UTC时间，包含时区信息
    """
    return datetime.now(timezone.utc)


class Site(Base):
    """
    站点模型
    
    代表一个物理地理位置/厂区，是组织架构的最顶层。
    每个站点包含多个实验室，是数据隔离的第一级。
    
    Attributes:
        id: 主键，自增整数
        name: 站点名称，如"深圳厂区"，唯一
        code: 站点代码，如"SZ"，用于标识和显示，唯一
        address: 详细地址
        city: 城市名称
        country: 国家名称
        timezone: 时区设置，默认UTC
        contact_name: 联系人姓名
        contact_email: 联系人邮箱
        contact_phone: 联系人电话
        is_active: 是否激活，停用后不显示在下拉选项中
        created_at: 创建时间
        updated_at: 更新时间
    
    Relationships:
        laboratories: 站点下的所有实验室列表
        users: 主站点为此站点的所有用户
    """
    __tablename__ = "sites"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 基本信息
    name = Column(String(100), unique=True, nullable=False, index=True)   # 站点名称，如"深圳厂区"
    code = Column(String(20), unique=True, nullable=False, index=True)    # 站点代码，如"SZ"
    address = Column(Text, nullable=True)                                  # 详细地址
    city = Column(String(100), nullable=True)                             # 城市
    country = Column(String(100), nullable=True)                          # 国家
    timezone = Column(String(50), default="UTC")                          # 时区，用于时间显示
    
    # 联系信息
    contact_name = Column(String(100), nullable=True)    # 联系人姓名
    contact_email = Column(String(255), nullable=True)   # 联系人邮箱
    contact_phone = Column(String(50), nullable=True)    # 联系人电话
    
    # 状态
    is_active = Column(Boolean, default=True)  # 是否激活
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)                   # 创建时间
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)  # 更新时间

    # 关联关系
    laboratories = relationship("Laboratory", back_populates="site")  # 站点下的实验室
    users = relationship("User", back_populates="primary_site", foreign_keys="User.primary_site_id")  # 主站点用户

    def __repr__(self):
        """返回站点对象的字符串表示"""
        return f"<Site(id={self.id}, name='{self.name}', code='{self.code}')>"

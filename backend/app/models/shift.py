"""
班次模型 - Shift Model

本模块定义人员排班相关的模型，支持定义班次时间范围和将人员分配到班次。

数据关系:
- Shift N:1 Laboratory (多个班次属于一个实验室，或null表示适用所有实验室)
- Shift 1:N PersonnelShift (一个班次可分配给多个人员)
- PersonnelShift N:1 Personnel (多个班次分配记录关联一个人员)

业务说明:
- 班次定义工作时间范围，支持跨夜班次（如22:00-06:00）
- 人员班次分配有生效日期和结束日期，支持历史记录
- 班次用于交接管理，确保任务在班次变更时正确交接
"""
from datetime import datetime, timezone, date, time
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Time, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow():
    """
    获取当前UTC时间（带时区信息）
    
    Returns:
        datetime: 当前UTC时间，包含时区信息
    """
    return datetime.now(timezone.utc)


class Shift(Base):
    """
    班次定义模型
    
    定义工作班次的时间范围和所属实验室。
    
    Attributes:
        id: 主键
        name: 班次名称（如"早班"）
        code: 班次代码，唯一标识（如"DAY"）
        start_time: 开始时间
        end_time: 结束时间
        laboratory_id: 所属实验室ID（null=适用所有实验室）
        is_active: 是否激活
        created_at: 创建时间
        updated_at: 更新时间
    
    Relationships:
        laboratory: 关联实验室
        personnel_shifts: 人员班次分配列表
    """
    __tablename__ = "shifts"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 基本信息
    name = Column(String(100), nullable=False)                                # 班次名称
    code = Column(String(20), unique=True, nullable=False, index=True)        # 班次代码
    
    # 时间范围（支持跨夜班次，如22:00-06:00）
    start_time = Column(Time, nullable=False)  # 开始时间
    end_time = Column(Time, nullable=False)    # 结束时间
    
    # 实验室关联（null=适用所有实验室）
    laboratory_id = Column(Integer, ForeignKey("laboratories.id"), nullable=True)
    
    # 状态
    is_active = Column(Boolean, default=True)  # 是否激活
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)                   # 创建时间
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)  # 更新时间

    # 关联关系
    laboratory = relationship("Laboratory")                                    # 关联实验室
    personnel_shifts = relationship(
        "PersonnelShift", 
        back_populates="shift", 
        cascade="all, delete-orphan"
    )  # 人员班次分配

    def __repr__(self):
        """返回班次对象的字符串表示"""
        return f"<Shift(id={self.id}, code='{self.code}', name='{self.name}')>"

    def format_time_range(self) -> str:
        """
        格式化时间范围用于显示
        
        Returns:
            str: 格式化的时间范围（如"08:00 - 17:00"）
        """
        start = self.start_time.strftime("%H:%M") if self.start_time else ""
        end = self.end_time.strftime("%H:%M") if self.end_time else ""
        return f"{start} - {end}"


class PersonnelShift(Base):
    """
    人员班次分配模型
    
    记录人员的班次分配，支持日期范围。
    
    Attributes:
        id: 主键
        personnel_id: 人员ID
        shift_id: 班次ID
        effective_date: 生效日期
        end_date: 结束日期（null=持续有效）
        created_at: 创建时间
        updated_at: 更新时间
    
    Relationships:
        personnel: 关联人员
        shift: 关联班次
    """
    __tablename__ = "personnel_shifts"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 关联信息
    personnel_id = Column(Integer, ForeignKey("personnel.id"), nullable=False)  # 人员ID
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=False)          # 班次ID
    
    # 有效期
    effective_date = Column(Date, nullable=False, index=True)  # 生效日期
    end_date = Column(Date, nullable=True)                      # 结束日期（null=持续有效）
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)                   # 创建时间
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)  # 更新时间

    # 关联关系
    personnel = relationship("Personnel", back_populates="shifts")  # 关联人员
    shift = relationship("Shift", back_populates="personnel_shifts")  # 关联班次

    # 索引用于高效重叠查询
    __table_args__ = (
        Index('ix_personnel_shift_dates', 'personnel_id', 'effective_date'),
    )

    def __repr__(self):
        """返回人员班次分配对象的字符串表示"""
        return f"<PersonnelShift(id={self.id}, personnel_id={self.personnel_id}, shift_id={self.shift_id})>"

    def is_active_on(self, check_date: date) -> bool:
        """
        检查该分配在指定日期是否有效
        
        Args:
            check_date: 要检查的日期
        
        Returns:
            bool: 如果分配在该日期有效则返回True
        """
        if check_date < self.effective_date:
            return False
        if self.end_date and check_date > self.end_date:
            return False
        return True

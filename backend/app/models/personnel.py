"""
人员模型 - Personnel Model

本模块定义人员档案模型，支持双重归属（主实验室+主站点）和跨实验室借调功能。
每个人员与一个用户账号一一对应，包含员工的工作信息和技能档案。

数据关系:
- Personnel 1:1 User (一个人员对应一个用户账号)
- Personnel N:1 Laboratory (人员有主实验室和当前实验室)
- Personnel N:1 Site (人员有主站点和当前站点)
- Personnel N:M Skill (通过PersonnelSkill关联多个技能)
- Personnel 1:N StaffBorrowRequest (一个人员可有多个借调记录)
- Personnel 1:N PersonnelShift (一个人员可分配多个班次)
- Personnel 1:N WorkOrderTask (一个人员可被分配多个任务)

业务说明:
- 人员有主实验室归属和当前实验室归属两个概念
- 当人员被借调时，current_laboratory_id和current_site_id会更新
- 借调结束后，当前归属会恢复为主实验室归属
- 人员状态影响任务分配：只有AVAILABLE状态的人员可接受新任务
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
        datetime: 当前UTC时间
    """
    return datetime.now(timezone.utc)


class PersonnelStatus(str, Enum):
    """
    人员状态枚举
    
    定义人员的可用状态，影响任务分配和借调申请：
    - AVAILABLE: 可用 - 可接受新任务分配
    - BUSY: 忙碌 - 正在执行任务，暂时无法分配新任务
    - ON_LEAVE: 休假 - 请假/休假中，不可分配任务
    - BORROWED: 借调 - 已借调到其他实验室工作
    """
    AVAILABLE = "available"   # 可用
    BUSY = "busy"            # 忙碌
    ON_LEAVE = "on_leave"    # 休假
    BORROWED = "borrowed"    # 借调中


class Personnel(Base):
    """
    人员档案模型
    
    存储员工的工作信息，每个人员必须关联一个用户账号。
    支持双重归属：主实验室/站点 和 当前实验室/站点。
    
    Attributes:
        id: 主键，自增整数
        employee_id: 员工工号，唯一标识
        user_id: 关联用户账号ID
        primary_laboratory_id: 主实验室ID（员工正式归属）
        primary_site_id: 主站点ID（员工正式归属）
        current_laboratory_id: 当前实验室ID（借调时会变化）
        current_site_id: 当前站点ID（借调时会变化）
        job_title: 职位/岗位名称
        department: 部门名称
        status: 人员状态（可用/忙碌/休假/借调）
        hire_date: 入职日期
        created_at: 创建时间
        updated_at: 更新时间
    
    Relationships:
        user: 关联的用户账号（1:1关系）
        primary_laboratory: 主实验室
        primary_site: 主站点
        current_laboratory: 当前实验室（借调时使用）
        current_site: 当前站点（借调时使用）
        skills: 人员技能列表（通过PersonnelSkill关联）
        borrow_requests_as_borrower: 作为被借调人的借调申请
        shifts: 人员班次分配
    """
    __tablename__ = "personnel"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 员工标识
    employee_id = Column(String(50), unique=True, nullable=False, index=True)  # 员工工号
    
    # 关联用户账号 - 一一对应
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    # 主归属 - 员工的正式归属部门
    primary_laboratory_id = Column(Integer, ForeignKey("laboratories.id"), nullable=False)  # 主实验室
    primary_site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)               # 主站点
    
    # 当前归属 - 借调时会与主归属不同
    current_laboratory_id = Column(Integer, ForeignKey("laboratories.id"), nullable=True)   # 当前实验室
    current_site_id = Column(Integer, ForeignKey("sites.id"), nullable=True)                # 当前站点
    
    # 工作信息
    job_title = Column(String(100), nullable=True)   # 职位
    department = Column(String(100), nullable=True)  # 部门
    
    # 状态
    status = Column(SQLEnum(PersonnelStatus), default=PersonnelStatus.AVAILABLE, nullable=False)
    
    # 时间信息
    hire_date = Column(DateTime, nullable=True)                      # 入职日期
    created_at = Column(DateTime, default=utcnow)                    # 创建时间
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)   # 更新时间

    # 关联关系
    user = relationship("User", backref="personnel", uselist=False)  # 关联用户
    primary_laboratory = relationship("Laboratory", foreign_keys=[primary_laboratory_id])  # 主实验室
    primary_site = relationship("Site", foreign_keys=[primary_site_id])                    # 主站点
    current_laboratory = relationship("Laboratory", foreign_keys=[current_laboratory_id])  # 当前实验室
    current_site = relationship("Site", foreign_keys=[current_site_id])                    # 当前站点
    skills = relationship("PersonnelSkill", back_populates="personnel", cascade="all, delete-orphan")  # 技能
    borrow_requests_as_borrower = relationship(
        "StaffBorrowRequest", 
        foreign_keys="StaffBorrowRequest.personnel_id",
        back_populates="personnel"
    )  # 借调申请
    shifts = relationship("PersonnelShift", back_populates="personnel", cascade="all, delete-orphan")  # 班次分配

    def __repr__(self):
        """返回人员对象的字符串表示"""
        return f"<Personnel(id={self.id}, employee_id='{self.employee_id}', status='{self.status}')>"


class StaffBorrowRequest(Base):
    """
    人员借调申请模型
    
    管理人员在不同实验室之间的临时调配，需要经理审批。
    借调期间，人员的current_laboratory_id会更新，状态变为BORROWED。
    
    Attributes:
        id: 主键
        personnel_id: 被借调人员ID
        from_laboratory_id: 原实验室ID
        to_laboratory_id: 目标实验室ID
        reason: 借调原因
        start_date: 借调开始日期
        end_date: 借调结束日期
        status: 审批状态 (pending/approved/rejected/completed)
        requested_by_id: 申请人用户ID
        approved_by_id: 审批人用户ID
        approved_at: 审批时间
        rejection_reason: 拒绝原因（如被拒绝）
        created_at: 创建时间
        updated_at: 更新时间
    
    业务流程:
        1. Manager发起借调申请 (status=pending)
        2. 目标实验室Manager审批 (status=approved/rejected)
        3. 审批通过后，人员current_laboratory_id更新
        4. 借调到期后，系统恢复人员归属 (status=completed)
    """
    __tablename__ = "staff_borrow_requests"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 借调人员
    personnel_id = Column(Integer, ForeignKey("personnel.id"), nullable=False)  # 被借调人员
    
    # 借调方向
    from_laboratory_id = Column(Integer, ForeignKey("laboratories.id"), nullable=False)  # 原实验室
    to_laboratory_id = Column(Integer, ForeignKey("laboratories.id"), nullable=False)    # 目标实验室
    
    # 借调详情
    reason = Column(Text, nullable=True)          # 借调原因
    start_date = Column(DateTime, nullable=False)  # 开始日期
    end_date = Column(DateTime, nullable=False)    # 结束日期
    
    # 审批信息
    status = Column(String(20), default="pending")  # 状态：pending/approved/rejected/completed
    requested_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)   # 申请人
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)     # 审批人
    approved_at = Column(DateTime, nullable=True)                                # 审批时间
    rejection_reason = Column(Text, nullable=True)                               # 拒绝原因
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)                   # 创建时间
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)  # 更新时间

    # 关联关系
    personnel = relationship("Personnel", foreign_keys=[personnel_id], back_populates="borrow_requests_as_borrower")
    from_laboratory = relationship("Laboratory", foreign_keys=[from_laboratory_id])   # 原实验室
    to_laboratory = relationship("Laboratory", foreign_keys=[to_laboratory_id])       # 目标实验室
    requested_by = relationship("User", foreign_keys=[requested_by_id])               # 申请人
    approved_by = relationship("User", foreign_keys=[approved_by_id])                 # 审批人

    def __repr__(self):
        """返回借调申请对象的字符串表示"""
        return f"<StaffBorrowRequest(id={self.id}, personnel_id={self.personnel_id}, status='{self.status}')>"

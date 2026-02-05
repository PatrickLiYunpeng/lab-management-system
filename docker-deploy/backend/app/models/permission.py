"""
权限模型 - Permission Model

本模块定义动态权限管理相关的模型，支持角色权限的运行时配置和变更追踪。

数据关系:
- RolePermission: 角色-权限映射表，支持动态启用/禁用
- PermissionChangeLog: 权限变更日志，用于审计

业务说明:
- 系统定义32个权限代码，分为8个类别
- 支持5种角色：Admin、Manager、Engineer、Technician、Viewer
- Admin角色权限不可修改（系统保护）
- 权限变更记录完整的审计日志
"""
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow():
    """
    获取当前UTC时间（带时区信息）
    
    Returns:
        datetime: 当前UTC时间，包含时区信息
    """
    return datetime.now(timezone.utc)


class PermissionCode(str, Enum):
    """
    权限代码枚举 - 与前端Permission常量保持一致
    
    权限分为8个类别：
    - 用户管理：MANAGE_USERS, MANAGE_SITES, MANAGE_LABORATORIES, MANAGE_LOCATIONS
    - 客户与SLA：MANAGE_CLIENTS, MANAGE_CLIENT_SLA, MANAGE_SOURCE_CATEGORIES
    - 技能：MANAGE_SKILL_CATEGORIES, MANAGE_SKILLS, ASSIGN_PERSONNEL_SKILLS
    - 人员：INITIATE_BORROW, APPROVE_BORROW, MANAGE_SHIFTS
    - 设备与方法：MANAGE_EQUIPMENT, MANAGE_METHODS
    - 工单：CREATE_WORK_ORDER, ASSIGN_LEAD_ENGINEER, CREATE_SUBTASK, 
           ASSIGN_TECHNICIAN, EXECUTE_SUBTASK, VERIFY_RESULTS
    - 交接：INITIATE_HANDOVER
    - 材料：MANAGE_MATERIALS, ALLOCATE_MATERIALS, HANDLE_MATERIAL_RETURN, CONFIRM_MATERIAL_ALERTS
    - 仪表板与报表：VIEW_LAB_DASHBOARD, VIEW_ALL_DASHBOARDS, VIEW_CYCLE_TIME_REPORT,
                   VIEW_SKILLS_MATRIX, VIEW_REPORTS
    - 审计：VIEW_AUDIT_LOGS
    """
    # 用户管理
    MANAGE_USERS = "manage_users"                   # 管理用户
    MANAGE_SITES = "manage_sites"                   # 管理站点
    MANAGE_LABORATORIES = "manage_laboratories"     # 管理实验室
    MANAGE_LOCATIONS = "manage_locations"           # 管理位置
    
    # 客户与SLA
    MANAGE_CLIENTS = "manage_clients"               # 管理客户
    MANAGE_CLIENT_SLA = "manage_client_sla"         # 管理客户SLA
    MANAGE_SOURCE_CATEGORIES = "manage_source_categories"  # 管理来源类别
    
    # 技能
    MANAGE_SKILL_CATEGORIES = "manage_skill_categories"    # 管理技能分类
    MANAGE_SKILLS = "manage_skills"                         # 管理技能
    ASSIGN_PERSONNEL_SKILLS = "assign_personnel_skills"     # 分配人员技能
    
    # 人员
    INITIATE_BORROW = "initiate_borrow"   # 发起借调
    APPROVE_BORROW = "approve_borrow"     # 审批借调
    MANAGE_SHIFTS = "manage_shifts"       # 管理班次
    
    # 设备与方法
    MANAGE_EQUIPMENT = "manage_equipment"  # 管理设备
    MANAGE_METHODS = "manage_methods"      # 管理方法
    
    # 工单
    CREATE_WORK_ORDER = "create_work_order"       # 创建工单
    ASSIGN_LEAD_ENGINEER = "assign_lead_engineer" # 分配负责工程师
    CREATE_SUBTASK = "create_subtask"             # 创建子任务
    ASSIGN_TECHNICIAN = "assign_technician"       # 分配技术员
    EXECUTE_SUBTASK = "execute_subtask"           # 执行子任务
    VERIFY_RESULTS = "verify_results"             # 验收结果
    
    # 交接
    INITIATE_HANDOVER = "initiate_handover"  # 发起交接
    
    # 材料
    MANAGE_MATERIALS = "manage_materials"             # 管理材料
    ALLOCATE_MATERIALS = "allocate_materials"         # 分配材料
    HANDLE_MATERIAL_RETURN = "handle_material_return" # 处理材料返还
    CONFIRM_MATERIAL_ALERTS = "confirm_material_alerts"  # 确认材料告警
    
    # 仪表板与报表
    VIEW_LAB_DASHBOARD = "view_lab_dashboard"         # 查看实验室仪表板
    VIEW_ALL_DASHBOARDS = "view_all_dashboards"       # 查看所有仪表板
    VIEW_CYCLE_TIME_REPORT = "view_cycle_time_report" # 查看周期时间报表
    VIEW_SKILLS_MATRIX = "view_skills_matrix"         # 查看技能矩阵
    VIEW_REPORTS = "view_reports"                     # 查看报表
    
    # 审计
    VIEW_AUDIT_LOGS = "view_audit_logs"  # 查看审计日志


class RolePermission(Base):
    """
    角色权限映射模型
    
    存储角色和权限的动态映射关系，支持运行时配置。
    
    Attributes:
        id: 主键
        role: 角色名称
        permission: 权限代码
        is_enabled: 是否启用
        created_at: 创建时间
        updated_at: 更新时间
    """
    __tablename__ = "role_permissions"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 角色和权限
    role = Column(String(50), nullable=False, index=True)         # 角色名称
    permission = Column(String(100), nullable=False, index=True)  # 权限代码
    is_enabled = Column(Boolean, default=True, nullable=False)    # 是否启用
    
    # 时间戳
    created_at = Column(DateTime, default=utcnow)                   # 创建时间
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)  # 更新时间

    # 唯一约束：角色+权限组合唯一
    __table_args__ = (
        UniqueConstraint('role', 'permission', name='uq_role_permission'),
    )

    def __repr__(self):
        """返回角色权限映射对象的字符串表示"""
        return f"<RolePermission(role='{self.role}', permission='{self.permission}', enabled={self.is_enabled})>"


class PermissionChangeLog(Base):
    """
    权限变更日志模型
    
    记录权限变更的审计日志，用于追踪权限修改历史。
    
    Attributes:
        id: 主键
        role: 角色名称
        permission: 权限代码
        old_value: 原值
        new_value: 新值
        changed_by_id: 变更人ID
        changed_at: 变更时间
        reason: 变更原因
    """
    __tablename__ = "permission_change_logs"

    # 主键
    id = Column(Integer, primary_key=True, index=True)
    
    # 变更信息
    role = Column(String(50), nullable=False, index=True)   # 角色名称
    permission = Column(String(100), nullable=False)        # 权限代码
    old_value = Column(Boolean, nullable=True)              # 原值
    new_value = Column(Boolean, nullable=False)             # 新值
    changed_by_id = Column(Integer, nullable=False)         # 变更人ID
    changed_at = Column(DateTime, default=utcnow)           # 变更时间
    reason = Column(String(500), nullable=True)             # 变更原因

    def __repr__(self):
        """返回权限变更日志对象的字符串表示"""
        return f"<PermissionChangeLog(role='{self.role}', permission='{self.permission}', changed_at='{self.changed_at}')>"

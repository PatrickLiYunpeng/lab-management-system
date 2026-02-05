"""
Module Permission Model - 模块访问权限管理

定义模块权限的数据模型和默认配置，用于控制不同角色对系统模块/页面的访问权限。
"""
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import Column, Integer, String, Boolean, DateTime, UniqueConstraint
from sqlalchemy.sql import func

from app.core.database import Base


class ModuleCode(str, Enum):
    """系统模块代码枚举"""
    WORK_ORDERS = "work_orders"
    DASHBOARD = "dashboard"
    LOCATIONS = "locations"
    PERSONNEL = "personnel"
    EQUIPMENT = "equipment"
    METHODS = "methods"
    MATERIALS = "materials"
    CLIENTS = "clients"
    PRODUCTS = "products"
    HANDOVERS = "handovers"
    AUDIT_LOGS = "audit_logs"
    USER_MANAGEMENT = "user_management"
    SETTINGS = "settings"


class ModuleCategory(str, Enum):
    """模块分类"""
    CORE = "core"           # 核心业务
    RESOURCE = "resource"   # 资源管理
    ANALYTICS = "analytics" # 分析报表
    ADMIN = "admin"         # 系统管理


# 模块定义配置
MODULE_DEFINITIONS = {
    ModuleCode.WORK_ORDERS: {
        "code": "work_orders",
        "label": "工单管理",
        "route": "/work-orders",
        "icon": "FileTextOutlined",
        "category": ModuleCategory.CORE,
        "description": "创建、管理和跟踪工单",
        "display_order": 1,
    },
    ModuleCode.DASHBOARD: {
        "code": "dashboard",
        "label": "仪表板",
        "route": "/dashboard",
        "icon": "AppstoreOutlined",
        "category": ModuleCategory.ANALYTICS,
        "description": "查看数据分析和统计图表",
        "display_order": 2,
    },
    ModuleCode.LOCATIONS: {
        "code": "locations",
        "label": "地址管理",
        "route": "/locations",
        "icon": "BankOutlined",
        "category": ModuleCategory.RESOURCE,
        "description": "管理站点和实验室信息",
        "display_order": 3,
    },
    ModuleCode.PERSONNEL: {
        "code": "personnel",
        "label": "人员管理",
        "route": "/personnel",
        "icon": "TeamOutlined",
        "category": ModuleCategory.RESOURCE,
        "description": "管理人员信息、技能和排班",
        "display_order": 4,
    },
    ModuleCode.EQUIPMENT: {
        "code": "equipment",
        "label": "设备管理",
        "route": "/equipment",
        "icon": "ToolOutlined",
        "category": ModuleCategory.RESOURCE,
        "description": "管理设备信息、类型和调度",
        "display_order": 5,
    },
    ModuleCode.METHODS: {
        "code": "methods",
        "label": "分析/测试方法",
        "route": "/methods",
        "icon": "SolutionOutlined",
        "category": ModuleCategory.RESOURCE,
        "description": "管理分析和测试方法",
        "display_order": 6,
    },
    ModuleCode.MATERIALS: {
        "code": "materials",
        "label": "物料管理",
        "route": "/materials",
        "icon": "InboxOutlined",
        "category": ModuleCategory.CORE,
        "description": "管理物料库存和分配",
        "display_order": 7,
    },
    ModuleCode.CLIENTS: {
        "code": "clients",
        "label": "客户与SLA",
        "route": "/clients",
        "icon": "UsergroupAddOutlined",
        "category": ModuleCategory.RESOURCE,
        "description": "管理客户信息和服务级别协议",
        "display_order": 8,
    },
    ModuleCode.PRODUCTS: {
        "code": "products",
        "label": "产品管理",
        "route": "/products",
        "icon": "ShoppingOutlined",
        "category": ModuleCategory.RESOURCE,
        "description": "管理产品信息",
        "display_order": 9,
    },
    ModuleCode.HANDOVERS: {
        "code": "handovers",
        "label": "任务交接",
        "route": "/handovers",
        "icon": "SwapOutlined",
        "category": ModuleCategory.CORE,
        "description": "管理任务交接流程",
        "display_order": 10,
    },
    ModuleCode.AUDIT_LOGS: {
        "code": "audit_logs",
        "label": "审计日志",
        "route": "/audit-logs",
        "icon": "FileTextOutlined",
        "category": ModuleCategory.ADMIN,
        "description": "查看系统操作日志",
        "display_order": 11,
    },
    ModuleCode.USER_MANAGEMENT: {
        "code": "user_management",
        "label": "用户管理",
        "route": "/user-management",
        "icon": "UsergroupAddOutlined",
        "category": ModuleCategory.ADMIN,
        "description": "管理系统用户账号",
        "display_order": 12,
    },
    ModuleCode.SETTINGS: {
        "code": "settings",
        "label": "系统设置",
        "route": "/settings",
        "icon": "SettingOutlined",
        "category": ModuleCategory.ADMIN,
        "description": "系统配置和权限管理",
        "display_order": 13,
    },
}

# 各角色默认可访问的模块
# 基于2026-02-05用户配置的权限矩阵
DEFAULT_MODULE_PERMISSIONS = {
    "admin": list(ModuleCode),  # 管理员可访问所有模块
    "manager": [
        # 核心业务
        ModuleCode.WORK_ORDERS,
        ModuleCode.MATERIALS,
        ModuleCode.HANDOVERS,
        # 资源管理
        ModuleCode.LOCATIONS,
        ModuleCode.PERSONNEL,
        ModuleCode.EQUIPMENT,
        ModuleCode.METHODS,
        ModuleCode.CLIENTS,
        ModuleCode.PRODUCTS,
        # 分析报表
        ModuleCode.DASHBOARD,
        # 系统管理 - 仅用户管理，不含设置和审计
        ModuleCode.USER_MANAGEMENT,
    ],
    "engineer": [
        # 核心业务
        ModuleCode.WORK_ORDERS,
        ModuleCode.MATERIALS,
        ModuleCode.HANDOVERS,
        # 资源管理 - 技术相关
        ModuleCode.PERSONNEL,
        ModuleCode.EQUIPMENT,
        ModuleCode.METHODS,
        # 分析报表
        ModuleCode.DASHBOARD,
    ],
    "technician": [
        # 核心业务 - 日常操作
        ModuleCode.WORK_ORDERS,
        ModuleCode.MATERIALS,
        ModuleCode.HANDOVERS,
        # 分析报表
        ModuleCode.DASHBOARD,
    ],
    "viewer": [
        # 仅查看权限 - 只能访问工单查询
        ModuleCode.WORK_ORDERS,
    ],
}


class ModulePermission(Base):
    """模块权限模型 - 存储角色对模块的访问权限"""
    __tablename__ = "module_permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    role = Column(String(50), nullable=False, index=True)
    module_code = Column(String(50), nullable=False, index=True)
    can_access = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('role', 'module_code', name='uq_role_module'),
    )
    
    def __repr__(self):
        return f"<ModulePermission(role={self.role}, module={self.module_code}, can_access={self.can_access})>"


def get_module_definition(module_code: str) -> Optional[dict]:
    """获取模块定义"""
    try:
        code = ModuleCode(module_code)
        return MODULE_DEFINITIONS.get(code)
    except ValueError:
        return None


def get_all_module_definitions() -> list[dict]:
    """获取所有模块定义列表"""
    return [
        {**defn, "code": code.value}
        for code, defn in MODULE_DEFINITIONS.items()
    ]


def get_default_permissions_for_role(role: str) -> list[str]:
    """获取角色的默认模块权限列表"""
    modules = DEFAULT_MODULE_PERMISSIONS.get(role, [])
    return [m.value for m in modules]

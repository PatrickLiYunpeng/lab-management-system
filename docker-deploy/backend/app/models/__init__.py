"""
SQLAlchemy 数据模型包

本包包含所有数据库模型定义，供 Alembic 迁移工具自动检测。

模型分类:
- 用户认证: User, UserRole
- 组织结构: Site, Laboratory, LaboratoryType
- 人员管理: Personnel, PersonnelStatus, StaffBorrowRequest
- 技能管理: Skill, PersonnelSkill, ProficiencyLevel, SkillCategory
- 设备管理: Equipment, EquipmentType, EquipmentStatus, EquipmentCategory, 
            EquipmentSchedule, EquipmentSkillRequirement, 
            EquipmentCategoryModel, EquipmentNameModel
- 物料管理: Material, MaterialType, MaterialStatus, DisposalMethod, 
            MaterialHistory, MaterialReplenishment, MaterialConsumption
- 客户管理: Client, ClientSLA, TestingSourceCategory
- 工单管理: WorkOrder, WorkOrderType, WorkOrderStatus, WorkOrderTask, 
            TaskStatus, StandardCycleTime
- 班次管理: Shift, PersonnelShift
- 交接管理: TaskHandover, HandoverNote, HandoverStatus, HandoverPriority
- 方法管理: Method, MethodType, MethodSkillRequirement
- 产品管理: Product, PackageFormOption, PackageTypeOption, 
            ApplicationScenario, ProductApplicationScenario
- 权限管理: RolePermission, PermissionChangeLog, PermissionCode,
            ModulePermission, ModuleCode, ModuleCategory
- 审计日志: AuditLog, AuditAction
"""
from app.models.user import User, UserRole
from app.models.site import Site
from app.models.laboratory import Laboratory, LaboratoryType
from app.models.personnel import Personnel, PersonnelStatus, StaffBorrowRequest
from app.models.skill import Skill, PersonnelSkill, ProficiencyLevel, SkillCategory
from app.models.equipment import Equipment, EquipmentType, EquipmentStatus, EquipmentCategory, EquipmentSchedule, EquipmentSkillRequirement
from app.models.equipment_category import EquipmentCategoryModel, EquipmentNameModel
from app.models.material import Material, MaterialType, MaterialStatus, DisposalMethod, MaterialHistory, MaterialReplenishment, NonSapSource, ConsumptionStatus, MaterialConsumption, Client, ClientSLA, TestingSourceCategory
from app.models.work_order import WorkOrder, WorkOrderType, WorkOrderStatus, WorkOrderTask, TaskStatus, StandardCycleTime
from app.models.shift import Shift, PersonnelShift
from app.models.handover import TaskHandover, HandoverNote, HandoverStatus, HandoverPriority
from app.models.method import Method, MethodType, MethodSkillRequirement
from app.models.audit_log import AuditLog, AuditAction
from app.models.permission import RolePermission, PermissionChangeLog, PermissionCode
from app.models.module_permission import ModulePermission, ModuleCode, ModuleCategory, MODULE_DEFINITIONS, DEFAULT_MODULE_PERMISSIONS
from app.models.product import Product, PackageFormOption, PackageTypeOption, ApplicationScenario, ProductApplicationScenario

__all__ = [
    # User
    "User",
    "UserRole",
    # Site
    "Site",
    # Laboratory
    "Laboratory",
    "LaboratoryType",
    # Personnel
    "Personnel",
    "PersonnelStatus",
    "StaffBorrowRequest",
    # Skills
    "Skill",
    "PersonnelSkill",
    "ProficiencyLevel",
    "SkillCategory",
    # Equipment
    "Equipment",
    "EquipmentType",
    "EquipmentStatus",
    "EquipmentCategory",
    "EquipmentSchedule",
    "EquipmentSkillRequirement",
    "EquipmentCategoryModel",
    "EquipmentNameModel",
    # Material
    "Material",
    "MaterialType",
    "MaterialStatus",
    "DisposalMethod",
    "MaterialHistory",
    "MaterialReplenishment",
    "NonSapSource",
    "ConsumptionStatus",
    "MaterialConsumption",
    "Client",
    "ClientSLA",
    "TestingSourceCategory",
    # Work Order
    "WorkOrder",
    "WorkOrderType",
    "WorkOrderStatus",
    "WorkOrderTask",
    "TaskStatus",
    "StandardCycleTime",
    # Shift
    "Shift",
    "PersonnelShift",
    # Handover
    "TaskHandover",
    "HandoverNote",
    "HandoverStatus",
    "HandoverPriority",
    # Method
    "Method",
    "MethodType",
    "MethodSkillRequirement",
    # Audit Log
    "AuditLog",
    "AuditAction",
    # Permissions
    "RolePermission",
    "PermissionChangeLog",
    "PermissionCode",
    # Module Permissions
    "ModulePermission",
    "ModuleCode",
    "ModuleCategory",
    "MODULE_DEFINITIONS",
    "DEFAULT_MODULE_PERMISSIONS",
    # Product
    "Product",
    "PackageFormOption",
    "PackageTypeOption",
    "ApplicationScenario",
    "ProductApplicationScenario",
]

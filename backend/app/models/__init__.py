"""
SQLAlchemy models package.
All models should be imported here for Alembic autogenerate to detect them.
"""
from app.models.user import User, UserRole
from app.models.site import Site
from app.models.laboratory import Laboratory, LaboratoryType
from app.models.personnel import Personnel, PersonnelStatus, StaffBorrowRequest
from app.models.skill import Skill, PersonnelSkill, ProficiencyLevel, SkillCategory
from app.models.equipment import Equipment, EquipmentType, EquipmentStatus, EquipmentCategory, EquipmentSchedule, EquipmentSkillRequirement
from app.models.material import Material, MaterialType, MaterialStatus, DisposalMethod, MaterialHistory, Client, ClientSLA, TestingSourceCategory
from app.models.work_order import WorkOrder, WorkOrderType, WorkOrderStatus, WorkOrderTask, TaskStatus, StandardCycleTime
from app.models.shift import Shift, PersonnelShift
from app.models.handover import TaskHandover, HandoverNote, HandoverStatus, HandoverPriority
from app.models.method import Method, MethodType, MethodSkillRequirement
from app.models.audit_log import AuditLog, AuditAction
from app.models.permission import RolePermission, PermissionChangeLog, PermissionCode

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
    # Material
    "Material",
    "MaterialType",
    "MaterialStatus",
    "DisposalMethod",
    "MaterialHistory",
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
]

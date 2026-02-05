"""Add performance indexes and optimistic lock version

Revision ID: f1a2b3c4d5e6
Revises: aab1a5b414bd
Create Date: 2026-02-05 12:00:00.000000

添加数据库索引以提高查询性能，并为材料表添加乐观锁版本字段
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f1a2b3c4d5e6'
down_revision = 'aab1a5b414bd'
branch_labels = None
depends_on = None


def upgrade():
    # ========================================
    # 1. 为材料表添加版本字段（乐观锁）
    # ========================================
    op.add_column('materials', sa.Column('version', sa.Integer(), nullable=False, server_default='1'))
    
    # ========================================
    # 2. 工单表索引
    # ========================================
    # 常用查询字段索引
    op.create_index('ix_work_orders_created_at', 'work_orders', ['created_at'], unique=False)
    op.create_index('ix_work_orders_sla_deadline', 'work_orders', ['sla_deadline'], unique=False)
    op.create_index('ix_work_orders_priority_score', 'work_orders', ['priority_score'], unique=False)
    op.create_index('ix_work_orders_client_id', 'work_orders', ['client_id'], unique=False)
    op.create_index('ix_work_orders_assigned_engineer_id', 'work_orders', ['assigned_engineer_id'], unique=False)
    
    # 复合索引：状态+实验室（常见筛选组合）
    op.create_index('ix_work_orders_status_laboratory', 'work_orders', ['status', 'laboratory_id'], unique=False)
    # 复合索引：状态+创建时间（列表查询排序）
    op.create_index('ix_work_orders_status_created', 'work_orders', ['status', 'created_at'], unique=False)
    
    # ========================================
    # 3. 工单任务表索引
    # ========================================
    op.create_index('ix_work_order_tasks_work_order_id', 'work_order_tasks', ['work_order_id'], unique=False)
    op.create_index('ix_work_order_tasks_assigned_technician_id', 'work_order_tasks', ['assigned_technician_id'], unique=False)
    op.create_index('ix_work_order_tasks_required_equipment_id', 'work_order_tasks', ['required_equipment_id'], unique=False)
    # 复合索引：状态+技术员（查询技术员当前任务）
    op.create_index('ix_work_order_tasks_status_technician', 'work_order_tasks', ['status', 'assigned_technician_id'], unique=False)
    
    # ========================================
    # 4. 材料表索引
    # ========================================
    op.create_index('ix_materials_laboratory_id', 'materials', ['laboratory_id'], unique=False)
    op.create_index('ix_materials_site_id', 'materials', ['site_id'], unique=False)
    op.create_index('ix_materials_client_id', 'materials', ['client_id'], unique=False)
    op.create_index('ix_materials_created_at', 'materials', ['created_at'], unique=False)
    # 复合索引：类型+状态（查询可用物料）
    op.create_index('ix_materials_type_status', 'materials', ['material_type', 'status'], unique=False)
    
    # ========================================
    # 5. 设备表索引
    # ========================================
    op.create_index('ix_equipment_laboratory_id', 'equipment', ['laboratory_id'], unique=False)
    op.create_index('ix_equipment_equipment_status', 'equipment', ['equipment_status'], unique=False)
    # 复合索引：实验室+状态（查询可用设备）
    op.create_index('ix_equipment_lab_status', 'equipment', ['laboratory_id', 'equipment_status'], unique=False)
    
    # ========================================
    # 6. 设备调度表索引
    # ========================================
    op.create_index('ix_equipment_schedules_equipment_id', 'equipment_schedules', ['equipment_id'], unique=False)
    op.create_index('ix_equipment_schedules_start_time', 'equipment_schedules', ['start_time'], unique=False)
    op.create_index('ix_equipment_schedules_end_time', 'equipment_schedules', ['end_time'], unique=False)
    # 复合索引：设备+状态+时间（冲突检测）
    op.create_index('ix_equipment_schedules_conflict_check', 'equipment_schedules', 
                    ['equipment_id', 'status', 'start_time', 'end_time'], unique=False)
    
    # ========================================
    # 7. 人员表索引
    # ========================================
    op.create_index('ix_personnel_laboratory_id', 'personnel', ['laboratory_id'], unique=False)
    op.create_index('ix_personnel_status', 'personnel', ['status'], unique=False)
    # 复合索引：实验室+状态（查询可用人员）
    op.create_index('ix_personnel_lab_status', 'personnel', ['laboratory_id', 'status'], unique=False)
    
    # ========================================
    # 8. 审计日志表索引
    # ========================================
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'], unique=False)
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'], unique=False)
    op.create_index('ix_audit_logs_entity_type', 'audit_logs', ['entity_type'], unique=False)
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'], unique=False)
    # 复合索引：实体类型+实体ID（查询特定实体的操作历史）
    op.create_index('ix_audit_logs_entity', 'audit_logs', ['entity_type', 'entity_id'], unique=False)
    # 复合索引：时间+动作类型（按时间范围查询特定操作）
    op.create_index('ix_audit_logs_time_action', 'audit_logs', ['created_at', 'action'], unique=False)
    
    # ========================================
    # 9. 材料消耗表索引
    # ========================================
    op.create_index('ix_material_consumptions_material_id', 'material_consumptions', ['material_id'], unique=False)
    op.create_index('ix_material_consumptions_task_id', 'material_consumptions', ['task_id'], unique=False)
    op.create_index('ix_material_consumptions_consumed_at', 'material_consumptions', ['consumed_at'], unique=False)
    
    # ========================================
    # 10. 材料补充表索引
    # ========================================
    op.create_index('ix_material_replenishments_material_id', 'material_replenishments', ['material_id'], unique=False)
    op.create_index('ix_material_replenishments_received_date', 'material_replenishments', ['received_date'], unique=False)


def downgrade():
    # 移除材料版本字段
    op.drop_column('materials', 'version')
    
    # 移除所有索引（按添加顺序的逆序）
    op.drop_index('ix_material_replenishments_received_date', table_name='material_replenishments')
    op.drop_index('ix_material_replenishments_material_id', table_name='material_replenishments')
    
    op.drop_index('ix_material_consumptions_consumed_at', table_name='material_consumptions')
    op.drop_index('ix_material_consumptions_task_id', table_name='material_consumptions')
    op.drop_index('ix_material_consumptions_material_id', table_name='material_consumptions')
    
    op.drop_index('ix_audit_logs_time_action', table_name='audit_logs')
    op.drop_index('ix_audit_logs_entity', table_name='audit_logs')
    op.drop_index('ix_audit_logs_action', table_name='audit_logs')
    op.drop_index('ix_audit_logs_entity_type', table_name='audit_logs')
    op.drop_index('ix_audit_logs_user_id', table_name='audit_logs')
    op.drop_index('ix_audit_logs_created_at', table_name='audit_logs')
    
    op.drop_index('ix_personnel_lab_status', table_name='personnel')
    op.drop_index('ix_personnel_status', table_name='personnel')
    op.drop_index('ix_personnel_laboratory_id', table_name='personnel')
    
    op.drop_index('ix_equipment_schedules_conflict_check', table_name='equipment_schedules')
    op.drop_index('ix_equipment_schedules_end_time', table_name='equipment_schedules')
    op.drop_index('ix_equipment_schedules_start_time', table_name='equipment_schedules')
    op.drop_index('ix_equipment_schedules_equipment_id', table_name='equipment_schedules')
    
    op.drop_index('ix_equipment_lab_status', table_name='equipment')
    op.drop_index('ix_equipment_equipment_status', table_name='equipment')
    op.drop_index('ix_equipment_laboratory_id', table_name='equipment')
    
    op.drop_index('ix_materials_type_status', table_name='materials')
    op.drop_index('ix_materials_created_at', table_name='materials')
    op.drop_index('ix_materials_client_id', table_name='materials')
    op.drop_index('ix_materials_site_id', table_name='materials')
    op.drop_index('ix_materials_laboratory_id', table_name='materials')
    
    op.drop_index('ix_work_order_tasks_status_technician', table_name='work_order_tasks')
    op.drop_index('ix_work_order_tasks_required_equipment_id', table_name='work_order_tasks')
    op.drop_index('ix_work_order_tasks_assigned_technician_id', table_name='work_order_tasks')
    op.drop_index('ix_work_order_tasks_work_order_id', table_name='work_order_tasks')
    
    op.drop_index('ix_work_orders_status_created', table_name='work_orders')
    op.drop_index('ix_work_orders_status_laboratory', table_name='work_orders')
    op.drop_index('ix_work_orders_assigned_engineer_id', table_name='work_orders')
    op.drop_index('ix_work_orders_client_id', table_name='work_orders')
    op.drop_index('ix_work_orders_priority_score', table_name='work_orders')
    op.drop_index('ix_work_orders_sla_deadline', table_name='work_orders')
    op.drop_index('ix_work_orders_created_at', table_name='work_orders')

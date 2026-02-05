"""add_equipment_categories_and_names_tables

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2026-02-04 23:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6g7h8'
down_revision: Union[str, None] = 'b2c3d4e5f6g7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# 初始类别数据
INITIAL_CATEGORIES = [
    {'name': '电学分析', 'code': 'electrical_analysis', 'display_order': 1},
    {'name': '物理分析', 'code': 'physical_analysis', 'display_order': 2},
    {'name': '化学分析', 'code': 'chemical_analysis', 'display_order': 3},
    {'name': '光学分析', 'code': 'optical_analysis', 'display_order': 4},
    {'name': '热分析', 'code': 'thermal_analysis', 'display_order': 5},
    {'name': '机械测试', 'code': 'mechanical_test', 'display_order': 6},
    {'name': '环境测试', 'code': 'environmental_test', 'display_order': 7},
    {'name': '寿命测试', 'code': 'lifetime_test', 'display_order': 8},
]

# 旧枚举 -> 新类别code映射
CATEGORY_MAPPING = {
    'thermal': 'thermal_analysis',
    'mechanical': 'mechanical_test',
    'electrical': 'electrical_analysis',
    'optical': 'optical_analysis',
    'analytical': 'chemical_analysis',
    'environmental': 'environmental_test',
    'measurement': 'physical_analysis',
    'other': 'lifetime_test',
}


def upgrade() -> None:
    # 1. 创建equipment_categories表
    op.create_table(
        'equipment_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_equipment_categories_id', 'equipment_categories', ['id'], unique=False)
    op.create_index('ix_equipment_categories_name', 'equipment_categories', ['name'], unique=True)
    op.create_index('ix_equipment_categories_code', 'equipment_categories', ['code'], unique=True)

    # 2. 创建equipment_names表
    op.create_table(
        'equipment_names',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['category_id'], ['equipment_categories.id'], name='fk_equipment_names_category'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('category_id', 'name', name='uq_equipment_name_category')
    )
    op.create_index('ix_equipment_names_id', 'equipment_names', ['id'], unique=False)
    op.create_index('ix_equipment_names_category_id', 'equipment_names', ['category_id'], unique=False)
    op.create_index('ix_equipment_names_name', 'equipment_names', ['name'], unique=False)

    # 3. 给equipment表添加新字段
    op.add_column('equipment', sa.Column('category_id', sa.Integer(), nullable=True))
    op.add_column('equipment', sa.Column('equipment_name_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_equipment_category', 'equipment', 'equipment_categories', ['category_id'], ['id'])
    op.create_foreign_key('fk_equipment_name', 'equipment', 'equipment_names', ['equipment_name_id'], ['id'])
    op.create_index('ix_equipment_category_id', 'equipment', ['category_id'], unique=False)
    op.create_index('ix_equipment_equipment_name_id', 'equipment', ['equipment_name_id'], unique=False)

    # 4. 插入初始类别数据
    equipment_categories = sa.table(
        'equipment_categories',
        sa.column('name', sa.String),
        sa.column('code', sa.String),
        sa.column('display_order', sa.Integer),
        sa.column('is_active', sa.Boolean),
    )
    op.bulk_insert(equipment_categories, INITIAL_CATEGORIES)

    # 5. 数据迁移：为现有设备创建设备名并关联
    # 使用原生SQL进行数据迁移
    connection = op.get_bind()
    
    # 获取所有设备
    equipment_data = connection.execute(sa.text(
        "SELECT id, name, category FROM equipment WHERE category IS NOT NULL"
    )).fetchall()
    
    if equipment_data:
        # 获取类别ID映射
        categories = connection.execute(sa.text(
            "SELECT id, code FROM equipment_categories"
        )).fetchall()
        category_code_to_id = {c[1]: c[0] for c in categories}
        
        # 收集唯一的设备名（按类别分组）
        equipment_name_map = {}  # (category_id, base_name) -> equipment_name_id
        
        for eq_id, eq_name, eq_category in equipment_data:
            # 提取基础设备名（去除编号）
            base_name = extract_base_name(eq_name)
            
            # 获取新类别ID
            new_category_code = CATEGORY_MAPPING.get(eq_category)
            if not new_category_code:
                continue
            category_id = category_code_to_id.get(new_category_code)
            if not category_id:
                continue
            
            key = (category_id, base_name)
            
            # 如果这个设备名还没有创建，则创建
            if key not in equipment_name_map:
                connection.execute(sa.text(
                    "INSERT INTO equipment_names (category_id, name, is_active) VALUES (:category_id, :name, 1)"
                ), {'category_id': category_id, 'name': base_name})
                
                # 获取刚插入的ID
                result = connection.execute(sa.text(
                    "SELECT id FROM equipment_names WHERE category_id = :category_id AND name = :name"
                ), {'category_id': category_id, 'name': base_name}).fetchone()
                equipment_name_map[key] = result[0]
            
            # 更新设备记录
            equipment_name_id = equipment_name_map[key]
            connection.execute(sa.text(
                "UPDATE equipment SET category_id = :category_id, equipment_name_id = :equipment_name_id WHERE id = :eq_id"
            ), {'category_id': category_id, 'equipment_name_id': equipment_name_id, 'eq_id': eq_id})


def extract_base_name(full_name: str) -> str:
    """
    从完整设备名中提取基础名称（去除编号）
    
    示例:
    - "万用表001" -> "万用表"
    - "示波器-A2" -> "示波器"
    - "高温箱 #3" -> "高温箱"
    - "XRF分析仪" -> "XRF分析仪"
    """
    import re
    
    # 去除常见的编号模式
    patterns = [
        r'[-_\s]?[A-Z]?\d+$',      # 末尾数字: 001, A2, -01
        r'\s*#\d+$',               # #数字: #3
        r'\s*\(\d+\)$',            # (数字): (1)
        r'\s*【\d+】$',            # 【数字】: 【1】
    ]
    
    result = full_name.strip()
    for pattern in patterns:
        result = re.sub(pattern, '', result).strip()
    
    return result if result else full_name


def downgrade() -> None:
    # 1. 删除equipment表的外键约束和新字段
    op.drop_index('ix_equipment_equipment_name_id', table_name='equipment')
    op.drop_index('ix_equipment_category_id', table_name='equipment')
    op.drop_constraint('fk_equipment_name', 'equipment', type_='foreignkey')
    op.drop_constraint('fk_equipment_category', 'equipment', type_='foreignkey')
    op.drop_column('equipment', 'equipment_name_id')
    op.drop_column('equipment', 'category_id')

    # 2. 删除equipment_names表
    op.drop_index('ix_equipment_names_name', table_name='equipment_names')
    op.drop_index('ix_equipment_names_category_id', table_name='equipment_names')
    op.drop_index('ix_equipment_names_id', table_name='equipment_names')
    op.drop_table('equipment_names')

    # 3. 删除equipment_categories表
    op.drop_index('ix_equipment_categories_code', table_name='equipment_categories')
    op.drop_index('ix_equipment_categories_name', table_name='equipment_categories')
    op.drop_index('ix_equipment_categories_id', table_name='equipment_categories')
    op.drop_table('equipment_categories')

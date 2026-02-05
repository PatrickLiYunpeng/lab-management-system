"""add_material_replenishment_table

Revision ID: a1b2c3d4e5f6
Revises: c935eac5de3a
Create Date: 2026-02-04 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'c935eac5de3a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create non_sap_source enum type
    non_sap_source_enum = sa.Enum(
        'internal_transfer',
        'emergency_purchase',
        'gift_sample',
        'inventory_adjustment',
        'other',
        name='nonsapsource'
    )
    non_sap_source_enum.create(op.get_bind(), checkfirst=True)
    
    # Create material_replenishments table
    op.create_table('material_replenishments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('material_id', sa.Integer(), nullable=False),
        sa.Column('received_date', sa.DateTime(), nullable=False, comment='收货日期'),
        sa.Column('quantity_added', sa.Integer(), nullable=False, comment='增加数量'),
        sa.Column('sap_order_no', sa.String(length=100), nullable=True, comment='SAP订单号'),
        sa.Column('non_sap_source', sa.Enum(
            'internal_transfer',
            'emergency_purchase',
            'gift_sample',
            'inventory_adjustment',
            'other',
            name='nonsapsource'
        ), nullable=True, comment='非SAP来源'),
        sa.Column('notes', sa.Text(), nullable=True, comment='备注'),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True, comment='创建时间'),
        sa.ForeignKeyConstraint(['material_id'], ['materials.id'], ),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_material_replenishments_id'), 'material_replenishments', ['id'], unique=False)
    op.create_index(op.f('ix_material_replenishments_material_id'), 'material_replenishments', ['material_id'], unique=False)
    
    # Add CHECK constraint: quantity_added must be > 0
    op.create_check_constraint(
        'ck_material_replenishments_quantity_positive',
        'material_replenishments',
        'quantity_added > 0'
    )
    
    # Add CHECK constraint: at least one of sap_order_no or non_sap_source must be set
    op.create_check_constraint(
        'ck_material_replenishments_source_required',
        'material_replenishments',
        'sap_order_no IS NOT NULL OR non_sap_source IS NOT NULL'
    )


def downgrade() -> None:
    # Drop CHECK constraints
    op.drop_constraint('ck_material_replenishments_source_required', 'material_replenishments', type_='check')
    op.drop_constraint('ck_material_replenishments_quantity_positive', 'material_replenishments', type_='check')
    
    # Drop indexes
    op.drop_index(op.f('ix_material_replenishments_material_id'), table_name='material_replenishments')
    op.drop_index(op.f('ix_material_replenishments_id'), table_name='material_replenishments')
    
    # Drop table
    op.drop_table('material_replenishments')
    
    # Drop enum type
    sa.Enum(name='nonsapsource').drop(op.get_bind(), checkfirst=True)

"""add_material_consumption_table

Revision ID: b2c3d4e5f6g7
Revises: 1f11967eb327
Create Date: 2026-02-04 22:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, None] = '1f11967eb327'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create consumptions status enum type
    consumption_status_enum = sa.Enum('registered', 'voided', name='consumptionstatus')
    consumption_status_enum.create(op.get_bind(), checkfirst=True)
    
    # Create material_consumptions table
    op.create_table(
        'material_consumptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('material_id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('quantity_consumed', sa.Integer(), nullable=False),
        sa.Column('unit_price', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('total_cost', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('status', consumption_status_enum, nullable=False, server_default='registered'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('consumed_at', sa.DateTime(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('voided_at', sa.DateTime(), nullable=True),
        sa.Column('voided_by_id', sa.Integer(), nullable=True),
        sa.Column('void_reason', sa.Text(), nullable=True),
        sa.Column('replenishment_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['material_id'], ['materials.id'], name='fk_consumption_material'),
        sa.ForeignKeyConstraint(['task_id'], ['work_order_tasks.id'], name='fk_consumption_task'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], name='fk_consumption_created_by'),
        sa.ForeignKeyConstraint(['voided_by_id'], ['users.id'], name='fk_consumption_voided_by'),
        sa.ForeignKeyConstraint(['replenishment_id'], ['material_replenishments.id'], name='fk_consumption_replenishment'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('ix_material_consumptions_id', 'material_consumptions', ['id'], unique=False)
    op.create_index('ix_material_consumptions_material_id', 'material_consumptions', ['material_id'], unique=False)
    op.create_index('ix_material_consumptions_task_id', 'material_consumptions', ['task_id'], unique=False)
    op.create_index('ix_material_consumptions_status', 'material_consumptions', ['status'], unique=False)
    
    # Add CHECK constraint for quantity_consumed > 0
    op.execute("""
        ALTER TABLE material_consumptions 
        ADD CONSTRAINT ck_material_consumptions_quantity_positive 
        CHECK (quantity_consumed > 0)
    """)


def downgrade() -> None:
    # Drop CHECK constraint
    op.execute("""
        ALTER TABLE material_consumptions 
        DROP CONSTRAINT ck_material_consumptions_quantity_positive
    """)
    
    # Drop indexes
    op.drop_index('ix_material_consumptions_status', table_name='material_consumptions')
    op.drop_index('ix_material_consumptions_task_id', table_name='material_consumptions')
    op.drop_index('ix_material_consumptions_material_id', table_name='material_consumptions')
    op.drop_index('ix_material_consumptions_id', table_name='material_consumptions')
    
    # Drop table
    op.drop_table('material_consumptions')
    
    # Drop enum type
    consumption_status_enum = sa.Enum('registered', 'voided', name='consumptionstatus')
    consumption_status_enum.drop(op.get_bind(), checkfirst=True)

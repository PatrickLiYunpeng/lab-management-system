"""add module_permissions table

Revision ID: e5f6g7h8i9j0
Revises: d4e5f6g7h8i9
Create Date: 2026-02-05 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f6g7h8i9j0'
down_revision: Union[str, None] = 'd4e5f6g7h8i9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create module_permissions table
    op.create_table(
        'module_permissions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('module_code', sa.String(50), nullable=False),
        sa.Column('can_access', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('role', 'module_code', name='uq_role_module')
    )
    
    # Create index for faster lookups
    op.create_index('ix_module_permissions_role', 'module_permissions', ['role'])
    op.create_index('ix_module_permissions_module_code', 'module_permissions', ['module_code'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_module_permissions_module_code', table_name='module_permissions')
    op.drop_index('ix_module_permissions_role', table_name='module_permissions')
    
    # Drop table
    op.drop_table('module_permissions')

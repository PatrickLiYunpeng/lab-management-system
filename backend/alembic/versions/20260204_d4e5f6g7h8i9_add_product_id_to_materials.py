"""add_product_id_to_materials

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2026-02-04 23:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6g7h8i9'
down_revision: Union[str, None] = 'c3d4e5f6g7h8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add product_id column to materials table
    op.add_column('materials', sa.Column('product_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_materials_product_id',
        'materials', 'products',
        ['product_id'], ['id']
    )
    op.create_index('ix_materials_product_id', 'materials', ['product_id'])


def downgrade() -> None:
    op.drop_index('ix_materials_product_id', table_name='materials')
    op.drop_constraint('fk_materials_product_id', 'materials', type_='foreignkey')
    op.drop_column('materials', 'product_id')

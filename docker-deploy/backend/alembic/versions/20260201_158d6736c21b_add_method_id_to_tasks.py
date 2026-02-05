"""add_method_id_to_tasks

Revision ID: 158d6736c21b
Revises: ca15b07af86c
Create Date: 2026-02-01 04:10:34.950562

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '158d6736c21b'
down_revision: Union[str, None] = 'ca15b07af86c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use batch mode for SQLite compatibility
    with op.batch_alter_table('work_order_tasks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('method_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_work_order_tasks_method_id', 'methods', ['method_id'], ['id'])


def downgrade() -> None:
    with op.batch_alter_table('work_order_tasks', schema=None) as batch_op:
        batch_op.drop_constraint('fk_work_order_tasks_method_id', type_='foreignkey')
        batch_op.drop_column('method_id')

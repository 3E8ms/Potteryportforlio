"""initial schema

Revision ID: 0001
Revises: 
Create Date: 2026-09-30
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('orders',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('order_no', sa.String(length=20), nullable=False),
    sa.Column('status', sa.String(length=12), nullable=False),
    sa.Column('lang', sa.String(length=5), nullable=False),
    sa.Column('customer_name', sa.String(length=120), nullable=False),
    sa.Column('email', sa.String(length=254), nullable=False),
    sa.Column('phone', sa.String(length=20), nullable=False),
    sa.Column('address', sa.String(length=200), nullable=False),
    sa.Column('city', sa.String(length=80), nullable=False),
    sa.Column('province', sa.String(length=2), nullable=False),
    sa.Column('postal_code', sa.String(length=7), nullable=False),
    sa.Column('note', sa.Text(), nullable=False),
    sa.Column('total_cents', sa.Integer(), nullable=False),
    sa.Column('stock_applied', sa.Boolean(), nullable=False),
    sa.Column('stock_short', sa.Boolean(), nullable=False),
    sa.Column('stripe_session_id', sa.String(length=255), nullable=True),
    sa.Column('stripe_payment_intent', sa.String(length=255), nullable=True),
    sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('shipped_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("status IN ('pending','paid','shipped','cancelled')", name='ck_orders_status'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('stripe_session_id')
    )
    op.create_index(op.f('ix_orders_created_at'), 'orders', ['created_at'], unique=False)
    op.create_index(op.f('ix_orders_email'), 'orders', ['email'], unique=False)
    op.create_index(op.f('ix_orders_order_no'), 'orders', ['order_no'], unique=True)
    op.create_index(op.f('ix_orders_status'), 'orders', ['status'], unique=False)
    op.create_table('products',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', postgresql.JSONB(), nullable=False),
    sa.Column('description', postgresql.JSONB(), nullable=False),
    sa.Column('type', postgresql.JSONB(), nullable=False),
    sa.Column('theme', postgresql.JSONB(), nullable=False),
    sa.Column('year', sa.Integer(), nullable=False),
    sa.Column('season', sa.String(length=10), nullable=True),
    sa.Column('price_cents', sa.Integer(), nullable=False),
    sa.Column('stock', sa.Integer(), nullable=False),
    sa.Column('image_path', sa.String(length=255), nullable=True),
    sa.Column('tone', sa.Integer(), nullable=False),
    sa.Column('is_sample', sa.Boolean(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('price_cents >= 0', name='ck_products_price'),
    sa.CheckConstraint('stock >= 0', name='ck_products_stock'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('shop_settings',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', postgresql.JSONB(), nullable=False),
    sa.Column('tagline', postgresql.JSONB(), nullable=False),
    sa.Column('market_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('market_place', postgresql.JSONB(), nullable=False),
    sa.Column('form_link', sa.String(length=500), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('order_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('order_id', sa.Integer(), nullable=False),
    sa.Column('product_id', sa.Integer(), nullable=True),
    sa.Column('name', postgresql.JSONB(), nullable=False),
    sa.Column('unit_price_cents', sa.Integer(), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.CheckConstraint('quantity > 0', name='ck_order_items_qty'),
    sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_order_items_order_id'), 'order_items', ['order_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_order_items_order_id'), table_name='order_items')
    op.drop_table('order_items')
    op.drop_table('shop_settings')
    op.drop_table('products')
    op.drop_index(op.f('ix_orders_status'), table_name='orders')
    op.drop_index(op.f('ix_orders_order_no'), table_name='orders')
    op.drop_index(op.f('ix_orders_email'), table_name='orders')
    op.drop_index(op.f('ix_orders_created_at'), table_name='orders')
    op.drop_table('orders')

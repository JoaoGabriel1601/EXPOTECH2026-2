"""Ambientes, dispositivos e leituras de sensores."""

import sqlalchemy as sa
from alembic import op

revision = "0001_telemetry"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "rooms",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
    )
    op.create_table(
        "devices",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("room_id", sa.String(64), sa.ForeignKey("rooms.id"), nullable=False, unique=True),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("enabled", sa.Boolean(), nullable=False),
    )
    op.create_table(
        "sensor_readings",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("message_id", sa.Uuid(), nullable=False),
        sa.Column("device_id", sa.String(64), sa.ForeignKey("devices.id"), nullable=False),
        sa.Column("room_id", sa.String(64), sa.ForeignKey("rooms.id"), nullable=False),
        sa.Column("measured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "received_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("occupancy", sa.Integer(), nullable=False),
        sa.Column("temp_inside", sa.Float(), nullable=False),
        sa.Column("temp_outside", sa.Float(), nullable=False),
        sa.Column("target_temp", sa.Float(), nullable=False),
        sa.Column("humidity_inside", sa.Float(), nullable=False),
        sa.Column("humidity_outside", sa.Float(), nullable=False),
        sa.Column("ac_on", sa.Boolean(), nullable=False),
        sa.Column("manual_mode", sa.Boolean(), nullable=False),
        sa.UniqueConstraint("device_id", "message_id", name="uq_reading_device_message"),
        sa.CheckConstraint("occupancy >= 0", name="ck_reading_occupancy"),
        sa.CheckConstraint("temp_inside BETWEEN -40 AND 85", name="ck_reading_temp_inside"),
        sa.CheckConstraint("temp_outside BETWEEN -40 AND 85", name="ck_reading_temp_outside"),
        sa.CheckConstraint("humidity_inside BETWEEN 0 AND 100", name="ck_reading_humidity_inside"),
        sa.CheckConstraint(
            "humidity_outside BETWEEN 0 AND 100", name="ck_reading_humidity_outside"
        ),
        sa.CheckConstraint(
            "target_temp = 0 OR target_temp BETWEEN 16 AND 30", name="ck_reading_target"
        ),
    )
    op.create_index("ix_readings_room_measured", "sensor_readings", ["room_id", "measured_at"])


def downgrade():
    op.drop_table("sensor_readings")
    op.drop_table("devices")
    op.drop_table("rooms")

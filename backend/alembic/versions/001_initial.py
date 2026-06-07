"""Initial schema — vessels, sensor_stations, water_quality_samples

Revision ID: 001
Revises:
Create Date: 2026-04-26
"""

from typing import Sequence, Union

import geoalchemy2
import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "vessels",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("mmsi", sa.String(9), nullable=False, index=True),
        sa.Column("name", sa.String(64), nullable=True),
        sa.Column("vessel_type", sa.String(32), nullable=True),
        sa.Column("flag", sa.String(4), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("speed_knots", sa.Float(), nullable=True),
        sa.Column("heading", sa.Float(), nullable=True),
        sa.Column("course", sa.Float(), nullable=True),
        sa.Column("status", sa.String(32), nullable=True),
        sa.Column(
            "geom",
            geoalchemy2.types.Geometry("POINT", srid=4326),
            nullable=True,
        ),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_vessels_mmsi", "vessels", ["mmsi"])
    op.create_index("ix_vessels_observed_at", "vessels", ["observed_at"])

    op.create_table(
        "sensor_stations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("station_id", sa.String(32), nullable=False, unique=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("source", sa.String(32), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column(
            "geom",
            geoalchemy2.types.Geometry("POINT", srid=4326),
            nullable=True,
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("active", sa.Boolean(), server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    op.create_table(
        "water_quality_samples",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("station_id", sa.String(32), nullable=False, index=True),
        sa.Column("temperature_c", sa.Float(), nullable=True),
        sa.Column("salinity_ppt", sa.Float(), nullable=True),
        sa.Column("dissolved_oxygen_mgl", sa.Float(), nullable=True),
        sa.Column("ph", sa.Float(), nullable=True),
        sa.Column("turbidity_ntu", sa.Float(), nullable=True),
        sa.Column("chlorophyll_ugl", sa.Float(), nullable=True),
        sa.Column("nitrate_mgl", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("sampled_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("source", sa.String(32), nullable=False),
        sa.Column("quality_flag", sa.String(8), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("water_quality_samples")
    op.drop_table("sensor_stations")
    op.drop_table("vessels")

from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SensorStation(Base):
    __tablename__ = "sensor_stations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    station_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    source: Mapped[str] = mapped_column(String(32))  # usgs | noaa | derm | field
    longitude: Mapped[float] = mapped_column(Float)
    latitude: Mapped[float] = mapped_column(Float)
    geom: Mapped[object] = mapped_column(Geometry("POINT", srid=4326), nullable=True)
    description: Mapped[str | None] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class WaterQualitySample(Base):
    __tablename__ = "water_quality_samples"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    station_id: Mapped[str] = mapped_column(String(32), index=True)

    # Core measurements
    temperature_c: Mapped[float | None] = mapped_column(Float)
    salinity_ppt: Mapped[float | None] = mapped_column(Float)
    dissolved_oxygen_mgl: Mapped[float | None] = mapped_column(Float)
    ph: Mapped[float | None] = mapped_column(Float)
    turbidity_ntu: Mapped[float | None] = mapped_column(Float)

    # Additional analytes
    chlorophyll_ugl: Mapped[float | None] = mapped_column(Float)
    nitrate_mgl: Mapped[float | None] = mapped_column(Float)

    # Spatial (optional point override if sample is mobile)
    longitude: Mapped[float | None] = mapped_column(Float)
    latitude: Mapped[float | None] = mapped_column(Float)

    sampled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    source: Mapped[str] = mapped_column(String(32))
    quality_flag: Mapped[str | None] = mapped_column(String(8))  # P=provisional A=approved

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

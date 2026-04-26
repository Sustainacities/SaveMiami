from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Vessel(Base):
    __tablename__ = "vessels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    mmsi: Mapped[str] = mapped_column(String(9), index=True)
    name: Mapped[str | None] = mapped_column(String(64))
    vessel_type: Mapped[str | None] = mapped_column(String(32))
    flag: Mapped[str | None] = mapped_column(String(4))

    # Latest position
    longitude: Mapped[float] = mapped_column(Float)
    latitude: Mapped[float] = mapped_column(Float)
    speed_knots: Mapped[float | None] = mapped_column(Float)
    heading: Mapped[float | None] = mapped_column(Float)
    course: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str | None] = mapped_column(String(32))

    geom: Mapped[object] = mapped_column(Geometry("POINT", srid=4326), nullable=True)

    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

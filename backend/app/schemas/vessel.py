from datetime import datetime

from pydantic import BaseModel


class VesselOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    mmsi: str
    name: str | None
    vessel_type: str | None
    flag: str | None
    longitude: float
    latitude: float
    speed_knots: float | None
    heading: float | None
    course: float | None
    status: str | None
    observed_at: datetime


class VesselTrackOut(BaseModel):
    mmsi: str
    name: str | None
    positions: list[dict]

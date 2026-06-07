from datetime import datetime

from pydantic import BaseModel


class SensorStationOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    station_id: str
    name: str
    source: str
    longitude: float
    latitude: float
    description: str | None
    active: bool


class WaterQualitySampleOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    station_id: str
    temperature_c: float | None
    salinity_ppt: float | None
    dissolved_oxygen_mgl: float | None
    ph: float | None
    turbidity_ntu: float | None
    chlorophyll_ugl: float | None
    nitrate_mgl: float | None
    longitude: float | None
    latitude: float | None
    sampled_at: datetime
    source: str
    quality_flag: str | None

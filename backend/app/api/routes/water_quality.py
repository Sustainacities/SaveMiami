from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.water_quality import SensorStation, WaterQualitySample
from app.schemas.water_quality import SensorStationOut, WaterQualitySampleOut

router = APIRouter(prefix="/api/v1/water-quality", tags=["water-quality"])


@router.get("/stations", response_model=list[SensorStationOut])
async def list_stations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SensorStation).where(SensorStation.active == True))
    return result.scalars().all()


@router.get("/samples", response_model=list[WaterQualitySampleOut])
async def list_samples(
    station_id: str | None = Query(None),
    hours: int = Query(24, le=720),
    limit: int = Query(500, le=2000),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    q = select(WaterQualitySample).where(WaterQualitySample.sampled_at >= since)
    if station_id:
        q = q.where(WaterQualitySample.station_id == station_id)
    q = q.order_by(desc(WaterQualitySample.sampled_at)).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()

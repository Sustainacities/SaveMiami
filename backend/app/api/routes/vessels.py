from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.vessel import Vessel
from app.schemas.vessel import VesselOut

router = APIRouter(prefix="/api/v1/vessels", tags=["vessels"])


@router.get("", response_model=list[VesselOut])
async def list_vessels(
    limit: int = Query(200, le=500),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Vessel).order_by(desc(Vessel.observed_at)).limit(limit)
    )
    return result.scalars().all()


@router.get("/{mmsi}", response_model=VesselOut)
async def get_vessel(mmsi: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Vessel).where(Vessel.mmsi == mmsi).order_by(desc(Vessel.observed_at)).limit(1)
    )
    vessel = result.scalar_one_or_none()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return vessel

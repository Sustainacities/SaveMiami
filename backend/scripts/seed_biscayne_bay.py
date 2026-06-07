"""Seed Biscayne Bay demo data — vessels + water quality stations."""

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from random import uniform

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://aquadome:aquadome@localhost:5432/aquadome",
)

engine = create_async_engine(DATABASE_URL)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

# Biscayne Bay bounds: roughly -80.35 to -80.09 lon, 25.41 to 25.88 lat
VESSELS = [
    {"mmsi": "338234567", "name": "BISCAYNE SPIRIT", "vessel_type": "passenger",    "flag": "US", "lon": -80.16, "lat": 25.77},
    {"mmsi": "338198765", "name": "MIAMI REEF RUNNER","vessel_type": "fishing",     "flag": "US", "lon": -80.22, "lat": 25.68},
    {"mmsi": "338301122", "name": "PORT EVERGLADES","vessel_type": "cargo",         "flag": "US", "lon": -80.12, "lat": 25.79},
    {"mmsi": "338445566", "name": "SEAQUARIUM FERRY","vessel_type": "passenger",   "flag": "US", "lon": -80.16, "lat": 25.74},
    {"mmsi": "338556677", "name": "FLORIDA PIONEER", "vessel_type": "tug",          "flag": "US", "lon": -80.18, "lat": 25.76},
    {"mmsi": "636019388", "name": "CATALINA DREAM",  "vessel_type": "pleasure",     "flag": "PA", "lon": -80.20, "lat": 25.71},
    {"mmsi": "316019234", "name": "GULFSTREAM III",  "vessel_type": "tanker",       "flag": "CA", "lon": -80.13, "lat": 25.81},
    {"mmsi": "368019001", "name": "OCEAN PULSE",     "vessel_type": "research",     "flag": "US", "lon": -80.24, "lat": 25.65},
]

STATIONS = [
    {"station_id": "USGS-02288990", "name": "Biscayne Bay at Coconut Grove",
     "source": "usgs", "lon": -80.2385, "lat": 25.7281,
     "description": "USGS continuous water-quality monitor"},
    {"station_id": "NOAA-8723170",  "name": "Virginia Key — NOAA Tide Gauge",
     "source": "noaa", "lon": -80.1617, "lat": 25.7306,
     "description": "NOAA tidal and water-quality station"},
    {"station_id": "DERM-BIS01",    "name": "Biscayne Bay NP North",
     "source": "derm", "lon": -80.2100, "lat": 25.5200,
     "description": "Miami-Dade DERM ambient monitoring — northern bay"},
    {"station_id": "DERM-BIS02",    "name": "Card Sound",
     "source": "derm", "lon": -80.3000, "lat": 25.3900,
     "description": "Miami-Dade DERM ambient monitoring — Card Sound"},
    {"station_id": "FIELD-MVK01",   "name": "Miami-Dade Seaquarium",
     "source": "field","lon": -80.1617, "lat": 25.7378,
     "description": "Field sampling — Virginia Key"},
]


async def seed():
    from app.models.vessel import Vessel
    from app.models.water_quality import SensorStation, WaterQualitySample

    async with SessionLocal() as session:
        now = datetime.now(timezone.utc)

        # Vessels
        for v in VESSELS:
            session.add(
                Vessel(
                    mmsi=v["mmsi"],
                    name=v["name"],
                    vessel_type=v["vessel_type"],
                    flag=v["flag"],
                    longitude=v["lon"] + uniform(-0.02, 0.02),
                    latitude=v["lat"] + uniform(-0.01, 0.01),
                    speed_knots=round(uniform(0, 12), 1),
                    heading=round(uniform(0, 360), 1),
                    course=round(uniform(0, 360), 1),
                    status="underway",
                    observed_at=now - timedelta(minutes=uniform(0, 15)),
                )
            )

        # Sensor stations
        for s in STATIONS:
            station = SensorStation(
                station_id=s["station_id"],
                name=s["name"],
                source=s["source"],
                longitude=s["lon"],
                latitude=s["lat"],
                description=s["description"],
                active=True,
            )
            session.add(station)

        await session.flush()

        # Water quality samples — 48 h × 5 stations
        for s in STATIONS:
            for h in range(48):
                ts = now - timedelta(hours=h)
                session.add(
                    WaterQualitySample(
                        station_id=s["station_id"],
                        temperature_c=round(uniform(26, 30), 2),
                        salinity_ppt=round(uniform(30, 36), 2),
                        dissolved_oxygen_mgl=round(uniform(5.5, 8.5), 2),
                        ph=round(uniform(7.8, 8.4), 2),
                        turbidity_ntu=round(uniform(0.5, 4.0), 2),
                        chlorophyll_ugl=round(uniform(0.5, 6.0), 2),
                        nitrate_mgl=round(uniform(0.01, 0.4), 3),
                        longitude=s["lon"],
                        latitude=s["lat"],
                        sampled_at=ts,
                        source=s["source"],
                        quality_flag="P",
                    )
                )

        await session.commit()
        print(f"✓ Seeded {len(VESSELS)} vessels, {len(STATIONS)} stations, "
              f"{len(STATIONS) * 48} water quality samples")


if __name__ == "__main__":
    asyncio.run(seed())

# AquaDome — Biscayne Bay Digital Twin

**Project AquaDome** is a SustainaCities initiative and the first operational module of [SaveMiami](https://sustainacities.org) — a sustainable smart city platform launched at the OpenClimateFL Climate Collabothon.

AquaDome delivers a real-time, open-data digital twin of Biscayne Bay and Miami-Dade, combining live vessel tracking, water quality monitoring, and climate resilience layers into a GPU-accelerated map intelligence platform.

## Architecture

| Layer | Stack |
|---|---|
| Backend API | FastAPI · PostgreSQL/PostGIS · Redis · NATS JetStream |
| Frontend | Next.js 14 · deck.gl · MapLibre GL · Zustand |
| Infrastructure | Docker Compose · nginx · Alembic migrations |

## Quick Start

```bash
cp .env.example .env          # configure tokens
make up                        # start all services
make migrate                   # run DB migrations
make seed                      # load Biscayne Bay demo data
# → http://localhost
```

## Key Features

- **AIS Vessel Tracking** — live positions for all vessels in Biscayne Bay
- **Water Quality Monitoring** — USGS / NOAA / DERM sensor streams (pH, dissolved oxygen, salinity, temperature, turbidity)
- **Climate Layers** — flood risk, tree canopy, heat islands
- **Real-time WebSocket** — NATS JetStream → WebSocket telemetry fan-out
- **Waste Intelligence Layer** — PFAS plume modeling, incinerator fire event analysis, 305 Consortium zero-waste planning *(see PR #1)*

## Organisation

**SustainaCities / SaveMiami** — [sustainacities.org](https://sustainacities.org)  
Climate Collabothon · OpenClimateFL · NVIDIA Inception Program · Water.org · 305 Consortium

import asyncio
import json
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, vessels, water_quality
from app.core.config import settings
from app.core.nats import close_nats, get_nats

logging.basicConfig(level=getattr(logging, settings.log_level.upper()))
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="AquaDome — Biscayne Bay Digital Twin API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(vessels.router)
app.include_router(water_quality.router)


# ── WebSocket telemetry hub ────────────────────────────────────
class ConnectionManager:
    def __init__(self) -> None:
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self.active.remove(ws)

    async def broadcast(self, message: str) -> None:
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active.remove(ws)


manager = ConnectionManager()


@app.websocket("/ws/telemetry")
async def ws_telemetry(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()  # keep-alive ping
    except WebSocketDisconnect:
        manager.disconnect(ws)


# ── NATS subscriber → WebSocket fan-out ────────────────────────
async def _nats_to_ws():
    try:
        nc = await get_nats()
        sub = await nc.subscribe("telemetry.frames")
        async for msg in sub.messages:
            payload = msg.data.decode()
            await manager.broadcast(payload)
    except Exception as exc:
        logger.warning("NATS subscriber error: %s", exc)


@app.on_event("startup")
async def startup():
    asyncio.create_task(_nats_to_ws())
    logger.info("AquaDome API started — environment=%s", settings.environment)


@app.on_event("shutdown")
async def shutdown():
    await close_nats()

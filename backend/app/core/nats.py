import json
import logging

import nats
from nats.aio.client import Client as NATSClient

from .config import settings

logger = logging.getLogger(__name__)

_nc: NATSClient | None = None


async def get_nats() -> NATSClient:
    global _nc
    if _nc is None or not _nc.is_connected:
        _nc = await nats.connect(settings.nats_url)
    return _nc


async def publish(subject: str, data: dict) -> None:
    try:
        nc = await get_nats()
        await nc.publish(subject, json.dumps(data).encode())
    except Exception as exc:
        logger.warning("NATS publish failed for %s: %s", subject, exc)


async def close_nats() -> None:
    global _nc
    if _nc and _nc.is_connected:
        await _nc.drain()
        _nc = None

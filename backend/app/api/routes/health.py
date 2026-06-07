from fastapi import APIRouter
from sqlalchemy import text

from app.core.database import AsyncSessionLocal

router = APIRouter()


@router.get("/health")
async def health():
    db_ok = False
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    return {
        "status": "ok" if db_ok else "degraded",
        "db": "ok" if db_ok else "unreachable",
    }

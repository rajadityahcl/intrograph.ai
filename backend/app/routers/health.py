from fastapi import APIRouter

from ..db import verify_connectivity
from ..models import HealthStatus

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthStatus)
def health() -> HealthStatus:
    ok, detail = verify_connectivity()
    return HealthStatus(status="ok" if ok else "degraded", database=ok, detail=detail)

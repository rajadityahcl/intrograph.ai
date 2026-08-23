from fastapi import APIRouter

from ..db import run_query
from ..models import Sector

router = APIRouter(prefix="/api/sectors", tags=["sectors"])


@router.get("", response_model=list[Sector])
def list_sectors() -> list[Sector]:
    rows = run_query(
        """
        MATCH (sec:Sector)
        RETURN sec.id AS id, sec.name AS name
        ORDER BY sec.name
        """
    )
    return [Sector(**row) for row in rows]

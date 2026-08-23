"""Co-investment syndicate network for an investor -- who they habitually
co-invest with. Backed by the CO_INVESTED_WITH edges materialised during
seeding (derived from shared FundingRound participation)."""
from fastapi import APIRouter, HTTPException, Query

from ..db import run_query
from ..models import NetworkGraph, PathEdge, PathNode

router = APIRouter(prefix="/api/investors", tags=["network"])


@router.get("/{investor_id}/network", response_model=NetworkGraph)
def get_syndicate_network(investor_id: str, limit: int = Query(default=12, ge=1, le=40)) -> NetworkGraph:
    exists = run_query("MATCH (i:Investor {id: $id}) RETURN i.id AS id", {"id": investor_id})
    if not exists:
        raise HTTPException(status_code=404, detail=f"Investor '{investor_id}' not found")

    rows = run_query(
        """
        MATCH (i:Investor {id: $id})-[c:CO_INVESTED_WITH]-(partner:Investor)
        RETURN i.id AS centerId, i.name AS centerName, i.type AS centerType,
               partner.id AS partnerId, partner.name AS partnerName, partner.type AS partnerType,
               c.dealCount AS dealCount
        ORDER BY c.dealCount DESC
        LIMIT $limit
        """,
        {"id": investor_id, "limit": limit},
    )

    nodes: dict[str, PathNode] = {}
    edges: list[PathEdge] = []
    for row in rows:
        nodes.setdefault(
            row["centerId"],
            PathNode(id=row["centerId"], label="Investor", name=row["centerName"], subtitle=row["centerType"]),
        )
        nodes.setdefault(
            row["partnerId"],
            PathNode(id=row["partnerId"], label="Investor", name=row["partnerName"], subtitle=row["partnerType"]),
        )
        edges.append(
            PathEdge(source=row["centerId"], target=row["partnerId"], type=f"co-invested x{row['dealCount']}")
        )

    if investor_id not in nodes:
        detail_rows = run_query(
            "MATCH (i:Investor {id: $id}) RETURN i.id AS id, i.name AS name, i.type AS type", {"id": investor_id}
        )
        if detail_rows:
            d = detail_rows[0]
            nodes[d["id"]] = PathNode(id=d["id"], label="Investor", name=d["name"], subtitle=d["type"])

    return NetworkGraph(nodes=list(nodes.values()), edges=edges)

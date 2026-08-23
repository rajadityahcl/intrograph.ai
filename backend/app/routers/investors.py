from fastapi import APIRouter, HTTPException, Query

from ..db import run_query
from ..models import InvestorDetail, InvestorSummary, Person

router = APIRouter(prefix="/api/investors", tags=["investors"])


@router.get("", response_model=list[InvestorSummary])
def list_investors(
    sector: str | None = Query(default=None),
    stage: str | None = Query(default=None),
    search: str | None = Query(default=None),
) -> list[InvestorSummary]:
    rows = run_query(
        """
        MATCH (i:Investor)
        WHERE ($stage IS NULL OR $stage IN i.preferredStages)
          AND ($search IS NULL OR toLower(i.name) CONTAINS toLower($search))
        OPTIONAL MATCH (i)-[:FOCUSES_ON]->(sec:Sector)
        WITH i, collect(DISTINCT sec.name) AS sectors
        WHERE $sector IS NULL OR $sector IN sectors
        RETURN i.id AS id, i.name AS name, i.type AS type, i.hq AS hq,
               i.minTicket AS minTicket, i.maxTicket AS maxTicket,
               i.preferredStages AS preferredStages, sectors
        ORDER BY i.name
        """,
        {"sector": sector, "stage": stage, "search": search},
    )
    return [InvestorSummary(**row) for row in rows]


@router.get("/{investor_id}", response_model=InvestorDetail)
def get_investor(investor_id: str) -> InvestorDetail:
    rows = run_query(
        """
        MATCH (i:Investor {id: $id})
        OPTIONAL MATCH (i)-[:FOCUSES_ON]->(sec:Sector)
        OPTIONAL MATCH (p:Person)-[w:WORKS_AT]->(i)
        OPTIONAL MATCH (i)-[:PARTICIPATED_IN]->(:FundingRound)<-[:RAISED]-(s:Startup)
        WITH i,
             collect(DISTINCT sec.name) AS sectors,
             collect(DISTINCT CASE WHEN p IS NULL THEN NULL
                     ELSE {id: p.id, name: p.name, title: w.title} END) AS partnersRaw,
             count(DISTINCT s) AS portfolioCount
        RETURN i.id AS id, i.name AS name, i.type AS type, i.hq AS hq,
               i.minTicket AS minTicket, i.maxTicket AS maxTicket,
               i.preferredStages AS preferredStages, sectors,
               i.description AS description, i.foundedYear AS foundedYear, i.website AS website,
               [p IN partnersRaw WHERE p IS NOT NULL] AS partners, portfolioCount
        """,
        {"id": investor_id},
    )
    if not rows:
        raise HTTPException(status_code=404, detail=f"Investor '{investor_id}' not found")
    row = rows[0]
    return InvestorDetail(
        id=row["id"],
        name=row["name"],
        type=row["type"],
        hq=row["hq"],
        minTicket=row["minTicket"],
        maxTicket=row["maxTicket"],
        preferredStages=row["preferredStages"],
        sectors=row["sectors"],
        description=row["description"],
        foundedYear=row["foundedYear"],
        website=row["website"],
        partners=[Person(**p) for p in row["partners"]],
        portfolioCount=row["portfolioCount"],
    )

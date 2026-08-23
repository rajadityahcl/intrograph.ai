from fastapi import APIRouter, HTTPException, Query

from ..db import run_query
from ..models import FundingRound, Person, StartupDetail, StartupSummary

router = APIRouter(prefix="/api/startups", tags=["startups"])


@router.get("", response_model=list[StartupSummary])
def list_startups(
    sector: str | None = Query(default=None, description="Filter by sector name"),
    stage: str | None = Query(default=None, description="Filter by funding stage"),
    search: str | None = Query(default=None, description="Case-insensitive name search"),
) -> list[StartupSummary]:
    rows = run_query(
        """
        MATCH (s:Startup)
        WHERE ($stage IS NULL OR s.stage = $stage)
          AND ($search IS NULL OR toLower(s.name) CONTAINS toLower($search))
        OPTIONAL MATCH (s)-[:OPERATES_IN]->(sec:Sector)
        WITH s, collect(DISTINCT sec.name) AS sectors
        WHERE $sector IS NULL OR $sector IN sectors
        RETURN s.id AS id, s.name AS name, s.tagline AS tagline, s.stage AS stage,
               s.fundingAsk AS fundingAsk, s.location AS location,
               s.foundedYear AS foundedYear, sectors
        ORDER BY s.name
        """,
        {"sector": sector, "stage": stage, "search": search},
    )
    return [StartupSummary(**row) for row in rows]


@router.get("/{startup_id}", response_model=StartupDetail)
def get_startup(startup_id: str) -> StartupDetail:
    rows = run_query(
        """
        MATCH (s:Startup {id: $id})
        OPTIONAL MATCH (s)-[:OPERATES_IN]->(sec:Sector)
        OPTIONAL MATCH (p:Person)-[f:FOUNDED]->(s)
        OPTIONAL MATCH (s)-[:RAISED]->(fr:FundingRound)
        WITH s,
             collect(DISTINCT sec.name) AS sectors,
             collect(DISTINCT CASE WHEN p IS NULL THEN NULL
                     ELSE {id: p.id, name: p.name, title: f.title} END) AS foundersRaw,
             collect(DISTINCT CASE WHEN fr IS NULL THEN NULL
                     ELSE {id: fr.id, roundType: fr.roundType, amount: fr.amount,
                           date: toString(fr.date), valuation: fr.valuation, status: fr.status} END) AS roundsRaw
        RETURN s.id AS id, s.name AS name, s.tagline AS tagline, s.description AS description,
               s.stage AS stage, s.fundingAsk AS fundingAsk, s.location AS location,
               s.foundedYear AS foundedYear, s.teamSize AS teamSize, sectors,
               [f IN foundersRaw WHERE f IS NOT NULL] AS founders,
               [r IN roundsRaw WHERE r IS NOT NULL] AS fundingRounds
        """,
        {"id": startup_id},
    )
    if not rows:
        raise HTTPException(status_code=404, detail=f"Startup '{startup_id}' not found")
    row = rows[0]
    return StartupDetail(
        id=row["id"],
        name=row["name"],
        tagline=row["tagline"],
        description=row["description"],
        stage=row["stage"],
        fundingAsk=row["fundingAsk"],
        location=row["location"],
        foundedYear=row["foundedYear"],
        teamSize=row["teamSize"],
        sectors=row["sectors"],
        founders=[Person(**f) for f in row["founders"]],
        fundingRounds=[FundingRound(**r) for r in row["fundingRounds"]],
    )

"""
The two queries that are the actual point of this app.

`GET /api/startups/{id}/matches` is an ordinary-ish 2-hop traversal
(Startup -> Sector <- Investor) with post-hoc scoring -- the kind of thing
you *could* wedge into SQL with a couple of joins, just less pleasantly.

`GET /api/startups/{id}/matches/{investor_id}/path` is the one that a
relational schema genuinely struggles with: an unbounded, heterogeneous,
variable-length shortest path between a startup and an investor that
have no direct edge, discovered across five different relationship
types (people, boards, funding rounds, co-investment). In SQL this is a
recursive CTE with a UNION across half a dozen join tables and no way to
bound the relationship types cleanly; in Cypher it is one pattern.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from ..db import run_query
from ..models import ConflictResult, InvestorMatch, InvestorSummary, PathEdge, PathNode, StartupSummary, WarmIntroPath

router = APIRouter(prefix="/api/startups", tags=["matches"])

# Relationship types eligible for the warm-intro traversal. Cypher paths
# aren't guaranteed to be walked in the "natural" subject-verb-object
# direction a relationship name suggests (e.g. Investor-[:PARTICIPATED_IN]->
# FundingRound might be traversed FundingRound-to-Investor along the
# shortest path), so the explanation renders each hop as a neutral
# "A --label--> B" link rather than a grammatical sentence.
_REL_LABELS = {
    "FOUNDED": "founded",
    "WORKS_AT": "works at",
    "BOARD_MEMBER_OF": "board member of",
    "PARTICIPATED_IN": "invested in",
    "RAISED": "raised",
    "CO_INVESTED_WITH": "co-invested with",
    "OPERATES_IN": "operates in",
    "FOCUSES_ON": "focuses on",
}

_LABEL_TITLES = {
    "Startup": "Startup",
    "Investor": "Investor",
    "Person": "Person",
    "Sector": "Sector",
    "FundingRound": "Funding round",
}


def _node_name(props: dict) -> str:
    return props.get("name") or props.get("roundType") or props.get("id") or "?"


def _node_subtitle(label: str, props: dict) -> str | None:
    if label == "Startup":
        return props.get("tagline")
    if label == "Investor":
        return props.get("type")
    if label == "Person":
        return props.get("title")
    if label == "FundingRound":
        amount = props.get("amount")
        return f"{props.get('roundType', '')} · ${amount:,}" if amount else props.get("roundType")
    if label == "Sector":
        return "Sector"
    return None


@router.get("/{startup_id}/matches", response_model=list[InvestorMatch])
def get_matches(startup_id: str, limit: int = Query(default=15, ge=1, le=50)) -> list[InvestorMatch]:
    exists = run_query("MATCH (s:Startup {id: $id}) RETURN s.id AS id", {"id": startup_id})
    if not exists:
        raise HTTPException(status_code=404, detail=f"Startup '{startup_id}' not found")

    rows = run_query(
        """
        MATCH (s:Startup {id: $startupId})
        OPTIONAL MATCH (s)-[:OPERATES_IN]->(startupSector:Sector)
        WITH s, collect(DISTINCT startupSector.name) AS startupSectors, size(collect(DISTINCT startupSector.name)) AS totalSectors
        MATCH (i:Investor)-[:FOCUSES_ON]->(sec:Sector)
        WHERE sec.name IN startupSectors
        WITH s, i, totalSectors, collect(DISTINCT sec.name) AS matchedSectors
        OPTIONAL MATCH (i)-[:FOCUSES_ON]->(allSec:Sector)
        WITH s, i, totalSectors, matchedSectors, collect(DISTINCT allSec.name) AS allSectors,
             size(matchedSectors) AS sectorOverlap,
             s.stage IN i.preferredStages AS stageMatch,
             (s.fundingAsk >= i.minTicket AND s.fundingAsk <= i.maxTicket) AS ticketFit
        RETURN i.id AS id, i.name AS name, i.type AS type, i.hq AS hq,
               i.minTicket AS minTicket, i.maxTicket AS maxTicket,
               i.preferredStages AS preferredStages, allSectors AS sectors,
               matchedSectors, sectorOverlap, totalSectors, stageMatch, ticketFit
        ORDER BY sectorOverlap DESC, stageMatch DESC, ticketFit DESC
        LIMIT $limit
        """,
        {"startupId": startup_id, "limit": limit},
    )

    matches: list[InvestorMatch] = []
    for row in rows:
        score = row["sectorOverlap"] * 2 + (2 if row["stageMatch"] else 0) + (1 if row["ticketFit"] else 0)
        max_score = max(row["totalSectors"], 1) * 2 + 3
        parts = []
        if row["matchedSectors"]:
            parts.append(f"focuses on {row['sectorOverlap']} of your sectors ({', '.join(row['matchedSectors'])})")
        parts.append("invests at your stage" if row["stageMatch"] else "doesn't usually invest at your stage")
        parts.append("your ask fits their typical check size" if row["ticketFit"] else "your ask is outside their usual check size")
        joined = "; ".join(parts)
        reason = joined[0].upper() + joined[1:] + "."

        matches.append(
            InvestorMatch(
                investor=InvestorSummary(
                    id=row["id"], name=row["name"], type=row["type"], hq=row["hq"],
                    minTicket=row["minTicket"], maxTicket=row["maxTicket"],
                    preferredStages=row["preferredStages"], sectors=row["sectors"],
                ),
                sectorOverlap=row["sectorOverlap"],
                matchedSectors=row["matchedSectors"],
                stageMatch=row["stageMatch"],
                ticketFit=row["ticketFit"],
                fitScore=round(score / max_score, 2),
                reason=reason,
            )
        )
    return matches


@router.get("/{startup_id}/matches/{investor_id}/path", response_model=WarmIntroPath)
def get_warm_intro_path(startup_id: str, investor_id: str, max_hops: int = Query(default=6, ge=2, le=8)) -> WarmIntroPath:
    rows = run_query(
        f"""
        MATCH (start:Startup {{id: $startupId}}), (target:Investor {{id: $investorId}})
        MATCH path = shortestPath(
            (start)-[:FOUNDED|WORKS_AT|BOARD_MEMBER_OF|PARTICIPATED_IN|RAISED|CO_INVESTED_WITH*..{max_hops}]-(target)
        )
        RETURN [n IN nodes(path) | {{id: n.id, labels: labels(n), props: properties(n)}}] AS pathNodes,
               [r IN relationships(path) | type(r)] AS pathRelTypes
        """,
        {"startupId": startup_id, "investorId": investor_id},
    )
    if not rows:
        return WarmIntroPath(found=False, explanation="No connection found within the search depth.")

    row = rows[0]
    raw_nodes = row["pathNodes"]
    rel_types = row["pathRelTypes"]

    nodes: list[PathNode] = []
    for n in raw_nodes:
        label = n["labels"][0] if n["labels"] else "Node"
        props = n["props"]
        nodes.append(PathNode(id=n["id"], label=label, name=_node_name(props), subtitle=_node_subtitle(label, props)))

    edges = [PathEdge(source=nodes[i].id, target=nodes[i + 1].id, type=rel_types[i]) for i in range(len(rel_types))]

    chain = [nodes[0].name]
    for i, rel_type in enumerate(rel_types):
        label = _REL_LABELS.get(rel_type, rel_type.lower().replace("_", " "))
        chain.append(f"--[{label}]--> {nodes[i + 1].name}")
    explanation = " ".join(chain)

    return WarmIntroPath(found=True, hops=len(rel_types), nodes=nodes, edges=edges, explanation=explanation)


@router.get("/{startup_id}/conflicts/{investor_id}", response_model=ConflictResult)
def get_conflicts(startup_id: str, investor_id: str) -> ConflictResult:
    """Portfolio-conflict check: does this investor already back a competitor
    of the startup (i.e. another company in the same sector)? A real VC
    workflow question that is a single graph pattern here and a multi-way
    self-join with a NOT EXISTS in SQL."""
    rows = run_query(
        """
        MATCH (s:Startup {id: $startupId})-[:OPERATES_IN]->(sec:Sector)
        MATCH (i:Investor {id: $investorId})-[:PARTICIPATED_IN]->(:FundingRound)<-[:RAISED]-(competitor:Startup)-[:OPERATES_IN]->(sec)
        WHERE competitor.id <> $startupId
        WITH sec, collect(DISTINCT competitor) AS competitors
        RETURN sec.name AS sector,
               [c IN competitors | {id: c.id, name: c.name, tagline: c.tagline, stage: c.stage,
                                     fundingAsk: c.fundingAsk, location: c.location,
                                     foundedYear: c.foundedYear, sectors: []}] AS competitors
        """,
        {"startupId": startup_id, "investorId": investor_id},
    )
    sectors = [r["sector"] for r in rows]
    startups: list[StartupSummary] = []
    seen = set()
    for r in rows:
        for c in r["competitors"]:
            if c["id"] not in seen:
                seen.add(c["id"])
                startups.append(StartupSummary(**c))
    return ConflictResult(hasConflict=bool(sectors), conflictingSectors=sectors, conflictingStartups=startups)

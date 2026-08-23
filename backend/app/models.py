"""Pydantic response/request models shared across routers."""
from __future__ import annotations

from pydantic import BaseModel


class Sector(BaseModel):
    id: str
    name: str


class FundingRound(BaseModel):
    id: str
    roundType: str
    amount: int
    date: str
    valuation: int | None = None
    status: str = "closed"


class Person(BaseModel):
    id: str
    name: str
    title: str | None = None


class StartupSummary(BaseModel):
    id: str
    name: str
    tagline: str
    stage: str
    fundingAsk: int
    location: str
    foundedYear: int
    sectors: list[str]


class StartupDetail(StartupSummary):
    description: str
    teamSize: int
    founders: list[Person]
    fundingRounds: list[FundingRound]


class InvestorSummary(BaseModel):
    id: str
    name: str
    type: str
    hq: str
    minTicket: int
    maxTicket: int
    preferredStages: list[str]
    sectors: list[str]


class InvestorDetail(InvestorSummary):
    description: str
    foundedYear: int
    website: str
    partners: list[Person]
    portfolioCount: int


class InvestorMatch(BaseModel):
    investor: InvestorSummary
    sectorOverlap: int
    matchedSectors: list[str]
    stageMatch: bool
    ticketFit: bool
    fitScore: float
    reason: str


class PathNode(BaseModel):
    id: str
    label: str
    name: str
    subtitle: str | None = None


class PathEdge(BaseModel):
    source: str
    target: str
    type: str


class WarmIntroPath(BaseModel):
    found: bool
    hops: int = 0
    nodes: list[PathNode] = []
    edges: list[PathEdge] = []
    explanation: str = ""


class ConflictResult(BaseModel):
    hasConflict: bool
    conflictingSectors: list[str]
    conflictingStartups: list[StartupSummary]


class NetworkGraph(BaseModel):
    nodes: list[PathNode]
    edges: list[PathEdge]


class HealthStatus(BaseModel):
    status: str
    database: bool
    detail: str | None = None

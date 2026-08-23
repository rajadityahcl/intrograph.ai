export interface Sector {
  id: string;
  name: string;
}

export interface FundingRound {
  id: string;
  roundType: string;
  amount: number;
  date: string;
  valuation: number | null;
  status: "open" | "closed";
}

export interface Person {
  id: string;
  name: string;
  title: string | null;
}

export interface StartupSummary {
  id: string;
  name: string;
  tagline: string;
  stage: string;
  fundingAsk: number;
  location: string;
  foundedYear: number;
  sectors: string[];
}

export interface StartupDetail extends StartupSummary {
  description: string;
  teamSize: number;
  founders: Person[];
  fundingRounds: FundingRound[];
}

export interface InvestorSummary {
  id: string;
  name: string;
  type: string;
  hq: string;
  minTicket: number;
  maxTicket: number;
  preferredStages: string[];
  sectors: string[];
}

export interface InvestorDetail extends InvestorSummary {
  description: string;
  foundedYear: number;
  website: string;
  partners: Person[];
  portfolioCount: number;
}

export interface InvestorMatch {
  investor: InvestorSummary;
  sectorOverlap: number;
  matchedSectors: string[];
  stageMatch: boolean;
  ticketFit: boolean;
  fitScore: number;
  reason: string;
}

export interface PathNode {
  id: string;
  label: string;
  name: string;
  subtitle: string | null;
}

export interface PathEdge {
  source: string;
  target: string;
  type: string;
}

export interface WarmIntroPath {
  found: boolean;
  hops: number;
  nodes: PathNode[];
  edges: PathEdge[];
  explanation: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflictingSectors: string[];
  conflictingStartups: StartupSummary[];
}

export interface NetworkGraph {
  nodes: PathNode[];
  edges: PathEdge[];
}

export interface HealthStatus {
  status: string;
  database: boolean;
  detail: string | null;
}

import type {
  ConflictResult,
  HealthStatus,
  InvestorDetail,
  InvestorMatch,
  NetworkGraph,
  Sector,
  StartupDetail,
  StartupSummary,
  InvestorSummary,
  WarmIntroPath,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`);
  } catch {
    throw new ApiError(
      "Can't reach the IntroGraph API. Is the backend running?",
      0,
    );
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* ignore parse errors */
    }
    throw new ApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

export const api = {
  health: () => request<HealthStatus>("/health"),
  sectors: () => request<Sector[]>("/api/sectors"),

  startups: (params: { sector?: string; stage?: string; search?: string } = {}) =>
    request<StartupSummary[]>(`/api/startups${qs(params)}`),
  startup: (id: string) => request<StartupDetail>(`/api/startups/${id}`),

  investors: (params: { sector?: string; stage?: string; search?: string } = {}) =>
    request<InvestorSummary[]>(`/api/investors${qs(params)}`),
  investor: (id: string) => request<InvestorDetail>(`/api/investors/${id}`),

  matches: (startupId: string, limit = 15) =>
    request<InvestorMatch[]>(`/api/startups/${startupId}/matches${qs({ limit })}`),

  warmIntroPath: (startupId: string, investorId: string) =>
    request<WarmIntroPath>(`/api/startups/${startupId}/matches/${investorId}/path`),

  conflicts: (startupId: string, investorId: string) =>
    request<ConflictResult>(`/api/startups/${startupId}/conflicts/${investorId}`),

  syndicateNetwork: (investorId: string) =>
    request<NetworkGraph>(`/api/investors/${investorId}/network`),
};

import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { InvestorSummary, Sector } from "../types";
import { InvestorCard } from "../components/InvestorCard";
import { CardGridSkeleton, EmptyState, ErrorBanner } from "../components/States";

const STAGES = ["Pre-Seed", "Seed", "Series A", "Series B", "Series C"];

export function InvestorsPage() {
  const [investors, setInvestors] = useState<InvestorSummary[] | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [sector, setSector] = useState("");
  const [stage, setStage] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.sectors().then(setSectors).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const handle = setTimeout(() => {
      api
        .investors({ sector: sector || undefined, stage: stage || undefined, search: search || undefined })
        .then((data) => {
          if (!cancelled) setInvestors(data);
        })
        .catch((err: ApiError) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [sector, stage, search]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Browse investors</h1>
        <p>Focus areas, typical check size, and stage preference for every investor in the network.</p>
      </div>

      <div className="filter-bar">
        <input
          className="input"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="select" value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="">All sectors</option>
          {sectors.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <select className="select" value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading && !error && <CardGridSkeleton />}
      {!loading && !error && investors && investors.length === 0 && (
        <EmptyState
          icon="🧑‍💼"
          title="No investors match those filters"
          description="Try widening your search — clear the sector or stage filter."
        />
      )}
      {!loading && !error && investors && investors.length > 0 && (
        <div className="grid">
          {investors.map((i) => (
            <InvestorCard key={i.id} investor={i} />
          ))}
        </div>
      )}
    </div>
  );
}

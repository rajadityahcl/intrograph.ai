import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Sector, StartupSummary } from "../types";
import { StartupCard } from "../components/StartupCard";
import { CardGridSkeleton, EmptyState, ErrorBanner } from "../components/States";

const STAGES = ["Pre-Seed", "Seed", "Series A", "Series B", "Series C"];

export function HomePage() {
  const [startups, setStartups] = useState<StartupSummary[] | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [sector, setSector] = useState("");
  const [stage, setStage] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  useEffect(() => {
    api.sectors().then(setSectors).catch(() => {});
    api.startups().then((data) => setTotalCount(data.length)).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const handle = setTimeout(() => {
      api
        .startups({ sector: sector || undefined, stage: stage || undefined, search: search || undefined })
        .then((data) => {
          if (!cancelled) setStartups(data);
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
    <>
      <div className="hero">
        <div className="hero-inner">
          <div className="eyebrow">Startup ↔ investor matchmaking</div>
          <h1>Find the right investor — and the shortest path to a warm intro.</h1>
          <p>
            IntroGraph matches startups currently raising with investors whose sector focus, stage and check
            size actually fit, then traces the fastest route to a warm introduction through founders, board
            seats and co-investment history.
          </p>
          <div className="stat-row">
            <div className="stat">
              <span className="stat-value">{totalCount ?? "…"}</span>
              <span className="stat-label">Startups fundraising</span>
            </div>
            <div className="stat">
              <span className="stat-value">{sectors.length || "…"}</span>
              <span className="stat-label">Sectors tracked</span>
            </div>
          </div>
        </div>
      </div>

      <div className="page">
        <div className="page-header">
          <h1>Browse startups</h1>
          <p>Pick a company to see its matched investors and the warm-intro path to each one.</p>
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
        {!loading && !error && startups && startups.length === 0 && (
          <EmptyState
            icon="🌱"
            title="No startups match those filters"
            description="Try widening your search — clear the sector or stage filter."
          />
        )}
        {!loading && !error && startups && startups.length > 0 && (
          <div className="grid">
            {startups.map((s) => (
              <StartupCard key={s.id} startup={s} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

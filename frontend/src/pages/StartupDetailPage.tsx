import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { InvestorMatch, StartupDetail } from "../types";
import { formatUsd } from "../lib/format";
import { EmptyState, ErrorBanner, InlineLoading, LineSkeleton, Panel } from "../components/States";
import { MatchCard } from "../components/MatchCard";

export function StartupDetailPage() {
  const { id = "" } = useParams();
  const [startup, setStartup] = useState<StartupDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<InvestorMatch[] | null>(null);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(true);

  useEffect(() => {
    setStartup(null);
    setError(null);
    api
      .startup(id)
      .then(setStartup)
      .catch((err: ApiError) => setError(err.message));
  }, [id]);

  useEffect(() => {
    setMatches(null);
    setMatchesError(null);
    setMatchesLoading(true);
    api
      .matches(id)
      .then(setMatches)
      .catch((err: ApiError) => setMatchesError(err.message))
      .finally(() => setMatchesLoading(false));
  }, [id]);

  if (error) {
    return (
      <div className="page">
        <ErrorBanner message={error} />
      </div>
    );
  }

  if (!startup) {
    return (
      <div className="page">
        <LineSkeleton width="40%" />
        <LineSkeleton width="60%" />
        <div className="skeleton skeleton-card" style={{ marginTop: 20 }} />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="detail-header">
        <div>
          <h1 className="detail-title">{startup.name}</h1>
          <p className="detail-tagline">{startup.tagline}</p>
          <div className="card-meta">
            <span className="badge badge-primary">{startup.stage}</span>
            {startup.sectors.map((s) => (
              <span key={s} className="badge">
                {s}
              </span>
            ))}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="fit-score-value" style={{ fontSize: 22 }}>
            {formatUsd(startup.fundingAsk)}
          </div>
          <div className="fit-score-label">Currently raising ({startup.stage})</div>
        </div>
      </div>

      <div className="detail-grid">
        <div>
          <Panel>
            <h2 className="section-title">About</h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--color-text)" }}>{startup.description}</p>
          </Panel>

          <Panel>
            <h2 className="section-title">Founders</h2>
            {startup.founders.map((f) => (
              <div className="person-row" key={f.id}>
                <span className="person-name">{f.name}</span>
                <span className="person-title">{f.title}</span>
              </div>
            ))}
          </Panel>

          <Panel>
            <h2 className="section-title">Funding history</h2>
            {startup.fundingRounds.length === 0 && (
              <p style={{ fontSize: 13.5, color: "var(--color-text-muted)" }}>No closed rounds yet.</p>
            )}
            {startup.fundingRounds
              .slice()
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .map((r) => (
                <div className="round-row" key={r.id}>
                  <span>
                    {r.roundType}
                    {r.status === "open" && (
                      <span className="badge badge-warning" style={{ marginLeft: 8 }}>
                        Currently raising
                      </span>
                    )}
                  </span>
                  <span style={{ color: "var(--color-text-muted)" }}>{r.status === "open" ? "—" : r.date}</span>
                  <span style={{ fontWeight: 600 }}>
                    {r.status === "open" ? `${formatUsd(r.amount)} target` : formatUsd(r.amount)}
                  </span>
                </div>
              ))}
          </Panel>
        </div>

        <div>
          <Panel>
            <h2 className="section-title">At a glance</h2>
            <div className="kv-list">
              <div className="kv-row">
                <span className="kv-label">Location</span>
                <span className="kv-value">{startup.location}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Founded</span>
                <span className="kv-value">{startup.foundedYear}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Team size</span>
                <span className="kv-value">{startup.teamSize}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Current stage</span>
                <span className="kv-value">{startup.stage}</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <div className="page-header" style={{ marginTop: 36 }}>
        <h1>Matched investors</h1>
        <p>
          Ranked by sector focus, stage fit and typical check size. Expand any match to find the shortest
          warm-intro path through {startup.name}'s network, or check for portfolio conflicts.
        </p>
      </div>

      {matchesLoading && <InlineLoading label="Scoring investors against this startup's profile…" />}
      {matchesError && <ErrorBanner message={matchesError} />}
      {!matchesLoading && !matchesError && matches && matches.length === 0 && (
        <EmptyState
          icon="🕸️"
          title="No matching investors yet"
          description="No investor in the network currently focuses on this startup's sectors. Try seeding more data, or broaden the sector coverage."
        />
      )}
      {!matchesLoading &&
        !matchesError &&
        matches &&
        matches.map((m) => <MatchCard key={m.investor.id} startupId={startup.id} match={m} />)}

      <p style={{ marginTop: 24 }}>
        <Link to="/" className="btn btn-ghost btn-sm">
          ← Back to all startups
        </Link>
      </p>
    </div>
  );
}

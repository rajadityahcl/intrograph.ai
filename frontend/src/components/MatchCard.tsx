import { useState } from "react";
import { Link } from "react-router-dom";
import type { ConflictResult, InvestorMatch, WarmIntroPath } from "../types";
import { api, ApiError } from "../api/client";
import { formatUsd } from "../lib/format";
import { PathVisualizer } from "./PathVisualizer";
import { InlineLoading } from "./States";

export function MatchCard({ startupId, match }: { startupId: string; match: InvestorMatch }) {
  const [openPanel, setOpenPanel] = useState<"path" | "conflicts" | null>(null);
  const [path, setPath] = useState<WarmIntroPath | null>(null);
  const [conflicts, setConflicts] = useState<ConflictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function togglePath() {
    if (openPanel === "path") {
      setOpenPanel(null);
      return;
    }
    setOpenPanel("path");
    setError(null);
    if (!path) {
      setLoading(true);
      try {
        setPath(await api.warmIntroPath(startupId, match.investor.id));
      } catch (err) {
        setError((err as ApiError).message);
      } finally {
        setLoading(false);
      }
    }
  }

  async function toggleConflicts() {
    if (openPanel === "conflicts") {
      setOpenPanel(null);
      return;
    }
    setOpenPanel("conflicts");
    setError(null);
    if (!conflicts) {
      setLoading(true);
      try {
        setConflicts(await api.conflicts(startupId, match.investor.id));
      } catch (err) {
        setError((err as ApiError).message);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="match-card">
      <div className="match-head">
        <div>
          <Link to={`/investors/${match.investor.id}`}>
            <span className="card-title">{match.investor.name}</span>
          </Link>
          <div style={{ marginTop: 4 }}>
            <span className="badge badge-accent">{match.investor.type}</span>{" "}
            <span className="badge">{match.investor.hq}</span>{" "}
            <span className="badge">
              {formatUsd(match.investor.minTicket)}–{formatUsd(match.investor.maxTicket)}
            </span>
          </div>
        </div>
        <div className="fit-score">
          <span className="fit-score-value">{Math.round(match.fitScore * 100)}%</span>
          <span className="fit-score-label">Fit score</span>
        </div>
      </div>
      <p className="match-reason">{match.reason}</p>
      <div className="match-actions">
        <button className="btn btn-secondary btn-sm" onClick={togglePath}>
          {openPanel === "path" ? "Hide warm-intro path" : "Find warm-intro path"}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={toggleConflicts}>
          {openPanel === "conflicts" ? "Hide conflict check" : "Check portfolio conflicts"}
        </button>
      </div>

      {openPanel === "path" && (
        <div style={{ marginTop: 12, borderTop: "1px solid var(--color-border)", paddingTop: 12 }}>
          {loading && <InlineLoading label="Searching the network for a path…" />}
          {error && <p style={{ color: "var(--color-danger)", fontSize: 13.5 }}>{error}</p>}
          {!loading && !error && path && <PathVisualizer path={path} />}
        </div>
      )}

      {openPanel === "conflicts" && (
        <div style={{ marginTop: 12, borderTop: "1px solid var(--color-border)", paddingTop: 12 }}>
          {loading && <InlineLoading label="Checking portfolio for conflicts…" />}
          {error && <p style={{ color: "var(--color-danger)", fontSize: 13.5 }}>{error}</p>}
          {!loading && !error && conflicts && (
            <div>
              {!conflicts.hasConflict ? (
                <p style={{ fontSize: 13.5, color: "var(--color-success)" }}>
                  ✓ No overlap — this investor doesn't currently back a competitor in your sectors.
                </p>
              ) : (
                <div>
                  <p style={{ fontSize: 13.5, color: "var(--color-warning)", marginBottom: 8 }}>
                    ⚠ Already backs {conflicts.conflictingStartups.length} other{" "}
                    {conflicts.conflictingStartups.length === 1 ? "company" : "companies"} in{" "}
                    {conflicts.conflictingSectors.join(", ")}:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5 }}>
                    {conflicts.conflictingStartups.map((s) => (
                      <li key={s.id}>
                        <Link to={`/startups/${s.id}`}>{s.name}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

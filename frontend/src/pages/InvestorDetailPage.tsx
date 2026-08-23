import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { InvestorDetail, NetworkGraph } from "../types";
import { formatUsd, initials } from "../lib/format";
import { EmptyState, ErrorBanner, InlineLoading, LineSkeleton, Panel } from "../components/States";

export function InvestorDetailPage() {
  const { id = "" } = useParams();
  const [investor, setInvestor] = useState<InvestorDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [network, setNetwork] = useState<NetworkGraph | null>(null);
  const [networkLoading, setNetworkLoading] = useState(true);
  const [networkError, setNetworkError] = useState<string | null>(null);

  useEffect(() => {
    setInvestor(null);
    setError(null);
    api
      .investor(id)
      .then(setInvestor)
      .catch((err: ApiError) => setError(err.message));
  }, [id]);

  useEffect(() => {
    setNetwork(null);
    setNetworkLoading(true);
    setNetworkError(null);
    api
      .syndicateNetwork(id)
      .then(setNetwork)
      .catch((err: ApiError) => setNetworkError(err.message))
      .finally(() => setNetworkLoading(false));
  }, [id]);

  if (error) {
    return (
      <div className="page">
        <ErrorBanner message={error} />
      </div>
    );
  }

  if (!investor) {
    return (
      <div className="page">
        <LineSkeleton width="40%" />
        <LineSkeleton width="60%" />
        <div className="skeleton skeleton-card" style={{ marginTop: 20 }} />
      </div>
    );
  }

  const coInvestors = (network?.nodes ?? []).filter((n) => n.id !== investor.id);

  return (
    <div className="page">
      <div className="detail-header">
        <div>
          <h1 className="detail-title">{investor.name}</h1>
          <p className="detail-tagline">{investor.description}</p>
          <div className="card-meta">
            <span className="badge badge-accent">{investor.type}</span>
            {investor.sectors.map((s) => (
              <span key={s} className="badge">
                {s}
              </span>
            ))}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="fit-score-value" style={{ fontSize: 20 }}>
            {formatUsd(investor.minTicket)}–{formatUsd(investor.maxTicket)}
          </div>
          <div className="fit-score-label">Typical check size</div>
        </div>
      </div>

      <div className="detail-grid">
        <div>
          <Panel>
            <h2 className="section-title">Investment partners</h2>
            {investor.partners.length === 0 && (
              <p style={{ fontSize: 13.5, color: "var(--color-text-muted)" }}>No partners on record.</p>
            )}
            {investor.partners.map((p) => (
              <div className="person-row" key={p.id}>
                <span className="person-name">{p.name}</span>
                <span className="person-title">{p.title}</span>
              </div>
            ))}
          </Panel>

          <Panel>
            <h2 className="section-title">Co-investment network</h2>
            {networkLoading && <InlineLoading label="Mapping syndicate partners…" />}
            {networkError && <ErrorBanner message={networkError} />}
            {!networkLoading && !networkError && coInvestors.length === 0 && (
              <EmptyState
                icon="🤝"
                title="No recorded co-investments"
                description="This investor hasn't shared a funding round with another investor in the network yet."
              />
            )}
            {!networkLoading &&
              !networkError &&
              coInvestors.map((n) => {
                const edge = network?.edges.find((e) => e.source === n.id || e.target === n.id);
                return (
                  <div className="network-row" key={n.id}>
                    <div className="network-row-left">
                      <span className="network-avatar">{initials(n.name)}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          <Link to={`/investors/${n.id}`}>{n.name}</Link>
                        </div>
                        <div style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>{n.subtitle}</div>
                      </div>
                    </div>
                    <span className="badge">{edge?.type ?? "co-invested"}</span>
                  </div>
                );
              })}
          </Panel>
        </div>

        <div>
          <Panel>
            <h2 className="section-title">At a glance</h2>
            <div className="kv-list">
              <div className="kv-row">
                <span className="kv-label">HQ</span>
                <span className="kv-value">{investor.hq}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Founded</span>
                <span className="kv-value">{investor.foundedYear}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Preferred stages</span>
                <span className="kv-value">{investor.preferredStages.join(", ")}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Portfolio companies</span>
                <span className="kv-value">{investor.portfolioCount}</span>
              </div>
              <div className="kv-row">
                <span className="kv-label">Website</span>
                <span className="kv-value">
                  <a href={investor.website} target="_blank" rel="noreferrer">
                    {investor.website.replace(/^https?:\/\//, "")}
                  </a>
                </span>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <p style={{ marginTop: 24 }}>
        <Link to="/investors" className="btn btn-ghost btn-sm">
          ← Back to all investors
        </Link>
      </p>
    </div>
  );
}

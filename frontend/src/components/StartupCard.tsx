import { Link } from "react-router-dom";
import type { StartupSummary } from "../types";
import { formatUsd } from "../lib/format";

export function StartupCard({ startup }: { startup: StartupSummary }) {
  return (
    <Link to={`/startups/${startup.id}`} className="card-link">
      <div className="card">
        <div className="card-title-row">
          <span className="card-title">{startup.name}</span>
          <span className="badge badge-primary">{startup.stage}</span>
        </div>
        <p className="card-tagline">{startup.tagline}</p>
        <div className="card-meta">
          {startup.sectors.map((s) => (
            <span key={s} className="badge">
              {s}
            </span>
          ))}
        </div>
        <div className="card-footer">
          <span>{startup.location}</span>
          <span>Raising {formatUsd(startup.fundingAsk)}</span>
        </div>
      </div>
    </Link>
  );
}

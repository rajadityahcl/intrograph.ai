import { Link } from "react-router-dom";
import type { InvestorSummary } from "../types";
import { formatUsd } from "../lib/format";

export function InvestorCard({ investor }: { investor: InvestorSummary }) {
  return (
    <Link to={`/investors/${investor.id}`} className="card-link">
      <div className="card">
        <div className="card-title-row">
          <span className="card-title">{investor.name}</span>
          <span className="badge badge-accent">{investor.type}</span>
        </div>
        <p className="card-tagline">
          Typically writes {formatUsd(investor.minTicket)}–{formatUsd(investor.maxTicket)} checks at{" "}
          {investor.preferredStages.join(", ")}
        </p>
        <div className="card-meta">
          {investor.sectors.map((s) => (
            <span key={s} className="badge">
              {s}
            </span>
          ))}
        </div>
        <div className="card-footer">
          <span>{investor.hq}</span>
        </div>
      </div>
    </Link>
  );
}

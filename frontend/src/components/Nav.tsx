import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { api } from "../api/client";

type Status = "checking" | "up" | "down";

export function Nav() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const health = await api.health();
        if (!cancelled) setStatus(health.database ? "up" : "down");
      } catch {
        if (!cancelled) setStatus("down");
      }
    }
    check();
    const interval = setInterval(check, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const statusLabel = status === "up" ? "Graph connected" : status === "down" ? "Graph unreachable" : "Checking…";
  const dotClass = status === "up" ? "" : status === "down" ? "down" : "checking";

  return (
    <header className="top-nav">
      <div className="top-nav-inner">
        <NavLink to="/" className="brand">
          <span className="brand-mark">IG</span>
          IntroGraph
        </NavLink>
        <nav className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            Startups
          </NavLink>
          <NavLink to="/investors" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            Investors
          </NavLink>
        </nav>
        <span className="nav-status" title={statusLabel}>
          <span className={`status-dot ${dotClass}`} />
          {statusLabel}
        </span>
      </div>
    </header>
  );
}

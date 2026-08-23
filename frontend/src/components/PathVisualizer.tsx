import type { WarmIntroPath } from "../types";
import { EmptyState } from "./States";

const LABELS: Record<string, string> = {
  FOUNDED: "founded",
  WORKS_AT: "works at",
  BOARD_MEMBER_OF: "board member of",
  PARTICIPATED_IN: "invested in",
  RAISED: "raised",
  CO_INVESTED_WITH: "co-invested with",
};

export function PathVisualizer({ path }: { path: WarmIntroPath }) {
  if (!path.found) {
    return (
      <EmptyState
        icon="🧭"
        title="No warm-intro path found"
        description="No connection through founders, board seats, or co-investment history was found within the search depth. A cold outreach may be the only route here."
      />
    );
  }

  return (
    <div>
      <div className="path-chain">
        {path.nodes.map((node, i) => (
          <span key={node.id} style={{ display: "flex", alignItems: "center" }}>
            <div className={`path-node ${i === 0 || i === path.nodes.length - 1 ? "is-endpoint" : ""}`}>
              <span className="path-node-label">{node.label}</span>
              <span className="path-node-name">{node.name}</span>
            </div>
            {i < path.edges.length && (
              <div className="path-connector">
                <div className="path-connector-line" />
                <span className="path-connector-label">{LABELS[path.edges[i].type] ?? path.edges[i].type}</span>
              </div>
            )}
          </span>
        ))}
      </div>
      <div className="path-explanation">
        <strong>{path.hops}-hop path</strong> · {path.explanation}
      </div>
    </div>
  );
}

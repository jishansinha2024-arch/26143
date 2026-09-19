import { STATUS_LABEL, STATUS_STYLE } from "@/lib/api";

const EXTENDED_STATUS = {
  active: { color: "#0284C7", bg: "#F0F9FF", border: "#BAE6FD", label: "Active" },
  monitored: { color: "#0EA5E9", bg: "#F0F9FF", border: "#BAE6FD", label: "Monitored" },
  warning: { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", label: "Warning" },
  critical: { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", label: "Critical" },
  resolved: { color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", label: "Resolved" },
  probable: { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", label: "Probable" },
  possible: { color: "#B45309", bg: "#FFFBEB", border: "#FDE68A", label: "Possible" },
  analyst_confirmed: { color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", label: "Analyst Confirmed" },
  insufficient_evidence: { color: "#64748B", bg: "#F8FAFC", border: "#E2E8F0", label: "Insufficient Evidence" },
  indeterminate: { color: "#7C3AED", bg: "#FAF5FF", border: "#E9D5FF", label: "Indeterminate" },
};

export const StatusBadge = ({ status, testId }) => {
  const norm = (status || "insufficient_evidence").toLowerCase();
  const s = EXTENDED_STATUS[norm] || {
    color: STATUS_STYLE[norm]?.color || "#64748B",
    bg: STATUS_STYLE[norm]?.bg || "#F8FAFC",
    border: "#E2E8F0",
    label: STATUS_LABEL[norm] || status?.replace(/_/g, " "),
  };

  return (
    <span
      data-testid={testId || `status-badge-${status}`}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap shadow-xs"
      style={{
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.color }} />
      {s.label || STATUS_LABEL[status] || status?.replace(/_/g, " ")}
    </span>
  );
};

export const BandBadge = ({ band }) => {
  const map = {
    high: { color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
    medium: { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
    low: { color: "#64748B", bg: "#F8FAFC", border: "#E2E8F0" },
  };
  const b = map[band] || map.low;
  return (
    <span
      data-testid={`band-badge-${band}`}
      className="inline-flex items-center rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider shadow-xs"
      style={{ color: b.color, background: b.bg, border: `1px solid ${b.border}` }}
    >
      {band || "—"}
    </span>
  );
};

export const ScoreBar = ({ value, color = "#0284C7", testId }) => (
  <div data-testid={testId} className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200/60 p-0">
    <div
      className="h-full rounded-full transition-all duration-300 ease-out"
      style={{
        width: `${Math.min(100, Math.max(0, Math.round((value || 0) * 100)))}%`,
        background: color,
      }}
    />
  </div>
);

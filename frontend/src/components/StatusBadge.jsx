import { STATUS_LABEL, STATUS_STYLE } from "@/lib/api";

const EXTENDED_STATUS = {
  active: { color: "#1F7F93", bg: "#EEF7F9", border: "#B3DBE3", label: "Active" },
  monitored: { color: "#1F7F93", bg: "#EEF7F9", border: "#B3DBE3", label: "Monitored" },
  warning: { color: "#B8862A", bg: "#FAF4E4", border: "#E9D49A", label: "Warning" },
  critical: { color: "#C25A49", bg: "#FBEFEC", border: "#EBC7BF", label: "Critical" },
  resolved: { color: "#2E8B6A", bg: "#EAF5F0", border: "#B5DCCB", label: "Resolved" },
  probable: { color: "#B8862A", bg: "#FAF4E4", border: "#E9D49A", label: "Probable" },
  possible: { color: "#96691A", bg: "#FAF4E4", border: "#E9D49A", label: "Possible" },
  analyst_confirmed: { color: "#2E8B6A", bg: "#EAF5F0", border: "#B5DCCB", label: "Analyst Confirmed" },
  insufficient_evidence: { color: "#5F7684", bg: "#F7F6F2", border: "#E2DFD6", label: "Insufficient Evidence" },
  indeterminate: { color: "#7C5CBF", bg: "#F3EFFA", border: "#D8CDEE", label: "Indeterminate" },
};

export const StatusBadge = ({ status, testId }) => {
  const norm = (status || "insufficient_evidence").toLowerCase();
  const s = EXTENDED_STATUS[norm] || {
    color: STATUS_STYLE[norm]?.color || "#5F7684",
    bg: STATUS_STYLE[norm]?.bg || "#F7F6F2",
    border: "#E2DFD6",
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
    high: { color: "#2E8B6A", bg: "#EAF5F0", border: "#B5DCCB" },
    medium: { color: "#B8862A", bg: "#FAF4E4", border: "#E9D49A" },
    low: { color: "#5F7684", bg: "#F7F6F2", border: "#E2DFD6" },
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

export const ScoreBar = ({ value, color = "#1F7F93", testId }) => (
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

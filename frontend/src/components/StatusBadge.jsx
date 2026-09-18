import { STATUS_LABEL, STATUS_STYLE } from "@/lib/api";

export const StatusBadge = ({ status, testId }) => {
  const s = STATUS_STYLE[status] || STATUS_STYLE.insufficient_evidence;
  return (
    <span
      data-testid={testId || `status-badge-${status}`}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider whitespace-nowrap shadow-sm"
      style={{
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.color}44`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}88` }} />
      {STATUS_LABEL[status] || status?.replace(/_/g, " ")}
    </span>
  );
};

export const BandBadge = ({ band }) => {
  const map = {
    high: { color: "#10B981", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.3)" },
    medium: { color: "#F59E0B", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.3)" },
    low: { color: "#94A3B8", bg: "rgba(148, 163, 184, 0.12)", border: "rgba(148, 163, 184, 0.3)" },
  };
  const b = map[band] || map.low;
  return (
    <span
      data-testid={`band-badge-${band}`}
      className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider"
      style={{ color: b.color, background: b.bg, border: `1px solid ${b.border}` }}
    >
      {band || "—"}
    </span>
  );
};

export const ScoreBar = ({ value, color = "#00E5FF", testId }) => (
  <div data-testid={testId} className="h-1.5 w-full rounded-full bg-[#16233B] overflow-hidden p-0">
    <div
      className="h-full rounded-full transition-all duration-500 ease-out"
      style={{
        width: `${Math.min(100, Math.max(0, Math.round((value || 0) * 100)))}%`,
        background: color,
        boxShadow: `0 0 6px ${color}66`,
      }}
    />
  </div>
);

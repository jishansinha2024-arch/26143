import { STATUS_LABEL, STATUS_STYLE } from "@/lib/api";

export const StatusBadge = ({ status, testId }) => {
  const s = STATUS_STYLE[status] || STATUS_STYLE.insufficient_evidence;
  return (
    <span
      data-testid={testId || `status-badge-${status}`}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider whitespace-nowrap"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}55` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
      {STATUS_LABEL[status] || status}
    </span>
  );
};

export const BandBadge = ({ band }) => {
  const map = { high: "#006a61", medium: "#b26a00", low: "#707881" };
  return (
    <span data-testid={`band-badge-${band}`} className="font-mono text-[10px] uppercase tracking-wider" style={{ color: map[band] || "#707881" }}>
      {band || "—"}
    </span>
  );
};

export const ScoreBar = ({ value, color = "#006194", testId }) => (
  <div data-testid={testId} className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.round((value || 0) * 100)}%`, background: color }} />
  </div>
);

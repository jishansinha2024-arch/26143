import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, AlertTriangle, History, Eye, HelpCircle, Ship } from "lucide-react";
import { StatusBadge, ScoreBar } from "@/components/StatusBadge";
import { rankColor } from "@/components/case/CaseMap";
import { fmtTime } from "@/lib/api";

const FACTORS = ["spatial", "temporal", "continuity", "heading", "drift", "reliability"];
const FACTOR_LABEL = {
  spatial: "Spatial Proximity",
  temporal: "Temporal Alignment",
  continuity: "Track Continuity / AIS Gaps",
  heading: "Heading & Course Match",
  drift: "Drift Trajectory Match",
  reliability: "AIS Transponder Reliability",
};

export const CandidatesTable = ({ candidates, selected, onSelect }) => {
  const [open, setOpen] = useState(null);
  if (!candidates?.length) {
    return (
      <div className="p-8 text-center" data-testid="candidates-empty">
        <Ship size={32} className="mx-auto mb-2 text-slate-400" />
        <p className="text-sm font-semibold text-slate-700">
          No AIS candidate vessels found within the corridor and temporal window.
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Adjust the corridor radius or time window parameters to expand the search.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200 border-y border-slate-200 bg-white">
      {candidates.map((c) => {
        const isOpen = open === c.mmsi;
        const sel = selected === c.mmsi;
        const rColor = rankColor(c.rank);
        return (
          <div
            key={c.mmsi}
            data-testid={`candidate-vessel-row-${c.mmsi}`}
            className={`transition-colors ${
              sel ? "bg-sky-50/80 border-l-2 border-sky-600" : "hover:bg-slate-50/80"
            }`}
          >
            <div
              className="flex cursor-pointer items-center gap-3 px-4 py-3"
              onClick={() => {
                onSelect?.(c.mmsi);
                setOpen(isOpen ? null : c.mmsi);
              }}
            >
              {/* Rank Badge */}
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg font-mono text-xs font-bold shadow-xs"
                style={{
                  background: `${rColor}15`,
                  color: rColor,
                  border: `1px solid ${rColor}40`,
                }}
              >
                #{c.rank}
              </span>

              {/* Vessel Information */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="font-display text-sm font-bold text-slate-900 tracking-tight">
                    {c.vessel_name || "UNKNOWN VESSEL"}
                  </span>
                  <span className="font-mono text-[10.5px] text-slate-500">
                    MMSI {c.mmsi}
                    {c.imo ? ` · IMO ${c.imo}` : ""}
                    {c.vessel_type ? ` · ${c.vessel_type}` : ""}
                  </span>
                  <Link
                    to={`/vessels/${c.mmsi}`}
                    data-testid={`vessel-history-link-${c.mmsi}`}
                    onClick={(e) => e.stopPropagation()}
                    title="View historical vessel track profile"
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] text-sky-800 bg-sky-50 hover:bg-sky-100 transition-colors border border-sky-200 font-medium"
                  >
                    <History size={11} /> History
                  </Link>
                  {c.ais_flags?.length > 0 && (
                    <AlertTriangle
                      size={14}
                      className="text-amber-600"
                      title={c.ais_flags.join(", ")}
                    />
                  )}
                  {c.watchlist && (
                    <span
                      data-testid={`watchlist-badge-${c.mmsi}`}
                      title={c.watchlist.reason}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-rose-800 bg-rose-50 border border-rose-200 font-semibold"
                    >
                      <Eye size={10} /> Watchlist
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <div className="w-44 sm:w-60">
                    <ScoreBar value={c.score} color={rColor} testId={`candidate-score-bar-${c.mmsi}`} />
                  </div>
                  <span
                    className="font-mono text-xs font-bold text-right"
                    style={{ color: rColor }}
                    data-testid={`candidate-score-${c.mmsi}`}
                  >
                    {c.score.toFixed(3)}
                  </span>
                </div>
              </div>

              {/* Status & Zone Badges */}
              <div className="flex items-center gap-2">
                <StatusBadge status={c.status} testId={`candidate-status-${c.mmsi}`} />
                {c.zone && (
                  <span
                    data-testid={`candidate-zone-${c.mmsi}`}
                    title={`${c.zone.name} · ${c.zone.authority}`}
                    className="hidden sm:inline-flex rounded px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-sky-800 bg-sky-50 border border-sky-200"
                  >
                    {c.zone.code} · {c.zone.zone_label}
                  </span>
                )}
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
                  data-testid={`score-breakdown-toggle-${c.mmsi}`}
                >
                  <HelpCircle size={12} className="text-sky-600" />
                  <span className="hidden md:inline">Why this vessel?</span>
                  {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
              </div>
            </div>

            {/* Expandable Factor Breakdown */}
            {isOpen && (
              <div
                className="px-4 pb-4 pt-1 border-t border-slate-200 bg-slate-50/70"
                data-testid={`score-breakdown-${c.mmsi}`}
              >
                <div
                  className="mb-3 flex flex-wrap items-center gap-2 font-mono text-[11px]"
                  data-testid={`why-summary-${c.mmsi}`}
                >
                  <span className="rounded-md px-2 py-0.5 text-amber-800 bg-amber-50 border border-amber-200 font-bold">
                    CANDIDATE VESSEL · PRIORITY #{c.rank}
                  </span>
                  <span className="text-slate-800">
                    Correlation score: <b>{Math.round(c.score * 100)}/100</b>
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    = Σ(weight × factor) ÷ Σ(weights)
                  </span>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {FACTORS.map((k) => {
                    const f = c.factors[k];
                    if (!f) return null;
                    const tw = FACTORS.reduce((s, x) => s + (c.factors[x]?.weight || 0), 0) || 1;
                    return (
                      <div
                        key={k}
                        className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xs"
                        data-testid={`factor-${k}-${c.mmsi}`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="label-mono text-[9px] text-slate-600">
                            {FACTOR_LABEL[k] || k}
                          </span>
                          <span
                            className="font-mono text-xs font-bold text-sky-800"
                            data-testid={`factor-points-${k}-${c.mmsi}`}
                          >
                            {Math.round(f.contribution * 100)}/{Math.round((f.weight / tw) * 100)}
                            <span className="text-slate-400 font-normal ml-1">
                              ({f.score.toFixed(2)})
                            </span>
                          </span>
                        </div>
                        <ScoreBar value={f.score} color="#0284C7" />
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-600">{f.detail}</p>
                      </div>
                    );
                  })}
                </div>

                <p
                  className="mt-3 text-[10.5px] text-slate-500 font-mono"
                  data-testid={`why-disclaimer-${c.mmsi}`}
                >
                  Algorithmic probability output for maritime investigative support · Final attribution requires explicit analyst confirmation.
                </p>

                <div className="mt-2.5 rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-[11px] text-slate-700 grid gap-1 sm:grid-cols-2 shadow-xs">
                  <span>
                    Closest Fix: {fmtTime(c.evidence.closest_fix.timestamp)} ·{" "}
                    {c.evidence.closest_fix.lat.toFixed(4)}°, {c.evidence.closest_fix.lon.toFixed(4)}°
                  </span>
                  <span>
                    Distance: {c.evidence.distance_km} km · Time Gap: {c.evidence.time_gap_hours}h · Fix Count: {c.evidence.fix_count}
                  </span>
                </div>

                {c.notes?.length > 0 && (
                  <ul
                    className="mt-2 space-y-1 text-xs text-amber-800 font-mono"
                    data-testid={`candidate-notes-${c.mmsi}`}
                  >
                    {c.notes.map((n) => (
                      <li key={n} className="flex items-center gap-1.5">
                        <span className="text-amber-600">▸</span> {n}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

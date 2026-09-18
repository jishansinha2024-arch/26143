import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, AlertTriangle, History, Eye, HelpCircle, Ship, Navigation } from "lucide-react";
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
        <Ship size={32} className="mx-auto mb-2 text-slate-600" />
        <p className="text-sm font-medium text-slate-400">
          No AIS candidate vessels found within the corridor and temporal window.
        </p>
        <p className="text-xs text-slate-600 mt-1">
          Adjust the corridor radius or time window parameters to expand the search.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#1B2B44]" style={{ borderColor: "var(--border-default)" }}>
      {candidates.map((c) => {
        const isOpen = open === c.mmsi;
        const sel = selected === c.mmsi;
        const rColor = rankColor(c.rank);
        return (
          <div
            key={c.mmsi}
            data-testid={`candidate-vessel-row-${c.mmsi}`}
            className={`transition-colors ${
              sel ? "bg-[#111F36]/90 border-l-2 border-[#00E5FF]" : "hover:bg-[#0E182A]/70"
            }`}
            style={{ borderColor: "var(--border-default)" }}
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
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md font-mono text-xs font-bold shadow-sm"
                style={{
                  background: `${rColor}22`,
                  color: rColor,
                  border: `1px solid ${rColor}55`,
                }}
              >
                #{c.rank}
              </span>

              {/* Vessel Information */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="font-display text-sm font-bold text-white tracking-tight">
                    {c.vessel_name || "UNKNOWN VESSEL"}
                  </span>
                  <span className="font-mono text-[10.5px] text-slate-400">
                    MMSI {c.mmsi}
                    {c.imo ? ` · IMO ${c.imo}` : ""}
                    {c.vessel_type ? ` · ${c.vessel_type}` : ""}
                  </span>
                  <Link
                    to={`/vessels/${c.mmsi}`}
                    data-testid={`vessel-history-link-${c.mmsi}`}
                    onClick={(e) => e.stopPropagation()}
                    title="View historical vessel track profile"
                    className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] text-cyan-300 bg-cyan-400/10 hover:bg-cyan-400/20 transition-colors border border-cyan-400/25"
                  >
                    <History size={10} /> History
                  </Link>
                  {c.ais_flags?.length > 0 && (
                    <AlertTriangle
                      size={13}
                      className="text-amber-400"
                      title={c.ais_flags.join(", ")}
                    />
                  )}
                  {c.watchlist && (
                    <span
                      data-testid={`watchlist-badge-${c.mmsi}`}
                      title={c.watchlist.reason}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-rose-300 bg-rose-500/15 border border-rose-500/40"
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
                    className="hidden sm:inline-flex rounded px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-cyan-300 bg-cyan-500/10 border border-cyan-500/30"
                  >
                    {c.zone.code} · {c.zone.zone_label}
                  </span>
                )}
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/35 bg-[#091424] px-2.5 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-cyan-300 hover:bg-cyan-400/15 transition-all"
                  data-testid={`score-breakdown-toggle-${c.mmsi}`}
                >
                  <HelpCircle size={11} />
                  <span className="hidden md:inline">Why this vessel?</span>
                  {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
              </div>
            </div>

            {/* Expandable Factor Breakdown */}
            {isOpen && (
              <div
                className="px-4 pb-4 pt-1 fade-up border-t border-[#1B2B44]/60 bg-[#0A1324]/50"
                data-testid={`score-breakdown-${c.mmsi}`}
              >
                <div
                  className="mb-3 flex flex-wrap items-center gap-2 font-mono text-[11px]"
                  data-testid={`why-summary-${c.mmsi}`}
                >
                  <span className="rounded px-2 py-0.5 text-amber-300 bg-amber-500/10 border border-amber-500/30 font-semibold">
                    CANDIDATE VESSEL · PRIORITY #{c.rank}
                  </span>
                  <span className="text-slate-200">
                    Correlation score: <b>{Math.round(c.score * 100)}/100</b>
                  </span>
                  <span className="text-slate-400 text-[10px]">
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
                        className="rounded-lg border border-[#1E314B] bg-[#070D18] p-3 text-xs"
                        data-testid={`factor-${k}-${c.mmsi}`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="label-mono text-[9px] text-slate-300">
                            {FACTOR_LABEL[k] || k}
                          </span>
                          <span
                            className="font-mono text-xs font-bold text-cyan-300"
                            data-testid={`factor-points-${k}-${c.mmsi}`}
                          >
                            {Math.round(f.contribution * 100)}/{Math.round((f.weight / tw) * 100)}
                            <span className="text-slate-500 font-normal ml-1">
                              ({f.score.toFixed(2)})
                            </span>
                          </span>
                        </div>
                        <ScoreBar value={f.score} color="#00E5FF" />
                        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{f.detail}</p>
                      </div>
                    );
                  })}
                </div>

                <p
                  className="mt-3 text-[10.5px] text-slate-400 font-mono"
                  data-testid={`why-disclaimer-${c.mmsi}`}
                >
                  Algorithmic probability output for maritime investigative support · Final attribution requires explicit analyst confirmation.
                </p>

                <div className="mt-2.5 rounded-md border border-[#1B2B44] bg-[#070D18] p-2.5 font-mono text-[11px] text-slate-300 grid gap-1 sm:grid-cols-2">
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
                    className="mt-2 space-y-1 text-xs text-amber-300/90 font-mono"
                    data-testid={`candidate-notes-${c.mmsi}`}
                  >
                    {c.notes.map((n) => (
                      <li key={n} className="flex items-center gap-1.5">
                        <span className="text-amber-400">▸</span> {n}
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

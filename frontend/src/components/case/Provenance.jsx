import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import { api, fmtTime } from "@/lib/api";

const BADGE = { "REAL SENTINEL-1": "text-emerald-300 border-emerald-400/60", LIVE: "text-emerald-300 border-emerald-400/60", HISTORICAL: "text-cyan-300 border-cyan-400/60", REFERENCE: "text-sky-300 border-sky-400/60", EXPERIMENTAL: "text-amber-300 border-amber-400/60", MOCK: "text-rose-300 border-rose-400/60", DEMO: "text-rose-300 border-rose-400/60", UNAVAILABLE: "text-slate-400 border-slate-500", NONE: "text-slate-400 border-slate-500", ANALYST: "text-cyan-300 border-cyan-400/60", EXTERNAL: "text-slate-300 border-slate-500", "USER-DEFINED": "text-violet-300 border-violet-400/60" };
export const Badge = ({ v, testid }) => <span data-testid={testid} className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${BADGE[v] || BADGE.NONE}`}>{v || "UNAVAILABLE"}</span>;
const age = (iso) => { if (!iso) return ""; const m = Math.round((Date.now() - new Date(iso)) / 60000); return m < 60 ? `${m} min ago` : m < 2880 ? `${Math.floor(m / 60)} h ${m % 60} m ago` : `${Math.round(m / 1440)} d ago`; };
const R = ({ k, v, testid }) => <div className="flex justify-between gap-2 border-b border-dashed py-0.5" style={{ borderColor: "var(--border-default)" }}><span className="text-slate-500">{k}</span><span className="text-right text-slate-200 break-all" data-testid={testid}>{v ?? "UNAVAILABLE"}</span></div>;

export const Provenance = ({ caseId }) => {
  const [p, setP] = useState(null);
  useEffect(() => { api.get(`/cases/${caseId}/provenance`).then((r) => setP(r.data)).catch(() => setP(false)); }, [caseId]);
  if (p === false) return <p className="mx-4 my-3 font-mono text-[11px] text-slate-500" data-testid="provenance-unavailable">Provenance UNAVAILABLE — backend not reachable.</p>;
  if (!p) return null;
  const ais = p.ais.status || {};
  return (
    <div className="mx-4 my-3 rounded border p-3 font-mono text-[11px]" style={{ borderColor: "var(--border-highlight)", background: "rgba(0,97,148,0.03)" }} data-testid="provenance-panel">
      <div className="mb-2 flex flex-wrap items-center gap-2"><Fingerprint size={13} className="text-cyan-300" /><span className="font-display text-sm font-semibold">Data provenance</span><Badge v={p.data_mode} testid="provenance-data-mode" />{p.case_origin_label && <Badge v={p.case_origin_label} testid="provenance-case-origin" />}</div>
      <div className="grid gap-x-6 gap-y-1 md:grid-cols-2 xl:grid-cols-3">
        <div><p className="label-mono mb-1 flex items-center gap-2">Satellite <Badge v={p.satellite.badge} testid="provenance-sat-badge" /></p>
          <R k="provider" v={p.satellite.provider} /><R k="scene" v={p.satellite.scene_id} testid="provenance-scene-id" /><R k="sensor" v={p.satellite.sensor} /><R k="acquired" v={p.satellite.acquisition_time ? `${fmtTime(p.satellite.acquisition_time)} · ${age(p.satellite.acquisition_time)}` : null} testid="provenance-acquired" />
          <R k="Δ event → scene" v={p.satellite.time_difference_hours != null ? `${p.satellite.time_difference_hours} h` : null} /><R k="platform / orbit" v={[p.satellite.platform, p.satellite.orbit_state].filter(Boolean).join(" · ") || null} /><R k="polarization / asset" v={[p.satellite.polarization, p.satellite.analysis_asset].filter(Boolean).join(" · ") || null} />
          {p.satellite.status && <p className="mt-1 text-[10px] text-slate-500">{p.satellite.status}</p>}
        </div>
        <div><p className="label-mono mb-1 flex items-center gap-2">Detection <Badge v={p.detection.badge} testid="provenance-det-badge" /></p>
          <R k="type" v={p.detection.type} /><R k="source" v={p.detection.source} /><R k="version" v={p.detection.model} /><R k="confidence" v={p.detection.confidence != null ? p.detection.confidence.toFixed(2) : (p.detection.confidence_note || null)} />
          <p className="mt-1 text-[10px] text-amber-300/80" data-testid="provenance-validation-note">{p.detection.validation}</p>
        </div>
        <div><p className="label-mono mb-1 flex items-center gap-2">AIS <Badge v={p.ais.badge} testid="provenance-ais-badge" /></p>
          <R k="provider" v={p.ais.provider} /><R k="feed now" v={ais.state ? `${ais.state}${ais.messages_per_min != null ? ` · ${ais.messages_per_min} msg/min` : ""}` : null} testid="provenance-ais-feed" /><R k="observations used" v={p.ais.observations} /><R k="closest observation" v={p.ais.last_observation ? fmtTime(p.ais.last_observation) : null} testid="provenance-ais-last" />
          {p.ais.note && <p className="mt-1 text-[10px] text-slate-500">{p.ais.note}</p>}
        </div>
        <div><p className="label-mono mb-1 flex items-center gap-2">Jurisdiction <Badge v={p.jurisdiction.badge} testid="provenance-jur-badge" /></p>
          <R k="zone" v={p.jurisdiction.zone ? `${p.jurisdiction.zone} · ${p.jurisdiction.zone_name || ""}` : null} testid="provenance-jur-zone" /><R k="country" v={p.jurisdiction.country} /><R k="dataset" v={p.jurisdiction.dataset} /><R k="resolved" v={p.jurisdiction.resolved_at ? fmtTime(p.jurisdiction.resolved_at) : null} />
          <p className="mt-1 text-[10px] text-slate-500">{p.jurisdiction.note}</p>
        </div>
        <div><p className="label-mono mb-1">Analysis</p>
          <R k="algorithm" v={p.analysis.algorithm} /><R k="result version" v={p.analysis.version} /><R k="analysed at" v={p.analysis.analysed_at ? fmtTime(p.analysis.analysed_at) : null} testid="provenance-analysed-at" /><R k="candidates" v={p.analysis.candidates} /><R k="weights" v={p.analysis.weights ? Object.entries(p.analysis.weights).map(([k, v]) => `${k} ${v}`).join(" · ") : null} /><R k="input hash" v={p.analysis.input_hash?.slice(0, 16)} />
        </div>
      </div>
      {(p.ais.badge === "NONE" || p.ais.badge === "UNAVAILABLE") && <p className="mt-2 text-amber-300/90" data-testid="provenance-ais-none">No AIS observations for this window — satellite analysis is valid, vessel attribution is unavailable for this case.</p>}
    </div>
  );
};

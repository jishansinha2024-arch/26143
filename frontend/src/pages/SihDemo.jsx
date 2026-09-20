import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, ChevronRight, ChevronLeft, Satellite, Waves, Radio, Ship, Scale, Fingerprint, FolderOpen, Globe2, HelpCircle, PinOff } from "lucide-react";
import { toast } from "sonner";
import { api, apiError, fmtTime, hasRole } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CandidatesTable } from "@/components/case/CandidatesTable";
import { Provenance } from "@/components/case/Provenance";
import { ChronoTimeline } from "@/components/case/ChronoTimeline";

const fmtDiff = (h) => (h == null ? "—" : `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, "0")} min`);
const Row = ({ k, v, testid }) => <div className="flex justify-between gap-3 border-b border-dashed py-1 font-mono text-[11px]" style={{ borderColor: "var(--border-default)" }}><span className="text-slate-500">{k}</span><span className="text-right text-slate-100" data-testid={testid}>{v ?? "UNAVAILABLE"}</span></div>;
const Tag = ({ children, tone = "#007bb9", testid }) => <span data-testid={testid} className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider" style={{ color: tone, border: `1px solid ${tone}66` }}>{children}</span>;

/** Judge walkthrough — every value is fetched from the real backend; the case is a stored REFERENCE CASE, never presented as live. */
export default function SihDemo() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [selected, setSelected] = useState(null);
  const load = async () => {
    setErr(null);
    try {
      const [aoi, summary, ais, ref] = await Promise.all([api.get("/aoi"), api.get("/dashboard/summary"), api.get("/ais/status"), api.get("/demo/reference")]);
      if (!ref.data.pinned) throw new Error("REFERENCE CASE NOT PINNED — an administrator must open a stored case and choose “Pin as SIH reference case”. The demo never picks an arbitrary case.");
      if (!ref.data.available) throw new Error(`REFERENCE CASE UNAVAILABLE — pinned case ${ref.data.case_number || ref.data.case_id} no longer exists. An administrator must pin a replacement case.`);
      const full = (await api.get(`/cases/${ref.data.case_id}`)).data;
      const r = await api.get(`/cases/${ref.data.case_id}/candidates`).catch(() => ({ data: {} }));
      const cands = Array.isArray(r.data) ? r.data : (r.data?.candidates || []);
      const geo = (await api.get(`/cases/${ref.data.case_id}/geojson`)).data;
      const timeline = (await api.get(`/cases/${ref.data.case_id}/evidence-timeline`).catch(() => ({ data: null }))).data;
      setD({ aoi: aoi.data, summary: summary.data, ais: ais.data, c: full, cands, geo, ref: ref.data, timeline, hasResult: cands.length > 0 });
    } catch (e) { setErr(e?.response?.data?.detail || e.message); }
  };
  useEffect(() => { load(); }, []);

  const steps = d ? [
    { t: "Problem", icon: Globe2, body: <>
      <p className="text-sm text-slate-200">Oil discharges at sea are rarely witnessed. Varuna Netra combines <b>real Sentinel-1 SAR acquisitions</b>, <b>real AIS vessel telemetry</b> and explainable space-time correlation so an operator can rank <i>candidate</i> vessels and open an evidence-backed case — anywhere in the world.</p>
      <div className="mt-3 grid gap-x-6 sm:grid-cols-2"><Row k="active cases (real, open)" v={d.summary.active_cases} testid="demo-live-cases" /><Row k="pending analyst review" v={d.summary.pending_review} /><Row k="AIS fixes indexed" v={d.summary.ais_fixes_indexed} /><Row k="imported / demo records excluded" v={`${d.summary.demo.imported} / ${d.summary.demo.cases}`} /></div>
      <p className="mt-3 font-mono text-[10px] text-amber-300" data-testid="demo-reference-label">REFERENCE CASE — STORED DATA · {d.c.case_number} · {d.c.origin_label} · pinned by {d.ref.pinned_by}. Nothing on this walkthrough is simulated; values are read from the database and provider catalogues.</p></> },
    { t: "AOI", icon: Globe2, body: <>
      <Row k="preset" v={d.aoi.aoi ? `${d.aoi.aoi.name} (${d.aoi.aoi.provenance})` : "none selected — SIH preset: Mumbai / Arabian Sea"} testid="demo-aoi" /><Row k="Sentinel bbox" v={d.aoi.aoi ? d.aoi.aoi.bbox.map((x) => x.toFixed(2)).join(", ") : d.aoi.presets.sih_mumbai.bbox.join(", ")} /><Row k="AIS coverage boxes" v={d.aoi.aoi ? d.aoi.aoi.ais_bboxes_swne.length : d.ais.coverage_bbox?.length} />
      <p className="mt-2 text-xs text-slate-400">Any zone or drawn polygon worldwide drives the same pipeline; India/Mumbai is only the SIH preset. Reference zones: Marine Regions v12 (CC-BY) — REFERENCE, not legal authority.</p></> },
    { t: "Sentinel-1 scene", icon: Satellite, body: <>
      <div className="mb-2 flex gap-2"><Tag tone="#006a61" testid="demo-scene-badge">{d.c.scene_status?.state === "SAR_READY" ? "REAL SENTINEL-1 · SAR READY" : d.c.scene_status?.state}</Tag><Tag>LATEST AVAILABLE ACQUISITION — not real-time</Tag></div>
      <Row k="scene" v={d.c.scene_status?.provider_scene_id} testid="demo-scene-id" /><Row k="acquired" v={d.c.scene_status?.acquisition_time ? fmtTime(d.c.scene_status.acquisition_time) : null} /><Row k="event time" v={fmtTime(d.c.acquisition_time)} /><Row k="Δ event → scene" v={fmtDiff(d.c.scene_status?.time_difference_hours)} /><Row k="platform · polarization · asset" v={[d.c.scene_status?.platform, d.c.scene_status?.polarization, d.c.scene_status?.analysis_asset].filter(Boolean).join(" · ") || null} /><Row k="provider" v="Microsoft Planetary Computer STAC (sentinel-1-grd)" /></> },
    { t: "Spill candidate", icon: Waves, body: <>
      <div className="mb-2 flex gap-2"><Tag tone="#b26a00">EXPERIMENTAL SAR DARK-SPOT DETECTOR</Tag><Tag tone="#707881">validation pending</Tag></div>
      <Row k="source · version" v={`${d.c.source}${d.geo?.features?.[0]?.properties?.processing_version ? ` · ${d.geo.features[0].properties.processing_version}` : ""}`} /><Row k="detection confidence" v={d.c.detection_confidence != null ? d.c.detection_confidence.toFixed(2) : null} /><Row k="centroid (lon, lat)" v={d.c.centroid.coordinates.map((x) => x.toFixed(4)).join(", ")} /><Row k="quality flags" v={(d.c.quality_flags || []).join(", ") || "none"} />
      <p className="mt-2 text-[11px] text-amber-300/90">Dark formations in SAR imagery may also be caused by low wind, biogenic films or other oceanographic phenomena. Detection is an investigation candidate, not automatic proof of an oil spill.</p></> },
    { t: "AIS vessels", icon: Radio, body: <>
      <div className="mb-2 flex gap-2"><Tag tone={d.ais.state === "LIVE" ? "#006a61" : "#b26a00"} testid="demo-ais-state">AISStream now: {d.ais.feed || d.ais.state}</Tag></div>
      <Row k="messages / min (now)" v={d.ais.messages_per_min} /><Row k="active vessels (now)" v={d.ais.vessels_active} /><Row k="positions stored" v={d.ais.positions_stored} /><Row k="AIS positions used for this case" v={d.cands.length ? d.cands.reduce((s, c) => s + (c.evidence?.fix_count || 0), 0) : 0} />
      <p className="mt-2 text-xs text-slate-400">Correlation uses AIS positions around the <b>satellite acquisition time</b> (historical window) — never current positions as if they were historical. Live feed status above is the current connection, shown separately.</p></> },
    { t: "Candidate ranking · Why this vessel?", icon: Ship, body: d.cands.length ? <>
      <p className="mb-2 text-xs text-slate-400">Click <b>Why this vessel?</b> to see the six real factors, weights and points from the correlation engine.</p>
      <div className="rounded border" style={{ borderColor: "var(--border-default)" }}><CandidatesTable candidates={d.cands} selected={selected} onSelect={setSelected} /></div></> : <p className="text-xs text-amber-300" data-testid="demo-no-candidates">No AIS candidate vessels were found in this case's space-time corridor — the system reports this truthfully rather than inventing a vessel. Correlation can be re-run once AIS history covers the window.</p> },
    { t: "Evidence timeline", icon: Fingerprint, body: <div className="-mx-4"><ChronoTimeline caseId={d.c.id} /></div> },
    { t: "Jurisdiction", icon: Scale, body: <>
      <Row k="primary zone" v={d.c.primary_jurisdiction ? `${d.c.primary_jurisdiction.code} · ${d.c.primary_jurisdiction.name}` : "no reference zone intersects (high seas / not imported)"} testid="demo-jurisdiction" /><Row k="authority (reference)" v={d.c.primary_jurisdiction?.authority} /><Row k="all intersecting zones" v={(d.c.jurisdictions || []).map((z) => z.code).join(", ") || null} /><Row k="ICG routing (India, approximate)" v={d.c.icg ? `${d.c.icg.code} · ${d.c.icg.district_hq}` : null} />
      <p className="mt-2 text-[11px] text-slate-500">Geographic intersection with a REFERENCE boundary is context for coordination — not a legal determination of responsibility.</p></> },
    { t: "Evidence & provenance", icon: Fingerprint, body: <div className="-mx-4"><Provenance caseId={d.c.id} /></div> },
    { t: "Investigation case", icon: FolderOpen, body: <>
      <Row k="case" v={d.c.case_number} testid="demo-case-number" /><Row k="status · review" v={`${d.c.status} · ${d.c.review_state}`} /><Row k="attribution" v={d.c.attribution_status} /><Row k="confidence band" v={d.c.confidence_band} />
      <button data-testid="demo-open-case" onClick={() => nav(`/cases/${d.c.id}`)} className="mt-3 inline-flex items-center gap-1 rounded bg-cyan-400 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-950"><FolderOpen size={12} /> Open the full case (map, tracks, PDF evidence)</button></> },
  ] : [];

  return (
    <div className="h-full overflow-y-auto p-6" data-testid="sih-demo-page">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div><p className="label-mono mb-1">Smart India Hackathon · judge walkthrough · ~2–3 minutes</p><h1 className="font-display text-3xl font-extrabold tracking-tight">Run SIH Demo</h1></div>
        <Tag tone="#b26a00" testid="demo-mode-tag">REFERENCE CASE — STORED DATA · not LIVE</Tag>
        {hasRole(user, "admin") && <button data-testid="demo-unpin" onClick={async () => { if (!window.confirm("Unpin the SIH reference case? Run SIH Demo will show REFERENCE CASE NOT PINNED until an admin pins another case.")) return; try { await api.delete("/demo/reference"); toast.success("Reference case unpinned"); load(); } catch (e) { toast.error(apiError(e)); } }} className="ml-auto inline-flex items-center gap-1 rounded border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-amber-300" style={{ borderColor: "var(--border-highlight)" }} title="Admin: unpin the reference case (pin another from any case's detail page)"><PinOff size={12} /> Unpin reference</button>}
        <button data-testid="demo-restart" onClick={() => { setStep(0); load(); }} className={`${hasRole(user, "admin") ? "" : "ml-auto "}inline-flex items-center gap-1 rounded border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300`} style={{ borderColor: "var(--border-highlight)" }}><Play size={12} /> Restart</button>
      </div>
      {err && <p className="rounded border border-rose-500/50 px-3 py-2 text-xs text-rose-300" data-testid="demo-error">Demo unavailable: {err}</p>}
      {!d && !err && <p className="font-mono text-xs text-slate-500">Loading real case data…</p>}
      {d && (
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <ol className="space-y-1" data-testid="demo-steps">
            {steps.map((s, i) => <li key={s.t}><button data-testid={`demo-step-${i}`} onClick={() => setStep(i)} className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left font-mono text-[11px] ${i === step ? "bg-cyan-400/15 text-cyan-300" : "text-slate-400 hover:text-on-surface"}`}><s.icon size={12} /> {i + 1}. {s.t}</button></li>)}
          </ol>
          <div className="panel p-5 fade-up" key={step} data-testid="demo-step-panel">
            <h2 className="font-display text-lg font-semibold" data-testid="demo-step-title">{step + 1}. {steps[step].t}</h2>
            <div className="mt-3">{steps[step].body}</div>
            <div className="mt-5 flex justify-between">
              <button data-testid="demo-prev" disabled={step === 0} onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1 rounded border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 disabled:opacity-40" style={{ borderColor: "var(--border-highlight)" }}><ChevronLeft size={12} /> Back</button>
              <button data-testid="demo-next" disabled={step === steps.length - 1} onClick={() => setStep(step + 1)} className="inline-flex items-center gap-1 rounded bg-cyan-400 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-950 disabled:opacity-40">Next <ChevronRight size={12} /></button>
            </div>
          </div>
        </div>
      )}
      <p className="mt-4 flex items-center gap-1 font-mono text-[10px] text-slate-500"><HelpCircle size={10} /> Every number is fetched from the backend at load time; no value on this page is scripted.</p>
    </div>
  );
}

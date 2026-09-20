import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import bbox from "@turf/bbox";
import { ArrowLeft, Download, Layers, FileText, Columns2, Globe2, Crosshair, Image as ImageIcon, Gavel, Pin } from "lucide-react";
import { api, apiError, fmtTime, pct, hasRole } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { StatusBadge, BandBadge } from "@/components/StatusBadge";
import { CaseMap, ZONE_STYLE } from "@/components/case/CaseMap";
import { CandidatesTable } from "@/components/case/CandidatesTable";
import { ReviewForm } from "@/components/case/ReviewForm";
import { EvidenceTimeline } from "@/components/case/EvidenceTimeline";
import { ChronoTimeline } from "@/components/case/ChronoTimeline";
import { CorrelatePanel } from "@/components/case/CorrelatePanel";
import { TimeScrubber } from "@/components/case/TimeScrubber";
import { CaseTimeline } from "@/components/case/CaseTimeline";
import { Attachments } from "@/components/case/Attachments";
import { BeforeAfter } from "@/components/case/BeforeAfter";
import { DetectorFeedback } from "@/components/case/DetectorFeedback";
import { Playbook } from "@/components/case/Playbook";
import { Precedents } from "@/components/case/Precedents";
import { Vulnerability } from "@/components/case/Vulnerability";
import { DarkVessels } from "@/components/case/DarkVessels";
import { Provenance } from "@/components/case/Provenance";
import { CaseSummary } from "@/components/case/CaseSummary";
import { CandidateComparison } from "@/components/case/CandidateComparison";
import { AiAssistant } from "@/components/case/AiAssistant";
import { SceneTimeline } from "@/components/case/SceneTimeline";
import { ResponseEta } from "@/components/case/ResponseEta";
import { useLiveVessels } from "@/components/map/LiveVesselLayer";
import { AssetSearch, assetBounds } from "@/components/map/AssetSearch";
import { useLive } from "@/context/LiveFeed";

const TABS = [["candidates", "Candidates"], ["comparison", "Why not #2?"], ["assistant", "AI assistant"], ["summary", "Investigation summary"], ["review", "Analyst review"], ["response", "Response"], ["precedents", "Related precedent"], ["vulnerability", "Vulnerability"], ["timeline", "Timeline"], ["files", "Files"], ["beforeafter", "Before / After"], ["scenes", "Scene timeline"], ["evidence", "Evidence & audit"], ["log", "Processing log"]];
const overlayBtn = { background: "rgba(255,255,255,0.85)", border: "1px solid var(--border-highlight)", backdropFilter: "blur(12px)" };

export default function CaseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [c, setC] = useState(null);
  const [cands, setCands] = useState(null);
  const [geo, setGeo] = useState(null);
  const [evidence, setEvidence] = useState(null);
  const [config, setConfig] = useState(null);
  const [tab, setTab] = useState("candidates");
  const [darkScan, setDarkScan] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showTracks, setShowTracks] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [zones, setZones] = useState(null);
  const [showZones, setShowZones] = useState(true);
  const { data: liveAis } = useLiveVessels(15000);
  const nearLive = useMemo(() => {
    if (!c?.centroid || !liveAis?.vessels) return [];
    const [lon0, lat0] = c.centroid.coordinates;
    const km = (a, b) => { const R = 6371, dLat = (b[0] - a[0]) * Math.PI / 180, dLon = (b[1] - a[1]) * Math.PI / 180, x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
    return liveAis.vessels.map((v) => ({ ...v, distance_km: km([lat0, lon0], [v.lat, v.lon]) })).filter((v) => v.distance_km <= 250).sort((a, b) => a.distance_km - b.distance_km);
  }, [c?.centroid, liveAis]);
  const [zoneKinds, setZoneKinds] = useState({ territorial: true, contiguous: true, eez: true, port_state: true, custom: true });
  const [satMeta, setSatMeta] = useState(null);
  const [showSat, setShowSat] = useState(false);
  const [overlayMeta, setOverlayMeta] = useState(null);
  const [overlayUrl, setOverlayUrl] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.8);
  const [fitTo, setFitTo] = useState(null);
  const [focus, setFocus] = useState(false);
  const [asset, setAsset] = useState(null);
  const [exporting, setExporting] = useState(false);
  const prosecutionExport = async () => {
    setExporting(true);
    try {
      const r = await api.post(`/cases/${id}/prosecution-export`, null, { responseType: "blob", timeout: 180000 });
      const h = r.headers["x-bundle-sha256"];
      const el = document.createElement("a"); el.href = URL.createObjectURL(r.data); el.download = `${c.case_number}_prosecution.zip`; el.click(); URL.revokeObjectURL(el.href);
      toast.success("Prosecution bundle exported", { description: `SHA-256 ${h?.slice(0, 20)}… recorded in audit ledger · verify at /verify`, duration: 12000 });
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setExporting(false); }
  };

  const load = useCallback(async () => {
    const [a, b, g, e, cfg] = await Promise.all([api.get(`/cases/${id}`), api.get(`/cases/${id}/candidates`), api.get(`/cases/${id}/geojson`), api.get(`/cases/${id}/evidence`), api.get("/config/defaults")]);
    const [lon, lat] = a.data.centroid.coordinates;
    const z = await api.get(`/jurisdictions/geojson?bbox=${lon - 4},${lat - 4},${lon + 4},${lat + 4}&detail=low`).catch(() => ({ data: null }));
    setC(a.data); setCands(b.data); setGeo(g.data); setEvidence(e.data); setConfig(cfg.data); setZones(z.data);
  }, [id]);
  useEffect(() => { load().catch((e) => toast.error(apiError(e))); }, [load]);
  const live = useLive();
  useEffect(() => { if (live?.lastJob?.case_id === id && live.lastJob.status === "succeeded") load().catch(() => {}); }, [live?.lastJob, id, load]);
  useEffect(() => { api.get("/satellite/collections").then((r) => setSatMeta(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    if (!c?.scene_id) return undefined;
    api.get(`/scenes/${c.scene_id}/overlay`).then((r) => setOverlayMeta(r.data)).catch(() => {});
  }, [c?.scene_id]);
  useEffect(() => {
    if (!showOverlay || overlayUrl || !overlayMeta?.has_quicklook) return undefined;
    let u;
    api.get(`/scenes/${c.scene_id}/quicklook`, { responseType: "blob", timeout: 120000 }).then((r) => { u = URL.createObjectURL(r.data); setOverlayUrl(u); }).catch((e) => toast.error(apiError(e)));
    return undefined;
  }, [showOverlay, overlayUrl, overlayMeta, c?.scene_id]);

  const top = cands?.candidates?.[0];
  const confirmedTop = top && c?.review_state === "confirmed" && c?.confirmed_vessel_mmsi === top.mmsi;
  const highlight = useMemo(() => {
    if (!focus || !top) return null;
    const cf = top.evidence.closest_fix;
    return { lat: cf.lat, lon: cf.lon, name: `${top.vessel_name || top.mmsi} (#${top.rank}, ${top.status})`, confirmed: !!confirmedTop };
  }, [focus, top, confirmedTop]);
  const focusSpill = () => {
    const spillF = geo?.features?.filter((f) => f.properties.layer === "spill") || [];
    if (!spillF.length) return;
    const feats = [...spillF];
    if (top) feats.push({ type: "Feature", geometry: { type: "Point", coordinates: [top.evidence.closest_fix.lon, top.evidence.closest_fix.lat] }, properties: {} });
    const [w, s, e, n] = bbox({ type: "FeatureCollection", features: feats });
    setFitTo([[s, w], [n, e]]); setFocus(true); setSelected(top?.mmsi || null);
  };

  const saveBlob = (blob, name) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href); };
  const exportGeo = () => saveBlob(new Blob([JSON.stringify(geo, null, 2)], { type: "application/geo+json" }), `${c.case_number}.geojson`);
  const exportPdf = async () => {
    setPdfBusy(true);
    try {
      const { data } = await api.get(`/cases/${id}/evidence.pdf`, { responseType: "blob" });
      saveBlob(data, `${c.case_number}-evidence.pdf`);
      toast.success("Evidence package downloaded"); load();
    } catch (e) { toast.error(apiError(e)); } finally { setPdfBusy(false); }
  };

  if (!c) return <div className="p-6 font-mono text-xs text-slate-400" data-testid="case-loading">Loading case…</div>;
  const spill = c.spill_observation;

  return (
    <div className="flex h-full overflow-hidden" data-testid="case-detail">
      <div className="relative flex-1">
        <CaseMap liveVessels={nearLive} darkVessels={darkScan?.targets} geojson={geo} selected={selected} onSelect={setSelected} showTracks={showTracks} timeCursor={cursor} acquisitionTime={c.acquisition_time} zones={showZones ? zones : null} zoneKinds={zoneKinds} gibs={showSat && satMeta ? { layer: satMeta.basemaps[0], template: satMeta.gibs_template } : null}
          overlay={showOverlay && overlayUrl && overlayMeta ? { url: overlayUrl, bounds: overlayMeta.bounds, opacity: overlayOpacity } : null} fitTo={fitTo} highlight={highlight} asset={asset} />
        <div className="absolute left-3 top-3 z-[1000] flex items-center gap-2">
          <Link to="/" data-testid="back-to-dashboard" className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-200" style={overlayBtn}><ArrowLeft size={12} /> Cases</Link>
          <button data-testid="map-toggle-ais-layer" onClick={() => setShowTracks(!showTracks)} className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider" style={{ ...overlayBtn, color: showTracks ? "#006194" : "#707881" }}><Layers size={12} /> AIS tracks</button>
          <button data-testid="map-toggle-zones-layer" onClick={() => setShowZones(!showZones)} className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider" style={{ ...overlayBtn, color: showZones ? "#006194" : "#707881" }}><Layers size={12} /> Zones</button>
          {showZones && (
            <span className="inline-flex items-center gap-1 rounded px-1.5 py-1" style={overlayBtn} data-testid="zone-kind-toggles">
              {[["territorial", "12 NM"], ["contiguous", "24 NM"], ["eez", "EEZ"]].map(([k, l]) => (
                <button key={k} data-testid={`zone-kind-${k}`} onClick={() => setZoneKinds({ ...zoneKinds, [k]: !zoneKinds[k] })} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: zoneKinds[k] ? ZONE_STYLE[k].color : "#707881", background: zoneKinds[k] ? `${ZONE_STYLE[k].color}22` : "transparent" }}>
                  <span className="inline-block h-0 w-3 border-t-2" style={{ borderColor: zoneKinds[k] ? ZONE_STYLE[k].color : "#707881", borderStyle: ZONE_STYLE[k].dashArray ? "dashed" : "solid" }} />{l}
                </button>))}
            </span>
          )}
          <button data-testid="map-toggle-satellite-layer" onClick={() => setShowSat(!showSat)} title="NASA GIBS VIIRS true colour on acquisition date" className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider" style={{ ...overlayBtn, color: showSat ? "#006194" : "#707881" }}><Globe2 size={12} /> Satellite</button>
          <button data-testid="btn-export-geojson" onClick={exportGeo} className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-200" style={overlayBtn}><Download size={12} /> GeoJSON</button>
          <button data-testid="btn-export-pdf" disabled={pdfBusy} onClick={exportPdf} className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider disabled:opacity-50" style={{ ...overlayBtn, color: "#b26a00" }}><FileText size={12} /> {pdfBusy ? "Building…" : "Evidence PDF"}</button>
          <Link to={`/compare?a=${id}`} data-testid="btn-compare-case" className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-200" style={overlayBtn}><Columns2 size={12} /> Compare</Link>
          <button data-testid="btn-focus-spill" onClick={focusSpill} className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider" style={{ ...overlayBtn, color: focus ? "#b26a00" : "#191c1e" }}><Crosshair size={12} /> Focus spill</button>
          {hasRole(user, "supervisor") && <button data-testid="btn-prosecution-export" disabled={exporting} onClick={prosecutionExport} className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-rose-200 disabled:opacity-50" style={{ ...overlayBtn, borderColor: "rgba(186,26,26,0.6)" }}><Gavel size={12} /> {exporting ? "Bundling…" : "Prosecution export"}</button>}
          {hasRole(user, "admin") && <button data-testid="btn-pin-reference" onClick={async () => { try { await api.put(`/demo/reference/${id}`); toast.success(`${c.case_number} pinned as SIH reference case (REFERENCE CASE — STORED DATA)`); } catch (e) { toast.error(apiError(e)); } }} title="Run SIH Demo will always open this stored case" className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider" style={{ ...overlayBtn, color: "#b26a00" }}><Pin size={12} /> Pin as SIH reference case</button>}
          <AssetSearch compact onSelect={(h) => { setFitTo(assetBounds(h)); setAsset(h); }} />
          <span className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider" style={{ ...overlayBtn, color: liveAis?.state === "LIVE" ? "#006a61" : "#707881" }} data-testid="map-live-vessels-chip" title="Live AISStream vessels within 250 km of the slick (green dots)">● live AIS {liveAis?.state || "…"} · {nearLive.length} near slick</span>
          {overlayMeta?.has_quicklook && (
            <span className="inline-flex items-center gap-2 rounded px-2.5 py-1.5" style={overlayBtn} data-testid="scene-overlay-control">
              <button data-testid="map-toggle-scene-overlay" onClick={() => setShowOverlay(!showOverlay)} className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider" style={{ color: showOverlay ? "#006194" : "#707881" }}><ImageIcon size={12} /> SAR quicklook</button>
              {showOverlay && <input data-testid="scene-overlay-opacity" type="range" min="0" max="1" step="0.05" value={overlayOpacity} onChange={(e) => setOverlayOpacity(+e.target.value)} className="w-20" />}
            </span>
          )}
        </div>
        <div className="absolute bottom-3 left-3 right-3 z-[1000] flex items-end gap-3">
          <div className="rounded p-3 text-[11px] shrink-0" style={{ background: "rgba(255,255,255,0.85)", border: "1px solid var(--border-default)", backdropFilter: "blur(12px)" }} data-testid="map-legend">
            <div className="flex items-center gap-2"><span className="h-2.5 w-4 border border-dashed" style={{ borderColor: "#ba1a1a", background: "rgba(186,26,26,0.35)" }} /> Spill polygon</div>
            <div className="flex items-center gap-2 mt-1"><span className="h-2.5 w-4 border border-dashed" style={{ borderColor: "#006194" }} /> Search corridor</div>
            <div className="flex items-center gap-2 mt-1"><span className="h-0.5 w-4" style={{ background: "#ba1a1a" }} /> Rank 1 track · <span className="h-0.5 w-4" style={{ background: "#b26a00" }} /> Rank 2 …</div>
            <div className="flex items-center gap-2 mt-1"><span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: "#707881" }} /> Interpolated AIS gap (dead reckoning)</div>
            <div className="flex items-center gap-2 mt-1"><span className="h-2.5 w-4 border border-dashed" style={{ borderColor: "#8a63d2", background: "rgba(111,79,168,0.25)" }} /> Origin envelope (2σ back-drift) · likely window</div>
            <div className="flex items-center gap-2 mt-1"><span className="h-2 w-2 rounded-full border border-white" /> Drift back-projection</div>
          </div>
          <div className="flex-1 max-w-3xl">
            <TimeScrubber geojson={geo} acquisitionTime={c.acquisition_time} windowAfterHours={cands?.params?.window_hours_after ?? 3} cursor={cursor} setCursor={setCursor} />
          </div>
        </div>
      </div>

      <aside className="flex w-[520px] shrink-0 flex-col border-l overflow-hidden" style={{ borderColor: "var(--border-default)", background: "var(--bg-secondary)" }}>
        <div className="border-b p-4" style={{ borderColor: "var(--border-default)" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-mono">{c.source} · det. conf {c.source === "dark_spot_detector" ? pct(c.detection_confidence) : <span title="value supplied at registration, not produced by a detector">N/A (registrant-supplied)</span>}</p>
              <h1 className="font-display text-2xl font-bold tracking-tight" data-testid="case-number">{c.case_number}</h1>
              <p className="font-mono text-xs text-slate-400">Acquired {fmtTime(c.acquisition_time)} · {spill?.estimated_area_km2} km² · v{c.latest_result_version}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <StatusBadge status={c.attribution_status} testId="case-attribution-status" />
              <span className="font-mono text-[10px] text-slate-400">band <BandBadge band={c.confidence_band} /> · <span data-testid="case-review-state">{c.review_state}</span></span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {c.primary_jurisdiction && <span data-testid="case-jurisdiction-chip" title={c.primary_jurisdiction.name} className="rounded px-1.5 py-0.5 font-mono text-[10px] text-cyan-300" style={{ background: "rgba(0,97,148,0.08)", border: "1px solid rgba(0,97,148,0.35)" }}>⚖ {c.primary_jurisdiction.code} · {c.primary_jurisdiction.zone_label || c.primary_jurisdiction.zone_type} · {c.primary_jurisdiction.authority}</span>}
            {c.jurisdictions?.filter((z) => z.code !== c.primary_jurisdiction?.code).map((z) => <span key={z.code} data-testid={`case-jurisdiction-other-${z.code}`} className="rounded px-1.5 py-0.5 font-mono text-[10px] text-slate-400" style={{ border: "1px solid var(--border-highlight)" }}>also {z.code} · {z.zone_label || z.zone_type} ({Math.round(z.overlap_fraction * 100)}%)</span>)}
            {!c.primary_jurisdiction && <span data-testid="case-jurisdiction-none" className="rounded px-1.5 py-0.5 font-mono text-[10px] text-slate-500" style={{ border: "1px solid var(--border-highlight)" }}>jurisdiction unassigned</span>}
            {c.icg && <span data-testid="case-icg-chip" title={`${c.icg.region} (HQ ${c.icg.region_hq}) · ${c.icg.note}`} className="rounded px-1.5 py-0.5 font-mono text-[10px] text-emerald-300" style={{ background: "rgba(0,106,97,0.08)", border: "1px solid rgba(0,106,97,0.4)" }}>⚓ {c.icg.code} · {c.icg.district_hq} · {c.icg.region.replace("Coast Guard Region", "CG Region")}{c.icg.approximate ? " · approx." : ""}</span>}
            {spill?.quality_flags?.map((f) => <span key={f} data-testid={`spill-flag-${f}`} className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${f === "experimental_detector" ? "text-rose-200" : "text-amber-300"}`} style={f === "experimental_detector" ? { background: "rgba(186,26,26,0.15)", border: "1px dashed rgba(186,26,26,0.7)" } : { background: "rgba(178,106,0,0.12)", border: "1px solid rgba(178,106,0,0.4)" }}>{f === "experimental_detector" ? "⚠ EXPERIMENTAL dark-spot detector" : f}</span>)}
            {cands?.degraded && <span data-testid="degraded-flag" className="rounded px-1.5 py-0.5 font-mono text-[10px] text-purple-300" style={{ background: "rgba(111,79,168,0.12)", border: "1px solid rgba(111,79,168,0.4)" }}>degraded: no drift inputs</span>}
            {cands?.ambiguous_multiple_vessels && <span data-testid="ambiguous-flag" className="rounded px-1.5 py-0.5 font-mono text-[10px] text-amber-300" style={{ background: "rgba(178,106,0,0.12)", border: "1px solid rgba(178,106,0,0.4)" }}>multiple-vessel ambiguity</span>}
            {c.confirmed_vessel_mmsi && <span data-testid="confirmed-vessel" className="rounded px-1.5 py-0.5 font-mono text-[10px] text-emerald-300" style={{ background: "rgba(0,106,97,0.12)", border: "1px solid rgba(0,106,97,0.4)" }}>confirmed MMSI {c.confirmed_vessel_mmsi}</span>}
          </div>
        </div>
        <CorrelatePanel key={`${c.latest_result_version}-${spill?.wind?.speed_ms}-${spill?.current?.speed_ms}`} caseId={id} defaults={config?.correlation_params} spill={spill} onDone={load} />
        <div className="flex border-b" style={{ borderColor: "var(--border-default)" }}>
          {TABS.map(([k, l]) => (
            <button key={k} data-testid={`tab-${k}`} onClick={() => setTab(k)} className={`px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors ${tab === k ? "text-cyan-300 border-b-2 border-cyan-300" : "text-slate-400 hover:text-on-surface"}`}>{l}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {tab === "comparison" && <div className="px-4 py-4" data-testid="comparison-tab"><CandidateComparison caseId={id} /></div>}
          {tab === "assistant" && <div className="px-4 py-4" data-testid="assistant-tab"><AiAssistant caseId={id} /></div>}
          {tab === "summary" && <div className="px-4 py-4" data-testid="summary-tab"><CaseSummary caseId={id} /></div>}
          {tab === "candidates" && (
            <>
              <p className="px-4 pt-3 text-[11px] text-slate-500" data-testid="candidates-disclaimer">{cands?.disclaimer || "Ranked candidates are decision-support output, not a legal determination."}</p>
              <Provenance caseId={id} />
              <CandidatesTable candidates={cands?.candidates} selected={selected} onSelect={setSelected} />
              <DarkVessels caseId={id} onScan={setDarkScan} sceneStatus={c?.scene_status} acquisitionTime={c?.acquisition_time} onAttached={load} />
            </>
          )}
          {tab === "review" && <div className="space-y-4"><DetectorFeedback caseId={id} source={c.source} onSaved={load} /><ReviewForm caseId={id} candidates={cands?.candidates} reasonCodes={config?.reason_codes} resultVersion={cands?.version} onSaved={load} /></div>}
          {tab === "timeline" && <CaseTimeline caseId={id} caseNumber={c.case_number} />}
          {tab === "files" && <Attachments caseId={id} onChanged={load} />}
          {tab === "response" && <div className="space-y-4"><ResponseEta caseId={id} /><Playbook caseId={id} /></div>}
          {tab === "precedents" && <div className="px-4 pb-4" data-testid="precedents-tab"><Precedents caseId={id} /></div>}
          {tab === "scenes" && <SceneTimeline caseId={id} />}
          {tab === "vulnerability" && <Vulnerability caseId={id} spillGeojson={geo} />}
          {tab === "beforeafter" && <div className="h-[520px]"><BeforeAfter caseId={id} /></div>}
          {tab === "evidence" && <><ChronoTimeline caseId={id} /><EvidenceTimeline evidence={evidence} /></>}
          {tab === "log" && (
            <div className="p-4 font-mono text-[11px] leading-relaxed" data-testid="processing-log">
              {evidence?.calculations?.processing_log?.map((l, i) => (
                <div key={i} className={l.level === "warn" ? "text-amber-300" : "text-slate-300"}><span className="text-slate-600">{l.t.slice(11, 19)}</span> {l.msg}</div>
              )) || <p className="text-slate-500">No processing log yet.</p>}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

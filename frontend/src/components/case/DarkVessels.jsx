import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Radar, ScanSearch, Satellite } from "lucide-react";
import { api, apiError, fmtTime } from "@/lib/api";

const STATE_UI = {
  SAR_READY: { color: "#006a61", label: "SENTINEL-1 SAR READY", hint: "Real Sentinel-1 SAR attached · dark-vessel scan available" },
  QUICKLOOK_GENERATING: { color: "#b26a00", label: "QUICKLOOK GENERATING", hint: "SAR available · preview still being generated" },
  NO_SCENE_SELECTED: { color: "#707881", label: "NO SCENE SELECTED", hint: "Run the acquisition search to find the nearest real Sentinel-1 pass" },
  SEARCHING: { color: "#006194", label: "SEARCHING SENTINEL-1", hint: "Querying Planetary Computer STAC (±36 h → ±72 h → ±5 d → ±7 d)" },
  NO_36H: { color: "#b26a00", label: "NO ACQUISITION IN ±36 H", hint: "" },
  NEAREST_FOUND_EXTENDED: { color: "#b26a00", label: "NEAREST SENTINEL-1 FOUND (EXTENDED WINDOW)", hint: "" },
  NO_COVERAGE_7D: { color: "#ba1a1a", label: "NO SENTINEL-1 ACQUISITION FOUND", hint: "Satellite revisit gap for this AOI/time. AIS/jurisdiction investigation can continue." },
  STAC_FAILED: { color: "#ba1a1a", label: "STAC SEARCH FAILED", hint: "" },
  SAR_ASSET_UNAVAILABLE: { color: "#ba1a1a", label: "SAR ASSET UNAVAILABLE", hint: "Scene attached but no Sentinel-1 analysis asset" },
  ATTACH_FAILED: { color: "#ba1a1a", label: "SCENE ATTACHMENT FAILED", hint: "" },
};
const fmtDiff = (h) => (h == null ? "—" : `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, "0")} min`);

const SceneStatus = ({ s, caseId, acquisitionTime, onAttached }) => {
  const [busy, setBusy] = useState(null);
  const [cands, setCands] = useState(null);
  const [localState, setLocalState] = useState(null);
  const [skipSar, setSkipSar] = useState(false);
  if (!s) return null;
  const state = localState || s.state;
  const ui = STATE_UI[state] || STATE_UI.NO_SCENE_SELECTED;
  const attach = async (sceneId) => {
    setBusy(sceneId || "auto"); setLocalState(sceneId ? null : "SEARCHING");
    try { const { data } = await api.post(`/cases/${caseId}/attach-scene`, sceneId ? { scene_id: sceneId } : {}); toast.success(`Attached ${data.scene.provider_scene_id} · ${fmtDiff(data.attachment.time_difference_hours)} from event`); setLocalState(null); setCands(null); onAttached?.(); }
    catch (e) { setLocalState(null); onAttached?.(); toast.error(apiError(e)); } finally { setBusy(null); }
  };
  const view = async () => {
    setBusy("list"); setLocalState("SEARCHING");
    try { const { data } = await api.get(`/cases/${caseId}/scene-candidates`); setCands(data); setLocalState(null); onAttached?.(); }
    catch (e) { setLocalState(null); toast.error(apiError(e)); } finally { setBusy(null); }
  };
  const search = s.search;
  return (
    <div className="mt-2 space-y-1.5 font-mono text-[10px]" data-testid="scene-sar-status">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded px-1.5 py-0.5 uppercase tracking-wider" style={{ color: ui.color, border: `1px solid ${ui.color}66` }} data-testid="scene-sar-state">{ui.label}</span>
        {s.sar_confirmation === "PENDING" && !skipSar && <span className="rounded px-1.5 py-0.5 uppercase tracking-wider text-amber-300" style={{ border: "1px solid rgba(178,106,0,0.4)" }} data-testid="sar-confirmation-pending">SAR confirmation pending</span>}
        <span className="text-slate-400" data-testid="scene-sar-reason">{state === "SEARCHING" ? ui.hint : (s.reason || ui.hint)}{s.provider_scene_id ? ` · ${s.provider_scene_id}` : ""}{s.analysis_asset ? ` · asset ${s.analysis_asset}` : ""}</span>
      </div>
      {s.scene_id && s.acquisition_time && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-slate-300 md:grid-cols-4" data-testid="scene-acquisition-info">
          <span>Target event: <b className="text-slate-100">{fmtTime(acquisitionTime)}</b></span><span>Acquired: <b className="text-slate-100">{fmtTime(s.acquisition_time)}</b></span>
          <span>Difference: <b className="text-slate-100">{fmtDiff(s.time_difference_hours)}</b></span><span>AOI overlap: <b className="text-slate-100">{s.overlap_percent != null ? `${s.overlap_percent}%` : "—"}</b>{s.search_window_hours ? ` · window ±${s.search_window_hours} h` : ""}{s.polarization ? ` · ${s.polarization}` : ""}</span>
        </div>
      )}
      {!s.scene_id && search?.stages_tried?.length > 0 && <div className="text-slate-500" data-testid="scene-search-stages">Search windows tried: {search.stages_tried.map((x) => `±${x.window_hours} h → ${x.scenes}`).join(" · ")}</div>}
      <div className="flex flex-wrap gap-1.5">
        {!s.scene_id && <button data-testid="btn-attach-scene" disabled={!!busy} onClick={() => attach()} className="inline-flex items-center gap-1 rounded border px-2 py-0.5 uppercase tracking-wider text-cyan-300 hover:bg-cyan-400/10 disabled:opacity-50" style={{ borderColor: "rgba(0,97,148,0.4)" }}><Satellite size={10} /> {busy === "auto" ? "Searching STAC…" : state === "NO_SCENE_SELECTED" ? "Find nearest Sentinel-1 scene" : "Retry search"}</button>}
        <button data-testid="btn-view-scenes" disabled={!!busy} onClick={view} className="rounded border px-2 py-0.5 uppercase tracking-wider text-slate-300 hover:text-on-surface disabled:opacity-50" style={{ borderColor: "var(--border-highlight)" }}>{busy === "list" ? "Searching…" : s.scene_id ? "Change scene" : "View available scenes"}</button>
        {!s.scene_id && !skipSar && <button data-testid="btn-continue-without-sar" onClick={() => setSkipSar(true)} className="rounded border px-2 py-0.5 uppercase tracking-wider text-slate-400 hover:text-on-surface" style={{ borderColor: "var(--border-default)" }}>Continue without SAR</button>}
        {skipSar && <span className="text-amber-300" data-testid="without-sar-note">Continuing with AIS + jurisdiction only · SAR confirmation pending · re-check satellite later</span>}
      </div>
      {cands && (
        <div className="rounded border p-2" style={{ borderColor: "var(--border-highlight)" }} data-testid="scene-candidates">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-slate-300"><b className="text-slate-100">AVAILABLE SENTINEL-1 SCENES</b> · PRIMARY: Sentinel-1 SAR · {cands.found ? `${cands.candidates.length} in ±${cands.search_window_hours} h` : cands.reason}</div>
          {cands.candidates.map((c) => (
            <div key={c.scene_id} className="flex flex-wrap items-center gap-2 border-t py-1" style={{ borderColor: "var(--border-default)" }} data-testid={`scene-candidate-${c.scene_id}`}>
              <span className="text-cyan-300">{c.scene_id}</span><span className="text-slate-400">{fmtTime(c.acquisition_time)}</span><span>{c.signed_offset_hours > 0 ? "+" : "−"}{fmtDiff(c.time_difference_hours)}</span>
              <span>overlap {c.overlap_percent != null ? `${c.overlap_percent}%` : "—"}</span><span>{(c.polarization || []).join("+") || "—"}</span><span className="text-slate-500">{c.platform} · score {c.score}</span>
              {c.scene_id === s.provider_scene_id ? <span className="ml-auto text-emerald-300">attached</span> : <button data-testid={`btn-use-scene-${c.scene_id}`} disabled={!!busy} onClick={() => attach(c.scene_id)} className="ml-auto rounded bg-cyan-400 px-1.5 py-0.5 font-semibold uppercase text-slate-950 disabled:opacity-50">{busy === c.scene_id ? "…" : "Use scene"}</button>}
            </div>))}
          {cands.supplementary && <div className="mt-1 text-slate-500" data-testid="scene-supplementary">SUPPLEMENTARY: {cands.supplementary.role} · {cands.supplementary.error || `${cands.supplementary.count} Sentinel-2 scene(s) within ±72 h`}{cands.supplementary.scenes?.slice(0, 2).map((x) => ` · ${x.stac_id} (cloud ${x.cloud_cover ?? "?"}%)`)}</div>}
        </div>
      )}
    </div>
  );
};

export const DarkVessels = ({ caseId, onScan, sceneStatus, acquisitionTime, onAttached }) => {
  const [scan, setScan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [radius, setRadius] = useState(40);
  const load = useCallback(() => api.get(`/cases/${caseId}/dark-vessels`).then((r) => { setScan(r.data); onScan?.(r.data); }).catch((e) => setError(apiError(e))), [caseId, onScan]);
  useEffect(() => { load(); }, [load]);
  const run = async () => {
    setBusy(true); setError(null);
    try { const { data } = await api.post(`/cases/${caseId}/dark-vessels/scan`, null, { params: { radius_km: radius } }); setScan(data); onScan?.(data); toast.success(`${data.dark_count} dark-vessel candidate(s) among ${data.targets.length} bright targets`); onAttached?.(); }
    catch (e) { setError(apiError(e)); onAttached?.(); } finally { setBusy(false); }
  };
  const dark = scan?.targets?.filter((t) => t.dark_candidate) || [];
  const noAis = scan?.ais_fixes_checked === 0;
  return (
    <div className="mx-4 my-3 rounded border p-3" style={{ borderColor: "rgba(186,26,26,0.45)", background: "rgba(186,26,26,0.04)" }} data-testid="dark-vessels-panel">
      <div className="flex flex-wrap items-center gap-2">
        <Radar size={13} color="#ba1a1a" /><span className="font-display text-sm font-semibold">Dark vessel scan</span>
        <span className="rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-300" style={{ border: "1px solid currentColor" }}>experimental · CFAR</span>
        <span className="ml-auto flex items-center gap-2 font-mono text-[11px]">
          <label className="text-slate-400">radius <input data-testid="dark-scan-radius" type="number" min={5} max={150} value={radius} onChange={(e) => setRadius(+e.target.value)} className="w-14 rounded border bg-slate-900/60 px-1 py-0.5 text-slate-100" style={{ borderColor: "var(--border-highlight)" }} /> km</label>
          <button data-testid="btn-dark-scan" disabled={busy} onClick={run} className="inline-flex items-center gap-1 rounded bg-rose-500 px-2.5 py-1 font-semibold uppercase tracking-wider text-slate-950 disabled:opacity-50"><ScanSearch size={11} /> {busy ? "Scanning…" : "Scan SAR for ships"}</button>
        </span>
      </div>
      <SceneStatus s={sceneStatus} caseId={caseId} acquisitionTime={acquisitionTime} onAttached={onAttached} />
      {error && <p className="mt-2 text-[11px] text-rose-300" data-testid="dark-scan-error">{error}</p>}
      {scan?.status === "not_scanned" && !error && <p className="mt-2 text-[11px] text-slate-500" data-testid="dark-not-scanned">Not scanned yet. {sceneStatus?.state === "SAR_READY" ? "Real SAR asset ready — run the scan." : "Attach a Sentinel-1 scene with a SAR asset first."}</p>}
      {scan?.targets && scan.status !== "not_scanned" && (
        <>
          <p className="mt-2 text-[11px] text-slate-400" data-testid="dark-summary">{scan.bright_targets_total} bright targets in {scan.analysis_input?.kind === "sar_aoi_window" ? `real SAR AOI window (${scan.analysis_input.asset})` : "scene quicklook"} · {scan.targets.length} within {scan.radius_km} km · <span className="text-rose-300">{scan.dark_count} without AIS ≤ {scan.dark_radius_km} km (±{scan.time_window_min} min, {scan.ais_fixes_checked} fixes checked)</span> · {fmtTime(scan.created_at)}</p>
          {noAis && <p className="mt-1 text-[10px] text-amber-300" data-testid="dark-no-ais-warning">No AIS fixes exist for this time window — every bright target is unmatched by construction. Connect live AIS or ingest historical AIS before treating any target as "dark".</p>}
          <p className="mt-1 text-[10px] text-amber-300/80">{scan.disclaimer}</p>
          {dark.length > 0 && (
            <table className="mt-2 w-full text-[11px]" data-testid="dark-vessels-table">
              <thead><tr className="label-mono text-left">{["#", "Position", "SNR", "≈ length", "Dist. to slick", "Nearest AIS", "Escape cue"].map((h) => <th key={h} className="px-2 py-1 font-normal">{h}</th>)}</tr></thead>
              <tbody>{dark.map((t, i) => (
                <tr key={t.id} data-testid={`dark-vessel-${t.id}`} className="border-t" style={{ borderColor: "var(--border-default)" }}>
                  <td className="px-2 py-1 font-mono text-rose-300">D{i + 1}</td>
                  <td className="px-2 py-1 font-mono text-slate-200">{t.lat.toFixed(4)}, {t.lon.toFixed(4)}</td>
                  <td className="px-2 py-1 font-mono">{t.snr}σ</td>
                  <td className="px-2 py-1 font-mono">{t.est_length_m} m</td>
                  <td className="px-2 py-1 font-mono">{t.distance_to_spill_km} km</td>
                  <td className="px-2 py-1 font-mono text-slate-400">{t.nearest_ais_km != null ? `${t.nearest_ais_km} km` : "none in window"}</td>
                  <td className="px-2 py-1 font-mono text-slate-400">{t.escape_heading_deg}° @ {t.assumed_speed_kn} kn</td>
                </tr>))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
};

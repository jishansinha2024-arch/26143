import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Satellite, Waves, Radio, Scan } from "lucide-react";
import { api, fmtTime, pollJob } from "@/lib/api";

import { CsvUpload } from "@/components/ingest/CsvUpload";
import { LiveAis } from "@/components/ingest/LiveAis";

const inputCls = "w-full rounded border bg-slate-900/60 px-2.5 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/60";
const bd = { borderColor: "var(--border-highlight)" };
const Field = ({ label, children }) => <label className="block"><span className="label-mono mb-1 block">{label}</span>{children}</label>;
const Btn = ({ children, ...p }) => <button {...p} className="rounded bg-cyan-400 px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-950 hover:bg-cyan-300 disabled:opacity-50">{children}</button>;
const Card = ({ icon: Icon, title, sub, children, testId }) => (
  <div className="panel p-5 fade-up" data-testid={testId}>
    <div className="mb-4 flex items-center gap-2"><Icon size={16} color="#006194" /><h2 className="font-display text-lg font-semibold">{title}</h2></div>
    <p className="mb-4 -mt-3 text-xs text-slate-400">{sub}</p>
    {children}
  </div>
);
const err = (e) => { const d = e.response?.data?.detail; toast.error(typeof d === "string" ? d : d?.[0]?.msg || e.message); };

const SAMPLE_FOOTPRINT = JSON.stringify({ type: "Polygon", coordinates: [[[71.8, 18.4], [73.2, 18.4], [73.2, 19.6], [71.8, 19.6], [71.8, 18.4]]] });
const SAMPLE_SPILL = JSON.stringify({ type: "Polygon", coordinates: [[[72.40, 18.90], [72.47, 18.93], [72.48, 18.92], [72.41, 18.89], [72.40, 18.90]]] });
const SAMPLE_AIS = JSON.stringify({ positions: [
  { mmsi: "419001234", vessel_name: "EXAMPLE TANKER", imo: "9123456", vessel_type: "tanker", timestamp: "2026-06-10T02:00:00Z", lat: 18.88, lon: 72.38, sog_kn: 11, cog_deg: 70 },
  { mmsi: "419001234", vessel_name: "EXAMPLE TANKER", imo: "9123456", vessel_type: "tanker", timestamp: "2026-06-10T02:20:00Z", lat: 18.90, lon: 72.44, sog_kn: 11, cog_deg: 70 },
  { mmsi: "419001234", vessel_name: "EXAMPLE TANKER", imo: "9123456", vessel_type: "tanker", timestamp: "2026-06-10T02:20:00Z", lat: 18.90, lon: 72.44, sog_kn: 11, cog_deg: 70 },
  { mmsi: "12345", vessel_name: null, timestamp: "2026-06-10T02:30:00", lat: 18.91, lon: 72.48, sog_kn: 75, cog_deg: 70 } ] }, null, 1);

export default function Ingest() {
  const [scenes, setScenes] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [ais, setAis] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const nav = useNavigate();
  const load = () => Promise.all([api.get("/scenes"), api.get("/ais/vessels")]).then(([s, v]) => {
    setScenes(Array.isArray(s.data) ? s.data : []);
    const d = v.data || {};
    setVessels(Array.isArray(d.indexed) ? d.indexed : []);
    setAis(d);
    setLoadErr(null);
  }).catch((e) => { setLoadErr(e.response?.data?.detail || e.message); throw e; });
  useEffect(() => { load().catch(err); const t = setInterval(() => load().catch(() => {}), 20000); return () => clearInterval(t); }, []);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-6">
        <p className="label-mono mb-1">Provider-neutral ingestion contracts</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Ingestion</h1>
      </div>
      <div className="mb-4"><LiveAis onChanged={load} /></div>
      {ais?.vessels?.length > 0 && (
        <div className="panel mb-4 overflow-hidden" data-testid="live-vessels-list">
          <div className="border-b px-4 py-3 font-display font-semibold" style={{ borderColor: "var(--border-default)" }}>Live vessels · AISStream · {ais.count} active (stale after {ais.stale_after_min} min)</div>
          <table className="w-full text-xs">
            <thead><tr className="label-mono text-left">{["MMSI", "Name", "Lat", "Lon", "SOG kn", "COG°", "Hdg°", "Source time", "Received"].map((h) => <th key={h} className="px-4 py-2 font-normal">{h}</th>)}</tr></thead>
            <tbody>{ais.vessels.slice(0, 50).map((v) => (
              <tr key={v.mmsi} data-testid={`live-vessel-row-${v.mmsi}`} className="border-t" style={{ borderColor: "var(--border-default)" }}>
                <td className="px-4 py-2 font-mono text-emerald-300"><button data-testid={`live-vessel-link-${v.mmsi}`} onClick={() => nav(`/vessels/${v.mmsi}`)} className="hover:underline">{v.mmsi}</button></td>
                <td className="px-4 py-2">{v.ship_name || <span className="text-slate-500">unknown</span>}</td>
                <td className="px-4 py-2 font-mono">{v.lat.toFixed(4)}</td><td className="px-4 py-2 font-mono">{v.lon.toFixed(4)}</td>
                <td className="px-4 py-2 font-mono">{v.sog ?? "—"}</td><td className="px-4 py-2 font-mono">{v.cog ?? "—"}</td><td className="px-4 py-2 font-mono">{v.heading ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-slate-400">{fmtTime(v.timestamp)}</td><td className="px-4 py-2 font-mono text-slate-400">{fmtTime(v.received_at)}</td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-3">
        <SceneForm onDone={load} />
        <SpillForm scenes={scenes} onDone={(caseId) => { load(); if (caseId) nav(`/cases/${caseId}`); }} />
        <AisForm onDone={load} />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <div className="panel overflow-hidden" data-testid="scenes-list">
          <div className="border-b px-4 py-3 font-display font-semibold" style={{ borderColor: "var(--border-default)" }}>Registered scenes</div>
          <table className="w-full text-xs">
            <thead><tr className="label-mono text-left">{["Provider", "Scene ID", "Acquired", "Status", ""].map((h) => <th key={h} className="px-4 py-2 font-normal">{h}</th>)}</tr></thead>
            <tbody>{scenes.map((s) => <SceneRow key={s.id} s={s} onDone={load} />)}</tbody>
          </table>
        </div>
        <div className="panel overflow-hidden" data-testid="vessels-list">
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border-default)" }}>
            <span className="font-display font-semibold">AIS vessels indexed ({vessels.length})</span>
            {ais && <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400" data-testid="vessels-live-state">{ais.source} · {ais.state} · live active {ais.count}</span>}
          </div>
          {loadErr ? <p className="px-4 py-4 text-xs text-rose-300" data-testid="vessels-error">Vessel index unavailable: {String(loadErr)}</p> : (
          <table className="w-full text-xs">
            <thead><tr className="label-mono text-left">{["MMSI", "Name", "Type", "Fixes", "Last seen", "Source"].map((h) => <th key={h} className="px-4 py-2 font-normal">{h}</th>)}</tr></thead>
            <tbody>{vessels.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-4 text-slate-500" data-testid="vessels-empty">{ais?.state === "NOT_CONFIGURED" ? "No AIS positions stored. Live AIS is not configured (AISSTREAM_API_KEY missing) — upload CSV/JSON or configure the key." : "No AIS positions stored yet."}</td></tr>
            ) : vessels.map((v) => (
              <tr key={v.mmsi} data-testid={`vessel-row-${v.mmsi}`} className="border-t" style={{ borderColor: "var(--border-default)" }}>
                <td className="px-4 py-2 font-mono text-cyan-300"><button data-testid={`vessel-link-${v.mmsi}`} onClick={() => nav(`/vessels/${v.mmsi}`)} className="hover:underline">{v.mmsi}</button></td><td className="px-4 py-2">{v.vessel_name || <span className="text-slate-500">unknown</span>}</td>
                <td className="px-4 py-2 text-slate-400">{v.vessel_type || "—"}</td><td className="px-4 py-2 font-mono">{v.fixes}</td>
                <td className="px-4 py-2 font-mono text-slate-400">{fmtTime(v.last_seen)}</td>
                <td className="px-4 py-2 font-mono text-[10px]"><span className={(v.sources || []).includes("AISStream") ? "text-emerald-300" : "text-slate-400"}>{(v.sources || []).join(", ") || "—"}</span>{(v.quality_flags || []).length > 0 && <span className="ml-1 text-amber-300">{v.quality_flags.join(", ")}</span>}</td>
              </tr>))}</tbody>
          </table>)}
        </div>
      </div>
    </div>
  );
}

const SceneRow = ({ s, onDone }) => {
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const real = !!s.metadata?.stac_collection;
  const detect = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/scenes/${s.id}/detect`);
      if (!data.case) { toast.info(`Detector found no dark spots in ${s.provider_scene_id}`); onDone(); return; }
      toast.success(`${real ? "Dark-spot detector" : "Mock detector"} produced ${data.case.case_number}; correlation queued`);
      if (data.job) await pollJob(data.job.id);
      onDone(); nav(`/cases/${data.case.id}`);
    } catch (e) { err(e); } finally { setBusy(false); }
  };
  return (
    <tr data-testid={`scene-row-${s.provider_scene_id}`} className="border-t" style={{ borderColor: "var(--border-default)" }}>
      <td className="px-4 py-2 text-slate-300">{s.provider}{real && <span className="ml-1 rounded px-1 font-mono text-[9px] uppercase text-emerald-300" style={{ border: "1px solid rgba(0,106,97,0.5)" }}>real</span>}</td><td className="px-4 py-2 font-mono text-[10px] text-cyan-300">{s.provider_scene_id}</td>
      <td className="px-4 py-2 font-mono text-slate-400">{fmtTime(s.acquisition_time)}</td><td className="px-4 py-2 font-mono text-[10px] uppercase text-slate-400">{s.status}</td>
      <td className="px-4 py-2 text-right"><button data-testid={`btn-mock-detect-${s.provider_scene_id}`} disabled={busy} onClick={detect} title={real ? "Experimental dark-spot detector on the real SAR asset" : "No SAR asset — mock placeholder (DEMO mode only)"} className="inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-purple-300 hover:bg-purple-400/10 disabled:opacity-50" style={{ borderColor: "rgba(111,79,168,0.5)" }}><Scan size={11} /> {busy ? "Detecting…" : real ? "Detect (SAR)" : "Mock detect"}</button></td>
    </tr>
  );
};

const SceneForm = ({ onDone }) => {
  const [f, setF] = useState({ provider: "sentinel-1", provider_scene_id: `S1A_IW_GRDH_${Date.now().toString().slice(-6)}`, sensor_mode: "IW", polarization: "VV+VH", acquisition_time: "2026-06-12T06:15:00Z", storage_ref: "s3://sentinelmar/scenes/new.tiff", footprint: SAMPLE_FOOTPRINT });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try { await api.post("/scenes", { ...f, footprint: JSON.parse(f.footprint) }); toast.success("Scene registered"); onDone(); setF({ ...f, provider_scene_id: `S1A_IW_GRDH_${Date.now().toString().slice(-6)}` }); }
    catch (e) { err(e); } finally { setBusy(false); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Card icon={Satellite} title="Register scene" sub="Satellite scene metadata / object-storage reference. Provider adapter: Sentinel-1 SAR first." testId="scene-form">
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Provider"><input data-testid="input-scene-provider" className={inputCls} style={bd} value={f.provider} onChange={set("provider")} /></Field>
          <Field label="Provider scene ID"><input data-testid="input-scene-id" className={inputCls} style={bd} value={f.provider_scene_id} onChange={set("provider_scene_id")} /></Field>
          <Field label="Sensor mode"><input data-testid="input-scene-mode" className={inputCls} style={bd} value={f.sensor_mode} onChange={set("sensor_mode")} /></Field>
          <Field label="Polarization"><input data-testid="input-scene-pol" className={inputCls} style={bd} value={f.polarization} onChange={set("polarization")} /></Field>
        </div>
        <Field label="Acquisition time (UTC ISO)"><input data-testid="input-scene-time" className={inputCls} style={bd} value={f.acquisition_time} onChange={set("acquisition_time")} /></Field>
        <Field label="Storage reference"><input data-testid="input-scene-storage" className={inputCls} style={bd} value={f.storage_ref} onChange={set("storage_ref")} /></Field>
        <Field label="Footprint GeoJSON"><textarea data-testid="input-scene-footprint" rows={3} className={inputCls} style={bd} value={f.footprint} onChange={set("footprint")} /></Field>
        <Btn data-testid="btn-register-scene" disabled={busy} onClick={submit}>{busy ? "Saving…" : "Register scene"}</Btn>
      </div>
    </Card>
  );
};

const SpillForm = ({ scenes, onDone }) => {
  const [f, setF] = useState({ scene_id: "", geometry: SAMPLE_SPILL, acquisition_time: "2026-06-10T05:30:00Z", source: "external", detection_confidence: 0.75, quality_flags: "", processing_version: "external-polygon-1.0", estimated_age_hours: "", wind_speed: "", wind_dir: "", cur_speed: "", cur_dir: "", correlate: true });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const submit = async () => {
    setBusy(true);
    try {
      const body = { scene_id: f.scene_id || null, geometry: JSON.parse(f.geometry), acquisition_time: f.acquisition_time, source: f.source, detection_confidence: +f.detection_confidence,
        quality_flags: f.quality_flags.split(",").map((s) => s.trim()).filter(Boolean), processing_version: f.processing_version, estimated_age_hours: f.estimated_age_hours === "" ? null : +f.estimated_age_hours,
        wind: f.wind_speed !== "" ? { speed_ms: +f.wind_speed, direction_deg: +f.wind_dir } : null, current: f.cur_speed !== "" ? { speed_ms: +f.cur_speed, direction_deg: +f.cur_dir } : null };
      const { data } = await api.post(`/spill-observations?correlate=${f.correlate}`, body);
      toast.success(`Spill observation created → ${data.case.case_number}`);
      if (data.job) await pollJob(data.job.id);
      onDone(data.case.id);
    } catch (e) { err(e); } finally { setBusy(false); }
  };
  return (
    <Card icon={Waves} title="Spill observation" sub="Validated polygon + detection metadata. Opens an investigation case; optionally queues correlation." testId="spill-form">
      <div className="space-y-2.5">
        <Field label="Scene (optional)">
          <select data-testid="input-spill-scene" className={inputCls} style={bd} value={f.scene_id} onChange={set("scene_id")}><option value="">— none (external polygon) —</option>{scenes.map((s) => <option key={s.id} value={s.id}>{s.provider_scene_id}</option>)}</select>
        </Field>
        <Field label="Geometry GeoJSON (Polygon, [lon, lat])"><textarea data-testid="input-spill-geojson" rows={3} className={inputCls} style={bd} value={f.geometry} onChange={set("geometry")} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Acquisition (UTC)"><input data-testid="input-spill-time" className={inputCls} style={bd} value={f.acquisition_time} onChange={set("acquisition_time")} /></Field>
          <Field label="Detection confidence 0–1"><input data-testid="input-spill-confidence" className={inputCls} style={bd} value={f.detection_confidence} onChange={set("detection_confidence")} /></Field>
          <Field label="Source"><input data-testid="input-spill-source" className={inputCls} style={bd} value={f.source} onChange={set("source")} /></Field>
          <Field label="Est. age (h)"><input data-testid="input-spill-age" className={inputCls} style={bd} value={f.estimated_age_hours} onChange={set("estimated_age_hours")} placeholder="unknown" /></Field>
        </div>
        <Field label="Quality flags (comma: low_wind, sunglint, natural_seep_suspect, cloud_contaminated, conflicting_source, uncertain_age)"><input data-testid="input-spill-flags" className={inputCls} style={bd} value={f.quality_flags} onChange={set("quality_flags")} /></Field>
        <div className="grid grid-cols-4 gap-2">
          <Field label="Wind m/s"><input data-testid="input-spill-wind-speed" className={inputCls} style={bd} value={f.wind_speed} onChange={set("wind_speed")} /></Field>
          <Field label="Wind FROM°"><input data-testid="input-spill-wind-dir" className={inputCls} style={bd} value={f.wind_dir} onChange={set("wind_dir")} /></Field>
          <Field label="Current m/s"><input data-testid="input-spill-cur-speed" className={inputCls} style={bd} value={f.cur_speed} onChange={set("cur_speed")} /></Field>
          <Field label="Current TO°"><input data-testid="input-spill-cur-dir" className={inputCls} style={bd} value={f.cur_dir} onChange={set("cur_dir")} /></Field>
        </div>
        <div className="flex items-center gap-3">
          <Btn data-testid="btn-create-spill" disabled={busy} onClick={submit}>{busy ? "Processing…" : "Create observation"}</Btn>
          <label className="flex items-center gap-1.5 text-xs text-slate-300"><input type="checkbox" data-testid="input-spill-correlate" checked={f.correlate} onChange={set("correlate")} /> run correlation</label>
        </div>
      </div>
    </Card>
  );
};

const AisForm = ({ onDone }) => {
  const [mode, setMode] = useState("csv");
  const [txt, setTxt] = useState(SAMPLE_AIS);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try { const { data } = await api.post("/ais/positions", JSON.parse(txt)); setRes(data); toast.success(`AIS batch: ${data.inserted} inserted, ${data.duplicates} duplicates`); onDone(); }
    catch (e) { err(e); } finally { setBusy(false); }
  };
  return (
    <Card icon={Radio} title="AIS batch ingest" sub="Deduplicated by MMSI/time/position. Quality checks flag naive timestamps, implausible speed, invalid MMSI, missing identity." testId="ais-form">
      <div className="mb-3 flex gap-1">
        {[["csv", "CSV upload"], ["json", "JSON payload"]].map(([m, l]) => (
          <button key={m} data-testid={`ais-mode-${m}`} onClick={() => setMode(m)} className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${mode === m ? "bg-cyan-400/15 text-cyan-300 border border-cyan-400/40" : "text-slate-400 border border-slate-700 hover:text-on-surface"}`}>{l}</button>
        ))}
      </div>
      {mode === "csv" ? <CsvUpload onDone={onDone} /> : (
        <>
          <Field label="JSON payload {positions: [...]}"><textarea data-testid="input-ais-json" rows={14} className={inputCls} style={bd} value={txt} onChange={(e) => setTxt(e.target.value)} /></Field>
          <div className="mt-2.5 flex items-center gap-3">
            <Btn data-testid="btn-ingest-ais" disabled={busy} onClick={submit}>{busy ? "Ingesting…" : "Ingest batch"}</Btn>
            {res && <span className="font-mono text-[11px] text-slate-300" data-testid="ais-ingest-result">received {res.received} · inserted <span className="text-emerald-300">{res.inserted}</span> · dup <span className="text-amber-300">{res.duplicates}</span> · flagged {res.flagged} · rejected {res.rejected.length}</span>}
          </div>
        </>
      )}
    </Card>
  );
};

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip } from "react-leaflet";
import { toast } from "sonner";
import { ArrowLeft, Scale, Leaf, Play, Pause, ExternalLink, Satellite } from "lucide-react";
import { api, apiError, fmtTime } from "@/lib/api";
import { OSM_URL, TILE_PERF } from "@/components/map/tiles";
import { GibsLayer } from "@/components/map/GibsLayer";

const GIBS_LAYER = { id: "MODIS_Terra_CorrectedReflectance_TrueColor", matrix: "GoogleMapsCompatible_Level9", ext: "jpg" };
const GIBS_TEMPLATE = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{layer}/default/{time}/{matrix}/{z}/{y}/{x}.{ext}";
const FOOT_STYLE = { color: "#ba1a1a", weight: 1.5, fillColor: "#ba1a1a", fillOpacity: 0.35 };
const ORIGIN_STYLE = { color: "#191c1e", fillColor: "#ba1a1a", fillOpacity: 1 };
const ellipse = (lat, lon, rKm, elong, bearing = 60) => {
  const pts = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * 2 * Math.PI, x = rKm * Math.sqrt(elong) * Math.cos(a), y = (rKm / Math.sqrt(elong)) * Math.sin(a), b = (bearing * Math.PI) / 180;
    const dx = x * Math.cos(b) - y * Math.sin(b), dy = x * Math.sin(b) + y * Math.cos(b);
    pts.push([lat + dy / 110.574, lon + dx / (111.32 * Math.cos((lat * Math.PI) / 180))]);
  }
  return pts;
};

export default function EvidenceVault() {
  const { id } = useParams();
  const [v, setV] = useState(null);
  const [day, setDay] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [optical, setOptical] = useState("none");
  useEffect(() => { api.get(`/archive/${id}/vault`).then((r) => setV(r.data)).catch((e) => toast.error(apiError(e))); }, [id]);
  useEffect(() => {
    if (!playing || !v) return undefined;
    const t = setInterval(() => setDay((d) => (d >= v.frames.length ? 1 : d + 1)), 350);
    return () => clearInterval(t);
  }, [playing, v]);
  const frame = useMemo(() => v?.frames?.[day - 1], [v, day]);
  const poly = useMemo(() => (v && frame ? ellipse(v.entry.lat, v.entry.lon, frame.radius_km, frame.elongation) : null), [v, frame]);
  if (!v) return <p className="p-6 font-mono text-xs text-slate-500">Opening evidence vault…</p>;
  const e = v.entry, ev = v.evidence;
  const gibsDate = optical === "before" ? new Date(new Date(e.date).getTime() - 7 * 864e5) : optical === "after" ? new Date(new Date(e.date).getTime() + 5 * 864e5) : null;
  return (
    <div className="flex h-full flex-col overflow-hidden" data-testid="evidence-vault">
      <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3" style={{ borderColor: "var(--border-default)" }}>
        <Link to="/archive" data-testid="vault-back" className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-slate-400 hover:text-on-surface"><ArrowLeft size={12} /> Archive</Link>
        <div><p className="label-mono">Evidence vault · case file</p><h1 className="font-display text-2xl font-extrabold tracking-tight">{e.name}</h1></div>
        <span className="ml-auto font-mono text-[11px] text-slate-400">{fmtTime(e.date).slice(0, 10)} · {e.country} · {e.volume_tonnes?.toLocaleString()} t {e.oil_type}</span>
      </div>
      <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[1fr_420px]">
        <div className="relative flex flex-col">
          <div className="flex-1" data-testid="vault-map">
            <MapContainer center={[e.lat, e.lon]} zoom={7} className="h-full w-full">
              <TileLayer url={OSM_URL} className="dark-tiles" {...TILE_PERF} />
              {gibsDate && <GibsLayer layer={GIBS_LAYER} date={gibsDate.toISOString().slice(0, 10)} template={GIBS_TEMPLATE} />}
              {poly && <Polygon positions={poly} pathOptions={FOOT_STYLE}><Tooltip sticky>Day {frame.day} · ≈{frame.area_km2} km² (reconstructed)</Tooltip></Polygon>}
              <CircleMarker center={[e.lat, e.lon]} radius={5} pathOptions={ORIGIN_STYLE}><Tooltip permanent direction="top">{e.vessel_facility}</Tooltip></CircleMarker>
            </MapContainer>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t px-4 py-2" style={{ borderColor: "var(--border-default)", background: "var(--bg-secondary)" }} data-testid="vault-timeline">
            <button data-testid="vault-play" onClick={() => setPlaying(!playing)} className="rounded border p-1.5 text-slate-200" style={{ borderColor: "var(--border-highlight)" }}>{playing ? <Pause size={12} /> : <Play size={12} />}</button>
            <input data-testid="vault-day-slider" type="range" min={1} max={v.frames.length} value={day} onChange={(e2) => { setPlaying(false); setDay(+e2.target.value); }} className="flex-1 accent-rose-400" />
            <span className="font-mono text-[11px] text-slate-300" data-testid="vault-day-label">Day {day}/{v.frames.length} · {fmtTime(frame.date).slice(0, 10)} · ≈{frame.area_km2} km²</span>
            <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400"><Satellite size={10} /> optical
              {["none", "before", "after"].map((k) => <button key={k} data-testid={`vault-optical-${k}`} onClick={() => setOptical(k)} className={`rounded px-1.5 py-0.5 uppercase ${optical === k ? "bg-cyan-400 text-slate-950" : "text-slate-400 hover:text-on-surface"}`}>{k}</button>)}
            </span>
          </div>
          <p className="px-4 py-1.5 text-[10px] text-amber-300/80" data-testid="vault-reconstructed-note">{v.note}</p>
        </div>
        <aside className="overflow-y-auto border-l p-4 text-xs" style={{ borderColor: "var(--border-default)", background: "var(--bg-secondary)" }} data-testid="vault-evidence-panel">
          <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-semibold"><Scale size={13} color="#b26a00" /> Legal evidence</h2>
          {ev ? (
            <dl className="space-y-2">
              {[["Ruling", ev.ruling], ["Penalties", ev.penalties], ["Cleanup cost", ev.cleanup_cost], ["Compensation", ev.compensation]].map(([k, val]) => <div key={k}><dt className="label-mono">{k}</dt><dd className="text-slate-200">{val}</dd></div>)}
            </dl>
          ) : <p className="text-slate-500" data-testid="vault-no-legal">No structured legal record for this entry yet.</p>}
          <h2 className="mb-2 mt-5 flex items-center gap-2 font-display text-sm font-semibold"><Leaf size={13} color="#006a61" /> Ecological evidence</h2>
          <p className="text-slate-200">{ev?.ecological || e.ecosystems?.join(", ")}</p>
          <p className="mt-2 text-slate-400"><span className="text-slate-500">Cause:</span> {e.cause}</p>
          <p className="mt-1 text-slate-400"><span className="text-slate-500">Remediation:</span> {e.remediation?.join("; ")}</p>
          <p className="mt-2 italic text-cyan-200/80">{e.lessons}</p>
          {ev?.sources?.length > 0 && (
            <div className="mt-4" data-testid="vault-sources"><p className="label-mono mb-1">Source documents</p>
              {ev.sources.map((s) => <a key={s.u} href={s.u} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-cyan-300 hover:underline"><ExternalLink size={10} /> {s.t}</a>)}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

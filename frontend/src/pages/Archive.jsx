import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { BookOpen, Plus, List, MapPin } from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { api, apiError, fmtTime, hasRole } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ArchiveLessons from "../components/archive/ArchiveLessons";

const FitBounds = ({ pts }) => {
  const map = useMap();
  useEffect(() => {
    if (pts.length) { try { map.fitBounds(pts.map((p) => [p.lat, p.lon]), { padding: [40, 40], maxZoom: 6 }); } catch { /* ignore */ } }
  }, [pts, map]);
  return null;
};

const ArchiveMap = ({ rows }) => (
  <div className="panel overflow-hidden" style={{ height: "70vh" }} data-testid="archive-map">
    {rows.length === 0 ? (
      <div className="grid h-full place-items-center font-mono text-xs text-slate-500" data-testid="archive-map-empty">No incidents with valid coordinates to plot</div>
    ) : (
      <MapContainer center={[12, 74]} zoom={4} worldCopyJump style={{ height: "100%", width: "100%", background: "#f2f4f6" }}>
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics" />
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />
        {rows.map((r) => (
          <CircleMarker key={r.id} center={[r.lat, r.lon]} radius={7} pathOptions={{ color: "#007bb9", fillColor: "#007bb9", fillOpacity: 0.6, weight: 1.5 }}>
            <Popup>
              <div style={{ minWidth: 190 }}>
                <b>{r.name}</b><br />
                {fmtTime(r.date).slice(0, 10)} · {r.country}<br />
                {r.lat}, {r.lon} · {r.volume_tonnes?.toLocaleString?.() ?? r.volume_tonnes} t · {r.oil_type}<br />
                <Link to={`/archive/${r.id}`} data-testid={`archive-map-open-${r.id}`}>Open case file →</Link>
              </div>
            </Popup>
          </CircleMarker>
        ))}
        <FitBounds pts={rows} />
      </MapContainer>
    )}
  </div>
);

const inputCls = "w-full rounded border bg-slate-900/60 px-2.5 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/60";
const bd = { borderColor: "var(--border-highlight)" };
const empty = { name: "", date: "", lat: "", lon: "", volume_tonnes: "", oil_type: "", cause: "", vessel_facility: "", ecosystems: "", remediation: "", lessons: "", country: "" };

export default function Archive() {
  const { user } = useAuth();
  const [sp, setSp] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [f, setF] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState("list");
  const q = sp.get("q") || "";
  const geo = useMemo(() => rows.filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon)), [rows]);
  const load = useCallback(() => api.get("/archive", { params: { q } }).then((r) => setRows(r.data)).catch((e) => toast.error(apiError(e))), [q]);
  useEffect(() => { load(); }, [load]);
  const create = async () => {
    try {
      await api.post("/archive", { ...f, lat: +f.lat, lon: +f.lon, volume_tonnes: f.volume_tonnes === "" ? null : +f.volume_tonnes, ecosystems: f.ecosystems.split(";").map((s) => s.trim()).filter(Boolean), remediation: f.remediation.split(";").map((s) => s.trim()).filter(Boolean) });
      toast.success("Archive entry added"); setF(empty); setShowForm(false); load();
    } catch (e) { toast.error(apiError(e)); }
  };
  return (
    <div className="h-full overflow-y-auto p-6" data-testid="archive-page">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="mr-auto"><p className="label-mono mb-1">Historical knowledge base · precedent incidents</p><h1 className="font-display text-3xl font-extrabold tracking-tight">Spill archive</h1></div>
        <input data-testid="archive-search" className={`${inputCls} w-80`} style={bd} value={q} onChange={(e) => { const n = new URLSearchParams(sp); e.target.value ? n.set("q", e.target.value) : n.delete("q"); setSp(n); }} placeholder="search name, country, oil type, cause, ecosystem…" />
        <div className="flex overflow-hidden rounded border" style={bd} data-testid="archive-view-toggle">
          <button data-testid="archive-view-list" onClick={() => setView("list")} className={`flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider ${view === "list" ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:bg-slate-800/60"}`}><List size={12} /> List</button>
          <button data-testid="archive-view-map" onClick={() => setView("map")} className={`flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider ${view === "map" ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:bg-slate-800/60"}`}><MapPin size={12} /> Map</button>
        </div>
        {hasRole(user, "supervisor") && <button data-testid="btn-archive-add" onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 rounded bg-cyan-400 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-950"><Plus size={12} /> Add incident</button>}
      </div>
      <ArchiveLessons />
      {showForm && (
        <div className="panel mb-4 grid grid-cols-4 gap-2 p-4" data-testid="archive-form">
          {[["name", "name"], ["date", "date YYYY-MM-DD"], ["country", "country"], ["oil_type", "oil type"], ["lat", "lat"], ["lon", "lon"], ["volume_tonnes", "volume tonnes"], ["vessel_facility", "vessel / facility"]].map(([k, ph]) => <input key={k} data-testid={`archive-${k}`} className={inputCls} style={bd} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={ph} />)}
          {[["cause", "cause"], ["ecosystems", "ecosystems (; separated)"], ["remediation", "remediation (; separated)"], ["lessons", "lessons learned"]].map(([k, ph]) => <input key={k} data-testid={`archive-${k}`} className={`${inputCls} col-span-2`} style={bd} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={ph} />)}
          <button data-testid="archive-submit" onClick={create} disabled={f.name.length < 3 || !f.date || f.lat === "" || f.lon === ""} className="col-span-4 rounded bg-cyan-400 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-950 disabled:opacity-50">Save incident</button>
        </div>
      )}
      {view === "map" ? <ArchiveMap rows={geo} /> : (<>
      <p className="mb-2 font-mono text-[10px] text-slate-500" data-testid="archive-count">{rows.length} incidents{geo.length !== rows.length ? ` · ${geo.length} mapped` : ""}</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="archive-list">
        {rows.map((r) => (
          <article key={r.id} data-testid={`archive-entry-${r.id}`} className="panel p-4 text-xs">
            <div className="flex items-start gap-2"><BookOpen size={13} color="#007bb9" className="mt-0.5 shrink-0" /><h2 className="font-display text-base font-semibold text-slate-100">{r.name}</h2><Link to={`/archive/${r.id}`} data-testid={`archive-open-vault-${r.id}`} className="ml-auto shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cyan-300 hover:bg-cyan-400/10" style={bd}>Open case file</Link></div>
            <div className="mt-1 font-mono text-[10px] text-slate-500">{fmtTime(r.date).slice(0, 10)} · {r.country} · {r.lat}, {r.lon} · {r.volume_tonnes?.toLocaleString()} t · {r.oil_type}</div>
            <p className="mt-2 text-slate-300"><span className="text-slate-500">Cause:</span> {r.cause}</p>
            <p className="text-slate-300"><span className="text-slate-500">Source:</span> {r.vessel_facility}</p>
            <p className="mt-1 text-slate-400"><span className="text-slate-500">Ecosystems:</span> {r.ecosystems.join(", ")}</p>
            <p className="mt-1 text-slate-300"><span className="text-slate-500">Remediation:</span> {r.remediation.join("; ")}</p>
            <p className="mt-2 italic text-cyan-200/80">{r.lessons}</p>
          </article>
        ))}
      </div>
      </>)}
    </div>
  );
}

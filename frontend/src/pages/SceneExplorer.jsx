import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents } from "react-leaflet";
import { toast } from "sonner";
import { Satellite, Search, Scan, Globe2, Image as ImageIcon, MapPin, Flame } from "lucide-react";
import { api, apiError, fmtTime } from "@/lib/api";
import { GibsLayer } from "@/components/map/GibsLayer";
import { DensityLayer } from "@/components/map/DensityLayer";
import { LiveVesselLayer, useLiveVessels } from "@/components/map/LiveVesselLayer";
import { SceneWatches } from "@/components/explorer/SceneWatches";
import { AssetSearch } from "@/components/map/AssetSearch";
import { TILE_PERF, OSM_URL } from "@/components/map/tiles";
import { ZonesLayer } from "@/components/zones/ZonesLayer";
import { AoiPanel } from "@/components/zones/AoiPanel";
import { DrawAoi, DrawHint } from "@/components/zones/DrawAoi";

const inputCls = "w-full rounded border bg-slate-900/60 px-2.5 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/60";
const bd = { borderColor: "var(--border-highlight)" };
const iso = (d) => d.toISOString().slice(0, 10);
const PRESETS = [["North Sea", [2, 51, 8, 56]], ["Gulf of Mexico", [-97, 18, -82, 30]], ["Strait of Malacca", [98, -1, 105, 6]], ["Persian Gulf", [48, 24, 57, 30]], ["Gulf of Guinea", [-5, -2, 10, 7]], ["Mediterranean (W)", [-5, 35, 12, 44]]];

const ViewTracker = ({ onView, onZoom }) => { const map = useMapEvents({ moveend: () => { onView(map.getBounds()); onZoom?.(map.getZoom()); } }); useEffect(() => { onView(map.getBounds()); }, [map, onView]); return null; };
const FlyTo = ({ bbox }) => { const map = useMap(); useEffect(() => { if (bbox) map.fitBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]], { padding: [20, 20] }); }, [bbox, map]); return null; };

const Preview = ({ s }) => {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } }, { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return undefined;
    let u;
    api.get("/satellite/preview", { params: { collection: s.collection, stac_id: s.stac_id }, responseType: "blob", timeout: 120000 }).then((r) => { u = URL.createObjectURL(r.data); setUrl(u); }).catch(() => setFailed(true));
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [visible, s.collection, s.stac_id]);
  if (failed) return <div ref={ref} className="grid h-24 w-32 shrink-0 place-items-center rounded bg-slate-900/60 text-[10px] text-slate-500">no preview</div>;
  return url ? <img src={url} alt={s.stac_id} loading="lazy" className="h-24 w-32 shrink-0 rounded object-cover" data-testid={`scene-preview-${s.stac_id}`} /> : <div ref={ref} className="grid h-24 w-32 shrink-0 place-items-center rounded bg-slate-900/60"><ImageIcon size={16} color="#57606a" className="animate-pulse" /></div>;
};

export default function SceneExplorer() {
  const nav = useNavigate();
  const [meta, setMeta] = useState(null);
  const [collection, setCollection] = useState("sentinel-1-grd");
  const [start, setStart] = useState(iso(new Date(Date.now() - 30 * 86400e3)));
  const [end, setEnd] = useState(iso(new Date()));
  const [maxCloud, setMaxCloud] = useState(40);
  const [view, setView] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [aoi, setAoi] = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [drawn, setDrawn] = useState(null);
  const [showZones, setShowZones] = useState(true);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState(null);
  const [basemap, setBasemap] = useState("");
  const [gibsDate, setGibsDate] = useState(iso(new Date(Date.now() - 86400e3)));
  const [density, setDensity] = useState(null);
  const [densityHours, setDensityHours] = useState(0);
  const { data: liveAis } = useLiveVessels();
  const [zoom, setZoom] = useState(3);
  const [asset, setAsset] = useState(null);

  useEffect(() => {
    if (!densityHours) { setDensity(null); return undefined; }
    let live = true;
    api.get("/ais/density", { params: { hours: densityHours, zoom } }).then((r) => { if (live) setDensity(r.data); }).catch((e) => toast.error(apiError(e)));
    return () => { live = false; };
  }, [densityHours, zoom]);

  useEffect(() => { api.get("/satellite/collections").then((r) => setMeta(r.data)).catch((e) => toast.error(apiError(e))); }, []);
  const bbox = view ? [view.getWest(), view.getSouth(), view.getEast(), view.getNorth()].map((x) => +x.toFixed(3)) : null;

  const search = async () => {
    if (!bbox) return;
    setBusy(true);
    try {
      const { data } = await api.post("/satellite/search", { bbox, start: `${start}T00:00:00Z`, end: `${end}T23:59:59Z`, collection, limit: 30, max_cloud: collection === "sentinel-2-l2a" ? maxCloud : null }, { timeout: 90000 });
      setRes(data); if (!data.count) toast.info("No scenes found for this area and date range");
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  const register = async (s, detect) => {
    try {
      const { data } = await api.post("/satellite/register", { collection: s.collection, stac_id: s.stac_id, detect });
      toast.success(data.already_registered ? "Scene already registered" : detect ? (data.detection?.spots ? `Scene registered · ${data.detection.detector === "mock" ? "mock" : "experimental dark-spot"} detector opened ${data.detection.spots} case(s)` : "Scene registered · detector found no dark spots") : "Scene registered");
      setRes((r) => ({ ...r, scenes: r.scenes.map((x) => (x.stac_id === s.stac_id ? { ...x, registered_scene_id: data.scene.id } : x)) }));
      if (detect && data.case) nav(`/cases/${data.case.id}`);
    } catch (e) { toast.error(apiError(e)); }
  };
  const footprints = useMemo(() => res && { type: "FeatureCollection", features: res.scenes.filter((s) => s.footprint).map((s) => ({ type: "Feature", geometry: s.footprint, properties: { id: s.stac_id } })) }, [res]);

  return (
    <div className="flex h-full overflow-hidden" data-testid="explorer-page">
      <div className="relative flex-1">
        <MapContainer center={[40, 10]} zoom={3} className="h-full w-full" worldCopyJump doubleClickZoom={!drawing}>
          <TileLayer url={OSM_URL} attribution="&copy; OpenStreetMap contributors" className="dark-tiles" {...TILE_PERF} />
          {basemap && meta && <GibsLayer layer={meta.basemaps.find((b) => b.id === basemap)} date={gibsDate} template={meta.gibs_template} />}
          {density && <DensityLayer cells={density.cells} />}
          <LiveVesselLayer vessels={liveAis?.vessels} />
          {asset?.geometry && <GeoJSON key={`asset-${asset.id}`} data={asset.geometry} style={{ color: "#b26a00", weight: 2, dashArray: "8,4", fillColor: "#b26a00", fillOpacity: 0.06 }} onEachFeature={(ft, l) => l.bindTooltip(`${asset.name} · ${asset.type}`, { permanent: true, direction: "top" })} />}
          <ViewTracker onView={setView} onZoom={setZoom} /><FlyTo bbox={flyTo} />
          {showZones && <ZonesLayer types={["eez", "territorial", "contiguous"]} />}
          {aoi?.geometry && <GeoJSON key={`aoi-${aoi.updated_at}`} data={aoi.geometry} style={{ color: "#006194", weight: 2, dashArray: "10,5", fillOpacity: 0.04 }} onEachFeature={(ft, l) => l.bindTooltip(`AOI · ${aoi.name} (${aoi.provenance})`, { sticky: true })} />}
          <DrawAoi active={drawing} onDone={(g) => { setDrawn(g); setDrawing(false); }} onCancel={() => setDrawing(false)} />
          {footprints && <GeoJSON key={res.scenes.map((s) => s.stac_id).join("|") + hover} data={footprints}
            style={(ft) => ({ color: ft.properties.id === hover ? "#b26a00" : "#006194", weight: ft.properties.id === hover ? 2.5 : 1, fillOpacity: ft.properties.id === hover ? 0.2 : 0.05 })}
            onEachFeature={(ft, layer) => layer.bindTooltip(ft.properties.id, { sticky: true })} />}
        </MapContainer>
        <DrawHint active={drawing} />
        <div className="absolute left-3 top-3 z-[1000] flex flex-wrap items-center gap-2">
          <AssetSearch compact onSelect={(h) => { setFlyTo(h.bbox); setAsset(h); }} />
          <button data-testid="explorer-toggle-zones" onClick={() => setShowZones(!showZones)} className="rounded px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider" style={{ background: "rgba(255,255,255,0.85)", border: "1px solid var(--border-highlight)", color: showZones ? "#007bb9" : "#707881" }}>EEZ zones</button>
          {PRESETS.map(([l, b]) => <button key={l} data-testid={`preset-${l.replace(/[^a-z]/gi, "").toLowerCase()}`} onClick={() => setFlyTo(b)} className="rounded px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-200" style={{ background: "rgba(255,255,255,0.85)", border: "1px solid var(--border-highlight)", backdropFilter: "blur(12px)" }}><MapPin size={10} className="mr-1 inline" />{l}</button>)}
        </div>
        <div className="absolute bottom-3 left-3 z-[1000] flex gap-2">
        <div className="rounded p-2.5 text-[11px]" style={{ background: "rgba(255,255,255,0.85)", border: "1px solid var(--border-default)", backdropFilter: "blur(12px)" }} data-testid="gibs-control">
          <div className="mb-1 flex items-center gap-1.5 label-mono"><Globe2 size={11} /> NASA GIBS daily imagery</div>
          <div className="flex items-center gap-2">
            <select data-testid="gibs-layer-select" value={basemap} onChange={(e) => setBasemap(e.target.value)} className="rounded border bg-slate-900/80 px-2 py-1 font-mono text-[10px] text-slate-200 outline-none" style={bd}>
              <option value="">off</option>{meta?.basemaps.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
            <input data-testid="gibs-date-input" type="date" value={gibsDate} max={iso(new Date())} onChange={(e) => setGibsDate(e.target.value)} className="rounded border bg-slate-900/80 px-2 py-1 font-mono text-[10px] text-slate-200 outline-none" style={bd} />
          </div>
        </div>
        <div className="rounded p-2.5 text-[11px]" style={{ background: "rgba(255,255,255,0.85)", border: "1px solid var(--border-default)", backdropFilter: "blur(12px)" }} data-testid="density-control">
          <div className="mb-1 flex items-center gap-1.5 label-mono"><Flame size={11} /> AIS traffic density</div>
          <select data-testid="density-window-select" value={densityHours} onChange={(e) => setDensityHours(+e.target.value)} className="rounded border bg-slate-900/80 px-2 py-1 font-mono text-[10px] text-slate-200 outline-none" style={bd}>
            <option value={0}>off</option><option value={24}>last 24 h</option><option value={168}>last 7 days</option><option value={2160}>last 90 days</option>
          </select>
          {density && <div className="mt-1 font-mono text-[10px] text-slate-400" data-testid="density-summary">{density.cells.length} bins · max {density.max} fixes/bin · {density.resolution_deg}° grid</div>}
          <div className="mt-1 font-mono text-[10px]" data-testid="live-vessels-summary" style={{ color: liveAis?.state === "LIVE" ? "#006a61" : "#707881" }}>● live AIS ({liveAis?.source || "AISStream"}) · {liveAis?.state || "…"} · {liveAis?.count ?? 0} vessel(s) on map</div>
        </div>
        </div>
      </div>
      <aside className="flex w-[480px] shrink-0 flex-col overflow-hidden border-l" style={{ borderColor: "var(--border-default)", background: "var(--bg-secondary)" }}>
        <div className="border-b p-4" style={{ borderColor: "var(--border-default)" }}>
          <p className="label-mono mb-1">Global scene search · Microsoft Planetary Computer STAC (open) · latest available acquisitions, not live</p>
          <h1 className="font-display text-2xl font-bold tracking-tight">Scene Explorer</h1>
          <div className="mt-3"><AoiPanel compact onFlyTo={setFlyTo} onAoiChange={setAoi} drawing={drawing} setDrawing={setDrawing} drawnGeometry={drawn} onDrawnConsumed={() => setDrawn(null)} /></div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="col-span-2 block"><span className="label-mono mb-1 block">Collection</span><select data-testid="explorer-collection-select" className={inputCls} style={bd} value={collection} onChange={(e) => setCollection(e.target.value)}>{meta?.collections.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
            <label className="block"><span className="label-mono mb-1 block">From</span><input data-testid="explorer-start-input" type="date" className={inputCls} style={bd} value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <label className="block"><span className="label-mono mb-1 block">To</span><input data-testid="explorer-end-input" type="date" className={inputCls} style={bd} value={end} onChange={(e) => setEnd(e.target.value)} /></label>
            {collection === "sentinel-2-l2a" && <label className="col-span-2 block"><span className="label-mono mb-1 block">Max cloud cover {maxCloud}%</span><input data-testid="explorer-cloud-input" type="range" min="0" max="100" value={maxCloud} onChange={(e) => setMaxCloud(+e.target.value)} className="w-full" /></label>}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button data-testid="btn-search-scenes" disabled={busy || !bbox} onClick={search} className="inline-flex items-center gap-1.5 rounded bg-cyan-400 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-950 hover:bg-cyan-300 disabled:opacity-50"><Search size={12} /> {busy ? "Searching…" : "Search current map view"}</button>
            <span className="font-mono text-[10px] text-slate-500" data-testid="explorer-bbox">{bbox ? `bbox ${bbox.join(", ")}` : ""}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4" data-testid="explorer-results">
          {!res && <p className="text-xs text-slate-500">Pan/zoom anywhere on Earth (or pick a preset), set dates, then search. Found scenes can be registered as Varuna Netra scenes; "Register + detect" runs the <span className="text-rose-300">⚠ experimental dark-spot detector</span> (Otsu thresholding on the SAR quicklook — low-wind areas and wakes cause false positives; every result is flagged low-confidence for analyst review).</p>}
          {res && <p className="mb-2 font-mono text-[10px] text-slate-400" data-testid="explorer-count">{res.count} scenes{res.matched ? ` of ${res.matched} matched` : ""} · {res.source}</p>}
          <div className="space-y-2">
            {res?.scenes.map((s) => (
              <div key={s.stac_id} data-testid={`scene-result-${s.stac_id}`} onMouseEnter={() => setHover(s.stac_id)} onMouseLeave={() => setHover(null)} className="flex gap-3 rounded border p-2.5 text-xs transition-colors hover:border-amber-400/50" style={{ borderColor: "var(--border-default)" }}>
                <Preview s={s} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5"><Satellite size={11} color="#006194" /><span className="font-display font-semibold">{s.platform?.toUpperCase()}</span><span className="font-mono text-[10px] text-slate-400">{fmtTime(s.datetime)}</span></div>
                  <div className="truncate font-mono text-[10px] text-cyan-300" title={s.stac_id}>{s.stac_id}</div>
                  <div className="mt-0.5 font-mono text-[10px] text-slate-400">{s.instrument_mode || s.product_type}{s.polarizations ? ` · ${s.polarizations.join("+")}` : ""}{s.orbit_state ? ` · ${s.orbit_state}` : ""}{s.cloud_cover != null ? ` · cloud ${Math.round(s.cloud_cover)}%` : ""}</div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {s.registered_scene_id ? <span className="rounded px-1.5 py-0.5 font-mono text-[10px] text-emerald-300" style={{ border: "1px solid rgba(0,106,97,0.4)" }} data-testid={`scene-registered-${s.stac_id}`}>registered</span>
                      : <button data-testid={`btn-register-${s.stac_id}`} onClick={() => register(s, false)} className="rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-200 hover:text-on-surface" style={bd}>Register</button>}
                    <button data-testid={`btn-register-detect-${s.stac_id}`} onClick={() => register(s, true)} className="inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-purple-300 hover:bg-purple-400/10" style={{ borderColor: "rgba(111,79,168,0.5)" }}><Scan size={10} /> Register + detect ⚠</button>
                    <a href={s.stac_href} target="_blank" rel="noreferrer" className="ml-auto font-mono text-[10px] text-slate-500 hover:text-slate-300" data-testid={`stac-link-${s.stac_id}`}>STAC ↗</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <SceneWatches bbox={bbox} collection={collection} />
      </aside>
    </div>
  );
}

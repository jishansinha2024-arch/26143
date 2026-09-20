import { useCallback, useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import { toast } from "sonner";
import { Map as MapIcon, Plus, Trash2, RefreshCw, Globe, Layers } from "lucide-react";
import { api, apiError, hasRole, pollJob } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ZoneRules } from "@/components/zones/ZoneRules";
import { IcgDistricts, icgColor } from "@/components/zones/IcgDistricts";
import { ZonesLayer, TYPE_COLOR, TYPE_LABEL } from "@/components/zones/ZonesLayer";
import { AoiPanel, ProvBadge } from "@/components/zones/AoiPanel";
import { DrawAoi, DrawHint } from "@/components/zones/DrawAoi";
import { TILE_PERF, OSM_URL } from "@/components/map/tiles";

const icgStyle = (ft) => ({ color: icgColor(ft.properties.region_code), weight: 1, dashArray: "3,3", fillColor: icgColor(ft.properties.region_code), fillOpacity: 0.04 });
const icgTip = (ft, layer) => layer.bindTooltip(`ICG ${ft.properties.code} · ${ft.properties.name} (${ft.properties.approximate ? "approximate — India only" : "official"})`, { sticky: true, className: "zone-tip" });
const inputCls = "w-full rounded border bg-slate-900/60 px-2.5 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/60";
const bd = { borderColor: "var(--border-highlight)" };
const SAMPLE = JSON.stringify({ type: "Polygon", coordinates: [[[5.0, 52.0], [6.0, 52.0], [6.0, 52.6], [5.0, 52.6], [5.0, 52.0]]] });
const FlyTo = ({ bbox }) => { const map = useMap(); useEffect(() => { if (bbox) map.fitBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]], { padding: [20, 20] }); }, [bbox, map]); return null; };

export default function Zones() {
  const { user } = useAuth();
  const admin = hasRole(user, "admin");
  const [cat, setCat] = useState(null);
  const [types, setTypes] = useState(["eez", "contiguous", "territorial", "port_state", "custom"]);
  const [selected, setSelected] = useState(null);
  const [layerStats, setLayerStats] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [aoi, setAoi] = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [drawn, setDrawn] = useState(null);
  const [f, setF] = useState({ code: "", name: "", authority: "", country: "", zone_type: "eez", geometry: SAMPLE });
  const [busy, setBusy] = useState(false);
  const [iso, setIso] = useState("ALL");
  const [importLayers, setImportLayers] = useState(["eez"]);
  const [importing, setImporting] = useState(null);
  const [icg, setIcg] = useState(null);
  const [showIcg, setShowIcg] = useState(false);
  const load = useCallback(() => api.get("/jurisdictions?active=true&limit=500").then((r) => setCat(r.data)).catch((e) => toast.error(apiError(e))), []);
  useEffect(() => { load(); }, [load]);
  const loadIcg = useCallback(() => api.get("/icg/districts/geojson").then((r) => setIcg(r.data)).catch(() => setIcg(null)), []);
  useEffect(() => { if (showIcg) loadIcg(); }, [showIcg, loadIcg]);

  const importZones = async () => {
    setImporting("queued…");
    try {
      const list = iso.split(/[,\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
      const { data: job } = await api.post("/jurisdictions/import/marine-regions", { iso3: list, replace_demo: true, layers: importLayers });
      const done = await pollJob(job.id, (j) => setImporting(`${j.status} · ${j.logs[j.logs.length - 1]?.msg || ""}`));
      if (done.status === "succeeded") toast.success(`Imported ${done.result.imported.length} reference boundaries (${done.result.failed.length} failed); ${done.result.cases_resolved} cases re-resolved`);
      else toast.error(`Import failed: ${done.error}`);
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setImporting(null); }
  };
  const create = async () => {
    setBusy(true);
    try { await api.post("/jurisdictions", { ...f, geometry: JSON.parse(f.geometry), country: f.country || null }); toast.success(`Zone ${f.code} created (USER-DEFINED)`); setF({ ...f, code: "", name: "", authority: "" }); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  const toggle = async (z) => { try { await api.put(`/jurisdictions/${z.id}`, { active: !z.active }); setSelected({ ...z, active: !z.active }); load(); } catch (e) { toast.error(apiError(e)); } };
  const remove = async (z) => { if (!window.confirm(`Delete zone ${z.code}?`)) return; try { await api.delete(`/jurisdictions/${z.id}`); toast.success("Zone deleted"); setSelected(null); load(); } catch (e) { toast.error(apiError(e)); } };
  const resolveAll = async () => { try { const { data } = await api.post("/jurisdictions/resolve-all"); toast.success(`Re-resolved ${data.cases} cases: ${Object.entries(data.by_primary).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(", ")}`); } catch (e) { toast.error(apiError(e)); } };
  const pick = async (p) => { try { const { data } = await api.get(`/jurisdictions/${p.id}/geometry?detail=low`); setSelected({ ...p, ...data.properties }); } catch { setSelected(p); } };

  return (
    <div className="flex h-full overflow-hidden" data-testid="zones-page">
      <div className="relative flex-1">
        <MapContainer center={[15, 60]} zoom={3} className="h-full w-full" worldCopyJump doubleClickZoom={!drawing}>
          <TileLayer url={OSM_URL} attribution="&copy; OpenStreetMap contributors" className="dark-tiles" {...TILE_PERF} />
          <ZonesLayer types={types} selected={selected?.code} onPick={pick} onStats={setLayerStats} />
          {aoi?.geometry && <GeoJSON key={`aoi-${aoi.updated_at}`} data={aoi.geometry} style={{ color: "#006194", weight: 2, dashArray: "10,5", fillOpacity: 0.05 }} />}
          {showIcg && icg && <GeoJSON key="icg" data={icg} style={icgStyle} onEachFeature={icgTip} />}
          <DrawAoi active={drawing} onDone={(g) => { setDrawn(g); setDrawing(false); }} onCancel={() => setDrawing(false)} />
          <FlyTo bbox={flyTo} />
        </MapContainer>
        <DrawHint active={drawing} />
        <div className="absolute left-3 top-3 z-[1000] rounded px-3 py-2 text-[11px]" style={{ background: "rgba(255,255,255,0.85)", border: "1px solid var(--border-default)", backdropFilter: "blur(12px)" }} data-testid="zones-legend">
          <div className="mb-1 flex items-center gap-1 label-mono"><Layers size={10} /> layers in view</div>
          {Object.entries(TYPE_COLOR).map(([k, c]) => (
            <label key={k} className="flex items-center gap-2"><input type="checkbox" data-testid={`zone-type-toggle-${k}`} checked={types.includes(k)} onChange={(e) => setTypes(e.target.checked ? [...types, k] : types.filter((t) => t !== k))} /><span className="h-2.5 w-4 border" style={{ borderColor: c, background: `${c}33` }} /> {TYPE_LABEL[k]}</label>))}
          <label className="mt-1.5 flex items-center gap-2 border-t pt-1.5" style={{ borderColor: "var(--border-default)" }}><input data-testid="toggle-icg-layer" type="checkbox" checked={showIcg} onChange={(e) => setShowIcg(e.target.checked)} /> ICG districts (India · approx.)</label>
          <div className="mt-1.5 border-t pt-1.5 font-mono text-[10px] text-slate-400" data-testid="zones-viewport-stats">{layerStats?.error ? "zone layer unavailable" : layerStats ? `${layerStats.count} zone(s) in view · ${layerStats.detail} detail${layerStats.truncated ? " · truncated, zoom in" : ""}` : "loading…"}</div>
        </div>
      </div>
      <aside className="flex w-[480px] shrink-0 flex-col overflow-y-auto border-l p-4" style={{ borderColor: "var(--border-default)", background: "var(--bg-secondary)" }}>
        <p className="label-mono mb-1">Global maritime zones · provenance-labelled · viewport loading</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">Jurisdiction zones</h1>
        <div className="mt-2 flex flex-wrap gap-3 font-mono text-[10px] text-slate-400" data-testid="zones-catalogue-stats">
          {cat ? <>
            <span data-testid="zones-total">{cat.total} zones</span><span data-testid="zones-countries">{cat.countries.length} countries/territories</span>
            {Object.entries(cat.by_type).map(([k, v]) => <span key={k} style={{ color: TYPE_COLOR[k] }}>{v} {k}</span>)}
            {cat.dataset && <span className="w-full text-slate-500" data-testid="zones-dataset">{cat.dataset.name} {cat.dataset.version} · {cat.dataset.license} · imported {cat.dataset.last_import_count} ({cat.dataset.world ? "worldwide" : "selected countries"})</span>}
          </> : "catalogue unavailable"}
        </div>
        <div className="mt-4"><AoiPanel onFlyTo={setFlyTo} onAoiChange={setAoi} drawing={drawing} setDrawing={setDrawing} drawnGeometry={drawn} onDrawnConsumed={() => setDrawn(null)} /></div>
        {selected && (
          <div className="mt-4 rounded border p-3 text-xs" style={{ borderColor: "var(--border-highlight)" }} data-testid={`zone-detail-${selected.code}`}>
            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: TYPE_COLOR[selected.zone_type] }} /><span className="font-mono text-cyan-300">{selected.code}</span><ProvBadge p={selected.provenance} testId="zone-detail-provenance" />
              {admin && <span className="ml-auto flex items-center gap-1"><button data-testid={`zone-toggle-${selected.code}`} onClick={() => toggle(selected)} className="rounded px-1.5 py-0.5 font-mono text-[10px] text-slate-400 hover:text-amber-300">{selected.active === false ? "enable" : "disable"}</button><button data-testid={`zone-delete-${selected.code}`} onClick={() => remove(selected)} className="rounded p-1 text-slate-400 hover:text-rose-400"><Trash2 size={12} /></button></span>}</div>
            <div className="mt-1 text-slate-100">{selected.name}</div>
            <div className="text-slate-400">{TYPE_LABEL[selected.zone_type] || selected.zone_type} · {selected.country_code || selected.country || "—"}{selected.country_name ? ` · ${selected.country_name}` : ""}</div>
            <div className="mt-1 text-slate-400">{selected.authority}{selected.authority_verified === false && <span className="ml-1 text-amber-300">(reference name — verify before contact)</span>}</div>
            <div className="mt-1 font-mono text-[10px] text-slate-500" data-testid="zone-detail-source">{selected.authority_status} · {selected.source}{selected.mrgid ? ` · MRGID ${selected.mrgid}` : ""}{selected.area_km2 ? ` · ${Math.round(selected.area_km2).toLocaleString()} km²` : ""}</div>
            {hasRole(user, "analyst") && <button data-testid="zone-detail-use-aoi" onClick={async () => { try { const { data } = await api.post("/aoi/select", { kind: "zone", zone_id: selected.id }); setAoi(data); setFlyTo(data.bbox); toast.success(`AOI set: ${data.name}`); } catch (e) { toast.error(apiError(e)); } }} className="mt-2 rounded bg-cyan-400 px-2 py-1 font-mono text-[10px] font-semibold uppercase text-slate-950">use this zone as investigation AOI</button>}
          </div>
        )}
        <ZoneRules zones={cat?.zones || []} />
        <IcgDistricts onChanged={loadIcg} />
        {admin && (
          <div className="mt-5 rounded border p-4" style={{ borderColor: "rgba(0,97,148,0.35)", background: "rgba(0,97,148,0.04)" }} data-testid="zone-import-form">
            <div className="mb-2 flex items-center gap-2"><Globe size={14} color="#006194" /><h2 className="font-display font-semibold">Import reference boundaries</h2></div>
            <p className="mb-2 text-[11px] text-slate-400">Marine Regions Maritime Boundaries v12 (CC-BY 4.0) via WFS — validated, repaired, simplified, stored with a 2dsphere index. Use <span className="font-mono text-cyan-300">ALL</span> for the whole world or ISO3 codes.</p>
            <input data-testid="zone-import-iso-input" className={inputCls} style={bd} value={iso} onChange={(e) => setIso(e.target.value)} placeholder="ALL or ISO3 codes, comma separated" />
            <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px]" data-testid="zone-import-layers">
              {[["eez", "EEZ 200 NM"], ["eez_24nm", "Contiguous 24 NM"], ["eez_12nm", "Territorial 12 NM"]].map(([k, l]) => (
                <label key={k} className="flex items-center gap-1 text-slate-300"><input type="checkbox" data-testid={`zone-import-layer-${k}`} checked={importLayers.includes(k)} onChange={(e) => setImportLayers(e.target.checked ? [...importLayers, k] : importLayers.filter((x) => x !== k))} /> {l}</label>))}
              <button data-testid="zone-import-india-preset" onClick={() => { setIso("IND"); setImportLayers(["eez", "eez_24nm", "eez_12nm"]); }} className="rounded border px-2 py-0.5 uppercase tracking-wider text-amber-300" style={{ borderColor: "rgba(178,106,0,0.5)" }}>India · all 3 zones</button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button data-testid="btn-import-eez" disabled={!!importing} onClick={importZones} className="inline-flex items-center gap-1.5 rounded bg-cyan-400 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-950 hover:bg-cyan-300 disabled:opacity-50"><Globe size={12} /> {importing ? "Importing…" : "Import from Marine Regions"}</button>
              {importing && <span className="truncate font-mono text-[10px] text-cyan-300" data-testid="zone-import-status">{importing}</span>}
            </div>
          </div>
        )}
        {admin && (
          <div className="mt-5 rounded border p-4" style={{ borderColor: "var(--border-default)" }} data-testid="zone-create-form">
            <div className="mb-3 flex items-center gap-2"><MapIcon size={14} color="#006194" /><h2 className="font-display font-semibold">Add USER-DEFINED zone</h2></div>
            <div className="grid grid-cols-2 gap-2">
              <input data-testid="zone-code-input" placeholder="code e.g. NOR-PS-OSL" className={inputCls} style={bd} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
              <select data-testid="zone-type-select" className={inputCls} style={bd} value={f.zone_type} onChange={(e) => setF({ ...f, zone_type: e.target.value })}>{Object.keys(TYPE_COLOR).map((t) => <option key={t} value={t}>{t}</option>)}</select>
              <input data-testid="zone-name-input" placeholder="name" className={`${inputCls} col-span-2`} style={bd} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              <input data-testid="zone-authority-input" placeholder="responsible authority" className={inputCls} style={bd} value={f.authority} onChange={(e) => setF({ ...f, authority: e.target.value })} />
              <input data-testid="zone-country-input" placeholder="country ISO3 (optional)" className={inputCls} style={bd} value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} />
              <textarea data-testid="zone-geometry-input" rows={4} className={`${inputCls} col-span-2`} style={bd} value={f.geometry} onChange={(e) => setF({ ...f, geometry: e.target.value })} placeholder="GeoJSON Polygon / MultiPolygon ([lon, lat])" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button data-testid="btn-create-zone" disabled={busy} onClick={create} className="inline-flex items-center gap-1.5 rounded bg-cyan-400 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-950 hover:bg-cyan-300 disabled:opacity-50"><Plus size={12} /> Create zone</button>
              <button data-testid="btn-resolve-all" onClick={resolveAll} className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 hover:text-on-surface" style={bd}><RefreshCw size={12} /> Re-resolve all cases</button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

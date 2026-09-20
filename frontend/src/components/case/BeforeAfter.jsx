import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, ImageOverlay, useMap } from "react-leaflet";
import { toast } from "sonner";
import { api, apiError, fmtTime } from "@/lib/api";
import { TILE_PERF, OSM_URL } from "@/components/map/tiles";

const useBlob = (s) => {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!s) return undefined;
    let u;
    api.get("/satellite/preview", { params: { collection: s.collection, stac_id: s.stac_id }, responseType: "blob", timeout: 120000 }).then((r) => { u = URL.createObjectURL(r.data); setUrl(u); }).catch(() => setUrl("failed"));
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [s]);
  return url;
};

const Sync = ({ id, register }) => { const map = useMap(); useEffect(() => register(id, map), [id, map, register]); return null; };

const Pane = ({ s, label, spill, bbox, id, register }) => {
  const url = useBlob(s);
  const b = s?.bbox;
  return (
    <div className="relative flex-1 min-w-0" data-testid={`before-after-${id}`}>
      <MapContainer center={[(bbox[1] + bbox[3]) / 2, (bbox[0] + bbox[2]) / 2]} zoom={9} className="h-full w-full" zoomControl={false} attributionControl={false}>
        <TileLayer url={OSM_URL} className="dark-tiles" {...TILE_PERF} />
        <Sync id={id} register={register} />
        {s && url && url !== "failed" && b && <ImageOverlay url={url} bounds={[[b[1], b[0]], [b[3], b[2]]]} opacity={0.9} />}
        <GeoJSON data={spill} style={{ color: "#ba1a1a", weight: 2, dashArray: "4,4", fillOpacity: 0.1 }} />
      </MapContainer>
      <div className="absolute left-2 top-2 z-[1000] rounded px-2.5 py-1.5 text-[11px]" style={{ background: "rgba(255,255,255,0.85)", border: "1px solid var(--border-highlight)", backdropFilter: "blur(12px)" }}>
        <span className="label-mono" style={{ color: id === "before" ? "#007bb9" : "#b26a00" }}>{label}</span>
        {s ? <div className="font-mono text-[10px] text-slate-200">{s.platform?.toUpperCase()} · {fmtTime(s.datetime)}{url === "failed" ? " · preview unavailable" : !url ? " · loading…" : ""}</div> : <div className="text-slate-400">no scene found in window</div>}
      </div>
    </div>
  );
};

export const BeforeAfter = ({ caseId }) => {
  const [d, setD] = useState(null);
  const [collection, setCollection] = useState("sentinel-1-grd");
  const [days, setDays] = useState(30);
  const [maps] = useState({});
  useEffect(() => {
    setD(null);
    api.get(`/cases/${caseId}/before-after`, { params: { collection, days }, timeout: 120000 }).then((r) => setD(r.data)).catch((e) => toast.error(apiError(e)));
  }, [caseId, collection, days]);
  const register = (id, map) => {
    maps[id] = map;
    const other = maps[id === "before" ? "after" : "before"];
    if (!other) return;
    let lock = false;
    const link = (a, b) => a.on("move", () => { if (lock) return; lock = true; b.setView(a.getCenter(), a.getZoom(), { animate: false }); lock = false; });
    link(map, other); link(other, map);
  };
  return (
    <div className="flex h-full flex-col" data-testid="before-after-view">
      <div className="flex items-center gap-2 border-b px-3 py-2 text-xs" style={{ borderColor: "var(--border-default)" }}>
        <span className="label-mono">Before / after · nearest scene at this location</span>
        <select data-testid="before-after-collection" value={collection} onChange={(e) => setCollection(e.target.value)} className="rounded border bg-slate-900/60 px-2 py-1 font-mono text-[10px] text-slate-200 outline-none" style={{ borderColor: "var(--border-highlight)" }}>
          <option value="sentinel-1-grd">Sentinel-1 SAR</option><option value="sentinel-2-l2a">Sentinel-2 optical</option>
        </select>
        <select data-testid="before-after-days" value={days} onChange={(e) => setDays(+e.target.value)} className="rounded border bg-slate-900/60 px-2 py-1 font-mono text-[10px] text-slate-200 outline-none" style={{ borderColor: "var(--border-highlight)" }}>
          {[10, 30, 60, 120].map((v) => <option key={v} value={v}>±{v} days</option>)}
        </select>
        <span className="ml-auto font-mono text-[10px] text-slate-500">maps are synchronised · drag either side</span>
      </div>
      {!d ? <p className="p-4 font-mono text-xs text-slate-500" data-testid="before-after-loading">Searching STAC for bracketing scenes…</p> : (
        <div className="flex flex-1 divide-x" style={{ borderColor: "var(--border-default)" }}>
          <Pane s={d.before} label="before" spill={d.spill_geometry} bbox={d.bbox} id="before" register={register} />
          <Pane s={d.after} label="after" spill={d.spill_geometry} bbox={d.bbox} id="after" register={register} />
        </div>
      )}
    </div>
  );
};

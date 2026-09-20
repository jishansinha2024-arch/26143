import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, Crosshair, Globe2, PenTool, X, Satellite, Radio, Scale } from "lucide-react";
import { api, apiError, hasRole } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PROV_COLOR, TYPE_LABEL } from "@/components/zones/ZonesLayer";

const inputCls = "w-full rounded border bg-slate-900/60 px-2.5 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/60";
const bd = { borderColor: "var(--border-highlight)" };

export const ProvBadge = ({ p, testId }) => <span data-testid={testId} className="rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider" style={{ color: PROV_COLOR[p] || "#707881", border: `1px solid ${PROV_COLOR[p] || "#707881"}55` }}>{p || "UNVERIFIED"}</span>;

/** Global maritime zone selector: country search → zone → AOI; presets; custom draw. Drives Sentinel + AIS + jurisdiction. */
export const AoiPanel = ({ onFlyTo, onAoiChange, drawing, setDrawing, drawnGeometry, onDrawnConsumed, compact = false }) => {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [hits, setHits] = useState(null);
  const [aoi, setAoi] = useState(null);
  const [presets, setPresets] = useState({});
  const [busy, setBusy] = useState(false);
  const analyst = hasRole(user, "analyst");
  const load = () => api.get("/aoi").then((r) => { setAoi(r.data.aoi); setPresets(r.data.presets); onAoiChange?.(r.data.aoi); }).catch(() => {});
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!q.trim() && !type) { setHits(null); return undefined; }
    const t = setTimeout(() => api.get(`/jurisdictions?q=${encodeURIComponent(q.trim())}${type ? `&zone_type=${type}` : ""}&active=true&limit=25`).then((r) => setHits(r.data)).catch(() => setHits(null)), 300);
    return () => clearTimeout(t);
  }, [q, type]);

  const select = async (body, label) => {
    setBusy(true);
    try {
      const { data } = await api.post("/aoi/select", body);
      setAoi(data); onAoiChange?.(data); onFlyTo?.(data.bbox);
      toast.success(`AOI set: ${data.name} · AIS coverage ${data.ais_bboxes_swne.length} box(es) · ${data.jurisdiction.inside_zone ? data.jurisdiction.zone : "no reference zone (high seas)"}`);
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  useEffect(() => { if (drawnGeometry) { select({ kind: "custom", geometry: drawnGeometry, name: "drawn maritime AOI" }); onDrawnConsumed?.(); } }, [drawnGeometry]); // eslint-disable-line react-hooks/exhaustive-deps
  const clear = async () => { try { await api.delete("/aoi"); setAoi(null); onAoiChange?.(null); toast.success("AOI cleared · AIS back to regional defaults"); } catch (e) { toast.error(apiError(e)); } };

  return (
    <div className="rounded border p-3" style={{ borderColor: "rgba(0,97,148,0.35)", background: "rgba(0,97,148,0.04)" }} data-testid="aoi-panel">
      <div className="mb-2 flex items-center gap-2"><Globe2 size={14} color="#006194" /><h2 className="font-display font-semibold">Investigation AOI · worldwide</h2>
        {aoi && analyst && <button data-testid="aoi-clear" onClick={clear} className="ml-auto rounded p-1 text-slate-400 hover:text-rose-300" title="clear AOI"><X size={12} /></button>}</div>
      {aoi ? (
        <div className="mb-2 rounded border p-2 text-[11px]" style={{ borderColor: "var(--border-default)" }} data-testid="aoi-current">
          <div className="flex items-center gap-2"><Crosshair size={11} color="#006194" /><span className="text-slate-100">{aoi.name}</span><ProvBadge p={aoi.provenance} testId="aoi-provenance" /></div>
          <div className="mt-1 grid grid-cols-1 gap-0.5 font-mono text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><Satellite size={10} /> Sentinel-1 bbox {aoi.bbox.map((x) => x.toFixed(2)).join(", ")}</span>
            <span className="flex items-center gap-1" data-testid="aoi-ais-boxes"><Radio size={10} /> AIS coverage: {aoi.ais_bboxes_swne.length} bbox(es), +margin</span>
            <span className="flex items-center gap-1" data-testid="aoi-jurisdiction"><Scale size={10} /> {aoi.jurisdiction.inside_zone ? `${aoi.jurisdiction.zone} · ${aoi.jurisdiction.country_code} · ${aoi.jurisdiction.authority_status}` : "No reference zone intersects — high seas / not imported (no jurisdiction inferred)"}</span>
          </div>
          <button data-testid="aoi-fly" onClick={() => onFlyTo?.(aoi.bbox)} className="mt-1 font-mono text-[10px] uppercase tracking-wider text-cyan-300 hover:underline">fly to AOI</button>
        </div>
      ) : <p className="mb-2 text-[11px] text-slate-500" data-testid="aoi-none">No AOI selected — Sentinel search uses the map view; AIS uses regional defaults.</p>}
      <div className="flex gap-1.5">
        <div className="relative flex-1"><Search size={12} className="absolute left-2 top-2 text-slate-500" /><input data-testid="aoi-country-search" className={`${inputCls} pl-6`} style={bd} value={q} onChange={(e) => setQ(e.target.value)} placeholder="country / zone search (e.g. Japan, BEL, Gulf)" /></div>
        <select data-testid="aoi-type-filter" className={`${inputCls} w-28`} style={bd} value={type} onChange={(e) => setType(e.target.value)}><option value="">all types</option>{Object.entries(TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </div>
      {hits && (
        <div className="mt-1.5 max-h-44 space-y-1 overflow-y-auto" data-testid="aoi-search-results">
          {hits.zones.map((z) => (
            <div key={z.id} className="flex items-center gap-2 rounded border px-2 py-1 text-[11px]" style={{ borderColor: "var(--border-default)" }} data-testid={`aoi-hit-${z.code}`}>
              <span className="font-mono text-cyan-300">{z.code}</span><span className="truncate text-slate-300">{z.name}</span><ProvBadge p={z.provenance} />
              <span className="ml-auto flex shrink-0 gap-1">
                <button data-testid={`aoi-hit-fly-${z.code}`} onClick={() => z.bbox && onFlyTo?.(z.bbox)} className="font-mono text-[10px] text-slate-400 hover:text-on-surface">view</button>
                {analyst && <button data-testid={`aoi-hit-use-${z.code}`} disabled={busy} onClick={() => select({ kind: "zone", zone_id: z.id })} className="rounded bg-cyan-400 px-1.5 font-mono text-[10px] font-semibold uppercase text-slate-950 disabled:opacity-50">use as AOI</button>}
              </span>
            </div>))}
          {hits.zones.length === 0 && <p className="text-[11px] text-slate-500" data-testid="aoi-search-empty">No zone matches — zones are imported from Marine Regions; high seas have none.</p>}
          {hits.total > hits.zones.length && <p className="font-mono text-[10px] text-slate-500">{hits.total} matches · refine search</p>}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5" data-testid="aoi-presets">
        {Object.entries(presets).map(([k, p]) => (
          <button key={k} data-testid={`aoi-preset-${k}`} disabled={busy || !analyst} onClick={() => select({ kind: "preset", preset: k })} className="rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider disabled:opacity-40" style={{ borderColor: k === "sih_mumbai" ? "rgba(178,106,0,0.6)" : "var(--border-highlight)", color: k === "sih_mumbai" ? "#b26a00" : "#3f4850" }} title={p.note || p.name}>{k === "sih_mumbai" ? "★ SIH · Mumbai" : p.name}</button>))}
        {analyst && setDrawing && <button data-testid="aoi-draw-toggle" onClick={() => setDrawing(!drawing)} className="inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider" style={{ borderColor: "rgba(111,79,168,0.6)", color: drawing ? "#ffffff" : "#6f4fa8", background: drawing ? "rgba(111,79,168,0.6)" : "transparent" }}><PenTool size={10} /> {drawing ? "drawing… (Esc)" : "draw custom AOI"}</button>}
      </div>
      {!compact && <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Zones: Marine Regions Maritime Boundaries v12 (CC-BY 4.0) — REFERENCE geometry, simplified for display. Intersection is investigation context, not a legal determination. India/Mumbai is only the SIH demo preset; the same pipeline runs anywhere.</p>}
    </div>
  );
};

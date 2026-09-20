import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { List } from "react-window";
import { toast } from "sonner";
import { Images, Satellite } from "lucide-react";
import { api, apiError, fmtTime, pct } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

const inputCls = "rounded border bg-slate-900/60 px-2.5 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/60";
const bd = { borderColor: "var(--border-highlight)" };
const COLS = 3, ROW_H = 250;

const Thumb = ({ src, alt }) => {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!src) return undefined;
    let u;
    api.get(src, { responseType: "blob", timeout: 120000 }).then((r) => { u = URL.createObjectURL(r.data); setUrl(u); }).catch(() => setUrl("x"));
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [src]);
  if (!src || url === "x") return <div className="grid h-28 w-full place-items-center rounded bg-slate-900/70"><Satellite size={18} color="#bfc7d2" /></div>;
  return url ? <img src={url} alt={alt} loading="lazy" className="h-28 w-full rounded object-cover" /> : <div className="h-28 w-full animate-pulse rounded bg-slate-900/70" />;
};

const Row = ({ index, style, events, nav }) => (
  <div style={style} className="grid grid-cols-3 gap-3 pr-2">
    {events.slice(index * COLS, index * COLS + COLS).map((e) => (
      <button key={e.id} data-testid={`event-card-${e.case_number}`} onClick={() => nav(`/cases/${e.id}`)} className="rounded border p-2.5 text-left text-xs transition-colors hover:border-cyan-400/50" style={{ borderColor: "var(--border-default)", background: "var(--bg-secondary)" }}>
        <Thumb src={e.thumb} alt={e.case_number} />
        <div className="mt-2 flex items-center gap-2"><span className="font-display font-semibold text-slate-100">{e.case_number}</span><StatusBadge status={e.attribution_status} /></div>
        <div className="mt-1 font-mono text-[10px] text-slate-400">{fmtTime(e.acquisition_time)} · {e.source} · conf {pct(e.detection_confidence)}</div>
        <div className="font-mono text-[10px] text-slate-500">{e.primary_jurisdiction?.code || "no jurisdiction"} · {e.candidate_count ?? 0} candidates{e.confirmed_vessel_mmsi ? ` · confirmed ${e.confirmed_vessel_mmsi}` : ""}</div>
      </button>
    ))}
  </div>
);

export default function Events() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [d, setD] = useState(null);
  const [h, setH] = useState(600);
  const params = useMemo(() => ({ start: sp.get("start") || undefined, end: sp.get("end") || undefined, min_conf: sp.get("min_conf") || undefined, status: sp.get("status") || undefined, source: sp.get("source") || undefined, limit: 100 }), [sp]);
  useEffect(() => { api.get("/spill-events", { params }).then((r) => setD(r.data)).catch((e) => toast.error(apiError(e))); }, [params]);
  useEffect(() => { const f = () => setH(window.innerHeight - 230); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  const set = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n); };
  const events = d?.events || [];
  return (
    <div className="h-full overflow-hidden p-6" data-testid="events-page">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="mr-auto"><p className="label-mono mb-1">Chronological detections · newest first · filters live in the URL</p><h1 className="font-display text-3xl font-extrabold tracking-tight">Spill events</h1></div>
        <label className="block"><span className="label-mono mb-1 block">From</span><input data-testid="events-start" type="date" className={inputCls} style={bd} value={sp.get("start")?.slice(0, 10) || ""} onChange={(e) => set("start", e.target.value ? `${e.target.value}T00:00:00Z` : "")} /></label>
        <label className="block"><span className="label-mono mb-1 block">To</span><input data-testid="events-end" type="date" className={inputCls} style={bd} value={sp.get("end")?.slice(0, 10) || ""} onChange={(e) => set("end", e.target.value ? `${e.target.value}T23:59:59Z` : "")} /></label>
        <label className="block"><span className="label-mono mb-1 block">Min confidence {sp.get("min_conf") || "0"}</span><input data-testid="events-min-conf" type="range" min="0" max="1" step="0.05" value={sp.get("min_conf") || 0} onChange={(e) => set("min_conf", e.target.value === "0" ? "" : e.target.value)} /></label>
        <label className="block"><span className="label-mono mb-1 block">Status</span><select data-testid="events-status" className={inputCls} style={bd} value={sp.get("status") || ""} onChange={(e) => set("status", e.target.value)}><option value="">any</option>{["possible", "probable", "insufficient_evidence", "analyst_confirmed", "indeterminate"].map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <label className="block"><span className="label-mono mb-1 block">Source</span><select data-testid="events-source" className={inputCls} style={bd} value={sp.get("source") || ""} onChange={(e) => set("source", e.target.value)}><option value="">any</option>{d?.sources?.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
      </div>
      <p className="mb-2 font-mono text-[10px] text-slate-500" data-testid="events-count"><Images size={11} className="mr-1 inline" />{d ? `${events.length} of ${d.total} events` : "loading…"}</p>
      {d && events.length === 0 && <p className="text-xs text-slate-500" data-testid="events-empty">No detections match these filters.</p>}
      {events.length > 0 && <List data-testid="events-grid" rowComponent={Row} rowCount={Math.ceil(events.length / COLS)} rowHeight={ROW_H} rowProps={{ events, nav }} style={{ height: h }} />}
    </div>
  );
}

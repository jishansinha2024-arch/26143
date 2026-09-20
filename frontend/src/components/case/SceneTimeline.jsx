import { useEffect, useState } from "react";
import { Clock3, Satellite } from "lucide-react";
import { api, apiError, fmtTime } from "@/lib/api";

const Pass = ({ p, active, onClick }) => (
  <button data-testid={`scene-pass-${p.stac_id}`} onClick={onClick} className={`shrink-0 rounded border px-2 py-1 text-left font-mono text-[10px] ${active ? "border-cyan-400 text-cyan-300" : "border-slate-700 text-slate-400 hover:text-on-surface"}`}>
    <div>{fmtTime(p.datetime)}</div>
    <div className={p.offset_hours === 0 ? "text-amber-300" : ""}>{p.offset_hours > 0 ? "+" : ""}{p.offset_hours} h{p.is_case_scene ? " · case scene" : ""}</div>
  </button>
);

export const SceneTimeline = ({ caseId }) => {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [days, setDays] = useState(60);
  const [idx, setIdx] = useState(0);
  const [img, setImg] = useState(null);
  useEffect(() => {
    setData(null); setErr(null);
    api.get(`/cases/${caseId}/scene-timeline`, { params: { days }, timeout: 90000 }).then((r) => {
      setData(r.data);
      const i = r.data.passes.findIndex((p) => p.is_case_scene);
      setIdx(i >= 0 ? i : Math.max(0, r.data.passes.findIndex((p) => p.offset_hours >= 0)));
    }).catch((e) => setErr(apiError(e)));
  }, [caseId, days]);
  const p = data?.passes?.[idx];
  useEffect(() => {
    if (!p?.preview) { setImg(null); return undefined; }
    let u; setImg("loading");
    api.get(p.preview, { responseType: "blob", timeout: 120000 }).then((r) => { u = URL.createObjectURL(r.data); setImg(u); }).catch(() => setImg("failed"));
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [p?.preview]);
  return (
    <div className="p-4" data-testid="scene-timeline">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Satellite size={13} color="#006194" /><span className="font-display text-sm font-semibold">Sentinel-1 pass timeline</span>
        <span className="rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-300" style={{ border: "1px solid currentColor" }}>REAL SENTINEL-1 · archive acquisitions</span>
        <select data-testid="scene-timeline-window" value={days} onChange={(e) => setDays(+e.target.value)} className="ml-auto rounded border bg-slate-900/60 px-2 py-1 font-mono text-[10px] text-slate-200" style={{ borderColor: "var(--border-highlight)" }}>
          {[14, 30, 60, 120, 365].map((d) => <option key={d} value={d}>± {d} days</option>)}
        </select>
      </div>
      {err && <p className="text-xs text-rose-300" data-testid="scene-timeline-error">{err}</p>}
      {!data && !err && <p className="font-mono text-xs text-slate-500">Searching Planetary Computer for every pass over the slick…</p>}
      {data && data.count === 0 && <p className="text-xs text-slate-500" data-testid="scene-timeline-empty">No Sentinel-1 GRD acquisition covers this point within ± {days} days.</p>}
      {data && data.count > 0 && p && (
        <>
          <input data-testid="scene-timeline-slider" type="range" min={0} max={data.count - 1} value={idx} onChange={(e) => setIdx(+e.target.value)} className="w-full" />
          <div className="mt-1 flex gap-1 overflow-x-auto pb-1">{data.passes.map((x, i) => <Pass key={x.stac_id} p={x} active={i === idx} onClick={() => setIdx(i)} />)}</div>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_320px]">
            <div className="relative min-h-[260px] overflow-hidden rounded border bg-black/40" style={{ borderColor: "var(--border-default)" }}>
              {img && img !== "loading" && img !== "failed" && <img src={img} alt={p.stac_id} className="h-full w-full object-contain" data-testid="scene-timeline-image" />}
              {img === "loading" && <p className="p-4 font-mono text-xs text-slate-500">Loading quicklook…</p>}
              {(img === "failed" || !p.preview) && <p className="p-4 font-mono text-xs text-slate-500" data-testid="scene-timeline-no-preview">No preview available for this pass — metadata only.</p>}
            </div>
            <div className="font-mono text-[11px] text-slate-300" data-testid="scene-timeline-meta">
              <div className="flex items-center gap-1 text-slate-400"><Clock3 size={11} /> acquired {fmtTime(p.datetime)} ({p.offset_hours > 0 ? "+" : ""}{p.offset_hours} h vs spill)</div>
              <div className="mt-1 break-all text-cyan-300">{p.stac_id}</div>
              <div className="mt-1">{p.platform} · {p.instrument_mode} · {(p.polarizations || []).join("+")} · {p.orbit_state}</div>
              <div className="mt-1 text-slate-500">{p.registered_scene_id ? "registered in Varuna Netra" : "not yet registered"} · pass {idx + 1}/{data.count}</div>
              <p className="mt-2 text-[10px] text-slate-500">{data.source}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

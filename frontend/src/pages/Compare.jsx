import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Columns2, Layers, Ship } from "lucide-react";
import { api, apiError, fmtTime } from "@/lib/api";
import { CaseMap } from "@/components/case/CaseMap";
import { StatusBadge } from "@/components/StatusBadge";

const SIDE = { a: "#006194", b: "#ba1a1a" };
const sel = "rounded border bg-slate-900/60 px-2 py-1.5 font-mono text-[11px] text-slate-200 outline-none";

const tag = (geo, side) => ({ ...geo, features: (geo?.features || []).map((f) => ({ ...f, properties: { ...f.properties, side } })) });

export default function Compare() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [cases, setCases] = useState([]);
  const [data, setData] = useState(null);
  const [mode, setMode] = useState("split");
  const a = sp.get("a") || "", b = sp.get("b") || "";

  useEffect(() => { api.get("/cases").then((r) => setCases(r.data)).catch((e) => toast.error(apiError(e))); }, []);
  useEffect(() => {
    if (!a || !b || a === b) { setData(null); return; }
    api.get(`/cases/compare/${a}/${b}`).then((r) => setData(r.data)).catch((e) => toast.error(apiError(e)));
  }, [a, b]);
  const overlay = useMemo(() => data && { type: "FeatureCollection", features: [...tag(data.a.geojson, "a").features, ...tag(data.b.geojson, "b").features] }, [data]);
  const set = (k, v) => { const n = new URLSearchParams(sp); n.set(k, v); setSp(n); };

  const Picker = ({ k }) => (
    <select data-testid={`compare-select-${k}`} value={sp.get(k) || ""} onChange={(e) => set(k, e.target.value)} className={sel} style={{ borderColor: SIDE[k] }}>
      <option value="">— select case {k.toUpperCase()} —</option>
      {cases.map((c) => <option key={c.id} value={c.id}>{c.case_number} · {c.attribution_status} · {c.primary_jurisdiction?.code || "—"}</option>)}
    </select>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden" data-testid="compare-page">
      <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-secondary)" }}>
        <div><p className="label-mono">Cross-incident analysis</p><h1 className="font-display text-xl font-bold tracking-tight">Compare cases</h1></div>
        <Picker k="a" /><span className="font-mono text-xs text-slate-500">vs</span><Picker k="b" />
        <div className="ml-auto flex rounded border" style={{ borderColor: "var(--border-highlight)" }}>
          {[["split", Columns2, "Split"], ["overlay", Layers, "Overlay"]].map(([m, Icon, l]) => (
            <button key={m} data-testid={`compare-mode-${m}`} onClick={() => setMode(m)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider ${mode === m ? "bg-slate-800 text-cyan-300" : "text-slate-400"}`}><Icon size={12} /> {l}</button>
          ))}
        </div>
      </div>
      {!data ? (
        <div className="grid flex-1 place-items-center text-sm text-slate-500" data-testid="compare-empty">{a && b && a === b ? "Pick two different cases." : "Select two cases to compare tracks and shared vessels."}</div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-1 flex-col">
            {mode === "split" ? (
              <div className="grid flex-1 grid-cols-2" data-testid="compare-split">
                {["a", "b"].map((k) => (
                  <div key={k} className="relative border-r" style={{ borderColor: "var(--border-default)" }}>
                    <CaseMap geojson={data[k].geojson} acquisitionTime={data[k].case.acquisition_time} />
                    <SideBadge k={k} c={data[k].case} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative flex-1" data-testid="compare-overlay">
                <CaseMap geojson={overlay} sideColors={SIDE} />
                <div className="absolute left-3 top-3 z-[1000] flex gap-2"><SideBadge k="a" c={data.a.case} inline /><SideBadge k="b" c={data.b.case} inline /></div>
              </div>
            )}
          </div>
          <aside className="w-[440px] shrink-0 overflow-y-auto border-l p-4" style={{ borderColor: "var(--border-default)", background: "var(--bg-secondary)" }}>
            <p className="label-mono mb-1">Vessels appearing in both candidate lists</p>
            <h2 className="font-display text-lg font-semibold" data-testid="shared-vessels-count">{data.shared_vessels.length} shared vessel{data.shared_vessels.length === 1 ? "" : "s"}</h2>
            <p className="mt-1 text-[11px] text-slate-500" data-testid="compare-disclaimer">{data.disclaimer}</p>
            <div className="mt-3 space-y-2" data-testid="shared-vessels-list">
              {data.shared_vessels.map((v) => (
                <button key={v.mmsi} data-testid={`shared-vessel-${v.mmsi}`} onClick={() => nav(`/vessels/${v.mmsi}`)} className="block w-full rounded border p-3 text-left text-xs hover:border-amber-400/60" style={{ borderColor: "rgba(178,106,0,0.4)", background: "rgba(178,106,0,0.05)" }}>
                  <div className="flex items-center gap-2"><Ship size={12} color="#b26a00" /><span className="font-display font-semibold">{v.vessel_name || "UNKNOWN"}</span><span className="font-mono text-slate-400">{v.mmsi}</span><span className="ml-auto font-mono text-[10px] text-slate-500">{v.vessel_type || ""}</span></div>
                  <div className="mt-1.5 grid grid-cols-2 gap-2 font-mono text-[10px]">
                    {["a", "b"].map((k) => <div key={k} className="flex items-center gap-1.5" style={{ color: SIDE[k] }}>{data[k].case.case_number}: #{v[k].rank} · {v[k].score.toFixed(2)} <StatusBadge status={v[k].status} /></div>)}
                  </div>
                </button>
              ))}
              {data.shared_vessels.length === 0 && <p className="text-xs text-slate-500" data-testid="shared-vessels-empty">No vessel appears in both latest candidate lists.</p>}
            </div>
            {["a", "b"].map((k) => (
              <div key={k} className="mt-4" data-testid={`compare-candidates-${k}`}>
                <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider" style={{ color: SIDE[k] }}><span className="h-2 w-2 rounded-full" style={{ background: SIDE[k] }} />{data[k].case.case_number} · v{data[k].version} · {data[k].candidates.length} candidates</div>
                {data[k].candidates.slice(0, 6).map((c) => {
                  const shared = data.shared_vessels.some((s) => s.mmsi === c.mmsi);
                  return <div key={c.mmsi} className="flex items-center gap-2 border-t py-1 text-xs" style={{ borderColor: "var(--border-default)" }}><span className="font-mono text-slate-500">#{c.rank}</span><span className={shared ? "font-semibold text-amber-300" : "text-slate-200"}>{c.vessel_name || c.mmsi}</span><span className="font-mono text-[10px] text-slate-500">{c.mmsi}</span><span className="ml-auto font-mono text-[10px]">{c.score.toFixed(2)}</span></div>;
                })}
              </div>
            ))}
          </aside>
        </div>
      )}
    </div>
  );
}

const SideBadge = ({ k, c, inline }) => (
  <div className={inline ? "" : "absolute left-3 top-3 z-[1000]"} data-testid={`compare-badge-${k}`}>
    <div className="rounded px-2.5 py-1.5 text-[11px]" style={{ background: "rgba(255,255,255,0.85)", border: `1px solid ${SIDE[k]}`, backdropFilter: "blur(12px)" }}>
      <span className="font-mono uppercase tracking-wider" style={{ color: SIDE[k] }}>{k}</span> <span className="font-display font-semibold">{c.case_number}</span>
      <span className="ml-2 text-slate-400">{fmtTime(c.acquisition_time)} · {c.primary_jurisdiction?.code || "—"}</span>
    </div>
  </div>
);

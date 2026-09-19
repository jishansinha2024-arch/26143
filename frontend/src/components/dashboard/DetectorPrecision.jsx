import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { Target } from "lucide-react";
import { api, apiError, pct } from "@/lib/api";

const COLORS = ["#D4604D", "#C48A22", "#8B6BCB", "#1F7F93", "#2E8B6A", "#7D919C", "#D9762E"];

export const DetectorPrecision = () => {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/detector/precision").then((r) => setD(r.data)).catch((e) => toast.error(apiError(e))); }, []);
  if (!d) return null;
  const o = d.overall;
  return (
    <div className="panel p-4" data-testid="detector-precision-card">
      <div className="mb-2 flex items-center gap-2"><Target size={14} color="#8B6BCB" /><h3 className="font-display text-sm font-semibold">Detector precision</h3><span className="ml-auto font-mono text-[10px] text-slate-500">{o.reviewed} reviewed · {o.pending_review} awaiting</span></div>
      <div className="flex items-center gap-4">
        <div>
          <div className="font-display text-4xl font-extrabold tracking-tight" data-testid="detector-precision-value" style={{ color: o.precision == null ? "#5F7684" : o.precision >= 0.7 ? "#2E8B6A" : o.precision >= 0.4 ? "#C48A22" : "#D4604D" }}>{o.precision == null ? "—" : pct(o.precision)}</div>
          <div className="font-mono text-[10px] text-slate-400">TP {o.tp} · FP {o.fp} · TP/(TP+FP)</div>
          <div className="mt-2 space-y-0.5" data-testid="detector-versions">
            {d.versions.map((v) => <div key={v.detector_version} className="font-mono text-[10px] text-slate-600"><span className="text-slate-500">{v.detector_version}</span> {v.precision == null ? "—" : pct(v.precision)} <span className="text-slate-500">({v.tp}/{v.tp + v.fp})</span></div>)}
          </div>
        </div>
        <div className="h-28 flex-1 min-w-0" data-testid="fp-reason-chart">
          {d.fp_reasons.length ? (
            <div className="flex h-full items-center justify-center">
              <PieChart width={120} height={112}>
                <Pie data={d.fp_reasons} dataKey="count" nameKey="reason" innerRadius={28} outerRadius={50} paddingAngle={2} stroke="none" isAnimationActive={false}>{d.fp_reasons.map((r, i) => <Cell key={r.reason} fill={COLORS[i % COLORS.length]} />)}</Pie>
                <Tooltip contentStyle={{ background: "#16262E", border: "1px solid #3A4F5B", fontSize: 11, fontFamily: "monospace" }} />
              </PieChart>
            </div>
          ) : <p className="pt-8 text-center text-[10px] text-slate-500">no false positives recorded</p>}
        </div>
      </div>
      {d.fp_reasons.length > 0 && <div className="mt-1 flex flex-wrap gap-2" data-testid="fp-reason-legend">{d.fp_reasons.map((r, i) => <span key={r.reason} className="font-mono text-[10px] text-slate-600"><span className="mr-1 inline-block h-2 w-2 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />{r.reason} {r.count}</span>)}</div>}
    </div>
  );
};

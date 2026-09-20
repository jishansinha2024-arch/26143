import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { api, fmtTime } from "@/lib/api";

const reasonFor = (p) => {
  const bits = [];
  if (p.distance_km != null) bits.push(`~${Math.round(p.distance_km).toLocaleString()} km away`);
  if (p.oil_type) bits.push(`oil type: ${p.oil_type}`);
  if (p.volume_tonnes != null) bits.push(`~${p.volume_tonnes.toLocaleString()} t`);
  return bits.join(" · ");
};

export const Precedents = ({ caseId }) => {
  const [d, setD] = useState(null);
  useEffect(() => { api.get(`/cases/${caseId}/precedents`).then((r) => setD(r.data)).catch(() => setD({ precedents: [] })); }, [caseId]);
  if (!d) return null;
  if (!d.precedents?.length) return <div className="rounded border p-3 font-mono text-[11px] text-slate-500" style={{ borderColor: "var(--border-default)" }} data-testid="precedents-empty">No related historical precedent found for this case.</div>;
  return (
    <div className="rounded border p-3" style={{ borderColor: "rgba(0,123,185,0.4)", background: "rgba(0,123,185,0.04)" }} data-testid="precedents-drawer">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <BookOpen size={13} color="#007bb9" />
        <span className="font-display text-sm font-semibold">Related historical precedent</span>
        <span className="font-mono text-[10px] text-slate-500">similarity = 0.5·distance + 0.3·volume + 0.2·oil type · est. {d.estimated_volume_tonnes} t</span>
        <Link to="/archive" className="ml-auto font-mono text-[10px] text-cyan-300 hover:underline" data-testid="precedents-archive-link">open archive →</Link>
      </div>
      <p className="mb-2 font-mono text-[10px] text-amber-300/80">Similar past incidents from the verified historical archive — context only, NOT a match of the responsible vessel and not a legal determination.</p>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {d.precedents.map((p) => (
          <div key={p.id} data-testid={`precedent-${p.id}`} className="rounded border p-2 text-xs" style={{ borderColor: "var(--border-default)" }}>
            <div className="flex items-center gap-2"><span className="font-display font-semibold text-slate-100">{p.name}</span><span className="ml-auto font-mono text-[10px] text-cyan-300">{(p.similarity * 100).toFixed(0)}%</span></div>
            <div className="font-mono text-[10px] text-slate-500">{fmtTime(p.date).slice(0, 10)} · {p.country}</div>
            <div className="mt-1 text-[11px] text-slate-400"><span className="text-slate-300">Matched on:</span> {reasonFor(p)}</div>
            <div className="mt-1 text-[11px] text-slate-400"><span className="text-slate-300">Remediation:</span> {(p.remediation || []).slice(0, 3).join("; ")}</div>
            <div className="mt-1 text-[11px] italic text-slate-400">{p.lessons}</div>
            <Link to={`/archive/${p.id}`} className="mt-1 inline-block font-mono text-[10px] text-cyan-300 hover:underline" data-testid={`precedent-open-${p.id}`}>view source →</Link>
          </div>
        ))}
      </div>
    </div>
  );
};

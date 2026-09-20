import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const FACTORS = ["spatial", "temporal", "continuity", "heading", "drift", "reliability"];

const Cand = ({ c, title }) => (
  <div className="flex-1 rounded-md border p-3" style={{ borderColor: "var(--border-default)" }} data-testid={`comparison-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
    <p className="label-mono">{title}</p>
    <p className="mt-0.5 font-mono text-sm text-cyan-300">{c.vessel_name || `MMSI ${c.mmsi}`}</p>
    <p className="font-mono text-[11px] text-slate-400">score {c.score} · {c.status}{c.in_drift_envelope ? " · in drift envelope" : ""}</p>
    <table className="mt-2 w-full text-[11px]">
      <tbody>
        {FACTORS.map((f) => {
          const v = (c.factors || {})[f];
          if (!v) return null;
          return (
            <tr key={f} className="border-t" style={{ borderColor: "var(--border-default)" }}>
              <td className="py-1 pr-2 text-slate-400 capitalize">{f}</td>
              <td className="py-1 pr-2 text-right font-mono text-slate-200">{v.score}</td>
              <td className="py-1 text-right font-mono text-slate-500">×{v.weight} = {v.contribution}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export function CandidateComparison({ caseId }) {
  const [d, setD] = useState(null);
  useEffect(() => { api.get(`/cases/${caseId}/candidate-comparison`).then((r) => setD(r.data)).catch(() => setD(false)); }, [caseId]);

  if (d === null) return <p className="text-xs text-slate-500" data-testid="comparison-loading">Loading comparison…</p>;
  if (d === false || !d.available) return <p className="text-sm text-slate-400" data-testid="comparison-unavailable">{d?.message || "No correlation run / no candidates yet."}</p>;

  const ambiguous = d.verdict === "AMBIGUOUS ATTRIBUTION";
  return (
    <div data-testid="candidate-comparison">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: ambiguous ? "#b26a00" : "#006a61", background: ambiguous ? "rgba(178,106,0,0.1)" : "rgba(0,106,97,0.1)", border: `1px solid ${ambiguous ? "rgba(178,106,0,0.35)" : "rgba(0,106,97,0.35)"}` }}>{d.verdict}</span>
        {d.score_delta != null && <span className="font-mono text-[11px] text-slate-400">Δ score {d.score_delta}</span>}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Cand c={d.rank1} title="Rank #1" />
        {d.rank2 ? <Cand c={d.rank2} title="Rank #2" /> : <div className="flex-1 grid place-items-center rounded-md border p-3 text-xs text-slate-500" style={{ borderColor: "var(--border-default)" }}>{d.verdict}</div>}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-300" data-testid="comparison-explanation">{d.explanation}</p>
      <p className="mt-2 text-[11px] text-slate-500">{d.disclaimer}</p>
    </div>
  );
}

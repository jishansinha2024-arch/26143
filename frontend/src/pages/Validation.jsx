import { useEffect, useState } from "react";
import { BadgeCheck, Cpu, FlaskConical } from "lucide-react";
import { api } from "@/lib/api";

const Row = ({ label, value, target }) => (
  <tr className="border-t" style={{ borderColor: "var(--border-default)" }}>
    <td className="px-4 py-2 text-slate-300">{label}</td>
    <td className="px-4 py-2 font-mono text-xs">
      {value === "NOT YET VALIDATED"
        ? <span className="rounded px-2 py-0.5 text-[10px] uppercase tracking-wider" style={{ color: "#b26a00", background: "rgba(178,106,0,0.1)", border: "1px solid rgba(178,106,0,0.35)" }}>NOT YET VALIDATED</span>
        : <span className="text-cyan-300">{String(value)}</span>}
    </td>
    <td className="px-4 py-2 font-mono text-[11px] text-slate-500">{target || "—"}</td>
  </tr>
);

export default function Validation() {
  const [v, setV] = useState(null);
  useEffect(() => { api.get("/validation").then((r) => setV(r.data)).catch(() => setV(false)); }, []);

  const det = v?.detector;
  const t = v?.targets || {};
  return (
    <div className="h-full overflow-y-auto p-6" data-testid="validation-page">
      <div className="mb-6 fade-up">
        <p className="label-mono mb-1">Model &amp; correlation validation</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Validation</h1>
        <p className="mt-2 text-sm text-slate-400">Only <span className="text-cyan-300">measured</span> results are shown. Unmeasured metrics read <span className="text-amber-300">NOT YET VALIDATED</span> — never fabricated.</p>
      </div>

      {v === false && <p className="text-rose-400" data-testid="validation-error">Validation data unavailable.</p>}

      {det && (
        <div className="panel mb-4 p-5 fade-up" data-testid="validation-detector">
          <div className="mb-2 flex items-center gap-2"><Cpu size={16} color="#006194" /><h2 className="font-display text-lg font-semibold">Active detector</h2></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><p className="label-mono">Detector</p><p className="mt-0.5 font-mono text-sm text-cyan-300">{det.active_detector}</p></div>
            <div><p className="label-mono">Mode</p><p className="mt-0.5 font-mono text-sm" style={{ color: det.ml_model_installed ? "#006a61" : "#b26a00" }}>{det.status_text}</p></div>
            <div><p className="label-mono">Correlation</p><p className="mt-0.5 font-mono text-sm text-slate-300">{v.correlation_version}</p></div>
            <div><p className="label-mono">Drift</p><p className="mt-0.5 font-mono text-sm text-slate-300">{v.drift_version}</p></div>
          </div>
          <p className="mt-3 text-xs text-slate-400">{det.note}</p>
        </div>
      )}

      {v && v.detection_metrics && (
        <div className="panel mb-4 overflow-hidden fade-up" data-testid="validation-detection">
          <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: "var(--border-default)" }}><FlaskConical size={15} color="#006194" /><h2 className="font-display font-semibold">Detection metrics</h2></div>
          <table className="w-full text-sm">
            <thead><tr className="label-mono text-left"><th className="px-4 py-2 font-normal">Metric</th><th className="px-4 py-2 font-normal">Measured</th><th className="px-4 py-2 font-normal">Target</th></tr></thead>
            <tbody>
              {Object.entries(v.detection_metrics).map(([k, val]) => <Row key={k} label={k.replace(/_/g, " ")} value={val} target={t[k]} />)}
            </tbody>
          </table>
        </div>
      )}

      {v && v.correlation_metrics && (
        <div className="panel overflow-hidden fade-up" data-testid="validation-correlation">
          <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: "var(--border-default)" }}><BadgeCheck size={15} color="#006194" /><h2 className="font-display font-semibold">Correlation metrics</h2></div>
          <table className="w-full text-sm">
            <thead><tr className="label-mono text-left"><th className="px-4 py-2 font-normal">Metric</th><th className="px-4 py-2 font-normal">Measured</th><th className="px-4 py-2 font-normal">Target</th></tr></thead>
            <tbody>
              {Object.entries(v.correlation_metrics).map(([k, val]) => <Row key={k} label={k.replace(/_/g, " ")} value={val} target={t[k]} />)}
            </tbody>
          </table>
          <p className="px-4 py-3 text-xs text-slate-500">{v.note}</p>
        </div>
      )}
    </div>
  );
}

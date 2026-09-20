import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { api, apiError, fmtTime } from "@/lib/api";

const Prov = ({ label, p }) => {
  const st = p?.state || "UNAVAILABLE";
  const ok = st === "REAL PROVIDER DATA";
  return (
    <div className="rounded-md border p-2.5" style={{ borderColor: "var(--border-default)" }}>
      <p className="label-mono">{label}</p>
      <p className="mt-0.5 font-mono text-[11px]" style={{ color: ok ? "#006a61" : "#707881" }}>{st}</p>
      {ok && <p className="font-mono text-[11px] text-slate-400">{p.speed_ms} m/s @ {p.direction_deg}°</p>}
    </div>
  );
};

export function CaseSummary({ caseId }) {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api.get(`/cases/${caseId}/summary`).then((r) => setD(r.data)).catch(() => setD(false)), [caseId]);
  useEffect(() => { load(); }, [load]);

  const regen = async () => {
    setBusy(true);
    try { const { data } = await api.post(`/cases/${caseId}/summary/regenerate`); setD(data); toast.success("Investigation summary regenerated"); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };

  if (d === null) return <p className="text-xs text-slate-500">Loading summary…</p>;
  if (d === false) return <p className="text-sm text-rose-400">Summary unavailable.</p>;
  const ep = d.environment_provenance || {};
  return (
    <div data-testid="investigation-summary">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-display text-sm font-semibold">Investigation summary</h3>
        <span className="font-mono text-[10px] text-slate-500">{d.generated_by} · {fmtTime(d.generated_at)}</span>
        <button data-testid="summary-regenerate" onClick={regen} disabled={busy} title="Regenerate (analyst)" className="ml-auto inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-300 hover:bg-slate-800/60 disabled:opacity-50" style={{ borderColor: "var(--border-default)" }}><RefreshCw size={11} className={busy ? "animate-spin" : ""} /> Regenerate</button>
      </div>
      <p className="text-sm leading-relaxed text-slate-200" data-testid="summary-text">{d.summary}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-md border p-2.5" style={{ borderColor: "var(--border-default)" }}><p className="label-mono">Detector</p><p className="mt-0.5 font-mono text-[11px] text-cyan-300">{d.detector_version}</p></div>
        <div className="rounded-md border p-2.5" style={{ borderColor: "var(--border-default)" }}><p className="label-mono">Correlation</p><p className="mt-0.5 font-mono text-[11px] text-slate-300">{d.correlation_version}</p></div>
        <Prov label="Wind" p={ep.wind} />
        <Prov label="Current" p={ep.current} />
      </div>
    </div>
  );
}

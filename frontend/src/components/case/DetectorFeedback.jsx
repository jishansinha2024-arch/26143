import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown, HelpCircle } from "lucide-react";
import { api, apiError, fmtTime } from "@/lib/api";

const REASONS = [["low_wind", "Low wind / calm sea"], ["wake", "Ship wake"], ["upwelling", "Upwelling / front"], ["land_shore", "Land / shoreline"], ["biogenic_slick", "Biogenic slick / algae"], ["rain_cell", "Rain cell"], ["other", "Other"]];
const inputCls = "w-full rounded border bg-mist px-2.5 py-1.5 font-mono text-xs text-slate-800 outline-none focus:border-tide/60";
const bd = { borderColor: "var(--border-highlight)" };

export const DetectorFeedback = ({ caseId, source, onSaved }) => {
  const [rows, setRows] = useState([]);
  const [verdict, setVerdict] = useState(null);
  const [reason, setReason] = useState("low_wind");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api.get(`/cases/${caseId}/detector-feedback`).then((r) => setRows(r.data)).catch(() => {}), [caseId]);
  useEffect(() => { load(); }, [load]);
  const submit = async () => {
    setBusy(true);
    try { await api.post(`/cases/${caseId}/detector-feedback`, { verdict, reason: verdict === "false_positive" ? reason : null, notes }); toast.success("Detector feedback recorded"); setVerdict(null); setNotes(""); load(); onSaved?.(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  const latest = rows[0];
  return (
    <div className="rounded border p-3" style={{ borderColor: "rgba(124,92,191,0.45)", background: "rgba(124,92,191,0.05)" }} data-testid="detector-feedback">
      <div className="mb-1 flex items-center gap-2"><span className="font-display text-sm font-semibold">Detector feedback</span><span className="font-mono text-[10px] text-slate-500">{source}</span>
        {latest && <span data-testid="detector-feedback-latest" className="ml-auto rounded px-1.5 py-0.5 font-mono text-[10px]" style={{ color: latest.verdict === "true_positive" ? "#2E8B6A" : latest.verdict === "false_positive" ? "#D4604D" : "#C48A22", border: "1px solid currentColor" }}>{latest.verdict.replace("_", " ")}{latest.reason ? ` · ${latest.reason}` : ""} · {latest.user_email}</span>}</div>
      <p className="mb-2 text-[11px] text-slate-400">Was this detection a real slick? Your verdict trains precision tracking per detector version and is written to the audit trail and the evidence PDF.</p>
      <div className="flex flex-wrap items-center gap-2">
        {[["true_positive", ThumbsUp, "#2E8B6A", "True positive"], ["false_positive", ThumbsDown, "#D4604D", "False positive"], ["uncertain", HelpCircle, "#C48A22", "Uncertain"]].map(([v, Icon, col, l]) => (
          <button key={v} data-testid={`feedback-${v}`} onClick={() => setVerdict(v)} className="inline-flex items-center gap-1 rounded border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider" style={{ borderColor: verdict === v ? col : "var(--border-highlight)", color: verdict === v ? col : "#CFCBC0", background: verdict === v ? `${col}1a` : "transparent" }}><Icon size={11} /> {l}</button>
        ))}
        {verdict === "false_positive" && <select data-testid="feedback-reason" className={`${inputCls} w-52`} style={bd} value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}
      </div>
      {verdict && (
        <div className="mt-2 flex gap-2">
          <input data-testid="feedback-notes" className={inputCls} style={bd} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="notes (optional)" />
          <button data-testid="feedback-submit" disabled={busy} onClick={submit} className="shrink-0 rounded px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-950 disabled:opacity-50" style={{ background: "#8B6BCB" }}>Record verdict</button>
        </div>
      )}
      {rows.length > 1 && <div className="mt-2 space-y-0.5 font-mono text-[10px] text-slate-500" data-testid="feedback-history">{rows.slice(1).map((r) => <div key={r.id}>{fmtTime(r.created_at)} · {r.verdict}{r.reason ? ` (${r.reason})` : ""} · {r.user_email}</div>)}</div>}
    </div>
  );
};

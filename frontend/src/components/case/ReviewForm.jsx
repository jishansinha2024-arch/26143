import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { api, apiError, hasRole, STATUS_LABEL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const inputCls = "w-full rounded border bg-slate-900/60 px-2.5 py-1.5 text-sm text-slate-100 outline-none focus:border-cyan-400/60";
const bd = { borderColor: "var(--border-highlight)" };

export const ReviewForm = ({ caseId, candidates, reasonCodes, resultVersion, onSaved }) => {
  const { user } = useAuth();
  const [decision, setDecision] = useState("confirm");
  const [mmsi, setMmsi] = useState(candidates?.[0]?.mmsi || "");
  const [codes, setCodes] = useState([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (c) => setCodes((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));

  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/cases/${caseId}/review`, { decision, vessel_mmsi: mmsi || null, reason_codes: codes, notes, result_version: resultVersion || null });
      toast.success(`Review recorded: ${decision.replace("_", " ")}`);
      setNotes(""); setCodes([]);
      onSaved?.();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 p-4" data-testid="review-form">
      <p className="text-xs text-slate-400">Decisions are immutable and signed as <span className="font-mono text-slate-200" data-testid="review-signer">{user?.name} · {user?.email} · {user?.role}</span>. Prior automated results are preserved.</p>
      <div className="grid grid-cols-3 gap-2">
        {[["confirm", "Confirm", "#006a61", "btn-confirm-analyst-review"], ["reject", "Reject", "#ba1a1a", "btn-reject-analyst-review"], ["needs_more_data", "Needs data", "#b26a00", "btn-needs-data-analyst-review"]].map(([v, l, col, tid]) => (
          <button key={v} data-testid={tid} onClick={() => setDecision(v)} className="rounded border px-2 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors"
            style={{ borderColor: decision === v ? col : "var(--border-highlight)", color: decision === v ? col : "#707881", background: decision === v ? `${col}18` : "transparent" }}>{l}</button>
        ))}
      </div>
      <div>
        <label className="label-mono block mb-1">Vessel {decision === "confirm" && <span style={{ color: "#ba1a1a" }}>*</span>}</label>
        <select data-testid="review-vessel-select" value={mmsi} onChange={(e) => setMmsi(e.target.value)} className={inputCls} style={bd}>
          <option value="">— none —</option>
          {candidates?.map((c) => <option key={c.mmsi} value={c.mmsi}>{`#${c.rank} ${c.vessel_name || c.mmsi} (${c.mmsi})`}</option>)}
        </select>
      </div>
      <div>
        <label className="label-mono block mb-1">Reason codes</label>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(reasonCodes || {}).map(([code, desc]) => (
            <button key={code} title={desc} data-testid={`reason-code-${code}`} onClick={() => toggle(code)}
              className={`rounded px-2 py-1 font-mono text-[10px] transition-colors ${codes.includes(code) ? "bg-cyan-400/15 text-cyan-300 border border-cyan-400/50" : "border border-slate-700 text-slate-400 hover:text-on-surface"}`}>{code.split("_")[0]}</button>
          ))}
        </div>
        {codes.length > 0 && <p className="mt-1.5 text-[11px] text-slate-400">{codes.map((c) => reasonCodes[c]).join(" · ")}</p>}
      </div>
      <div>
        <label className="label-mono block mb-1">Notes</label>
        <textarea data-testid="review-notes-input" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls} style={bd} placeholder="Corroborating intel, inspection results, uncertainty remarks…" />
      </div>
      <button data-testid="review-submit-button" disabled={busy} onClick={submit} className="rounded bg-cyan-400 px-4 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-slate-950 hover:bg-cyan-300 disabled:opacity-50">
        {busy ? "Saving…" : "Record decision"}
      </button>
      {hasRole(user, "supervisor") && <OverrideForm caseId={caseId} candidates={candidates} onSaved={onSaved} />}
    </div>
  );
};

const OverrideForm = ({ caseId, candidates, onSaved }) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("insufficient_evidence");
  const [mmsi, setMmsi] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/cases/${caseId}/override`, { attribution_status: status, vessel_mmsi: mmsi || null, notes, close_case: true });
      toast.success("Supervisor override recorded"); setNotes(""); setOpen(false); onSaved?.();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  return (
    <div className="mt-2 rounded border p-3" style={{ borderColor: "rgba(178,106,0,0.4)", background: "rgba(178,106,0,0.05)" }} data-testid="override-panel">
      <button data-testid="btn-override-toggle" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-amber-300"><ShieldAlert size={13} /> Supervisor override {open ? "▾" : "▸"}</button>
      {open && (
        <div className="mt-3 space-y-2 fade-up">
          <p className="text-[11px] text-slate-400">Force the attribution status and close the case. Logged as an immutable override decision.</p>
          <select data-testid="override-status-select" className={inputCls} style={bd} value={status} onChange={(e) => setStatus(e.target.value)}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select data-testid="override-vessel-select" className={inputCls} style={bd} value={mmsi} onChange={(e) => setMmsi(e.target.value)}>
            <option value="">— vessel (optional) —</option>
            {candidates?.map((c) => <option key={c.mmsi} value={c.mmsi}>{`#${c.rank} ${c.vessel_name || c.mmsi} (${c.mmsi})`}</option>)}
          </select>
          <textarea data-testid="override-notes-input" rows={2} className={inputCls} style={bd} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Justification (required)" />
          <button data-testid="btn-override-submit" disabled={busy || notes.trim().length < 3} onClick={submit} className="rounded px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-950 disabled:opacity-50" style={{ background: "#b26a00" }}>{busy ? "Saving…" : "Apply override"}</button>
        </div>
      )}
    </div>
  );
};

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, Send } from "lucide-react";
import { api, apiError, fmtTime } from "@/lib/api";

const inputCls = "w-full rounded border bg-slate-900/60 px-2.5 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-400/60";
const bd = { borderColor: "var(--border-highlight)" };

export const EmailSettings = ({ onChanged }) => {
  const [s, setS] = useState(null);
  const [key, setKey] = useState("");
  const [sender, setSender] = useState("");
  const [recipients, setRecipients] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => api.get("/settings/email").then((r) => { setS(r.data); setSender(r.data.sender_email || ""); setRecipients((r.data.alert_recipients || []).join(", ")); }).catch((e) => toast.error(apiError(e)));
  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    try {
      const body = { sender_email: sender, alert_recipients: recipients.split(/[,\s]+/).filter(Boolean) };
      if (key) body.resend_api_key = key;
      const { data } = await api.put("/settings/email", body);
      setS(data); setKey(""); toast.success("Email settings saved"); onChanged?.();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };
  const toggle = async () => { try { const { data } = await api.put("/settings/email", { enabled: !s.enabled }); setS(data); onChanged?.(); } catch (e) { toast.error(apiError(e)); } };
  const toggleAlerts = async () => { try { const { data } = await api.put("/settings/email", { alerts_enabled: !s.alerts_enabled }); setS(data); } catch (e) { toast.error(apiError(e)); } };
  const test = async () => {
    setBusy(true);
    try { const { data } = await api.post("/settings/email/test"); toast.success(`Test email sent to ${data.to}`); load(); }
    catch (e) { toast.error(apiError(e)); load(); } finally { setBusy(false); }
  };

  if (!s) return null;
  return (
    <div className="panel p-5 fade-up" data-testid="email-settings">
      <div className="mb-3 flex items-center gap-2"><Mail size={16} color="#006194" /><h2 className="font-display text-lg font-semibold">Email delivery (Resend)</h2>
        <span data-testid="email-configured-badge" className="ml-auto rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: s.configured ? "#006a61" : "#b26a00", border: `1px solid ${s.configured ? "#006a61" : "#b26a00"}66` }}>{s.configured ? "configured" : "not configured"}</span></div>
      <p className="mb-3 text-xs text-slate-400">Password-reset links and alert notifications (watchlist hits, high-confidence correlations, zone rules) are emailed through Resend. Create a key at resend.com/api-keys and verify a sender domain; <span className="font-mono">onboarding@resend.dev</span> works for test mode only.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block"><span className="label-mono mb-1 block">Resend API key {s.api_key && <span className="text-slate-500">(current {s.api_key} · {s.source})</span>}</span><input data-testid="email-api-key-input" type="password" className={inputCls} style={bd} value={key} onChange={(e) => setKey(e.target.value)} placeholder="re_…" autoComplete="off" /></label>
        <label className="block"><span className="label-mono mb-1 block">Sender address</span><input data-testid="email-sender-input" className={inputCls} style={bd} value={sender} onChange={(e) => setSender(e.target.value)} /></label>
        <label className="block sm:col-span-2"><span className="label-mono mb-1 block">Extra alert recipients (comma separated) — in addition to all active supervisors &amp; admins who haven't muted alert emails</span><input data-testid="email-alert-recipients-input" className={inputCls} style={bd} value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="duty-officer@agency.gov, ops@coastguard.example" /></label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button data-testid="btn-save-email-settings" disabled={busy} onClick={save} className="rounded bg-cyan-400 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-950 hover:bg-cyan-300 disabled:opacity-50">Save</button>
        <button data-testid="btn-test-email" disabled={busy || !s.api_key} onClick={test} className="inline-flex items-center gap-1.5 rounded border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-slate-300 hover:text-on-surface disabled:opacity-50" style={bd}><Send size={12} /> Send test to me</button>
        <label className="ml-auto flex items-center gap-1.5 font-mono text-[11px] text-slate-300"><input type="checkbox" data-testid="email-enabled-toggle" checked={s.enabled} onChange={toggle} /> delivery enabled</label>
        <label className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300"><input type="checkbox" data-testid="email-alerts-toggle" checked={s.alerts_enabled} onChange={toggleAlerts} /> alert emails</label>
      </div>
      {s.last_test && <p className="mt-2 font-mono text-[10px]" style={{ color: s.last_test.sent ? "#006a61" : "#ba1a1a" }} data-testid="email-last-test">last test {fmtTime(s.last_test.at)} → {s.last_test.sent ? `sent (${s.last_test.id})` : `failed: ${s.last_test.error}`}</p>}
    </div>
  );
};

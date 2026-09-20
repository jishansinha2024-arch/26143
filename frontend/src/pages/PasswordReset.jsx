import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Radar, KeyRound, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { api, apiError } from "@/lib/api";

const inputCls = "w-full rounded border bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/60";
const bd = { borderColor: "var(--border-highlight)" };

const Shell = ({ title, sub, children, testId }) => (
  <div className="grid h-screen place-items-center p-6 grid-bg" style={{ background: "var(--bg-primary)" }} data-testid={testId}>
    <div className="w-full max-w-md rounded-xl bg-surface-container-lowest p-8 shadow-[0_8px_32px_rgba(25,28,30,0.08)] fade-up">
      <div className="mb-5 flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-md" style={{ background: "rgba(0,97,148,0.12)", border: "1px solid rgba(0,97,148,0.4)" }}><Radar size={16} color="#006194" /></span><span className="font-display text-lg font-bold">VARUNA <span style={{ color: "#006194" }}>NETRA</span></span></div>
      <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
      {children}
      <Link to="/login" data-testid="back-to-login" className="mt-6 block font-mono text-[11px] uppercase tracking-wider text-cyan-300 hover:underline">← back to sign in</Link>
    </div>
  </div>
);

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { const { data } = await api.post("/auth/forgot-password", { email }); setDone(data); }
    catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  };
  return (
    <Shell title="Reset your password" sub="Enter your account email. A single-use reset link (valid 60 minutes) will be issued." testId="forgot-password-page">
      {done ? (
        <div className="mt-5 rounded border p-4 text-sm" style={{ borderColor: "rgba(0,106,97,0.4)", background: "rgba(0,106,97,0.08)" }} data-testid="forgot-password-done">
          <div className="flex items-center gap-2 text-emerald-300"><MailCheck size={16} /> Request received</div>
          <p className="mt-2 text-xs text-slate-300">{done.message}</p>
          {done.delivery === "logged" && <p className="mt-2 text-[11px] text-amber-300" data-testid="forgot-password-fallback">Email delivery is not configured on this deployment — an administrator can hand you the link from the Users page.</p>}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block"><span className="label-mono mb-1 block">Email</span><input data-testid="forgot-email-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} style={bd} /></label>
          <button data-testid="forgot-submit-button" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded bg-cyan-400 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-slate-950 hover:bg-cyan-300 disabled:opacity-50"><KeyRound size={14} /> {busy ? "Sending…" : "Send reset link"}</button>
        </form>
      )}
    </Shell>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault(); setError("");
    if (pw !== pw2) { setError("Passwords do not match"); return; }
    setBusy(true);
    try { const { data } = await api.post("/auth/reset-password", { token, new_password: pw }); toast.success(`Password updated for ${data.email}`); nav("/login"); }
    catch (err) { setError(apiError(err)); } finally { setBusy(false); }
  };
  return (
    <Shell title="Choose a new password" sub="Minimum 8 characters. The reset link is single-use." testId="reset-password-page">
      {!token ? <p className="mt-4 text-xs text-rose-300" data-testid="reset-missing-token">Missing reset token — open the link from your email.</p> : (
        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block"><span className="label-mono mb-1 block">New password</span><input data-testid="reset-password-input" type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} className={inputCls} style={bd} /></label>
          <label className="block"><span className="label-mono mb-1 block">Confirm password</span><input data-testid="reset-password-confirm-input" type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} className={inputCls} style={bd} /></label>
          {error && <p data-testid="reset-error" className="rounded px-3 py-2 text-xs" style={{ color: "#ba1a1a", background: "rgba(186,26,26,0.1)", border: "1px solid rgba(186,26,26,0.4)" }}>{error}</p>}
          <button data-testid="reset-submit-button" disabled={busy} className="w-full rounded bg-cyan-400 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-slate-950 hover:bg-cyan-300 disabled:opacity-50">{busy ? "Updating…" : "Set new password"}</button>
        </form>
      )}
    </Shell>
  );
}

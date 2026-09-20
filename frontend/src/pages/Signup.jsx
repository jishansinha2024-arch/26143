import { useEffect, useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { Radar, UserPlus, Compass } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api, apiError } from "@/lib/api";

export default function Signup() {
  const { user, signup, guestLogin } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "", organization: "" });
  const [busy, setBusy] = useState(false);
  const [exploreBusy, setExploreBusy] = useState(false);
  const [caps, setCaps] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { api.get("/auth/capabilities").then((r) => setCaps(r.data)).catch(() => setCaps(null)); }, []);
  const googleReady = caps?.authentication?.google?.enabled === true;

  if (user) return <Navigate to="/" replace />;

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e?.preventDefault();
    setError("");
    if (f.password !== f.confirm) { setError("Passwords do not match"); return; }
    setBusy(true);
    try {
      const u = await signup({ name: f.name, email: f.email, password: f.password, organization: f.organization || null });
      toast.success(`Welcome, ${u.name} — you have Viewer access`);
      nav("/", { replace: true });
    } catch (err) { setError(apiError(err)); } finally { setBusy(false); }
  };

  const explore = async () => {
    if (exploreBusy) return;
    setExploreBusy(true);
    try { await guestLogin(); nav("/", { replace: true }); } catch (err) { setError(apiError(err)); setExploreBusy(false); }
  };

  const googleSignIn = () => {
    const redirectUrl = window.location.origin + "/";
    const googleAuthUrl = process.env.REACT_APP_GOOGLE_AUTH_URL || `${(process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "")}/api/auth/google`;
    window.location.href = `${googleAuthUrl}?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const inputCls = "w-full rounded border bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400/60";
  return (
    <div className="grid h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]" style={{ background: "var(--bg-primary)" }} data-testid="signup-page">
      <div className="hidden lg:flex flex-col justify-between p-12 grid-bg bg-surface-container-low" style={{ borderColor: "var(--border-default)" }}>
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-md" style={{ background: "rgba(0,97,148,0.12)", border: "1px solid rgba(0,97,148,0.4)" }}><Radar size={18} color="#006194" /></span>
          <span className="font-display text-xl font-bold tracking-tight">Varuna <span style={{ color: "#006194" }}>Netra</span></span>
        </div>
        <div className="max-w-lg fade-up">
          <p className="label-mono mb-3">Create your account</p>
          <h1 className="font-display text-4xl font-bold tracking-[-0.03em] lg:text-5xl leading-[1.05]">Satellite spill detection, AIS correlation, auditable decisions.</h1>
          <p className="mt-5 text-sm leading-relaxed text-slate-400">New accounts receive read-only <span className="text-cyan-300">Viewer</span> access. Analyst and Supervisor access require administrator approval. Administrator access is never self-assigned.</p>
        </div>
        <div className="font-mono text-[11px] text-slate-500">Decision support · not a legal determination</div>
      </div>
      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-md rounded-xl bg-surface-container-lowest p-8 shadow-[0_8px_32px_rgba(25,28,30,0.08)] fade-up" data-testid="signup-form">
          <h2 className="font-display text-2xl font-bold tracking-tight">Create account</h2>
          <p className="mt-1 text-xs text-slate-400">Free Viewer access — explore every investigation, read-only.</p>
          <label className="mt-6 block"><span className="label-mono mb-1 block">Full name</span>
            <input data-testid="signup-name-input" value={f.name} onChange={set("name")} required className={inputCls} style={{ borderColor: "var(--border-highlight)" }} /></label>
          <label className="mt-3 block"><span className="label-mono mb-1 block">Email</span>
            <input data-testid="signup-email-input" type="email" autoComplete="username" value={f.email} onChange={set("email")} required className={inputCls} style={{ borderColor: "var(--border-highlight)" }} /></label>
          <label className="mt-3 block"><span className="label-mono mb-1 block">Organization / Institution (optional)</span>
            <input data-testid="signup-org-input" value={f.organization} onChange={set("organization")} className={inputCls} style={{ borderColor: "var(--border-highlight)" }} /></label>
          <label className="mt-3 block"><span className="label-mono mb-1 block">Password (min 10, letters + numbers)</span>
            <input data-testid="signup-password-input" type="password" autoComplete="new-password" value={f.password} onChange={set("password")} required className={inputCls} style={{ borderColor: "var(--border-highlight)" }} /></label>
          <label className="mt-3 block"><span className="label-mono mb-1 block">Confirm password</span>
            <input data-testid="signup-confirm-input" type="password" autoComplete="new-password" value={f.confirm} onChange={set("confirm")} required className={inputCls} style={{ borderColor: "var(--border-highlight)" }} /></label>
          {error && <p data-testid="signup-error" className="mt-3 rounded px-3 py-2 text-xs" style={{ color: "#ba1a1a", background: "rgba(186,26,26,0.1)", border: "1px solid rgba(186,26,26,0.4)" }}>{error}</p>}
          <button data-testid="signup-submit-button" disabled={busy} type="submit" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded bg-cyan-400 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-slate-950 hover:bg-cyan-300 disabled:opacity-50">
            <UserPlus size={14} /> {busy ? "Creating…" : "Create account"}
          </button>
          {googleReady && (
            <button type="button" data-testid="signup-google-button" onClick={googleSignIn} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded border px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-slate-100 hover:bg-slate-800/60" style={{ borderColor: "var(--border-highlight)" }}>
              <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.8l-7.7-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
              Continue with Google
            </button>
          )}
          <div className="mt-5 flex items-center gap-3"><span className="h-px flex-1" style={{ background: "var(--border-default)" }} /><span className="label-mono">or</span><span className="h-px flex-1" style={{ background: "var(--border-default)" }} /></div>
          <button type="button" data-testid="signup-explore-button" onClick={explore} disabled={exploreBusy} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded border px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-cyan-200 hover:bg-cyan-400/10 disabled:opacity-50" style={{ borderColor: "rgba(0,97,148,0.4)" }}>
            <Compass size={14} /> {exploreBusy ? "Entering…" : "Explore without an account"}
          </button>
          <Link to="/login" data-testid="have-account-link" className="mt-3 block text-center font-mono text-[11px] uppercase tracking-wider text-slate-400 hover:text-cyan-300">Already have an account? Sign in</Link>
        </form>
      </div>
    </div>
  );
}

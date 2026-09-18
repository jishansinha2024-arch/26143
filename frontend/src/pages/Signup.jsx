import { useEffect, useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { Radar, UserPlus, Compass, Eye, EyeOff, Mail, Lock, User, Building, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api, apiError } from "@/lib/api";

export default function Signup() {
  const { user, signup, guestLogin } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "", organization: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exploreBusy, setExploreBusy] = useState(false);
  const [caps, setCaps] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/auth/capabilities").then((r) => setCaps(r.data)).catch(() => setCaps(null));
  }, []);
  const googleReady = caps?.authentication?.google?.enabled === true;

  if (user) return <Navigate to="/" replace />;

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e?.preventDefault();
    setError("");
    if (f.password !== f.confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const u = await signup({
        name: f.name,
        email: f.email,
        password: f.password,
        organization: f.organization || null,
      });
      toast.success(`Welcome, ${u.name} — you have Viewer access`);
      nav("/", { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const explore = async () => {
    if (exploreBusy) return;
    setExploreBusy(true);
    try {
      await guestLogin();
      nav("/", { replace: true });
    } catch (err) {
      setError(apiError(err));
      setExploreBusy(false);
    }
  };

  const googleSignIn = () => {
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const inputCls =
    "w-full rounded-lg border border-[#1E314B] bg-[#080D1A]/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF]/40";

  return (
    <div
      className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr] bg-[#070D18] text-slate-100 selection:bg-cyan-500/20 selection:text-white"
      data-testid="signup-page"
    >
      {/* Left hero */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 border-r relative overflow-hidden grid-bg"
        style={{ borderColor: "var(--border-default)" }}
      >
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 place-items-center rounded-lg shadow-lg"
            style={{
              background: "linear-gradient(135deg, rgba(0,229,255,0.18), rgba(56,189,248,0.06))",
              border: "1px solid rgba(0,229,255,0.4)",
              boxShadow: "0 0 15px rgba(0,229,255,0.15)",
            }}
          >
            <Radar size={20} className="text-[#00E5FF]" />
          </span>
          <div>
            <div className="font-display text-2xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
              Varuna <span className="text-[#00E5FF]">Netra</span>
            </div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-slate-400 uppercase">
              Maritime Domain Awareness &amp; Correlation
            </p>
          </div>
        </div>

        <div className="max-w-lg my-auto py-8 fade-up">
          <p className="label-mono mb-3 text-cyan-400">Create your account</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight lg:text-5xl leading-[1.08] text-white">
            Satellite spill detection, AIS correlation, auditable decisions.
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-slate-300">
            New accounts receive read-only <span className="text-cyan-300 font-semibold">Viewer</span> access to all active maritime investigations. Analyst and Supervisor credentials require agency administrator verification.
          </p>

          <div className="mt-6 rounded-lg border border-[#1B2B44] bg-[#0E172A]/70 p-4 text-xs text-slate-400">
            <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 block mb-1">
              Role-Based Access Control
            </span>
            Viewer accounts can explore live surveillance, inspect candidate vessel rankings, search EEZ zones, and review historical precedent cases.
          </div>
        </div>

        <div className="font-mono text-[11px] text-slate-500 border-t border-[#1B2B44] pt-4">
          Decision support system · Not a formal legal determination
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-10 relative overflow-y-auto">
        <div className="w-full max-w-md py-6">
          <form
            onSubmit={submit}
            className="panel p-8 sm:p-9 shadow-2xl relative border-[#1B2B44] bg-[#0E172A]"
            data-testid="signup-form"
          >
            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold tracking-tight text-white">Create Account</h2>
                <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                  FREE VIEWER
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Instant read-only access to explore every maritime investigation.
              </p>
            </div>

            <div className="mt-6 space-y-3.5">
              <label className="block">
                <span className="label-mono mb-1 block flex items-center gap-1.5 text-slate-300">
                  <User size={12} className="text-slate-400" /> Full name
                </span>
                <input
                  data-testid="signup-name-input"
                  value={f.name}
                  onChange={set("name")}
                  placeholder="Officer Jane Doe"
                  required
                  className={inputCls}
                />
              </label>

              <label className="block">
                <span className="label-mono mb-1 block flex items-center gap-1.5 text-slate-300">
                  <Mail size={12} className="text-slate-400" /> Official / Work Email
                </span>
                <input
                  data-testid="signup-email-input"
                  type="email"
                  autoComplete="username"
                  value={f.email}
                  onChange={set("email")}
                  placeholder="jane.doe@coastguard.org"
                  required
                  className={inputCls}
                />
              </label>

              <label className="block">
                <span className="label-mono mb-1 block flex items-center gap-1.5 text-slate-300">
                  <Building size={12} className="text-slate-400" /> Organization / Authority (optional)
                </span>
                <input
                  data-testid="signup-org-input"
                  value={f.organization}
                  onChange={set("organization")}
                  placeholder="Maritime Safety Administration"
                  className={inputCls}
                />
              </label>

              <label className="block">
                <span className="label-mono mb-1 block flex items-center gap-1.5 text-slate-300">
                  <Lock size={12} className="text-slate-400" /> Password (min 10, letters + numbers)
                </span>
                <div className="relative">
                  <input
                    data-testid="signup-password-input"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={f.password}
                    onChange={set("password")}
                    placeholder="••••••••••"
                    required
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </label>

              <label className="block">
                <span className="label-mono mb-1 block flex items-center gap-1.5 text-slate-300">
                  <Lock size={12} className="text-slate-400" /> Confirm password
                </span>
                <div className="relative">
                  <input
                    data-testid="signup-confirm-input"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    value={f.confirm}
                    onChange={set("confirm")}
                    placeholder="••••••••••"
                    required
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirm((p) => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-200"
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </label>
            </div>

            {error && (
              <div
                data-testid="signup-error"
                className="mt-4 flex items-start gap-2 rounded-lg p-3 text-xs text-rose-300"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                }}
              >
                <AlertCircle size={15} className="shrink-0 text-rose-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              data-testid="signup-submit-button"
              disabled={busy}
              type="submit"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#00E5FF] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-[#070D18] shadow-lg shadow-cyan-500/20 hover:bg-[#38BDF8] disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Creating Account…
                </>
              ) : (
                <>
                  <UserPlus size={15} /> Create Account
                </>
              )}
            </button>

            {googleReady && (
              <button
                type="button"
                data-testid="signup-google-button"
                onClick={googleSignIn}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#1E314B] bg-[#0A1221] px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-slate-200 hover:bg-[#121E33]"
              >
                <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
                  <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z" />
                  <path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.8l-7.7-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
                </svg>
                Continue with Google
              </button>
            )}

            <div className="mt-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-[#1B2B44]" />
              <span className="label-mono text-[10px] text-slate-500">or</span>
              <span className="h-px flex-1 bg-[#1B2B44]" />
            </div>

            <button
              type="button"
              data-testid="signup-explore-button"
              onClick={explore}
              disabled={exploreBusy}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-400/30 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-cyan-200 hover:bg-cyan-400/10 disabled:opacity-50"
            >
              <Compass size={14} /> {exploreBusy ? "Entering…" : "Explore without an account"}
            </button>

            <Link
              to="/login"
              data-testid="have-account-link"
              className="mt-4 block text-center font-mono text-[11px] uppercase tracking-wider text-slate-400 hover:text-cyan-300"
            >
              Already have an account? Sign in →
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}

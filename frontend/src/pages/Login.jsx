import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, Link } from "react-router-dom";
import {
  Radar,
  LogIn,
  Compass,
  Satellite,
  Waypoints,
  Lightbulb,
  FileCheck2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Anchor,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api, apiError } from "@/lib/api";

const DEMO = [
  { role: "analyst", email: "analyst@sentinelmar.demo", scope: "ingest · correlate · review" },
  { role: "supervisor", email: "supervisor@sentinelmar.demo", scope: "+ acknowledge alerts · override cases" },
];
const DEMO_PASSWORDS = {};

const STEPS = [
  {
    icon: Satellite,
    title: "Detect",
    badge: "SAR RADAR",
    body: "Sentinel-1 synthetic aperture radar detects dark slicks and anomalies at sea.",
  },
  {
    icon: Waypoints,
    title: "Correlate",
    badge: "AIS VECTORS",
    body: "Spatial and temporal alignment with vessel tracks along drift corridors.",
  },
  {
    icon: Lightbulb,
    title: "Explain",
    badge: "6 FACTORS",
    body: "Multi-factor attribution scoring explains exactly why each vessel is ranked.",
  },
  {
    icon: FileCheck2,
    title: "Verify",
    badge: "EVIDENCE VAULT",
    body: "Jurisdiction analysis, chain-of-custody, and audit logs support review.",
  },
];

const REMEMBER_KEY = "varuna_netra_remember_email";

export default function Login() {
  const { user, login, guestLogin } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem(REMEMBER_KEY) || ""; } catch { return ""; }
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try { return !!localStorage.getItem(REMEMBER_KEY); } catch { return false; }
  });
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [exploreBusy, setExploreBusy] = useState(false);
  const [caps, setCaps] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/auth/capabilities").then((r) => setCaps(r.data)).catch(() => setCaps(null));
  }, []);

  const googleReady = caps?.authentication?.google?.enabled === true;
  const showDemo = caps?.demo_mode === true;

  if (user) return <Navigate to={loc.state?.from || "/"} replace />;

  const googleSignIn = () => {
    if (googleBusy) return;
    setGoogleBusy(true);
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const explore = async () => {
    if (exploreBusy) return;
    setExploreBusy(true);
    setError("");
    try {
      await guestLogin();
      nav("/", { replace: true });
    } catch (err) {
      setError(apiError(err));
      setExploreBusy(false);
    }
  };

  const submit = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (rememberMe && email) {
        try { localStorage.setItem(REMEMBER_KEY, email); } catch { /* ignore */ }
      } else {
        try { localStorage.removeItem(REMEMBER_KEY); } catch { /* ignore */ }
      }
      const u = await login(email, password);
      toast.success(`Signed in as ${u.name} (${u.role})`);
      nav(loc.state?.from || "/", { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.15fr_1fr] bg-[#070D18] text-slate-100 selection:bg-cyan-500/20 selection:text-white"
      data-testid="login-page"
    >
      {/* HERO / TACTICAL MARITIME INTELLIGENCE SIDE */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 border-r relative overflow-hidden grid-bg"
        style={{ borderColor: "var(--border-default)" }}
      >
        {/* Background ambient lighting */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="grid h-10 w-10 place-items-center rounded-lg shadow-lg"
              style={{
                background: "linear-gradient(135deg, rgba(0,229,255,0.18), rgba(56,189,248,0.06))",
                border: "1px solid rgba(0,229,255,0.4)",
                boxShadow: "0 0 15px rgba(0,229,255,0.15)",
              }}
            >
              <Radar size={20} className="text-[#00E5FF] animate-pulse" />
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
          <div className="flex items-center gap-2 rounded-full border border-[#1B2B44] bg-[#0B1424]/80 px-3 py-1 text-[11px] font-mono text-slate-400">
            <span className="pulse-dot" />
            <span className="text-slate-300">LIVE SURVEILLANCE ACTIVE</span>
          </div>
        </div>

        {/* Value Proposition Content */}
        <div className="relative z-10 max-w-xl my-auto py-8 fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-cyan-300 mb-5">
            <Shield size={12} /> AI-Assisted Maritime Oil-Spill Intelligence
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight lg:text-5xl leading-[1.08] text-white">
            Detect spills. Correlate vessels. <br />
            <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-slate-200 bg-clip-text text-transparent">
              Explain the evidence.
            </span>
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-slate-300 font-normal">
            Detect marine oil discharges from Sentinel-1 synthetic aperture radar (SAR), correlate candidate vessels with spatial-temporal AIS trajectories, evaluate jurisdiction under UNCLOS, and prepare tamper-evident evidence packages.
          </p>

          {/* Workflow Steps Grid */}
          <div className="mt-8 grid grid-cols-2 gap-3" data-testid="what-it-does">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.title}
                  className="rounded-lg border p-4 transition-all duration-200 hover:border-cyan-400/40 hover:bg-[#111D32]/80"
                  style={{
                    borderColor: "var(--border-default)",
                    background: "rgba(17,28,49,0.55)",
                    backdropFilter: "blur(8px)",
                    animationDelay: `${i * 60}ms`,
                  }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="grid h-7 w-7 place-items-center rounded-md"
                        style={{
                          background: "rgba(0,229,255,0.12)",
                          border: "1px solid rgba(0,229,255,0.3)",
                        }}
                      >
                        <Icon size={14} className="text-[#00E5FF]" />
                      </span>
                      <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-200">
                        {s.title}
                      </span>
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-cyan-400/80 bg-cyan-400/10 px-1.5 py-0.5 rounded">
                      {s.badge}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-400">{s.body}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between pt-4 border-t border-[#1B2B44] text-[11px] font-mono text-slate-500">
          <span>Decision support system · Not a final legal determination</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <Anchor size={12} className="text-cyan-400" /> IMO &amp; MARPOL Annex I standard
          </span>
        </div>
      </div>

      {/* AUTH CARD / FORM SIDE */}
      <div className="flex items-center justify-center p-6 sm:p-10 relative overflow-y-auto">
        <div className="w-full max-w-md py-6">
          {/* Mobile branding header */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <span
              className="grid h-9 w-9 place-items-center rounded-lg"
              style={{
                background: "rgba(0,229,255,0.15)",
                border: "1px solid rgba(0,229,255,0.4)",
              }}
            >
              <Radar size={18} className="text-[#00E5FF]" />
            </span>
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-white">
                Varuna <span className="text-[#00E5FF]">Netra</span>
              </span>
              <p className="font-mono text-[10px] text-slate-400 uppercase">Maritime Intelligence</p>
            </div>
          </div>

          <form
            onSubmit={submit}
            className="panel p-8 sm:p-9 shadow-2xl relative border-[#1B2B44] bg-[#0E172A]"
            data-testid="login-form"
          >
            {/* Header */}
            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold tracking-tight text-white">
                  Console Sign In
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">
                  SECURE AUTH
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Sign in to access satellite spill correlation, vessel AIS trajectories, and analyst reviews.
              </p>
            </div>

            {/* Quick Guest Access Button */}
            <div className="mt-5">
              <button
                type="button"
                data-testid="explore-guest-button"
                onClick={explore}
                disabled={exploreBusy}
                className="group relative flex w-full items-center justify-between rounded-lg border px-4 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-cyan-200 transition-all duration-200 hover:bg-cyan-400/10 hover:border-cyan-400/70 disabled:opacity-50"
                style={{ borderColor: "rgba(0,229,255,0.35)", background: "rgba(0,229,255,0.04)" }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid h-6 w-6 place-items-center rounded bg-cyan-400/15 text-cyan-300 group-hover:scale-110 transition-transform">
                    <Compass size={14} />
                  </span>
                  <span>{exploreBusy ? "Entering Console…" : "Explore as Guest"}</span>
                </div>
                <span className="font-mono text-[10px] text-cyan-400/80 lowercase tracking-normal">
                  (read-only) →
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="mt-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-[#1B2B44]" />
              <span className="label-mono text-[10px] text-slate-400">or sign in with credentials</span>
              <span className="h-px flex-1 bg-[#1B2B44]" />
            </div>

            {/* Form Fields */}
            <div className="mt-5 space-y-4">
              <div>
                <label className="block">
                  <span className="label-mono mb-1.5 block flex items-center gap-1.5 text-slate-300">
                    <Mail size={12} className="text-slate-400" /> Account Email
                  </span>
                  <input
                    data-testid="login-email-input"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="analyst@sentinelmar.demo"
                    required
                    className="w-full rounded-lg border bg-[#080D1A]/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF]/40 border-[#1E314B]"
                  />
                </label>
              </div>

              <div>
                <label className="block">
                  <span className="label-mono mb-1.5 block flex items-center gap-1.5 text-slate-300">
                    <Lock size={12} className="text-slate-400" /> Password
                  </span>
                  <div className="relative">
                    <input
                      data-testid="login-password-input"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full rounded-lg border bg-[#080D1A]/80 px-3.5 py-2.5 pr-10 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF]/40 border-[#1E314B]"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((p) => !p)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </label>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="mt-3.5 flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-400 hover:text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#1E314B] bg-[#080D1A] text-cyan-400 focus:ring-cyan-400/40"
                />
                <span>Remember email</span>
              </label>
              <Link
                to="/forgot-password"
                data-testid="forgot-password-link"
                className="font-mono text-[11px] uppercase tracking-wider text-slate-400 hover:text-cyan-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Error Message */}
            {error && (
              <div
                data-testid="login-error"
                className="mt-4 flex items-start gap-2.5 rounded-lg p-3 text-xs text-rose-300"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                }}
              >
                <AlertCircle size={15} className="shrink-0 text-rose-400 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              data-testid="login-submit-button"
              disabled={busy}
              type="submit"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#00E5FF] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-[#070D18] shadow-lg shadow-cyan-500/20 transition-all hover:bg-[#38BDF8] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Signing in…
                </>
              ) : (
                <>
                  <LogIn size={15} /> Sign In to Console
                </>
              )}
            </button>

            {/* Sign up Link */}
            <div className="mt-4 text-center">
              <Link
                to="/signup"
                data-testid="create-account-link"
                className="font-mono text-[11px] uppercase tracking-wider text-cyan-300 hover:text-cyan-200 transition-colors"
              >
                Create account — free Viewer access →
              </Link>
            </div>

            {/* Google OAuth (if enabled) */}
            {googleReady && (
              <div className="mt-5" data-testid="google-signin-block">
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-[#1B2B44]" />
                  <span className="label-mono text-[10px] text-slate-500">or</span>
                  <span className="h-px flex-1 bg-[#1B2B44]" />
                </div>
                <button
                  type="button"
                  data-testid="google-signin-button"
                  onClick={googleSignIn}
                  disabled={googleBusy}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#1E314B] bg-[#0A1221] px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-slate-200 hover:bg-[#121E33] hover:border-slate-600 transition-colors disabled:opacity-50"
                >
                  <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
                    <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z" />
                    <path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.8l-7.7-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
                  </svg>
                  {googleBusy ? "Redirecting to Google…" : "Continue with Google"}
                </button>
                <p className="mt-2 text-center text-[10px] text-slate-500">
                  New Google users get read-only Viewer access. Existing accounts keep their role.
                </p>
              </div>
            )}

            {/* Demo Accounts Panel */}
            {showDemo && (
              <div className="mt-6 border-t border-[#1B2B44] pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="label-mono text-[10px] text-slate-400">Demo accounts</p>
                  <span className="font-mono text-[9px] text-slate-500">Quick pre-fill</span>
                </div>
                <div className="space-y-1.5">
                  {DEMO.map((d) => (
                    <button
                      key={d.role}
                      type="button"
                      data-testid={`demo-login-${d.role}`}
                      onClick={() => {
                        setEmail(d.email);
                        setPassword(DEMO_PASSWORDS[d.role] || "");
                      }}
                      className="flex w-full items-center justify-between rounded-md border border-[#1E314B] bg-[#0A1221] px-3 py-2 text-left text-xs transition-colors hover:border-cyan-400/40 hover:bg-[#121E33]"
                    >
                      <span>
                        <span className="font-mono uppercase tracking-wider text-cyan-300 font-semibold">
                          {d.role}
                        </span>
                        <span className="text-slate-400 ml-2 font-mono text-[11px]">{d.email}</span>
                      </span>
                      <span className="text-[10px] text-slate-500">{d.scope}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-slate-500 leading-relaxed">
                  {Object.keys(DEMO_PASSWORDS).length
                    ? "Demo credentials are pre-filled."
                    : "Demo buttons pre-fill the email only — enter the issued password."}{" "}
                  Admin account is the workspace owner email.
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

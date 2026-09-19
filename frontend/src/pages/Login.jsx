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
  ArrowRight,
  Radio,
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
    body: "Sentinel-1 synthetic aperture radar detects dark slicks and marine anomalies.",
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
    const googleAuthUrl = process.env.REACT_APP_GOOGLE_AUTH_URL || `${(process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "")}/api/auth/google`;
    window.location.href = `${googleAuthUrl}?redirect=${encodeURIComponent(redirectUrl)}`;
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
      className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.15fr_1fr] bg-[#F8FAFC] text-slate-900 selection:bg-sky-500/20 selection:text-sky-900"
      data-testid="login-page"
    >
      {/* HERO / TACTICAL MARITIME INTELLIGENCE SIDE */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 bg-[#0B1528] text-slate-100 relative overflow-hidden border-r border-[#1E2E4A]"
      >
        {/* Subtle Maritime Radar Vector Background SVG */}
        <div className="pointer-events-none absolute inset-0 opacity-15 overflow-hidden flex items-center justify-center">
          <svg className="w-[850px] h-[850px] text-sky-400" viewBox="0 0 400 400" fill="none" stroke="currentColor">
            <circle cx="200" cy="200" r="180" strokeWidth="0.75" strokeDasharray="4 4" />
            <circle cx="200" cy="200" r="140" strokeWidth="0.75" />
            <circle cx="200" cy="200" r="100" strokeWidth="0.75" strokeDasharray="3 3" />
            <circle cx="200" cy="200" r="60" strokeWidth="0.75" />
            <circle cx="200" cy="200" r="20" strokeWidth="0.75" />
            <line x1="20" y1="200" x2="380" y2="200" strokeWidth="0.75" strokeDasharray="2 2" />
            <line x1="200" y1="20" x2="200" y2="380" strokeWidth="0.75" strokeDasharray="2 2" />
            <line x1="72" y1="72" x2="328" y2="328" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.6" />
            <line x1="72" y1="328" x2="328" y2="72" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.6" />
            {/* Simulated vessel vectors */}
            <path d="M 160 140 Q 185 170 230 190 T 290 240" strokeWidth="1.5" stroke="#38BDF8" fill="none" opacity="0.8" />
            <circle cx="230" cy="190" r="3" fill="#38BDF8" />
            <circle cx="290" cy="240" r="4" fill="#F59E0B" />
          </svg>
        </div>

        {/* Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="grid h-10 w-10 place-items-center rounded-lg shadow-md bg-gradient-to-br from-sky-500/20 to-sky-600/10 border border-sky-400/30 text-sky-400"
            >
              <Radar size={22} className="animate-pulse" />
            </span>
            <div>
              <div className="font-display text-2xl font-bold tracking-tight text-white flex items-center gap-1.5">
                Varuna <span className="text-sky-400 font-extrabold">Netra</span>
              </div>
              <p className="font-mono text-[10px] tracking-[0.2em] text-slate-400 uppercase">
                Maritime Domain Awareness &amp; Attribution
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-950/60 px-3 py-1 text-[11px] font-mono text-sky-300 shadow-sm">
            <span className="pulse-dot" />
            <span className="font-semibold tracking-wider">LIVE SURVEILLANCE</span>
          </div>
        </div>

        {/* Value Proposition Content */}
        <div className="relative z-10 max-w-xl my-auto py-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-sky-300 mb-5">
            <Shield size={13} /> AI-Assisted Maritime Oil-Spill Intelligence
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight lg:text-5xl leading-[1.12] text-white">
            Detect spills. Correlate vessels. <br />
            <span className="text-sky-300">
              Explain the evidence.
            </span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-300 font-normal">
            Detect marine oil discharges from Sentinel-1 synthetic aperture radar (SAR), correlate candidate vessels with spatial-temporal AIS trajectories, evaluate jurisdiction under UNCLOS, and prepare tamper-evident evidence packages.
          </p>

          {/* Workflow Steps Grid */}
          <div className="mt-8 grid grid-cols-2 gap-3" data-testid="what-it-does">
            {STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.title}
                  className="rounded-xl border border-[#1E2E4A] bg-[#101F38]/80 p-4 transition-all duration-200 hover:border-sky-400/40 hover:bg-[#162B4D]/80 shadow-xs"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-sky-500/15 border border-sky-400/30 text-sky-300">
                        <Icon size={14} />
                      </span>
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                        {s.title}
                      </span>
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-sky-400 bg-sky-400/10 px-1.5 py-0.5 rounded font-semibold">
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
        <div className="relative z-10 flex items-center justify-between pt-4 border-t border-[#1E2E4A] text-[11px] font-mono text-slate-400">
          <span>Decision support system · Not a final legal determination</span>
          <span className="flex items-center gap-1.5 text-slate-300">
            <Anchor size={13} className="text-sky-400" /> IMO &amp; MARPOL Annex I standard
          </span>
        </div>
      </div>

      {/* AUTH CARD / FORM SIDE */}
      <div className="flex items-center justify-center p-6 sm:p-10 relative overflow-y-auto">
        <div className="w-full max-w-md py-6">
          {/* Mobile branding header */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#0B1528] text-sky-400 shadow-md">
              <Radar size={20} />
            </span>
            <div>
              <span className="font-display text-xl font-bold tracking-tight text-slate-900">
                Varuna <span className="text-sky-600 font-extrabold">Netra</span>
              </span>
              <p className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Maritime Intelligence</p>
            </div>
          </div>

          <form
            onSubmit={submit}
            className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-9 shadow-sm relative"
            data-testid="login-form"
          >
            {/* Header */}
            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                  Console Sign In
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 font-semibold">
                  SECURE ACCESS
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
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
                className="group flex w-full items-center justify-between rounded-xl border border-sky-200 bg-sky-50/50 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-sky-900 transition-all duration-150 hover:bg-sky-100/70 hover:border-sky-300 disabled:opacity-50"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-sky-600 text-white group-hover:scale-105 transition-transform shadow-xs">
                    <Compass size={15} />
                  </span>
                  <span>{exploreBusy ? "Entering Console…" : "Explore as Guest"}</span>
                </div>
                <span className="font-mono text-[10.5px] text-sky-700 lowercase tracking-normal flex items-center gap-1 font-medium">
                  read-only <ArrowRight size={12} />
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="mt-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="label-mono text-[10px] text-slate-400">or sign in with credentials</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Form Fields */}
            <div className="mt-5 space-y-4">
              <div>
                <label className="block">
                  <span className="label-mono mb-1.5 flex items-center gap-1.5 text-slate-700">
                    <Mail size={13} className="text-slate-500" /> Account Email
                  </span>
                  <input
                    data-testid="login-email-input"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="analyst@sentinelmar.demo"
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
                  />
                </label>
              </div>

              <div>
                <label className="block">
                  <span className="label-mono mb-1.5 flex items-center gap-1.5 text-slate-700">
                    <Lock size={13} className="text-slate-500" /> Password
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
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((p) => !p)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="mt-3.5 flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="font-medium">Remember email</span>
              </label>
              <Link
                to="/forgot-password"
                data-testid="forgot-password-link"
                className="font-mono text-[11px] uppercase tracking-wider text-sky-700 hover:text-sky-900 font-semibold transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Error Message */}
            {error && (
              <div
                data-testid="login-error"
                className="mt-4 flex items-start gap-2.5 rounded-lg p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200"
              >
                <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
                <span className="leading-relaxed font-medium">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              data-testid="login-submit-button"
              disabled={busy}
              type="submit"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B1528] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-[#162B4D] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? (
                <>
                  <Loader2 size={15} className="animate-spin text-sky-400" /> Signing in…
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
                className="font-mono text-[11px] uppercase tracking-wider text-sky-700 hover:text-sky-900 font-semibold transition-colors"
              >
                Create account — free Viewer access →
              </Link>
            </div>

            {/* Google OAuth (if enabled) */}
            {googleReady && (
              <div className="mt-5" data-testid="google-signin-block">
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-slate-200" />
                  <span className="label-mono text-[10px] text-slate-400">or</span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
                <button
                  type="button"
                  data-testid="google-signin-button"
                  onClick={googleSignIn}
                  disabled={googleBusy}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-xs"
                >
                  <svg width="15" height="15" viewBox="0 0 48 48" aria-hidden="true">
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
              <div className="mt-6 border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="label-mono text-[10px] text-slate-500">Demo accounts</p>
                  <span className="font-mono text-[9px] text-slate-400">Quick pre-fill</span>
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
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-left text-xs transition-colors hover:border-sky-300 hover:bg-sky-50/50"
                    >
                      <span>
                        <span className="font-mono uppercase tracking-wider text-sky-800 font-bold">
                          {d.role}
                        </span>
                        <span className="text-slate-600 ml-2 font-mono text-[11px]">{d.email}</span>
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

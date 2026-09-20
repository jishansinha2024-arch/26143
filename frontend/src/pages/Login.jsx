import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api, apiError } from "@/lib/api";

const DEMO = [
  { role: "analyst", email: "analyst@sentinelmar.demo", scope: "ingest · correlate · review" },
  { role: "supervisor", email: "supervisor@sentinelmar.demo", scope: "+ acknowledge alerts · override cases" },
];
const DEMO_PASSWORDS = {}; // never ship passwords in the bundle — demo buttons only pre-fill the e-mail
const REMEMBER_KEY = "varuna_netra_remember_email";

const STEPS = [
  { icon: "satellite_alt", tone: "bg-primary-fixed text-on-primary-fixed", title: "Detect", body: "Sentinel imagery flags potential oil-spill candidates." },
  { icon: "directions_boat", tone: "bg-secondary-fixed text-on-secondary-fixed", title: "Correlate", body: "Nearby AIS vessel tracks are compared spatially and temporally." },
  { icon: "lightbulb", tone: "bg-tertiary-fixed text-on-tertiary-fixed", title: "Explain", body: "“Why This Vessel” shows the actual scoring factors." },
  { icon: "verified", tone: "bg-surface-container-high text-on-surface", title: "Verify", body: "Jurisdiction, provenance and an evidence timeline support review." },
];

const Icon = ({ name, className = "" }) => <span className={`material-symbols-outlined text-[18px] ${className}`}>{name}</span>;
const inputCls = "w-full rounded-lg border-0 bg-surface-container-low px-3 py-2.5 font-body-md text-body-md text-on-surface outline-none ring-1 ring-outline-variant/60 placeholder:text-outline transition-all focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary";

export default function Login() {
  const { user, login, guestLogin } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState(() => { try { return localStorage.getItem(REMEMBER_KEY) || ""; } catch { return ""; } });
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(() => { try { return !!localStorage.getItem(REMEMBER_KEY); } catch { return false; } });
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [exploreBusy, setExploreBusy] = useState(false);
  const [caps, setCaps] = useState(null);
  const [error, setError] = useState("");
  const [guestError, setGuestError] = useState("");

  useEffect(() => { api.get("/auth/capabilities").then((r) => setCaps(r.data)).catch(() => setCaps(null)); }, []);
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
    setExploreBusy(true); setGuestError("");
    try { await guestLogin(); nav("/", { replace: true }); }
    catch (err) { setGuestError(apiError(err)); setExploreBusy(false); }
  };

  const submit = async (e) => {
    e?.preventDefault();
    setBusy(true); setError("");
    try {
      try { if (remember && email) localStorage.setItem(REMEMBER_KEY, email); else localStorage.removeItem(REMEMBER_KEY); } catch { /* ignore */ }
      const u = await login(email, password);
      toast.success(`Signed in as ${u.name} (${u.role})`);
      nav(loc.state?.from || "/", { replace: true });
    } catch (err) { setError(apiError(err)); } finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[1.15fr_1fr]" data-testid="login-page">
      {/* HERO / EXPLAINER */}
      <div className="grid-bg hidden flex-col justify-between bg-surface-container-low p-12 lg:flex">
        <div className="flex items-center gap-space-md">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-on-primary"><span className="material-symbols-outlined text-[24px]">radar</span></span>
          <span className="flex items-center gap-space-sm">
            <span className="font-headline-md text-headline-md font-bold tracking-tight">VARUNA NETRA</span>
            <span className="rounded bg-primary-fixed px-space-xs py-0.5 font-label-md text-label-md font-semibold uppercase tracking-wider text-on-primary-fixed">Maritime Intelligence Console</span>
          </span>
        </div>

        <div className="max-w-xl fade-up">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-fixed px-space-md py-1 font-code-telemetry-sm text-code-telemetry-sm font-semibold uppercase tracking-wider text-on-secondary-fixed">
            <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" /> AI-assisted maritime oil-spill intelligence
          </span>
          <h1 className="mt-5 font-display text-[clamp(2.25rem,4vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.03em] text-on-surface">
            Detect spills. Correlate vessels. <span className="text-primary">Explain the evidence.</span>
          </h1>
          <p className="mt-5 max-w-lg font-body-lg text-body-lg text-on-surface-variant">
            Detect potential marine oil spills using satellite imagery, correlate nearby vessels using AIS data, analyze jurisdiction, and review explainable evidence.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-space-md" data-testid="what-it-does">
            {STEPS.map((s, i) => (
              <div key={s.title} className="fade-up rounded-xl bg-surface-container-lowest p-space-lg shadow-sm transition-shadow hover:shadow-md" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="mb-space-sm flex items-center gap-space-sm">
                  <span className={`grid h-8 w-8 place-items-center rounded-lg ${s.tone}`}><Icon name={s.icon} /></span>
                  <span className="font-headline-sm text-headline-sm text-on-surface">{s.title}</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="font-code-telemetry-sm text-code-telemetry-sm uppercase tracking-wider text-on-surface-variant">Decision support · not a legal determination</div>
      </div>

      {/* AUTH CARD */}
      <div className="flex items-center justify-center p-6 sm:p-8">
        <form onSubmit={submit} className="fade-up w-full max-w-md rounded-xl bg-surface-container-lowest p-8 shadow-[0_8px_32px_rgba(25,28,30,0.08)]" data-testid="login-form">
          <div className="mb-space-lg flex items-center gap-space-sm lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-on-primary"><span className="material-symbols-outlined text-[22px]">radar</span></span>
            <span className="font-headline-md text-headline-md font-bold">VARUNA NETRA</span>
          </div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Sign in to the console</h2>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">AI-assisted maritime oil-spill intelligence — explore read-only, no account needed.</p>

          <button type="button" data-testid="explore-guest-button" onClick={explore} disabled={exploreBusy}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-label-lg text-label-lg font-semibold text-on-primary shadow-sm transition-all hover:bg-primary-container disabled:opacity-60">
            <Icon name="explore" /> {exploreBusy ? "Entering…" : "Explore as Guest (read-only)"}
          </button>
          {guestError && <p role="alert" data-testid="guest-error" className="mt-3 rounded-lg bg-error-container px-3 py-2 font-body-sm text-body-sm text-on-error-container">{guestError}</p>}

          <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-surface-container-high" /><span className="label-mono">or sign in</span><span className="h-px flex-1 bg-surface-container-high" /></div>

          <label className="block"><span className="label-mono mb-1.5 block">Email</span>
            <input data-testid="login-email-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="analyst@sentinelmar.demo" className={inputCls} /></label>
          <label className="mt-space-lg block"><span className="label-mono mb-1.5 block">Password</span>
            <div className="relative">
              <input data-testid="login-password-input" type={showPw ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className={`${inputCls} pr-10`} />
              <button type="button" tabIndex={-1} onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-outline hover:text-on-surface"><Icon name={showPw ? "visibility_off" : "visibility"} /></button>
            </div></label>

          <div className="mt-space-md flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 font-body-sm text-body-sm text-on-surface-variant"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember email</label>
            <Link to="/forgot-password" data-testid="forgot-password-link" className="font-label-md text-label-md font-semibold text-primary hover:underline">Forgot password?</Link>
          </div>

          {error && <p role="alert" data-testid="login-error" className="mt-4 rounded-lg bg-error-container px-3 py-2 font-body-sm text-body-sm text-on-error-container">{error}</p>}

          <button data-testid="login-submit-button" disabled={busy} type="submit"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-surface-container-high px-4 py-2.5 font-label-lg text-label-lg font-semibold text-on-surface transition-colors hover:bg-surface-variant disabled:opacity-60">
            <Icon name="login" /> {busy ? "Signing in…" : "Sign in"}
          </button>
          <Link to="/signup" data-testid="create-account-link" className="mt-4 block text-center font-label-lg text-label-lg font-semibold text-primary hover:underline">Create account — free Viewer access</Link>

          {googleReady && (
            <div className="mt-5" data-testid="google-signin-block">
              <div className="flex items-center gap-3"><span className="h-px flex-1 bg-surface-container-high" /><span className="label-mono">or</span><span className="h-px flex-1 bg-surface-container-high" /></div>
              <button type="button" data-testid="google-signin-button" onClick={googleSignIn} disabled={googleBusy}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-surface-container-lowest px-4 py-2.5 font-label-lg text-label-lg font-semibold text-on-surface ring-1 ring-outline-variant transition-colors hover:bg-surface-container-low disabled:opacity-60">
                <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.8l-7.7-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
                {googleBusy ? "Redirecting to Google…" : "Continue with Google"}
              </button>
              <p className="mt-2 text-center font-body-sm text-body-sm text-on-surface-variant">New Google users get read-only Viewer access. Existing accounts keep their role.</p>
            </div>
          )}

          {showDemo && (
            <div className="mt-6 border-t border-surface-container-high pt-4">
              <p className="label-mono mb-2">Demo accounts</p>
              <div className="space-y-1.5">
                {DEMO.map((d) => (
                  <button key={d.role} type="button" data-testid={`demo-login-${d.role}`} onClick={() => { setEmail(d.email); setPassword(DEMO_PASSWORDS[d.role] || ""); }}
                    className="flex w-full items-center justify-between rounded-lg bg-surface-container-low px-3 py-2 text-left transition-colors hover:bg-surface-container">
                    <span><span className="font-code-telemetry text-code-telemetry font-semibold uppercase tracking-wider text-primary">{d.role}</span> <span className="ml-2 font-body-sm text-body-sm text-on-surface-variant">{d.email}</span></span>
                    <span className="font-code-telemetry-sm text-code-telemetry-sm text-outline">{d.scope}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">{Object.keys(DEMO_PASSWORDS).length ? "Demo credentials are pre-filled." : "Demo buttons pre-fill the email only — enter the issued password."} Admin account is the workspace owner's email (manages users).</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

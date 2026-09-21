import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRightIcon, ArrowUpRightIcon, LockIcon, MailIcon, RadarIcon, XIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { api, apiError } from "@/lib/api";
import { GlobeCanvas } from "@/components/landing/GlobeCanvas";
import { PipelineRail } from "@/components/landing/PipelineRail";
import { SignalFeed } from "@/components/landing/SignalFeed";

const EASE = [0.23, 1, 0.32, 1];
const REMEMBER_KEY = "varuna_netra_remember_email";
const WATCH_AREAS = ["Persian Gulf / Hormuz", "North Sea", "Strait of Malacca", "Gulf of Mexico", "Gulf of Guinea", "Tokyo Bay"];

function AccessPanel({ open, onClose, onLogin, busy, error, email, setEmail, password, setPassword }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Close sign in" onClick={onClose} className="absolute inset-0 bg-shell/70 backdrop-blur-md" />
          <motion.div role="dialog" aria-modal="true" aria-label="Console sign in" initial={{ opacity: 0, scale: .96, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .97, y: 10 }} transition={{ duration: .26, ease: EASE }} className="relative w-full max-w-md overflow-hidden rounded-2xl border border-ink/10 bg-mist p-7 shadow-[0_30px_80px_-32px_rgba(22,38,46,0.35)]">
            <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full p-1.5 text-muted hover:bg-ink/5 hover:text-ink"><XIcon className="h-4 w-4" /></button>
            <p className="font-mono text-[11px] uppercase tracking-[.22em] text-tide">Secure access</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">Console sign in</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">Satellite spill correlation, vessel AIS trajectories, and analyst reviews.</p>
            <form className="mt-6 space-y-4" onSubmit={onLogin}>
              <label className="block"><span className="mb-1.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.18em] text-muted"><MailIcon className="h-3.5 w-3.5" /> Account email</span><input autoFocus type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="analyst@sentinel.gov" className="w-full rounded-lg border border-ink/12 bg-paper/60 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-tide" /></label>
              <label className="block"><span className="mb-1.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.18em] text-muted"><LockIcon className="h-3.5 w-3.5" /> Password</span><input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-lg border border-ink/12 bg-paper/60 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-tide" /></label>
              {error && <p role="alert" className="rounded-lg border border-flare/30 bg-flare/10 px-3 py-2 text-[13px] text-flare">{error}</p>}
              <button type="submit" disabled={busy} className="group flex w-full items-center justify-center gap-2 rounded-lg bg-tide px-4 py-3 text-sm font-semibold text-white hover:bg-ink disabled:opacity-70">{busy ? "Verifying…" : "Enter console"}<ArrowRightIcon className="h-4 w-4" /></button>
            </form>
            <Link to="/signup" onClick={onClose} className="mt-5 block text-center font-mono text-[11px] uppercase tracking-[.16em] text-muted hover:text-tide">Create account — free viewer access</Link>
            <Link to="/forgot-password" onClick={onClose} className="mt-2 block text-center text-xs text-muted hover:text-tide">Forgot password?</Link>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Login() {
  const { user, login, guestLogin } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [signInOpen, setSignInOpen] = useState(false);
  const [email, setEmail] = useState(() => { try { return localStorage.getItem(REMEMBER_KEY) || ""; } catch { return ""; } });
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);
  const [error, setError] = useState("");
  const [caps, setCaps] = useState(null);

  useEffect(() => { api.get("/auth/capabilities").then(r => setCaps(r.data)).catch(() => setCaps(null)); }, []);
  if (user) return <Navigate to={loc.state?.from || "/"} replace />;

  const explore = async () => {
    if (guestBusy) return;
    setGuestBusy(true); setError("");
    try { await guestLogin(); nav(loc.state?.from || "/", { replace: true }); }
    catch (err) { setError(apiError(err)); setGuestBusy(false); }
  };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      if (email) { try { localStorage.setItem(REMEMBER_KEY, email); } catch {} }
      const u = await login(email, password);
      toast.success(`Signed in as ${u.name} (${u.role})`);
      nav(loc.state?.from || "/", { replace: true });
    } catch (err) { setError(apiError(err)); setBusy(false); }
  };

  const googleReady = caps?.authentication?.google?.enabled === true;
  const googleSignIn = () => {
    const redirectUrl = window.location.origin + "/";
    const base = process.env.REACT_APP_GOOGLE_AUTH_URL || `${(process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "")}/api/auth/google`;
    window.location.href = `${base}?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-paper text-ink" data-testid="login-page">
      <div className="pointer-events-none absolute inset-0 daylight" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-[18vw] top-1/2 h-[150vh] w-[105vw] -translate-y-1/2 opacity-45 md:-right-[12vw] md:w-[72vw] md:opacity-100"><GlobeCanvas spinSpeed={0.07} /></div>

      <header className="relative z-20 flex items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg border border-tide/25 bg-tide/10"><RadarIcon className="h-[18px] w-[18px] text-tide" /></span><span className="font-display text-lg font-semibold tracking-tight text-ink">Varuna <span className="text-tide">Netra</span></span></div>
        <div className="hidden items-center gap-2 font-mono text-[11px] uppercase tracking-[.2em] text-muted sm:flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-tide" /> Live surveillance · 26 open alerts</div>
      </header>

      <main className="relative z-10 flex flex-1 items-center px-6 pb-10 md:px-12">
        <div className="w-full max-w-2xl">
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-mono text-[11px] uppercase tracking-[.24em] text-tide">AI-assisted maritime oil-spill intelligence</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .06 }} className="mt-5 font-display text-[clamp(2.75rem,6.2vw,5.25rem)] font-extrabold leading-[.92] tracking-[-.035em] text-ink">Detect spills.<br />Correlate vessels.<br /><span className="text-tide">Explain the evidence.</span></motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12 }} className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted">Sentinel-1 radar finds the slick. AIS trajectories name the ship. Jurisdiction and evidence are sealed before anyone files a claim.</motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .18 }} className="mt-9 flex flex-wrap items-center gap-3">
            <button type="button" onClick={explore} disabled={guestBusy} className="group flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-paper hover:bg-tide disabled:opacity-70">{guestBusy ? "Opening console…" : "Explore as guest"}<span className="font-mono text-[11px] uppercase tracking-[.14em] text-paper/60">read-only</span><ArrowUpRightIcon className="h-4 w-4" /></button>
            <button type="button" onClick={() => { setError(""); setSignInOpen(true); }} className="rounded-full border border-ink/15 bg-mist/60 px-6 py-3.5 text-sm font-medium text-ink hover:border-tide/50 hover:bg-mist">Console sign in</button>
          </motion.div>
          {error && !signInOpen && <p role="alert" className="mt-4 max-w-lg rounded-lg border border-flare/30 bg-flare/10 px-3 py-2 text-sm text-flare">{error}</p>}
          <PipelineRail />
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .7 }} className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[.16em] text-muted/80"><span className="text-ink">Watch areas</span>{WATCH_AREAS.map(area => <span key={area}>{area}</span>)}</motion.div>
          {googleReady && <button type="button" onClick={googleSignIn} className="mt-6 text-xs text-muted underline decoration-tide/40 underline-offset-4 hover:text-tide">Continue with Google</button>}
        </div>
      </main>

      <div className="relative z-20"><SignalFeed /></div>
      <AccessPanel open={signInOpen} onClose={() => setSignInOpen(false)} onLogin={submit} busy={busy} error={error} email={email} setEmail={setEmail} password={password} setPassword={setPassword} />
    </div>
  );
}

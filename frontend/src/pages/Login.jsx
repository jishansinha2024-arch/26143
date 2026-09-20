import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Radar } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api, apiError } from "@/lib/api";
import { GlobeCanvas } from "@/components/entry/GlobeCanvas";
import { PipelineRail } from "@/components/entry/PipelineRail";
import { SignalFeed } from "@/components/entry/SignalFeed";
import { AccessPanel } from "@/components/entry/AccessPanel";
import { WATCH_AREAS } from "@/components/entry/entryData";

const DEMO = [
  { role: "analyst", email: "analyst@sentinelmar.demo", scope: "ingest · correlate · review" },
  { role: "supervisor", email: "supervisor@sentinelmar.demo", scope: "+ acknowledge alerts · override cases" },
];
const DEMO_PASSWORDS = {};
const REMEMBER_KEY = "varuna_netra_remember_email";
const EASE = [0.23, 1, 0.32, 1];

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
  const [guestError, setGuestError] = useState("");
  // Arriving from a protected route (or a failed guest entry) opens the sign-in panel straight away.
  const [signInOpen, setSignInOpen] = useState(() => !!loc.state?.from);

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
    setGuestError("");
    try {
      await guestLogin();
      nav("/", { replace: true });
    } catch (err) {
      // Show the reason next to the guest button; don't pop the sign-in form open with an error it didn't earn.
      setGuestError(apiError(err));
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
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden bg-paper text-ink" data-testid="login-page">
      <div className="daylight pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="pointer-events-none absolute -right-[18vw] top-1/2 h-[150vh] w-[105vw] -translate-y-1/2 opacity-45 md:-right-[12vw] md:w-[72vw] md:opacity-100">
        <GlobeCanvas spinSpeed={0.07} />
      </div>

      <header className="relative z-20 flex items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-tide/25 bg-tide/10">
            <Radar className="h-[18px] w-[18px] text-tide" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            Varuna <span className="text-tide">Netra</span>
          </span>
        </div>
        <div className="hidden items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-fog sm:flex">
          <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-tide" />
          Live surveillance · Sentinel-1 + AIS
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center px-6 pb-10 md:px-12">
        <div className="w-full max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="font-mono text-[11px] uppercase tracking-[0.24em] text-tide"
          >
            AI-assisted maritime oil-spill intelligence
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.06, ease: EASE }}
            className="mt-5 font-display text-[clamp(2.75rem,6.2vw,5.25rem)] font-extrabold leading-[0.92] tracking-[-0.035em] text-ink"
          >
            Detect spills.
            <br />
            Correlate vessels.
            <br />
            <span className="text-tide">Explain the evidence.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.12, ease: EASE }}
            className="mt-6 max-w-xl text-[15px] leading-relaxed text-fog"
          >
            Sentinel-1 radar finds the slick. AIS trajectories name the ship. Jurisdiction and
            evidence are sealed before anyone files a claim.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.18, ease: EASE }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <button
              type="button"
              data-testid="explore-guest-button"
              onClick={explore}
              disabled={exploreBusy}
              className="group flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-paper transition-[transform,background-color] duration-150 ease-surge hover:bg-tide active:scale-[0.99] disabled:opacity-70"
            >
              {exploreBusy ? "Entering console…" : "Explore as guest"}
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-paper/60">read-only</span>
              <ArrowUpRight className="h-4 w-4 transition-transform duration-150 ease-surge group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </button>
            <button
              type="button"
              data-testid="open-signin-button"
              onClick={() => {
                setError("");
                setGuestError("");
                setSignInOpen(true);
              }}
              className="rounded-full border border-ink/15 bg-mist/60 px-6 py-3.5 text-sm font-medium text-ink transition-colors duration-150 ease-surge hover:border-tide/50 hover:bg-mist"
            >
              Console sign in
            </button>
          </motion.div>

          {guestError && !signInOpen && (
            <p role="alert" data-testid="guest-error" className="mt-4 max-w-md rounded-lg border border-flare/30 bg-flare/10 px-3 py-2 text-[13px] text-flare">
              {guestError}
            </p>
          )}

          <PipelineRail />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.7, ease: EASE }}
            className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.16em] text-fog/80"
          >
            <span className="text-ink">Watch areas</span>
            {WATCH_AREAS.map((a) => (
              <span key={a}>{a}</span>
            ))}
          </motion.div>
        </div>
      </main>

      <div className="relative z-20">
        <SignalFeed />
      </div>

      <AccessPanel
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        rememberMe={rememberMe}
        setRememberMe={setRememberMe}
        busy={busy}
        error={error || guestError}
        onSubmit={submit}
        googleReady={googleReady}
        googleBusy={googleBusy}
        onGoogle={googleSignIn}
        showDemo={showDemo}
        demoAccounts={DEMO}
        onDemo={(d) => {
          setEmail(d.email);
          setPassword(DEMO_PASSWORDS[d.role] || "");
        }}
        onGuest={explore}
        exploreBusy={exploreBusy}
      />
    </div>
  );
}

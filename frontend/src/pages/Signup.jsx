import { useEffect, useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { Radar, UserPlus, Compass, Eye, EyeOff, Mail, Lock, User, Building, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api, apiError } from "@/lib/api";
import { GlobeCanvas } from "@/components/entry/GlobeCanvas";

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
    const googleAuthUrl = process.env.REACT_APP_GOOGLE_AUTH_URL || `${(process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "")}/api/auth/google`;
    window.location.href = `${googleAuthUrl}?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const inputCls =
    "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15";

  return (
    <div
      className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr] bg-paper text-ink selection:bg-tide/20 selection:text-ink"
      data-testid="signup-page"
    >
      {/* Left hero — daylight globe, same as the login screen */}
      <div className="daylight relative hidden flex-col justify-between overflow-hidden border-r border-ink/10 p-12 lg:flex">
        <div className="pointer-events-none absolute -left-[10%] top-1/2 h-[140%] w-[120%] -translate-y-1/2 opacity-70">
          <GlobeCanvas spinSpeed={0.05} />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-tide/25 bg-tide/10 text-tide">
            <Radar size={18} />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            Varuna <span className="text-tide">Netra</span>
          </span>
        </div>

        <div className="relative z-10 my-auto max-w-lg py-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-tide">Analyst registration</p>
          <h1 className="mt-5 font-display text-[clamp(2.25rem,3.6vw,3.5rem)] font-extrabold leading-[0.95] tracking-[-0.03em] text-ink">
            Register for Varuna Netra <span className="text-tide">intelligence access.</span>
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-fog">
            New accounts receive read-only <strong className="text-ink">Viewer</strong> privileges. If you are an authorized maritime safety officer, coast guard investigator, or supervisor, you can request role elevation inside your account console.
          </p>

          <ol className="relative mt-8 border-l border-ink/10 pl-6">
            {[
              "Full read access to active spill incidents",
              "Historical AIS trajectory vectors & replay",
              "Standard MARPOL Annex I evidence exports",
            ].map((line) => (
              <li key={line} className="relative pb-4 text-sm text-fog last:pb-0">
                <span aria-hidden="true" className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full bg-tide ring-4 ring-paper" />
                {line}
              </li>
            ))}
          </ol>
        </div>

        <div className="relative z-10 border-t border-ink/10 pt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-fog">
          Government &amp; Maritime Agency Decision Support Console
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-10 relative overflow-y-auto">
        <div className="w-full max-w-md py-6">
          <form
            onSubmit={submit}
            className="rounded-2xl border border-ink/10 bg-mist p-8 sm:p-9 shadow-[0_30px_80px_-32px_rgba(22,38,46,0.35)] relative"
            data-testid="signup-form"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
                Create Account
              </h2>
              <span className="font-mono text-[10px] uppercase text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 font-semibold">
                FREE VIEWER ACCESS
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Register with your professional email address to gain access to the surveillance dashboard.
            </p>

            {/* Quick guest option */}
            <button
              type="button"
              onClick={explore}
              disabled={exploreBusy}
              data-testid="signup-guest-button"
              className="mb-5 flex w-full items-center justify-between rounded-xl border border-sky-200 bg-sky-50/50 px-3.5 py-2.5 font-mono text-xs text-sky-900 hover:bg-sky-100/70 transition-colors shadow-xs"
            >
              <span className="flex items-center gap-2 font-semibold">
                <Compass size={14} className="text-sky-600" />
                Explore as Guest instead
              </span>
              <span className="text-[10px] text-sky-700">no login needed →</span>
            </button>

            <div className="space-y-3.5">
              <div>
                <label className="block">
                  <span className="label-mono mb-1.5 flex items-center gap-1.5 text-slate-700">
                    <User size={12} className="text-slate-500" /> Full Name
                  </span>
                  <input
                    data-testid="signup-name-input"
                    type="text"
                    value={f.name}
                    onChange={set("name")}
                    placeholder="Commander Sarah Connor"
                    required
                    className={inputCls}
                  />
                </label>
              </div>

              <div>
                <label className="block">
                  <span className="label-mono mb-1.5 flex items-center gap-1.5 text-slate-700">
                    <Mail size={12} className="text-slate-500" /> Professional Email
                  </span>
                  <input
                    data-testid="signup-email-input"
                    type="email"
                    value={f.email}
                    onChange={set("email")}
                    placeholder="officer@coastguard.gov"
                    required
                    className={inputCls}
                  />
                </label>
              </div>

              <div>
                <label className="block">
                  <span className="label-mono mb-1.5 flex items-center gap-1.5 text-slate-700">
                    <Building size={12} className="text-slate-500" /> Agency / Organization (Optional)
                  </span>
                  <input
                    data-testid="signup-org-input"
                    type="text"
                    value={f.organization}
                    onChange={set("organization")}
                    placeholder="Indian Coast Guard / Maritime Safety Agency"
                    className={inputCls}
                  />
                </label>
              </div>

              <div>
                <label className="block">
                  <span className="label-mono mb-1.5 flex items-center gap-1.5 text-slate-700">
                    <Lock size={12} className="text-slate-500" /> Password
                  </span>
                  <div className="relative">
                    <input
                      data-testid="signup-password-input"
                      type={showPassword ? "text" : "password"}
                      value={f.password}
                      onChange={set("password")}
                      placeholder="Min 10 characters with numbers"
                      required
                      className={inputCls}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </label>
              </div>

              <div>
                <label className="block">
                  <span className="label-mono mb-1.5 flex items-center gap-1.5 text-slate-700">
                    <Lock size={12} className="text-slate-500" /> Confirm Password
                  </span>
                  <div className="relative">
                    <input
                      data-testid="signup-confirm-input"
                      type={showConfirm ? "text" : "password"}
                      value={f.confirm}
                      onChange={set("confirm")}
                      placeholder="Re-enter password"
                      required
                      className={inputCls}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirm((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </label>
              </div>
            </div>

            {error && (
              <div
                data-testid="signup-error"
                className="mt-4 flex items-start gap-2.5 rounded-lg p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200"
              >
                <AlertCircle size={15} className="shrink-0 text-rose-600 mt-0.5" />
                <span className="leading-relaxed font-medium">{error}</span>
              </div>
            )}

            <button
              data-testid="signup-submit-button"
              disabled={busy}
              type="submit"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition-all hover:bg-tide active:scale-[0.99] disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 size={15} className="animate-spin text-tide" /> Creating Account…
                </>
              ) : (
                <>
                  <UserPlus size={15} /> Register Account
                </>
              )}
            </button>

            <div className="mt-4 text-center">
              <Link
                to="/login"
                data-testid="signup-login-link"
                className="font-mono text-[11px] uppercase tracking-wider text-sky-700 hover:text-sky-900 font-semibold transition-colors"
              >
                Already have an account? Sign In →
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

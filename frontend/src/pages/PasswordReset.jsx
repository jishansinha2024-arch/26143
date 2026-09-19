import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Radar, KeyRound, MailCheck, Lock, Mail, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { api, apiError } from "@/lib/api";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15";

const Shell = ({ title, sub, children, testId }) => (
  <div
    className="grid min-h-screen place-items-center p-6 daylight bg-paper text-ink selection:bg-tide/20 selection:text-ink"
    data-testid={testId}
  >
    <div className="rounded-2xl border border-ink/10 bg-mist w-full max-w-md p-8 sm:p-9 shadow-[0_30px_80px_-32px_rgba(22,38,46,0.35)]">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-9 w-9 place-items-center rounded-lg border border-tide/25 bg-tide/10 text-tide"
          >
            <Radar size={20} className="text-sky-600" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            Varuna <span className="text-sky-600">Netra</span>
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 font-semibold">
          SECURITY
        </span>
      </div>

      <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">{sub}</p>

      {children}

      <div className="mt-6 border-t border-slate-200 pt-4">
        <Link
          to="/login"
          data-testid="back-to-login"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-sky-700 hover:text-sky-900 font-semibold transition-colors"
        >
          <ArrowLeft size={13} /> Back to Sign In
        </Link>
      </div>
    </div>
  </div>
);

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setDone(data);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell
      title="Reset your password"
      sub="Enter your account email address. A single-use reset link (valid for 60 minutes) will be issued."
      testId="forgot-password-page"
    >
      {done ? (
        <div
          className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 shadow-xs"
          data-testid="forgot-success-banner"
        >
          <div className="flex items-center gap-2 font-mono font-bold text-emerald-800">
            <MailCheck size={16} /> Reset instructions issued
          </div>
          <p className="mt-2 text-slate-700 leading-relaxed">
            If an account exists for <b className="text-slate-900">{email}</b>, an email with a reset link has been dispatched.
          </p>
          {done.dev_reset_url && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2.5 font-mono text-[11px] text-amber-900">
              <span className="font-bold">Dev bypass link:</span>
              <br />
              <Link to={done.dev_reset_url} className="text-sky-700 underline break-all">
                {done.dev_reset_url}
              </Link>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4" data-testid="forgot-password-form">
          <label className="block">
            <span className="label-mono mb-1.5 flex items-center gap-1.5 text-slate-700">
              <Mail size={12} className="text-slate-500" /> Account Email
            </span>
            <input
              data-testid="forgot-email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="analyst@sentinelmar.demo"
              required
              className={inputCls}
            />
          </label>

          <button
            data-testid="forgot-submit-button"
            disabled={busy}
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition-all hover:bg-tide active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 size={15} className="animate-spin text-tide" /> Issuing link…
              </>
            ) : (
              <>
                <KeyRound size={15} /> Request Reset Link
              </>
            )}
          </button>
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
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (pw !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: pw });
      setDone(true);
      toast.success("Password reset successfully");
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <Shell
        title="Invalid reset link"
        sub="The password reset token is missing from this URL. Request a new link from the login page."
        testId="reset-password-page"
      >
        <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          No token provided. Return to sign in to request a password reset.
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      title="Create new password"
      sub="Choose a strong password with at least 10 characters, including letters and numbers."
      testId="reset-password-page"
    >
      {done ? (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900" data-testid="reset-success-banner">
          <p className="font-semibold">Password updated successfully.</p>
          <p className="mt-1 text-slate-600">You can now sign in to the Varuna Netra console with your new password.</p>
          <button
            onClick={() => nav("/login")}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper hover:bg-tide"
          >
            Sign In Now →
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4" data-testid="reset-password-form">
          <div>
            <label className="block">
              <span className="label-mono mb-1.5 flex items-center gap-1.5 text-slate-700">
                <Lock size={12} className="text-slate-500" /> New Password
              </span>
              <div className="relative">
                <input
                  data-testid="reset-password-input"
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={inputCls}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw((p) => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>
          </div>

          <div>
            <label className="block">
              <span className="label-mono mb-1.5 flex items-center gap-1.5 text-slate-700">
                <Lock size={12} className="text-slate-500" /> Confirm New Password
              </span>
              <div className="relative">
                <input
                  data-testid="reset-confirm-input"
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
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

          <button
            data-testid="reset-submit-button"
            disabled={busy}
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition-all hover:bg-tide active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 size={15} className="animate-spin text-tide" /> Updating Password…
              </>
            ) : (
              <>
                <KeyRound size={15} /> Save New Password
              </>
            )}
          </button>
        </form>
      )}
    </Shell>
  );
}

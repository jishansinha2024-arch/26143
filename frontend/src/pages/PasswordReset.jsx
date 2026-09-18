import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Radar, KeyRound, MailCheck, Lock, Mail, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { api, apiError } from "@/lib/api";

const inputCls =
  "w-full rounded-lg border border-[#1E314B] bg-[#080D1A]/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF]/40";

const Shell = ({ title, sub, children, testId }) => (
  <div
    className="grid min-h-screen place-items-center p-6 grid-bg bg-[#070D18] text-slate-100 selection:bg-cyan-500/20 selection:text-white"
    data-testid={testId}
  >
    <div className="panel w-full max-w-md p-8 sm:p-9 shadow-2xl border-[#1B2B44] bg-[#0E172A] fade-up">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-9 w-9 place-items-center rounded-lg shadow-md"
            style={{
              background: "linear-gradient(135deg, rgba(0,229,255,0.18), rgba(56,189,248,0.06))",
              border: "1px solid rgba(0,229,255,0.4)",
            }}
          >
            <Radar size={18} className="text-[#00E5FF]" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-white">
            Varuna <span className="text-[#00E5FF]">Netra</span>
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 bg-[#16233A] px-2 py-0.5 rounded">
          SECURITY
        </span>
      </div>

      <h1 className="font-display text-2xl font-bold tracking-tight text-white">{title}</h1>
      <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{sub}</p>

      {children}

      <div className="mt-6 border-t border-[#1B2B44] pt-4">
        <Link
          to="/login"
          data-testid="back-to-login"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-cyan-300 hover:text-cyan-200 transition-colors"
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
          className="mt-5 rounded-lg border p-4 text-sm"
          style={{
            borderColor: "rgba(16,185,129,0.4)",
            background: "rgba(16,185,129,0.08)",
          }}
          data-testid="forgot-password-done"
        >
          <div className="flex items-center gap-2 font-semibold text-emerald-300">
            <MailCheck size={16} /> Request Received
          </div>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed">{done.message}</p>
          {done.delivery === "logged" && (
            <p className="mt-2 text-[11px] text-amber-300" data-testid="forgot-password-fallback">
              Email delivery is not configured on this deployment — an administrator can retrieve your reset link from the Users panel.
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block">
            <span className="label-mono mb-1.5 block flex items-center gap-1.5 text-slate-300">
              <Mail size={12} className="text-slate-400" /> Account Email
            </span>
            <input
              data-testid="forgot-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className={inputCls}
            />
          </label>
          <button
            data-testid="forgot-submit-button"
            disabled={busy}
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#00E5FF] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-[#070D18] shadow-lg shadow-cyan-500/20 hover:bg-[#38BDF8] disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Sending link…
              </>
            ) : (
              <>
                <KeyRound size={14} /> Send reset link
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
  const [pw2, setPw2] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (pw !== pw2) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/auth/reset-password", { token, new_password: pw });
      toast.success(`Password updated for ${data.email}`);
      nav("/login");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell
      title="Choose a new password"
      sub="Minimum 8 characters. The reset token is single-use and will expire."
      testId="reset-password-page"
    >
      {!token ? (
        <p className="mt-4 text-xs text-rose-300" data-testid="reset-missing-token">
          Missing reset token — please open the link provided in your email or from your administrator.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block">
            <span className="label-mono mb-1.5 block flex items-center gap-1.5 text-slate-300">
              <Lock size={12} className="text-slate-400" /> New password
            </span>
            <div className="relative">
              <input
                data-testid="reset-password-input"
                type={show1 ? "text" : "password"}
                required
                minLength={8}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="••••••••"
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShow1((p) => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-200"
              >
                {show1 ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="label-mono mb-1.5 block flex items-center gap-1.5 text-slate-300">
              <Lock size={12} className="text-slate-400" /> Confirm new password
            </span>
            <div className="relative">
              <input
                data-testid="reset-password-confirm-input"
                type={show2 ? "text" : "password"}
                required
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="••••••••"
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShow2((p) => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-200"
              >
                {show2 ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>

          {error && (
            <p
              data-testid="reset-error"
              className="rounded-lg p-2.5 text-xs text-rose-300"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
              }}
            >
              {error}
            </p>
          )}

          <button
            data-testid="reset-submit-button"
            disabled={busy}
            type="submit"
            className="w-full rounded-lg bg-[#00E5FF] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-[#070D18] shadow-lg shadow-cyan-500/20 hover:bg-[#38BDF8] disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 size={14} className="animate-spin inline mr-1" /> Updating…
              </>
            ) : (
              "Set new password"
            )}
          </button>
        </form>
      )}
    </Shell>
  );
}

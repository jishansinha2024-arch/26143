import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowRight, Compass, Eye, EyeOff, Loader2, Lock, Mail, X } from "lucide-react";

const EASE = [0.23, 1, 0.32, 1];

const INPUT =
  "w-full rounded-lg border border-ink/15 bg-paper/60 px-3.5 py-2.5 text-sm text-ink placeholder:text-fog/60 outline-none transition-colors duration-150 ease-surge focus:border-tide";
const EYEBROW = "mb-1.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-fog";

/** Console sign-in modal — the login-screen design wired to the real auth flow. */
export function AccessPanel({
  open,
  onClose,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  rememberMe,
  setRememberMe,
  busy,
  error,
  onSubmit,
  googleReady,
  googleBusy,
  onGoogle,
  showDemo,
  demoAccounts,
  onDemo,
  onGuest,
  exploreBusy,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          <button
            type="button"
            aria-label="Close sign in"
            onClick={onClose}
            className="fixed inset-0 cursor-default bg-shell/70 backdrop-blur-md"
          />

          <motion.form
            role="dialog"
            aria-modal="true"
            aria-label="Console sign in"
            data-testid="login-form"
            onSubmit={onSubmit}
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.26, ease: EASE }}
            className="relative my-auto w-full max-w-md overflow-hidden rounded-2xl border border-ink/10 bg-mist p-7 shadow-[0_30px_80px_-32px_rgba(22,38,46,0.35)]"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full p-1.5 text-fog transition-colors duration-150 ease-surge hover:bg-ink/5 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>

            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-tide">Secure access</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">Console sign in</h2>
            <p className="mt-2 text-sm leading-relaxed text-fog">
              Satellite spill correlation, vessel AIS trajectories, and analyst reviews.
            </p>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className={EYEBROW}>
                  <Mail className="h-3.5 w-3.5" /> Account email
                </span>
                <input
                  data-testid="login-email-input"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@sentinelmar.demo"
                  className={INPUT}
                />
              </label>

              <label className="block">
                <span className={EYEBROW}>
                  <Lock className="h-3.5 w-3.5" /> Password
                </span>
                <div className="relative">
                  <input
                    data-testid="login-password-input"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${INPUT} pr-10`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-fog/70 transition-colors hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            </div>

            <div className="mt-3.5 flex items-center justify-between text-xs">
              <label className="flex cursor-pointer select-none items-center gap-2 text-fog hover:text-ink">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                <span className="font-medium">Remember email</span>
              </label>
              <Link
                to="/forgot-password"
                data-testid="forgot-password-link"
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-tide transition-colors hover:text-ink"
              >
                Forgot password?
              </Link>
            </div>

            {error && (
              <motion.p
                role="alert"
                data-testid="login-error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, ease: EASE }}
                className="mt-4 flex items-start gap-2 rounded-lg border border-flare/30 bg-flare/10 px-3 py-2 text-[13px] text-flare"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </motion.p>
            )}

            <button
              data-testid="login-submit-button"
              type="submit"
              disabled={busy}
              className="group mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-tide px-4 py-3 text-sm font-semibold text-white transition-[transform,background-color] duration-150 ease-surge hover:bg-ink active:scale-[0.99] disabled:opacity-70"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
                </>
              ) : (
                <>
                  Enter console
                  <ArrowRight className="h-4 w-4 transition-transform duration-150 ease-surge group-hover:translate-x-0.5" />
                </>
              )}
            </button>

            <div className="mt-3 flex items-center gap-3">
              <span className="h-px flex-1 bg-ink/10" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog/70">or</span>
              <span className="h-px flex-1 bg-ink/10" />
            </div>

            <button
              type="button"
              onClick={onGuest}
              disabled={exploreBusy}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-ink/15 bg-paper/60 px-4 py-2.5 text-sm font-medium text-ink transition-colors duration-150 ease-surge hover:border-tide/50 hover:bg-paper disabled:opacity-60"
            >
              <Compass className="h-4 w-4 text-tide" />
              {exploreBusy ? "Entering console…" : "Explore as guest"}
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fog">read-only</span>
            </button>

            {googleReady && (
              <div className="mt-3" data-testid="google-signin-block">
                <button
                  type="button"
                  data-testid="google-signin-button"
                  onClick={onGoogle}
                  disabled={googleBusy}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-ink/15 bg-mist px-4 py-2.5 text-sm font-medium text-ink transition-colors duration-150 ease-surge hover:border-tide/50 disabled:opacity-60"
                >
                  <svg width="15" height="15" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
                    <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z" />
                    <path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.8l-7.7-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
                  </svg>
                  {googleBusy ? "Redirecting to Google…" : "Continue with Google"}
                </button>
                <p className="mt-2 text-center text-[11px] text-fog">
                  New Google users get read-only Viewer access. Existing accounts keep their role.
                </p>
              </div>
            )}

            {showDemo && (
              <div className="mt-5 border-t border-ink/10 pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fog">Demo accounts</p>
                  <span className="font-mono text-[10px] text-fog/70">Quick pre-fill</span>
                </div>
                <div className="space-y-1.5">
                  {demoAccounts.map((d) => (
                    <button
                      key={d.role}
                      type="button"
                      data-testid={`demo-login-${d.role}`}
                      onClick={() => onDemo(d)}
                      className="flex w-full items-center justify-between rounded-lg border border-ink/10 bg-paper/60 px-3 py-2 text-left text-xs transition-colors hover:border-tide/50 hover:bg-paper"
                    >
                      <span>
                        <span className="font-mono font-semibold uppercase tracking-wider text-tide">{d.role}</span>
                        <span className="ml-2 font-mono text-[11px] text-fog">{d.email}</span>
                      </span>
                      <span className="text-[10px] text-fog/80">{d.scope}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 text-center">
              <Link
                to="/signup"
                data-testid="create-account-link"
                className="font-mono text-[11px] uppercase tracking-[0.16em] text-fog transition-colors hover:text-tide"
              >
                Create account — free viewer access
              </Link>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

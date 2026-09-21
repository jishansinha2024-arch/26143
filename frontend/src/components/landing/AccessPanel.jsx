import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, LockIcon, MailIcon, XIcon } from 'lucide-react';
import { LOGIN } from '../../constants/testIds';

const EASE = [0.23, 1, 0.32, 1];

/**
 * "Console sign in" modal from the entry-screen redesign.
 * Presentational: the parent (pages/Login.jsx) owns credentials, the request and its error state.
 *
 * Props: open, onClose, onSubmit(event), busy, error, email, onEmailChange(value), password, onPasswordChange(value)
 */
export function AccessPanel({
  open,
  onClose,
  onSubmit = (event) => event.preventDefault(),
  busy = false,
  error = '',
  email = '',
  onEmailChange = (_value) => {},
  password = '',
  onPasswordChange = (_value) => {}
}) {
  return (
    <AnimatePresence>
      {open &&
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: EASE }}>

          <button
          type="button"
          aria-label="Close sign in"
          onClick={onClose}
          className="absolute inset-0 cursor-default bg-shell/70 backdrop-blur-md" />

          <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Console sign in"
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.26, ease: EASE }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-ink/10 bg-mist p-7 shadow-[0_30px_80px_-32px_rgba(22,38,46,0.35)]">

            <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-testid={LOGIN.closePanelButton}
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted transition-colors duration-150 ease-surge hover:bg-ink/5 hover:text-ink">

              <XIcon className="h-4 w-4" />
            </button>

            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-tide">Secure access</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">Console sign in</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Satellite spill correlation, vessel AIS trajectories, and analyst reviews.
            </p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                  <MailIcon className="h-3.5 w-3.5" /> Account email
                </span>
                <input
                type="email"
                name="email"
                autoComplete="username"
                autoFocus
                required
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="analyst@sentinel.gov"
                data-testid={LOGIN.emailInput}
                className="w-full rounded-lg border border-ink/[0.12] bg-paper/60 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 outline-none transition-colors duration-150 ease-surge focus:border-tide" />

              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                  <LockIcon className="h-3.5 w-3.5" /> Password
                </span>
                <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder="••••••••"
                data-testid={LOGIN.passwordInput}
                className="w-full rounded-lg border border-ink/[0.12] bg-paper/60 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 outline-none transition-colors duration-150 ease-surge focus:border-tide" />

              </label>

              {error &&
            <motion.p
              role="alert"
              data-testid={LOGIN.formError}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, ease: EASE }}
              className="rounded-lg border border-flare/30 bg-flare/10 px-3 py-2 text-[13px] text-flare">

                  {error}
                </motion.p>
            }

              <button
              type="submit"
              disabled={busy}
              data-testid={LOGIN.submitButton}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-tide px-4 py-3 text-sm font-semibold text-white transition-[transform,background-color] duration-150 ease-surge hover:bg-ink active:scale-[0.99] disabled:opacity-70">

                {busy ? 'Verifying…' : 'Enter console'}
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-150 ease-surge group-hover:translate-x-0.5" />
              </button>
            </form>

            <Link
            to="/signup"
            onClick={onClose}
            data-testid={LOGIN.registerLink}
            className="mt-5 block text-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted transition-colors duration-150 ease-surge hover:text-tide">

              Create account — free viewer access
            </Link>
            <Link
            to="/forgot-password"
            onClick={onClose}
            data-testid={LOGIN.forgotPasswordLink}
            className="mt-2 block text-center text-xs text-muted transition-colors duration-150 ease-surge hover:text-tide">

              Forgot password?
            </Link>
          </motion.div>
        </motion.div>
      }
    </AnimatePresence>);

}

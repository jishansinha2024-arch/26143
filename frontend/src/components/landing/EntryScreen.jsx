import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRightIcon, RadarIcon } from 'lucide-react';
import { GlobeCanvas } from './GlobeCanvas';
import { PipelineRail } from './PipelineRail';
import { SignalFeed } from './SignalFeed';
import { AccessPanel } from './AccessPanel';
import { WATCH_AREAS } from '../../data/landing/entry';
import { LOGIN } from '../../constants/testIds';

const EASE = [0.23, 1, 0.32, 1];

/**
 * Entry screen from the redesign (globe + pipeline rail + live feed + sign-in modal).
 * Presentational: pages/Login.jsx supplies the auth behaviour.
 *
 * Props
 *   spinSpeed       globe rotation speed (0.07 cinematic, 0.018 calm)
 *   showSignalFeed  show the scrolling detection feed along the bottom edge
 *   onGuest         "Explore as guest" handler        guestBusy / guestError: its progress + failure message
 *   onGoogle        optional — renders "Continue with Google" when provided
 *   onOpenSignIn    optional — called when the sign-in modal opens (e.g. to clear stale errors)
 *   access          props forwarded to <AccessPanel> (onSubmit, busy, error, email, onEmailChange, password, onPasswordChange)
 */
export function EntryScreen({
  spinSpeed = 0.07,
  showSignalFeed = true,
  onGuest,
  guestBusy = false,
  guestError = '',
  onGoogle,
  onOpenSignIn,
  access = {}
}) {
  const [signInOpen, setSignInOpen] = useState(false);

  const openSignIn = () => {
    if (onOpenSignIn) onOpenSignIn();
    setSignInOpen(true);
  };

  return (
    <div
      className="entry-theme relative flex h-full min-h-screen w-full flex-col overflow-hidden bg-paper text-ink"
      data-testid={LOGIN.page}>

      <div className="pointer-events-none absolute inset-0 daylight" aria-hidden="true" />

      <div className="pointer-events-none absolute -right-[18vw] top-1/2 h-[150vh] w-[105vw] -translate-y-1/2 opacity-45 md:-right-[12vw] md:w-[72vw] md:opacity-100">
        <GlobeCanvas spinSpeed={spinSpeed} />
      </div>

      <header className="relative z-20 flex items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-tide/25 bg-tide/10">
            <RadarIcon className="h-[18px] w-[18px] text-tide" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            Varuna <span className="text-tide">Netra</span>
          </span>
        </div>

        {/* Hidden below `sm`: at phone widths this label is wider than the space left beside the logo. */}
        <div className="hidden items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted sm:flex">
          <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-tide" />
          Live surveillance · 26 open alerts
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center px-6 pb-10 md:px-12">
        <div className="w-full max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="font-mono text-[11px] uppercase tracking-[0.24em] text-tide">

            AI-assisted maritime oil-spill intelligence
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.06, ease: EASE }}
            className="mt-5 font-display text-[clamp(2.75rem,6.2vw,5.25rem)] font-extrabold leading-[0.92] tracking-[-0.035em] text-ink">

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
            className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted">

            Sentinel-1 radar finds the slick. AIS trajectories name the ship. Jurisdiction and
            evidence are sealed before anyone files a claim.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.18, ease: EASE }}
            className="mt-9 flex flex-wrap items-center gap-3">

            <button
              type="button"
              onClick={onGuest}
              disabled={guestBusy}
              data-testid={LOGIN.guestButton}
              className="group flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-paper transition-[transform,background-color] duration-150 ease-surge hover:bg-tide active:scale-[0.99] disabled:opacity-70">

              {guestBusy ? 'Opening console…' : 'Explore as guest'}
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-paper/60">read-only</span>
              <ArrowUpRightIcon className="h-4 w-4 transition-transform duration-150 ease-surge group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={openSignIn}
              data-testid={LOGIN.openSignInButton}
              className="rounded-full border border-ink/15 bg-mist/60 px-6 py-3.5 text-sm font-medium text-ink transition-colors duration-150 ease-surge hover:border-tide/50 hover:bg-mist">

              Console sign in
            </button>
          </motion.div>

          {guestError && !signInOpen &&
          <p
            role="alert"
            data-testid={LOGIN.guestError}
            className="mt-4 max-w-lg rounded-lg border border-flare/30 bg-flare/10 px-3 py-2 text-sm text-flare">

              {guestError}
            </p>
          }

          <PipelineRail />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.7, ease: EASE }}
            className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted/80">

            <span className="text-ink">Watch areas</span>
            {WATCH_AREAS.map((area) =>
            <span key={area}>{area}</span>
            )}
          </motion.div>

          {onGoogle &&
          <button
            type="button"
            onClick={onGoogle}
            data-testid={LOGIN.googleButton}
            className="mt-6 text-xs text-muted underline decoration-tide/40 underline-offset-4 transition-colors duration-150 ease-surge hover:text-tide">

              Continue with Google
            </button>
          }
        </div>
      </main>

      {showSignalFeed &&
      <div className="relative z-20">
          <SignalFeed />
        </div>
      }

      <AccessPanel {...access} open={signInOpen} onClose={() => setSignInOpen(false)} />
    </div>);

}

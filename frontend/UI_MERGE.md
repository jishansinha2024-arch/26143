# UI notes
The app was originally authored for a dark UI. To adopt the light redesign without editing every page, the legacy Tailwind
scales (`slate`, `cyan`, `amber`, `emerald`, `rose`, `red`, `purple`, `violet`, `sky`) are re-mapped in `tailwind.config.js`
(slate-100 = strongest text ... slate-900 = subtle panel tint). Prefer the redesign tokens for new code:
`bg-surface-container-lowest`, `text-on-surface`, `text-on-surface-variant`, `bg-primary`, `bg-primary-container`,
`text-error`, `font-headline-sm`, `font-code-telemetry`, `p-space-md` ...
Shell: `components/Layout.jsx`, `components/Sidebar.jsx`, `components/LiveBell.jsx`. Icons in the shell: Material Symbols.

## Blue type + console theme (Sep 2026)
* Text colour ramp runs dark navy -> sky blue: `slate-100..600` (strong -> muted), `cyan`/`sky` scales (links/accents), `on-surface` = `#0a2540`,
  `on-surface-variant` = `#2b5b8f`. Sky blue (`#38a3e0`) is only used for large gradient text (page titles, "Netra") — small text stays >= 4.5:1.
* `src/index.css` now defines the classes the pages already used but that were missing: `.panel`, `.label-mono`, `.fade-up`, `.pulse-dot`, `.grid-bg`,
  `--border-default`, `--border-highlight`, `--bg-primary|secondary|card`, plus `h1.font-display` gradient titles, form/table/scrollbar/Leaflet styling.
* Shell (`Layout.jsx`, `Sidebar.jsx`, `LiveBell.jsx`) matches the Ingestion reference: brand + "Command console", plain counters, About / clock / LIVE pills.
* New route `/about` (`pages/About.jsx`) + sidebar entry.

## Blue type + console theme (Sep 2026)
* Text colour ramp runs dark navy -> sky blue: `slate-100..600` (strong -> muted), `cyan`/`sky` scales (links/accents), `on-surface` = `#0a2540`,
  `on-surface-variant` = `#2b5b8f`. Sky blue (`#38a3e0`) is only used for large gradient text (page titles, "Netra"); small text stays >= 4.5:1.
* `src/index.css` now defines the classes the pages already used but that were missing: `.panel`, `.label-mono`, `.fade-up`, `.pulse-dot`, `.grid-bg`,
  `--border-default`, `--border-highlight`, `--bg-primary|secondary|card`, plus `h1.font-display` gradient titles, form/table/scrollbar/Leaflet styling.
* Shell (`Layout.jsx`, `Sidebar.jsx`, `LiveBell.jsx`) matches the Ingestion reference: brand + "Command console", plain counters, About / clock / LIVE pills.
* New route `/about` (`pages/About.jsx`) + sidebar entry.

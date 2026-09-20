# UI notes
The app was originally authored for a dark UI. To adopt the light redesign without editing every page, the legacy Tailwind
scales (`slate`, `cyan`, `amber`, `emerald`, `rose`, `red`, `purple`, `violet`, `sky`) are re-mapped in `tailwind.config.js`
(slate-100 = strongest text ... slate-900 = subtle panel tint). Prefer the redesign tokens for new code:
`bg-surface-container-lowest`, `text-on-surface`, `text-on-surface-variant`, `bg-primary`, `bg-primary-container`,
`text-error`, `font-headline-sm`, `font-code-telemetry`, `p-space-md` ...
Shell: `components/Layout.jsx`, `components/Sidebar.jsx`, `components/LiveBell.jsx`. Icons in the shell: Material Symbols.

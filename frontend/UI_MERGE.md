# Varuna Netra UI

The whole console uses the "daylight" language of the login/entry screen:

- paper `#f3f1ec` background, white `mist` cards, ink `#16262e` text, single teal `tide` accent (`#1f7f93`),
  `flare` / `signal` for critical / warning
- Bricolage Grotesque (display), Inter (body), IBM Plex Mono (labels)
- pill buttons (ink → teal on hover), 12–16px card radii, mono eyebrow labels
- tokens live in `tailwind.config.js` (paper/mist/ink/fog/tide/flare/signal, plus re-tinted slate/sky/cyan scales)
  and `src/index.css` (CSS variables, `.panel`, `.daylight`)
- login globe is a dependency-free canvas (`src/components/entry/GlobeCanvas.jsx`)

Run:
  cd frontend && yarn install && yarn start
Production:
  yarn build

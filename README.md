# Varuna Netra — maritime oil-spill intelligence console

Satellite (Sentinel-1) spill detection, AIS vessel correlation, jurisdiction analysis and auditable evidence.
FastAPI + MongoDB backend, React (CRA/craco + Tailwind) frontend.

## UI
The frontend uses the "Varuna Netra redesign" design system (light, Material-style tonal surfaces, Geist / Inter /
JetBrains Mono, Material Symbols icons). The original static mock is kept in `design-reference/`.
Tokens live in `frontend/tailwind.config.js` and `frontend/src/index.css`.

## Run locally
Requirements: Python 3.11+, Node 18+, yarn, MongoDB (local, or an Atlas URL in `backend/.env`).

- Windows: double-click `run_project.bat`
- macOS / Linux: `./run_project.sh`

First run creates `backend/.env` and `frontend/.env` from the `.env.example` files, installs dependencies, then starts
- backend  http://127.0.0.1:8000  (API docs at /docs)
- frontend http://localhost:3000

Sign in with **Explore as Guest**, or with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `backend/.env`
(defaults: `admin@varuna.local` / `VarunaAdmin2026x`). Change them before any real deployment.

Manual start:
```
cd backend  && python -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/uvicorn server:app --port 8000
cd frontend && yarn install && yarn start
```

## Deploy (Render)
`Dockerfile` + `render.yaml` build the frontend and serve it from the backend on one URL. See
`render_deployment_guide.md` and `AUTH_FIX.md`. Diagnose with `/health` and `/api/health`.

## Live AIS feed
Optional. Set `AISSTREAM_API_KEY` (aisstream.io). AISStream allows one connection per account, so run the feed on one
deployment only (`AIS_INGEST_ENABLED=false` elsewhere).

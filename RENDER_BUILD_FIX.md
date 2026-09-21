# Render deployment fix

The previous UI merge imported `three` from the template but `three` was missing from `frontend/package.json` and `frontend/yarn.lock`. Render uses `yarn install --frozen-lockfile`, so that mismatch caused the Docker frontend build to fail.

This version adds `three@0.169.0` to both files. The Render service also declares `AIS_INGEST_ENABLED` and `AISSTREAM_API_KEY` environment variables; configure the key only on the single production AIS-ingest instance.

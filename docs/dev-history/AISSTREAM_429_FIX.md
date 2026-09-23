# AISStream HTTP 429 / Concurrent Connection Conflict Fix

## Root Cause Analysis
The screenshot displays:
```text
AIS OFFLINE - HANDSHAKE_REJECTED: AISStream answered HTTP 429 (too many connection attempts from this host). BACKING OFF AUTOMATICALLY - DO NOT REDEPLOY REPEATEDLY. SERVER SAID: "{"error":"concurrent connections per user exceeded"}".
```

### Why this happens
1. **AISStream Single-Connection Limit**: AISStream.io strictly enforces a limit of **exactly 1 active WebSocket connection per user account / API key**.
2. **When the conflict occurs**:
   - **Multiple Environments**: If you have a Render production instance, a Render preview/staging instance, and/or a local development environment running simultaneously with `AIS_INGEST_ENABLED=true` using the same AISStream account, AISStream rejects any subsequent connection attempt with HTTP 429: `{"error":"concurrent connections per user exceeded"}`.
   - **Render Zero-Downtime Deployment Overlap**: When redeploying on Render, the new container starts while the previous container is still running and shutting down. If the old container has not yet closed its WebSocket, the new container gets rejected with HTTP 429.
   - **Redeployment Storm**: Repeatedly pressing "Redeploy" on Render exacerbates the problem because multiple containers overlap and keep colliding on the same account.

---

## Code Fixes Implemented

### 1. Backend (`backend/ais_live.py`)
- **Connection Conflict Detection**: Handshake HTTP 429 responses and `"concurrent connections per user exceeded"` errors are now classified as `KEY_CONFLICT` (not generic `OFFLINE`).
- **Sanitized Status & Reason**: Instead of dumping raw JSON strings into the UI badge, the backend returns:
  - State: `KEY_CONFLICT`
  - Feed label: `CONNECTION LIMIT — another client is connected (one connection per account)`
  - Reason: `AISStream allows only 1 active connection per user account. Another instance (e.g. preview, local dev, or previous deployment container) is connected. Ensure AIS_INGEST_ENABLED=false on secondary instances or wait for previous container to spin down, then click Reconnect now.`
- **Operator Reconnect Reset**: The `reconnect_now()` function resets `handshake_fails`, `kicks`, `last_http_status`, and wakes the worker loop immediately.

### 2. Frontend (`frontend/src/components/ingest/LiveAis.jsx`)
- **Actionable Guidance Card**: When in `KEY_CONFLICT`, the UI shows a dedicated alert explaining the 1-connection rule and listing clear steps to resolve it.
- **"Reconnect now" Button**: Re-added the `Reconnect now` button (`POST /api/ais/reconnect`) so operators can immediately reconnect as soon as they close the conflicting client or wait for the previous deployment container to terminate.
- **Badge Polish**: Cleaned up the status badge text to display `CONNECTION LIMIT — ANOTHER CLIENT IS CONNECTED` without overflowing the page header.

---

## Operational Guide: How to Avoid and Resolve Connection Conflicts

### For Production vs. Staging/Preview Deployments
In your hosting environment (e.g., Render Dashboard):
1. **Production Service**:
   ```bash
   AIS_INGEST_ENABLED=true
   AISSTREAM_API_KEY=<your_active_aisstream_key>
   ```
2. **Preview / Staging / Test Services**:
   ```bash
   AIS_INGEST_ENABLED=false
   ```
   Setting `AIS_INGEST_ENABLED=false` puts secondary deployments into **STANDBY** mode so they never compete with production for the single-connection limit.

### For Local Development
In `backend/.env`:
```bash
AIS_INGEST_ENABLED=false
```
If you want to test live AIS locally:
1. Temporarily pause or set `AIS_INGEST_ENABLED=false` on Render, **OR**
2. Create a separate free account at [aisstream.io](https://aisstream.io) for local development and set its key in `backend/.env`.

### When You Redeploy on Render
- **Do not repeatedly redeploy**: If you see HTTP 429 immediately after a redeployment, wait 60–90 seconds for Render to terminate the old container.
- Once the old container terminates, go to **Operations → Ingestion** and click **"Reconnect now"**. The connection will establish immediately without needing another deployment.

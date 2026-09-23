# Authentication/session fix

This build fixes the login/guest flow that could return to `/login` after a successful guest request.

Changes:
- Prevents the initial `/auth/me` session probe from racing a user-initiated guest/login/signup action.
- Verifies `/auth/me` after guest/login/signup/Google session exchange before routing into the app.
- Stores the issued access token in `sessionStorage` as a browser-session bearer fallback. The normal same-origin deployment still uses the httpOnly cookie.
- Avoids globally logging the user out when an `/auth/*` endpoint returns 401.
- Uses `SameSite=None; Secure` for the auth cookie so separately hosted frontend/API deployments can use credentialed requests.
- Keeps guest role read-only on the server.

Validation:
- Python backend passes `python -m compileall -q backend`.
- The container used to prepare this archive did not have Yarn installed, and the attempted npm dependency installation timed out, so a full React production build could not be run in this environment.

## Follow-up: "Request failed with status code 500" on the login page

- `POST /api/auth/guest` and `/api/auth/login` can no longer fail with an opaque 500:
  - missing `JWT_SECRET` falls back to an ephemeral key (with a warning) instead of `KeyError`;
  - a missing / non-bcrypt `password_hash` (e.g. Google-provisioned account) is a clean 401, not `KeyError`/`ValueError`;
  - the guest rate limiter is best-effort — a limiter/DB hiccup no longer blocks a read-only guest session.
- Any remaining server bug now returns JSON (`{"detail": ...}`); database outages return **503** with a readable message
  (check `MONGO_URL` and the Atlas *Network Access* allow-list, e.g. `0.0.0.0/0` for Render free tier).
- Guest sessions can now open the live alert stream (`/api/alerts/stream`), previously a 401.
- Frontend: the guest-button error is shown beside the button (the sign-in form no longer pops open with it), and
  `apiError()` explains 5xx / unreachable-server cases in plain language.
- Diagnose a deployment: open `https://<your-service>/api/health` — `database: online` and `authentication` must look right;
  `https://<your-service>/health` should show `ready: true`.

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

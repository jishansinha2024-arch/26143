"""Google sign-in. Identity comes from Google; authorization comes from the users collection.
Policy: PUBLIC sign-in — a new Google user is auto-provisioned at LOWEST privilege (role=viewer). Existing users
keep their stored role (never auto-promoted). Disabled accounts are not reactivated by Google sign-in."""
import logging
import os

import httpx

from livemode import APP_ENV, DEMO_MODE

logger = logging.getLogger("google_auth")
SESSION_DATA_URL = os.environ.get("GOOGLE_OAUTH_SESSION_URL", "")
UNAUTHORIZED_MSG = "Your Google account is not authorized for Varuna Netra. Contact an administrator for access."


def google_status() -> dict:
    flag = os.environ.get("GOOGLE_AUTH_ENABLED", "").strip().lower()
    if DEMO_MODE:
        status = "DISABLED"
    elif flag in ("1", "true", "yes"):
        status = "READY"
    elif flag in ("0", "false", "no"):
        status = "DISABLED"
    else:
        status = "UNCONFIGURED"
    return {"enabled": status == "READY", "configured": flag != "", "status": status, "provider": "Google OAuth"}


def capabilities() -> dict:
    g = google_status()
    if g["enabled"]:
        g = {**g, "policy": "PUBLIC_SIGN_IN", "default_role": "viewer"}
    return {"environment": APP_ENV, "demo_mode": DEMO_MODE, "authentication": {
        "email_password": {"enabled": True, "signup": True, "default_role": "viewer", "password_policy": "min 10 chars, letters + numbers"},
        "google": g,
        "guest": {"enabled": True, "role": "guest", "read_only": True},
    }}


async def fetch_google_identity(session_id: str) -> dict:
    """Server-side exchange of the one-time session_id — the frontend never talks to the auth provider's data endpoint."""
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(SESSION_DATA_URL, headers={"X-Session-ID": session_id})
    if r.status_code != 200:
        logger.warning("google session exchange failed: HTTP %s", r.status_code)
        raise ValueError("Google sign-in could not be verified. Please try again.")
    data = r.json()
    email = (data.get("email") or "").strip().lower()
    if not email:
        raise ValueError("Google sign-in returned no verified e-mail.")
    return {"email": email, "name": data.get("name"), "picture": data.get("picture")}

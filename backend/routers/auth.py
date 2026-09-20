import hashlib
import logging
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel

from auth import (check_lockout, clear_failures, create_access_token, create_guest_token, get_current_user, hash_password,
                  public_user, record_failure, require_role, verify_password, validate_password, rate_limit,
                  ROLES, ADMIN_ASSIGNABLE, ACCESS_HOURS, GUEST_ACCESS_HOURS, ROLE_RANK)
from db import db, clean, audit
from emailer import send_email, reset_email_html, test_email_html, record_test, configured as email_configured, get_config as get_email_config
from models import LoginRequest, UserCreate, UserUpdate, ForgotPasswordRequest, ResetPasswordRequest, SignupRequest, RoleRequestCreate, new_id

logger = logging.getLogger("auth")
router = APIRouter()


def _client_ip(request: Request) -> str:
    return (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "unknown")).split(",")[0].strip()


def _set_auth_cookie(response: Response, token: str, max_age: int) -> None:
    """Set the auth cookie for both same-origin Render and separately hosted frontends.

    Same-origin deployments can use Lax. If the API is called from another origin,
    SameSite=None is required for credentialed XHR/fetch; Secure is required with it.
    The frontend also receives the token and has a sessionStorage bearer fallback.
    """
    response.set_cookie(
        "access_token",
        token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=max_age,
        path="/",
    )


@router.post("/auth/login")
async def login(body: LoginRequest, request: Request, response: Response):
    email = body.email.lower().strip()
    ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "unknown")).split(",")[0].strip()
    ident = f"{ip}:{email}"
    await check_lockout(ident)
    user = await db.users.find_one({"email": email})
    if user and not user.get("password_hash"):
        # Google-provisioned account with no password set: say so instead of a misleading "invalid password".
        raise HTTPException(401, "This account signs in with Google. Use 'Continue with Google', or set a password via Create account.")
    if not user or not verify_password(body.password, user.get("password_hash")):
        await record_failure(ident)
        raise HTTPException(401, "Invalid email or password")
    if not user.get("active", True):
        raise HTTPException(403, "Account deactivated")
    await clear_failures(ident)
    token = create_access_token(user)
    _set_auth_cookie(response, token, ACCESS_HOURS * 3600)
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_login": datetime.now(timezone.utc)}})
    await audit("user", user["id"], "auth.login", {"email": email}, email)
    return {"access_token": token, "token_type": "bearer", "user": clean(public_user(user))}


@router.post("/auth/logout")
async def logout(response: Response, user=Depends(get_current_user)):
    response.delete_cookie("access_token", path="/", httponly=True, secure=True, samesite="none")
    await audit("user", user["id"], "auth.logout", {}, user["email"])
    return {"ok": True}


@router.get("/auth/capabilities")
async def auth_capabilities():
    """Public, secret-free: which sign-in methods this deployment actually supports."""
    from google_auth import capabilities
    return capabilities()


class GoogleSession(BaseModel):
    session_id: str


@router.post("/auth/google/session")
async def google_session(body: GoogleSession, request: Request, response: Response):
    """Exchange the Google session_id server-side; grant access ONLY to an existing active user (role from DB, never from the client)."""
    from google_auth import google_status, fetch_google_identity
    if not google_status()["enabled"]:
        raise HTTPException(403, "Google sign-in is not enabled for this deployment")
    ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "unknown")).split(",")[0].strip()
    ident = f"{ip}:google"
    await check_lockout(ident)
    try:
        ident_data = await fetch_google_identity(body.session_id.strip())
    except ValueError as e:
        await record_failure(ident)
        raise HTTPException(401, str(e))
    email = ident_data["email"]
    user = await db.users.find_one({"email": email})
    if user and not user.get("active", True):
        # Existing but disabled — Google must NOT silently reactivate.
        await record_failure(ident)
        await audit("user", user["id"], "auth.google_denied", {"email": email, "reason": "disabled"}, email)
        raise HTTPException(403, "Your Varuna Netra account is disabled. Contact an administrator.")
    if not user:
        # Public auto-provisioning at LOWEST privilege. Role is forced server-side to viewer —
        # never taken from the client, the form, or Google metadata. No auto-promotion, ever.
        now = datetime.now(timezone.utc)
        user = {"id": new_id(), "email": email, "name": ident_data.get("name") or email.split("@")[0],
                "role": "viewer", "active": True, "auth_provider": "google", "email_verified": True,
                "created_at": now, "first_login": now, "last_login": now, "last_login_method": "google"}
        await db.users.insert_one(user)
        await audit("user", user["id"], "auth.google_provisioned", {"email": email, "role": "viewer"}, email)
    await clear_failures(ident)
    token = create_access_token(user)
    _set_auth_cookie(response, token, ACCESS_HOURS * 3600)
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_login": datetime.now(timezone.utc), "last_login_method": "google"}})
    await audit("user", user["id"], "auth.login", {"email": email, "method": "google"}, email)
    return {"access_token": token, "token_type": "bearer", "user": clean(public_user(user))}


@router.post("/auth/guest")
async def guest_session(request: Request, response: Response):
    """Public, server-issued READ-ONLY session (role=guest). No account, no DB user; every write is denied server-side."""
    try:
        await rate_limit(f"guest:{_client_ip(request)}", 60, 3600)
    except HTTPException:
        raise
    except Exception:  # noqa: BLE001 — the limiter is best-effort; a read-only guest token must not 500 because of it
        logger.exception("guest rate limiter unavailable — issuing guest session anyway")
    token = create_guest_token()
    _set_auth_cookie(response, token, GUEST_ACCESS_HOURS * 3600)
    return {"access_token": token, "token_type": "bearer", "user": {"id": "guest", "email": None, "name": "Guest", "role": "guest", "active": True, "is_guest": True}}


@router.post("/auth/signup", status_code=201)
async def signup(body: SignupRequest, request: Request, response: Response):
    """Public self-registration. Role is FORCED to viewer server-side — never taken from the client. Auto-active for the hackathon (no e-mail verification while Resend runs in sandbox)."""
    await rate_limit(f"signup:{_client_ip(request)}", 10, 3600)
    validate_password(body.password)
    email = body.email.lower().strip()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(400, "A valid e-mail address is required")
    existing = await db.users.find_one({"email": email})
    if existing:
        if not existing.get("active", True):
            raise HTTPException(403, "Your Varuna Netra account is disabled. Contact an administrator.")
        if existing.get("password_hash"):
            raise HTTPException(400, "An account with this e-mail already exists. Please sign in.")
        # Google-only account signing up with a password → link it, PRESERVE the stored role (never downgrade/upgrade)
        await db.users.update_one({"id": existing["id"]}, {"$set": {"password_hash": hash_password(body.password),
                                  "name": existing.get("name") or body.name.strip(), "organization": body.organization, "auth_provider": "google+password"}})
        user = await db.users.find_one({"id": existing["id"]})
        await audit("user", user["id"], "auth.signup_linked", {"email": email}, email)
    else:
        now = datetime.now(timezone.utc)
        user = {"id": new_id(), "email": email, "name": body.name.strip(), "role": "viewer", "active": True,
                "auth_provider": "password", "email_verified": False, "password_hash": hash_password(body.password),
                "organization": body.organization, "created_at": now, "first_login": now, "last_login": now, "last_login_method": "password"}
        await db.users.insert_one(dict(user))
        await audit("user", user["id"], "auth.signup", {"email": email, "role": "viewer"}, email)
    token = create_access_token(user)
    _set_auth_cookie(response, token, ACCESS_HOURS * 3600)
    return {"access_token": token, "token_type": "bearer", "user": clean(public_user(user))}


@router.post("/role-requests", status_code=201)
async def create_role_request(body: RoleRequestCreate, request: Request, user=Depends(get_current_user)):
    if user.get("is_guest"):
        raise HTTPException(403, "Sign in with an account to request elevated access.")
    if body.requested_role not in ("analyst", "supervisor"):
        raise HTTPException(400, "You may only request analyst or supervisor access. Admin is granted only by an existing administrator.")
    if ROLE_RANK.get(user["role"], -1) >= ROLE_RANK[body.requested_role]:
        raise HTTPException(400, f"Your account already has {user['role']} access.")
    await rate_limit(f"rolereq:{user['id']}", 5, 3600)
    if await db.role_requests.find_one({"user_id": user["id"], "status": "pending"}):
        raise HTTPException(400, "You already have a pending access request.")
    now = datetime.now(timezone.utc)
    doc = {"id": new_id(), "user_id": user["id"], "email": user["email"], "name": user.get("name"),
           "current_role": user["role"], "requested_role": body.requested_role, "organization": body.organization,
           "reason": body.reason, "status": "pending", "requested_at": now}
    await db.role_requests.insert_one(dict(doc))
    await audit("role_request", doc["id"], "role_request.submitted", {"requested_role": body.requested_role}, user["email"])
    try:
        if await email_configured():
            admins = await db.users.find({"role": "admin", "active": True}).to_list(20)
            html = (f"<div style='font-family:Arial,sans-serif;padding:20px;background:#0A0E17;color:#F8FAFC'>"
                    f"<h2 style='margin:0 0 12px'>Varuna <span style='color:#00F0FF'>Netra</span> — access request</h2>"
                    f"<p style='color:#CBD5E1;font-size:14px;line-height:20px'><b>{user.get('name') or user['email']}</b> ({user['email']}) "
                    f"requested <b style='text-transform:uppercase'>{body.requested_role}</b> access.</p>"
                    f"<p style='color:#94A3B8;font-size:13px'>Organization: {body.organization or '—'}<br/>Reason: {body.reason or '—'}</p>"
                    f"<p style='color:#94A3B8;font-size:12px'>Review it in Users &amp; Roles → Elevated access requests. No access is granted until you approve.</p></div>")
            for a in admins:
                if a.get("email"):
                    await send_email(a["email"], f"Varuna Netra — {body.requested_role} access request from {user['email']}", html)
    except Exception:  # noqa: BLE001 — notification is best-effort; the request is already persisted and visible to admins
        logger.exception("role-request admin notification failed")
    return clean(doc)


@router.get("/role-requests/me")
async def my_role_request(user=Depends(get_current_user)):
    if user.get("is_guest"):
        return {"request": None}
    req = await db.role_requests.find_one({"user_id": user["id"]}, sort=[("requested_at", -1)])
    return clean({"request": req})


@router.delete("/role-requests/me")
async def cancel_my_role_request(user=Depends(get_current_user)):
    if user.get("is_guest"):
        raise HTTPException(403, "Not permitted")
    res = await db.role_requests.update_one({"user_id": user["id"], "status": "pending"}, {"$set": {"status": "cancelled", "resolved_at": datetime.now(timezone.utc)}})
    return {"ok": bool(res.modified_count)}


@router.get("/role-requests")
async def list_role_requests(status: Optional[str] = None, user=Depends(require_role("admin"))):
    q = {"status": status} if status else {}
    return clean(await db.role_requests.find(q).sort("requested_at", -1).to_list(200))


@router.post("/role-requests/{req_id}/approve")
async def approve_role_request(req_id: str, user=Depends(require_role("admin"))):
    req = await db.role_requests.find_one({"id": req_id})
    if not req:
        raise HTTPException(404, "request not found")
    if req["status"] != "pending":
        raise HTTPException(400, "request already resolved")
    if req["requested_role"] not in ("analyst", "supervisor"):
        raise HTTPException(400, "invalid requested role")
    target = await db.users.find_one({"id": req["user_id"]})
    if not target:
        raise HTTPException(404, "user not found")
    old = target.get("role")
    await db.users.update_one({"id": req["user_id"]}, {"$set": {"role": req["requested_role"]}})
    await db.role_requests.update_one({"id": req_id}, {"$set": {"status": "approved", "resolved_at": datetime.now(timezone.utc), "resolved_by": user["email"]}})
    await audit("user", req["user_id"], "role_request.approved", {"old_role": old, "new_role": req["requested_role"]}, user["email"])
    return {"ok": True, "user_id": req["user_id"], "role": req["requested_role"]}


@router.post("/role-requests/{req_id}/reject")
async def reject_role_request(req_id: str, user=Depends(require_role("admin"))):
    req = await db.role_requests.find_one({"id": req_id})
    if not req:
        raise HTTPException(404, "request not found")
    if req["status"] != "pending":
        raise HTTPException(400, "request already resolved")
    await db.role_requests.update_one({"id": req_id}, {"$set": {"status": "rejected", "resolved_at": datetime.now(timezone.utc), "resolved_by": user["email"]}})
    await audit("role_request", req_id, "role_request.rejected", {"requested_role": req["requested_role"]}, user["email"])
    return {"ok": True}


@router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return clean(user)


@router.get("/users")
async def list_users(user=Depends(require_role("admin"))):
    return clean([public_user(u) async for u in db.users.find({}).sort("created_at", 1)])


@router.post("/users", status_code=201)
async def create_user(body: UserCreate, user=Depends(require_role("admin"))):
    if body.role not in ADMIN_ASSIGNABLE:
        raise HTTPException(400, f"role must be one of {ADMIN_ASSIGNABLE}")
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "email already registered")
    doc = {"id": new_id(), "email": email, "name": body.name, "role": body.role, "password_hash": hash_password(body.password),
           "active": True, "created_at": datetime.now(timezone.utc), "created_by": user["email"]}
    await db.users.insert_one(dict(doc))
    await audit("user", doc["id"], "user.created", {"email": email, "role": body.role}, user["email"])
    return clean(public_user(doc))


@router.patch("/users/{user_id}")
async def update_user(user_id: str, body: UserUpdate, user=Depends(require_role("admin"))):
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(404, "user not found")
    update = {}
    if body.role is not None:
        if body.role not in ADMIN_ASSIGNABLE:
            raise HTTPException(400, f"role must be one of {ADMIN_ASSIGNABLE}")
        if user_id == user["id"] and body.role != "admin":
            raise HTTPException(400, "cannot demote yourself")
        update["role"] = body.role
    if body.active is not None:
        if user_id == user["id"] and not body.active:
            raise HTTPException(400, "cannot deactivate yourself")
        update["active"] = body.active
    if body.name is not None:
        update["name"] = body.name
    if body.notify_alerts is not None:
        update["notify_alerts"] = body.notify_alerts
    if body.password:
        update["password_hash"] = hash_password(body.password)
    if update:
        await db.users.update_one({"id": user_id}, {"$set": update})
        await audit("user", user_id, "user.updated", {k: v for k, v in update.items() if k != "password_hash"}, user["email"])
    return clean(public_user(await db.users.find_one({"id": user_id})))


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, user=Depends(require_role("admin"))):
    if user_id == user["id"]:
        raise HTTPException(400, "cannot delete yourself")
    res = await db.users.delete_one({"id": user_id})
    if not res.deleted_count:
        raise HTTPException(404, "user not found")
    await audit("user", user_id, "user.deleted", {}, user["email"])
    return {"ok": True}


GENERIC_MSG = "If that account exists, a reset link has been issued. Check your inbox (or ask an administrator if email delivery is not configured)."


@router.post("/auth/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, request: Request):
    await rate_limit(f"forgot:{_client_ip(request)}", 5, 900)
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        await audit("user", "unknown", "auth.reset_requested_unknown_email", {"email": email}, email)
        return {"message": GENERIC_MSG, "delivery": "email"}  # identical shape for unknown accounts — no enumeration
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    link = f"{os.environ['FRONTEND_URL'].rstrip('/')}/reset-password?token={token}"
    sent_res = await send_email(email, "Varuna Netra password reset", reset_email_html(user.get("name") or email, link))
    sent = sent_res["sent"]
    delivery = "email" if sent else "logged"
    await db.password_reset_tokens.insert_one({
        "id": new_id(), "token_hash": hashlib.sha256(token.encode()).hexdigest(), "user_id": user["id"], "email": email,
        "expires_at": now + timedelta(hours=1), "used": False, "delivery": delivery, "link": None if sent else link,
        "requested_ip": (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "")).split(",")[0].strip(), "created_at": now})
    if not sent:
        logger.warning("PASSWORD RESET LINK for %s (email not configured): %s", email, link)
    await audit("user", user["id"], "auth.reset_requested", {"delivery": delivery}, email)
    return {"message": GENERIC_MSG, "delivery": delivery}


@router.post("/auth/reset-password")
async def reset_password(body: ResetPasswordRequest, request: Request):
    await rate_limit(f"reset:{_client_ip(request)}", 10, 900)
    validate_password(body.new_password)
    rec = await db.password_reset_tokens.find_one({"token_hash": hashlib.sha256(body.token.encode()).hexdigest()})
    if not rec or rec.get("used"):
        raise HTTPException(400, "Reset link is invalid or has already been used")
    if rec["expires_at"].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(400, "Reset link has expired — request a new one")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"password_hash": hash_password(body.new_password), "password_changed_at": datetime.now(timezone.utc)}})
    await db.password_reset_tokens.update_one({"id": rec["id"]}, {"$set": {"used": True, "used_at": datetime.now(timezone.utc), "link": None}})
    await db.login_attempts.delete_many({"identifier": {"$regex": f":{re.escape(rec['email'])}$"}})
    await audit("user", rec["user_id"], "auth.password_reset", {"via": "reset_link"}, rec["email"])
    return {"ok": True, "email": rec["email"]}


@router.get("/auth/reset-requests")
async def list_reset_requests(user=Depends(require_role("admin"))):
    rows = await db.password_reset_tokens.find({}, {"_id": 0, "token_hash": 0}).sort("created_at", -1).to_list(50)
    return clean({"email_configured": await email_configured(), "requests": rows})


class EmailSettings(BaseModel):
    resend_api_key: Optional[str] = None
    sender_email: Optional[str] = None
    enabled: Optional[bool] = None
    alerts_enabled: Optional[bool] = None
    alert_recipients: Optional[List[str]] = None


def _mask(k: str) -> str:
    return f"{k[:5]}…{k[-4:]}" if k and len(k) > 10 else ("set" if k else "")


@router.get("/settings/email")
async def get_email_settings(user=Depends(require_role("admin"))):
    c = await get_email_config()
    return clean({**c, "api_key": _mask(c["api_key"]), "configured": bool(c["api_key"]) and c["enabled"]})


@router.put("/settings/email")
async def put_email_settings(body: EmailSettings, user=Depends(require_role("admin"))):
    update = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if "resend_api_key" in update and update["resend_api_key"] == "":
        update["resend_api_key"] = None
    if "alert_recipients" in update:
        update["alert_recipients"] = sorted({e.lower().strip() for e in update["alert_recipients"] if "@" in e})
    update.update({"updated_at": datetime.now(timezone.utc), "updated_by": user["email"]})
    await db.settings.update_one({"key": "email"}, {"$set": update}, upsert=True)
    await audit("settings", "email", "settings.email_updated", {k: ("***" if k == "resend_api_key" else v) for k, v in update.items()}, user["email"])
    return await get_email_settings(user)


@router.post("/settings/email/test")
async def test_email_settings(user=Depends(require_role("admin"))):
    res = await send_email(user["email"], "Varuna Netra delivery test", test_email_html(user.get("name") or user["email"]))
    await record_test(res, user["email"])
    await audit("settings", "email", "settings.email_tested", res, user["email"])
    if not res["sent"]:
        raise HTTPException(400, res.get("error", "send failed"))
    return {"ok": True, "to": user["email"], "id": res.get("id")}



@router.post("/email/test")
async def email_test(to: Optional[str] = None, user=Depends(require_role("admin"))):
    """Send a test e-mail via Resend (RESEND_API_KEY from backend env). Clear JSON on success/failure; never raises, never returns the key."""
    cfg = await get_email_config()
    target = to or user["email"]
    if not cfg["api_key"]:
        return {"ok": False, "configured": False, "error": "RESEND_API_KEY not configured in the backend environment", "sender": cfg["sender_email"], "to": target}
    res = await send_email(target, "Varuna Netra — Resend delivery test", test_email_html(user.get("name") or target))
    await record_test(res, target)
    await audit("settings", "email", "settings.email_tested", {**res, "to": target}, user["email"])
    return {"ok": res["sent"], "configured": True, "sender": cfg["sender_email"], "to": target, "id": res.get("id"), "error": res.get("error"),
            "note": None if res["sent"] else "With onboarding@resend.dev Resend only delivers to the account owner's e-mail; verify a domain to send to others."}

import logging
import os
import re
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request

from db import db, audit
from models import new_id

logger = logging.getLogger("auth")
ALG = "HS256"
ROLES = ["analyst", "supervisor", "admin"]  # legacy staff roles
ALL_ROLES = ["guest", "viewer", "analyst", "supervisor", "admin"]
ADMIN_ASSIGNABLE = ["viewer", "analyst", "supervisor", "admin"]  # roles an admin may assign; 'guest' is never a stored role
ROLE_RANK = {"viewer": 0, "analyst": 1, "supervisor": 2, "admin": 3}  # 'guest' (and unknown) → -1 via .get(role, -1): denied every write
ACCESS_HOURS = 12
GUEST_ACCESS_HOURS = 6
LOCKOUT_ATTEMPTS, LOCKOUT_MINUTES = 5, 15
GUEST_USER = {"id": "guest", "email": None, "name": "Guest", "role": "guest", "active": True, "is_guest": True}


_FALLBACK_SECRET: str = ""


def jwt_secret() -> str:
    """JWT signing key from JWT_SECRET. If the deployment forgot to set it, fall back to a per-process
    random key (and warn) instead of crashing every login/guest request with a 500. Sessions then only
    survive until the next restart, which is the safe failure mode."""
    global _FALLBACK_SECRET
    sec = os.environ.get("JWT_SECRET", "").strip()
    if sec:
        return sec
    if not _FALLBACK_SECRET:
        _FALLBACK_SECRET = secrets.token_urlsafe(48)
        logger.warning("JWT_SECRET is not set — using an ephemeral signing key. Set JWT_SECRET so sessions survive restarts.")
    return _FALLBACK_SECRET


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode()[:72], bcrypt.gensalt()).decode()


def verify_password(p: str, h) -> bool:
    """Never raises: a missing/non-bcrypt hash (e.g. Google-only account) or odd input is simply 'wrong password'."""
    if not h or not isinstance(h, str):
        return False
    try:
        return bcrypt.checkpw(p.encode()[:72], h.encode())
    except (ValueError, TypeError):
        return False


def create_access_token(user: dict) -> str:
    payload = {"sub": user["id"], "email": user["email"], "role": user["role"], "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_HOURS)}
    return jwt.encode(payload, jwt_secret(), algorithm=ALG)


def create_guest_token() -> str:
    """Server-issued read-only session. No DB user — role 'guest' is denied every write by require_role."""
    payload = {"sub": "guest", "email": "guest", "role": "guest", "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(hours=GUEST_ACCESS_HOURS)}
    return jwt.encode(payload, jwt_secret(), algorithm=ALG)


def validate_password(p: str) -> None:
    if len(p) < 10:
        raise HTTPException(400, "Password must be at least 10 characters")
    if len(p.encode("utf-8")) > 72:
        raise HTTPException(400, "Password is too long (max 72 bytes)")
    if not re.search(r"[A-Za-z]", p) or not re.search(r"\d", p):
        raise HTTPException(400, "Password must include both letters and numbers")


async def rate_limit(key: str, max_calls: int, window_seconds: int) -> None:
    now = datetime.now(timezone.utc)
    rec = await db.rate_limits.find_one({"key": key})
    if rec and rec.get("window_start") and rec["window_start"].replace(tzinfo=timezone.utc) > now - timedelta(seconds=window_seconds):
        if rec.get("count", 0) >= max_calls:
            raise HTTPException(429, "Too many requests. Please wait a moment and try again.")
        await db.rate_limits.update_one({"key": key}, {"$inc": {"count": 1}})
    else:
        await db.rate_limits.update_one({"key": key}, {"$set": {"window_start": now, "count": 1}}, upsert=True)


def public_user(u: dict) -> dict:
    return {k: v for k, v in u.items() if k not in ("_id", "password_hash")}


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        h = request.headers.get("Authorization", "")
        if h.startswith("Bearer "):
            token = h[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, jwt_secret(), algorithms=[ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    if payload.get("type") != "access":
        raise HTTPException(401, "Invalid token type")
    if payload.get("role") == "guest":
        return dict(GUEST_USER)
    user = await db.users.find_one({"id": payload["sub"]})
    if not user or not user.get("active", True):
        raise HTTPException(401, "User not found or deactivated")
    return public_user(user)


def require_role(min_role: str):
    async def dep(user: dict = Depends(get_current_user)) -> dict:
        if ROLE_RANK.get(user["role"], -1) < ROLE_RANK[min_role]:
            raise HTTPException(403, f"Requires role '{min_role}' or higher")
        return user
    return dep


async def check_lockout(identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    if rec and rec.get("count", 0) >= LOCKOUT_ATTEMPTS:
        last = rec["last_attempt"].replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) - last < timedelta(minutes=LOCKOUT_MINUTES):
            raise HTTPException(429, f"Too many failed attempts. Try again in {LOCKOUT_MINUTES} minutes.")
        await db.login_attempts.delete_one({"identifier": identifier})


async def record_failure(identifier: str):
    await db.login_attempts.update_one({"identifier": identifier}, {"$inc": {"count": 1}, "$set": {"last_attempt": datetime.now(timezone.utc)}}, upsert=True)


async def clear_failures(identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})


async def upsert_user(email: str, password: str, name: str, role: str):
    email = email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({"id": new_id(), "email": email, "password_hash": hash_password(password), "name": name, "role": role,
                                   "active": True, "created_at": datetime.now(timezone.utc)})
    elif not verify_password(password, existing.get("password_hash")):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password)}})


async def seed_users():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=86400)
    await db.password_reset_tokens.create_index("token_hash")
    await db.role_requests.create_index([("user_id", 1), ("status", 1)])
    await db.role_requests.create_index([("status", 1), ("requested_at", -1)])
    await db.rate_limits.create_index("key", unique=True)
    await db.rate_limits.create_index("window_start", expireAfterSeconds=3600)
    await upsert_user(os.environ["ADMIN_EMAIL"], os.environ["ADMIN_PASSWORD"], "System Administrator", "admin")
    from livemode import DEMO_MODE
    if DEMO_MODE and os.environ.get("DEMO_SUPERVISOR_PASSWORD") and os.environ.get("DEMO_ANALYST_PASSWORD"):
        # demo staff accounts only exist in explicit DEMO mode; production admins create real users via /users
        await upsert_user(os.environ["DEMO_SUPERVISOR_EMAIL"], os.environ["DEMO_SUPERVISOR_PASSWORD"], "Duty Supervisor", "supervisor")
        await upsert_user(os.environ["DEMO_ANALYST_EMAIL"], os.environ["DEMO_ANALYST_PASSWORD"], "Marine Analyst", "analyst")

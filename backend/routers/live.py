import asyncio
from datetime import datetime, timezone
from typing import Literal, Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from auth import ALG, GUEST_USER, get_current_user, jwt_secret, require_role
from db import db, clean, audit
from events import publish, subscribe, unsubscribe, subscriber_count
from models import new_id

router = APIRouter()
FP_REASONS = ["low_wind", "wake", "upwelling", "land_shore", "biogenic_slick", "rain_cell", "other"]


async def _user_from_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, jwt_secret(), algorithms=[ALG])
    except jwt.InvalidTokenError:
        raise HTTPException(401, "invalid token")
    if payload.get("role") == "guest":  # read-only public session: no DB user, but may watch the live stream
        return dict(GUEST_USER)
    user = await db.users.find_one({"id": payload.get("sub"), "active": True}, {"_id": 0})
    if not user:
        raise HTTPException(401, "user not found")
    return user


@router.get("/alerts/stream")
async def alerts_stream(request: Request, token: Optional[str] = Query(None)):
    """SSE stream; authenticates via httpOnly access_token cookie (browser) or ?token= (programmatic clients)."""
    tok = request.cookies.get("access_token") or token
    if not tok:
        raise HTTPException(401, "Not authenticated")
    user = await _user_from_token(tok)
    q = subscribe()

    async def gen():
        yield f"event: hello\ndata: {{\"user\": \"{user['email']}\", \"subscribers\": {subscriber_count()}}}\n\n"
        try:
            while True:
                try:
                    msg = await asyncio.wait_for(q.get(), timeout=15)
                    yield msg
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            unsubscribe(q)
    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"})


@router.get("/alerts/latest")
async def alerts_latest(since: Optional[str] = None, limit: int = Query(20, ge=1, le=100), user=Depends(get_current_user)):
    q = {}
    if since:
        q["created_at"] = {"$gt": datetime.fromisoformat(since.replace("Z", "+00:00"))}
    rows = await db.alerts.find(q, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return clean({"alerts": rows, "unacknowledged": await db.alerts.count_documents({"acknowledged": False}), "server_time": datetime.now(timezone.utc)})


class FeedbackIn(BaseModel):
    verdict: Literal["true_positive", "false_positive", "uncertain"]
    reason: Optional[str] = None
    notes: str = Field(default="", max_length=1000)


@router.post("/cases/{case_id}/detector-feedback", status_code=201)
async def detector_feedback(case_id: str, body: FeedbackIn, user=Depends(require_role("analyst"))):
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(404, "case not found")
    if body.verdict == "false_positive" and body.reason not in FP_REASONS:
        raise HTTPException(400, f"reason required for false positives: one of {FP_REASONS}")
    spill = await db.spill_observations.find_one({"id": case["spill_observation_id"]}, {"_id": 0, "processing_version": 1, "source": 1, "detection_confidence": 1})
    now = datetime.now(timezone.utc)
    doc = {"id": new_id(), "case_id": case_id, "case_number": case["case_number"], "scene_id": case.get("scene_id"), "detector_version": spill.get("processing_version") or "unknown", "detector_source": spill.get("source"),
           "detection_confidence": spill.get("detection_confidence"), "verdict": body.verdict, "is_true_positive": body.verdict == "true_positive", "reason": body.reason if body.verdict == "false_positive" else None,
           "notes": body.notes, "user_id": user["id"], "user_email": user["email"], "user_role": user["role"], "created_at": now}
    await db.detector_feedback.insert_one(dict(doc))
    await db.cases.update_one({"id": case_id}, {"$set": {"detector_feedback": {"verdict": body.verdict, "reason": doc["reason"], "by": user["email"], "at": now}}})
    await audit("case", case_id, "detector.feedback", {"verdict": body.verdict, "reason": doc["reason"], "detector_version": doc["detector_version"], "notes": body.notes[:200]}, user["email"])
    return clean(doc)


@router.get("/cases/{case_id}/detector-feedback")
async def list_feedback(case_id: str, user=Depends(get_current_user)):
    return clean(await db.detector_feedback.find({"case_id": case_id}, {"_id": 0}).sort("created_at", -1).to_list(100))


@router.get("/detector/precision")
async def detector_precision(user=Depends(get_current_user)):
    """Precision = TP / (TP + FP) per detector version, latest verdict per case; FP reason breakdown."""
    pipe = [{"$sort": {"created_at": -1}}, {"$group": {"_id": "$case_id", "latest": {"$first": "$$ROOT"}}}, {"$replaceRoot": {"newRoot": "$latest"}}]
    rows = await db.detector_feedback.aggregate(pipe).to_list(10000)
    versions, reasons, weekly = {}, {}, {}
    for r in rows:
        v = versions.setdefault(r["detector_version"], {"detector_version": r["detector_version"], "tp": 0, "fp": 0, "uncertain": 0, "reviewed": 0})
        v["reviewed"] += 1
        if r["verdict"] == "true_positive":
            v["tp"] += 1
        elif r["verdict"] == "false_positive":
            v["fp"] += 1
            reasons[r.get("reason") or "other"] = reasons.get(r.get("reason") or "other", 0) + 1
        else:
            v["uncertain"] += 1
        wk = r["created_at"].strftime("%G-W%V")
        w = weekly.setdefault(wk, {"week": wk, "tp": 0, "fp": 0})
        w["tp" if r["verdict"] == "true_positive" else "fp" if r["verdict"] == "false_positive" else "tp"] += 1 if r["verdict"] != "uncertain" else 0
    out = []
    for v in versions.values():
        n = v["tp"] + v["fp"]
        v["precision"] = round(v["tp"] / n, 3) if n else None
        out.append(v)
    out.sort(key=lambda v: v["detector_version"])
    total_tp = sum(v["tp"] for v in out)
    total_fp = sum(v["fp"] for v in out)
    pending = await db.cases.count_documents({"source": {"$in": ["dark_spot_detector", "mock_detector"]}, "detector_feedback": {"$exists": False}})
    return clean({"versions": out, "overall": {"tp": total_tp, "fp": total_fp, "precision": round(total_tp / (total_tp + total_fp), 3) if total_tp + total_fp else None, "reviewed": len(rows), "pending_review": pending},
                  "fp_reasons": [{"reason": k, "count": c} for k, c in sorted(reasons.items(), key=lambda x: -x[1])], "weekly": sorted(weekly.values(), key=lambda w: w["week"]),
                  "reasons_catalog": FP_REASONS, "recent": [{"case_number": r["case_number"], "verdict": r["verdict"], "reason": r.get("reason"), "by": r["user_email"], "at": r["created_at"], "detector_version": r["detector_version"]} for r in sorted(rows, key=lambda r: r["created_at"], reverse=True)[:10]]})


@router.post("/events/test-publish")
async def test_publish(user=Depends(require_role("admin"))):
    publish("ping", {"message": "test event from admin", "by": user["email"]})
    return {"ok": True, "subscribers": subscriber_count()}

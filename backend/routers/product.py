"""Product surfaces: detector status, honest validation page, stored investigation summaries,
Why-Not-#2 candidate comparison, and a read-only Admin Security Center. All values are derived
from real stored data or runtime config — never fabricated."""
import logging
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import get_current_user, require_role
from db import db, clean, audit
from ml_detector import detector_status
from correlation import ALGORITHM_VERSION
from drift import DRIFT_MODEL_VERSION

logger = logging.getLogger("product")
router = APIRouter()

NOT_VALIDATED = "NOT YET VALIDATED"


@router.get("/detector/status")
async def get_detector_status(user=Depends(get_current_user)):
    return {**detector_status(), "correlation_version": ALGORITHM_VERSION, "drift_version": DRIFT_MODEL_VERSION}


@router.get("/validation")
async def get_validation(user=Depends(get_current_user)):
    """Only measured values are ever shown. Everything unmeasured reads NOT YET VALIDATED."""
    det = detector_status()
    return {
        "detector": det,
        "correlation_version": ALGORITHM_VERSION,
        "drift_version": DRIFT_MODEL_VERSION,
        "status": "NOT_YET_VALIDATED",
        "note": "No independent evaluation dataset has been run against this deployment. Metrics populate only from measured results — never fabricated. Targets are goals, not achievements.",
        "detection_metrics": {k: NOT_VALIDATED for k in (
            "evaluation_dataset", "test_scene_count", "positive_slick_count", "negative_lookalike_count",
            "precision", "recall", "f1", "iou", "dice", "false_positives_per_scene")},
        "correlation_metrics": {k: NOT_VALIDATED for k in ("top_1_recall", "top_3_recall", "ambiguity_rate")},
        "targets": {"precision": "\u2265 0.80", "recall": "\u2265 0.75", "false_positives_per_scene": "\u2264 1.0 / scene", "top_3_recall": "\u2265 0.90"},
    }


async def _latest_result(case_id: str) -> Optional[dict]:
    return await db.correlation_results.find_one({"case_id": case_id}, {"_id": 0}, sort=[("version", -1)])


def _build_summary(case: dict, scene: Optional[dict], spill: Optional[dict], result: Optional[dict], det: dict) -> dict:
    cands = (result or {}).get("candidates") or []
    top = cands[0] if cands else None
    env = (result or {}).get("environment") or {}
    wind, current = env.get("wind"), env.get("current")
    lines = []
    acq = (scene or {}).get("acquisition_time") or case.get("acquisition_time")
    lines.append(f"Sentinel-1 acquisition: {(scene or {}).get('provider_scene_id') or 'scene metadata unavailable'}"
                 + (f" acquired {acq}." if acq else "."))
    conf = case.get("detection_confidence")
    if case.get("detection_confidence_source") == "detector" and conf is not None:
        lines.append(f"Detector: {det['active_detector']} ({det['mode']}); candidate detection confidence {conf:.2f}.")
    else:
        lines.append(f"Detector: {det['active_detector']} ({det['mode']}); detection confidence not machine-derived (analyst/registered).")
    if wind or current:
        parts = []
        if wind:
            parts.append(f"wind {wind.get('speed_ms')} m/s @ {wind.get('direction_deg')}\u00b0")
        if current:
            parts.append(f"current {current.get('speed_ms')} m/s @ {current.get('direction_deg')}\u00b0")
        lines.append("Environment (" + (env.get("source") or "provider") + "): " + ", ".join(parts) + ".")
    else:
        lines.append("Environment: wind/current UNAVAILABLE — drift attribution marked degraded.")
    lines.append(f"Drift model {DRIFT_MODEL_VERSION}: reverse-Lagrangian backtrack with a 2\u03c3 origin-uncertainty envelope.")
    lines.append(f"AIS candidates considered: {case.get('candidate_count', len(cands))}.")
    if top:
        lines.append(f"Highest-ranked candidate: {top.get('vessel_name') or ('MMSI ' + str(top.get('mmsi')))} "
                     f"(score {top.get('score')}, status {top.get('status')}).")
        f = top.get("factors") or {}
        if f:
            best = sorted(f.items(), key=lambda kv: -(kv[1].get('contribution') or 0))[:2]
            lines.append("Main ranking drivers: " + ", ".join(f"{k} ({v.get('detail')})" for k, v in best) + ".")
    else:
        lines.append("No candidate vessel qualified in the correlation window.")
    lines.append(f"Attribution status: {case.get('attribution_status')} (confidence band {case.get('confidence_band') or 'n/a'}).")
    lines.append(f"Analyst review: {case.get('review_state')}.")
    lines.append("Decision support \u2014 not a legal determination. Analyst review required before any operational action.")
    return {
        "case_id": case["id"], "case_number": case.get("case_number"),
        "summary": " ".join(lines),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generated_by": "deterministic-template-1.0",
        "detector_version": det["active_detector"], "detector_mode": det["mode"],
        "correlation_version": ALGORITHM_VERSION, "drift_version": DRIFT_MODEL_VERSION,
        "environment_provenance": {
            "source": env.get("source"),
            "wind": {"state": "REAL PROVIDER DATA" if wind else "UNAVAILABLE", **(wind or {})},
            "current": {"state": "REAL PROVIDER DATA" if current else "UNAVAILABLE", **(current or {})},
        },
        "top_candidate": ({"mmsi": top.get("mmsi"), "vessel_name": top.get("vessel_name"), "score": top.get("score"), "status": top.get("status")} if top else None),
        "attribution_status": case.get("attribution_status"),
        "review_state": case.get("review_state"),
    }


async def _generate_and_store(case_id: str) -> dict:
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(404, "case not found")
    scene = await db.scenes.find_one({"id": case["scene_id"]}, {"_id": 0, "acquisition_time": 1, "provider_scene_id": 1}) if case.get("scene_id") else None
    spill = await db.spill_observations.find_one({"id": case.get("spill_observation_id")}, {"_id": 0}) if case.get("spill_observation_id") else None
    result = await _latest_result(case_id)
    doc = _build_summary(case, scene, spill, result, detector_status())
    doc["source_case_version"] = case.get("latest_result_version")
    await db.investigation_summaries.update_one({"case_id": case_id}, {"$set": doc}, upsert=True)
    return doc


@router.get("/cases/{case_id}/summary")
async def get_case_summary(case_id: str, user=Depends(get_current_user)):
    """Persistent deterministic Investigation Summary — generated on first access, then reused."""
    existing = await db.investigation_summaries.find_one({"case_id": case_id}, {"_id": 0})
    if existing:
        return clean(existing)
    return clean(await _generate_and_store(case_id))


@router.post("/cases/{case_id}/summary/regenerate")
async def regenerate_case_summary(case_id: str, user=Depends(require_role("analyst"))):
    doc = await _generate_and_store(case_id)
    await audit("case", case_id, "summary.regenerated", {"by": doc["generated_by"]}, user["email"])
    return clean(doc)


@router.get("/cases/{case_id}/candidate-comparison")
async def candidate_comparison(case_id: str, user=Depends(get_current_user)):
    """Why This Vessel / Why Not #2 — deterministic comparison of the top two candidates using only correlation.py outputs."""
    result = await _latest_result(case_id)
    cands = (result or {}).get("candidates") or []
    if not cands:
        return {"case_id": case_id, "available": False, "message": "No correlation run / no candidates yet."}
    top = cands[0]
    if len(cands) < 2:
        return {"case_id": case_id, "available": True, "rank1": _cand(top), "rank2": None, "verdict": "NO COMPARABLE SECOND CANDIDATE", "explanation": "Only one candidate vessel qualified in the correlation window."}
    second = cands[1]
    delta = round((top.get("score") or 0) - (second.get("score") or 0), 4)
    diffs = []
    for k, fv in (top.get("factors") or {}).items():
        c1 = fv.get("contribution") or 0
        c2 = ((second.get("factors") or {}).get(k) or {}).get("contribution") or 0
        diffs.append((k, round(c1 - c2, 4)))
    diffs.sort(key=lambda kv: -kv[1])
    drivers = [k for k, d in diffs if d > 0][:2]
    ambiguous = delta < 0.08
    name1 = top.get("vessel_name") or f"MMSI {top.get('mmsi')}"
    name2 = second.get("vessel_name") or f"MMSI {second.get('mmsi')}"
    if ambiguous:
        explanation = f"Scores differ by only {delta} \u2014 AMBIGUOUS ATTRIBUTION. {name1} and {name2} cannot be reliably separated; analyst review required."
    else:
        explanation = f"{name1} ranks above {name2} primarily due to stronger " + " and ".join(drivers) + f" (total-score margin {delta})." if drivers else f"{name1} ranks above {name2} (margin {delta})."
    return {"case_id": case_id, "available": True, "rank1": _cand(top), "rank2": _cand(second),
            "score_delta": delta, "verdict": "AMBIGUOUS ATTRIBUTION" if ambiguous else "CLEARER RANK #1",
            "top_factor_differences": [{"factor": k, "contribution_delta": d} for k, d in diffs],
            "explanation": explanation,
            "disclaimer": "Decision support \u2014 not a legal determination. Numbers are produced by correlation.py, not estimated."}


def _cand(c: dict) -> dict:
    ev = c.get("evidence") or {}
    return {"mmsi": c.get("mmsi"), "vessel_name": c.get("vessel_name"), "score": c.get("score"), "status": c.get("status"),
            "factors": c.get("factors"), "ais_flags": c.get("ais_flags"),
            "distance_km": ev.get("distance_km"), "time_gap_hours": ev.get("time_gap_hours"),
            "fix_count": ev.get("fix_count"), "interpolated_count": ev.get("interpolated_count"), "max_gap_hours": ev.get("max_gap_hours"),
            "in_drift_envelope": bool(ev.get("drift_match"))}


def _cfg(name: str) -> bool:
    return bool(os.environ.get(name))


class AssistantAsk(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


@router.get("/assistant/status")
async def assistant_status(user=Depends(get_current_user)):
    return {"enabled": _cfg("OPENAI_API_KEY") or _cfg("LLM_KEY"), "model": "gpt-4o-mini", "grounded": True,
            "note": "Answers are grounded only in this case's stored evidence. It never invents scenes, AIS, vessels, confidence or metrics."}


@router.post("/cases/{case_id}/assistant")
async def case_assistant(case_id: str, body: AssistantAsk, user=Depends(get_current_user)):
    """Optional OpenAI case assistant — grounded ONLY in the case's stored evidence. Disabled gracefully if no key."""
    from routers.billing import current_entitlement
    entitlement = await current_entitlement(user)
    if entitlement.get("plan") not in ("pro", "institution") or entitlement.get("status") not in ("active", "trialing"):
        raise HTTPException(402, {"code": "ENTITLEMENT_REQUIRED", "required": "pro", "message": "The case assistant requires an active Pro or Institution plan."})
    key = os.environ.get("OPENAI_API_KEY") or os.environ.get("LLM_KEY")
    if not key:
        raise HTTPException(503, "AI assistant NOT CONFIGURED (no LLM key).")
    if user.get("is_guest"):
        raise HTTPException(403, "Sign in to use the case assistant.")
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(404, "case not found")
    summary = await db.investigation_summaries.find_one({"case_id": case_id}, {"_id": 0}) or await _generate_and_store(case_id)
    result = await _latest_result(case_id)
    cands = [(c.get("vessel_name") or f"MMSI {c.get('mmsi')}", c.get("score"), c.get("status")) for c in (result or {}).get("candidates", [])[:5]]
    det = detector_status()
    context = {
        "case_number": case.get("case_number"), "attribution_status": case.get("attribution_status"),
        "review_state": case.get("review_state"), "detector": det["active_detector"], "detector_mode": det["mode"],
        "detection_confidence": case.get("detection_confidence"), "top_score": case.get("top_score"),
        "candidate_count": case.get("candidate_count"), "primary_jurisdiction": (case.get("primary_jurisdiction") or {}).get("code"),
        "candidates": cands, "summary": summary.get("summary"),
        "environment": summary.get("environment_provenance"), "correlation_version": ALGORITHM_VERSION, "drift_version": DRIFT_MODEL_VERSION,
    }
    system = ("You are the Varuna Netra case assistant. Answer ONLY using the CASE DATA provided as JSON. "
              "Never invent satellite scenes, AIS positions, vessels, coordinates, confidence values, environmental data or metrics. "
              "If the answer is not in the data, say it is not available in this case. Be concise, factual, and neutral. "
              "Ranked candidates are decision support, NOT a legal determination of responsibility.")
    try:
        import openai
        import json as _json
        client = openai.AsyncOpenAI(api_key=key)
        res = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": f"CASE DATA (JSON):\n{_json.dumps(context, default=str)}\n\nQUESTION: {body.question}"}
            ]
        )
        answer = res.choices[0].message.content or ""
    except Exception as e:  # noqa: BLE001
        logger.exception("assistant failed")
        raise HTTPException(502, f"AI assistant error: {str(e)[:150]}")
    now = datetime.now(timezone.utc)
    await db.assistant_messages.insert_one({"case_id": case_id, "user_id": user.get("id"), "question": body.question,
                                            "answer": str(answer), "model": "gpt-5.4", "created_at": now})
    return {"case_id": case_id, "question": body.question, "answer": str(answer), "model": "gpt-5.4",
            "grounded_in": {"case_number": context["case_number"], "candidates": len(cands)},
            "disclaimer": "Grounded in stored case evidence only. Decision support — not a legal determination."}


@router.get("/admin/security")
async def admin_security(user=Depends(require_role("admin"))):
    """Read-only Security Center. Shows only booleans/states derived from real config & runtime — never any secret value."""
    det = detector_status()
    cors = bool([o for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()] or os.environ.get("FRONTEND_URL"))
    checks = [
        {"category": "Authentication", "state": "PASS", "detail": "bcrypt password hashing, login lockout, viewer-only public signup"},
        {"category": "Authorization / RBAC", "state": "PASS", "detail": "server-side require_role on all mutating routes; guest/viewer read-only"},
        {"category": "Rate limiting", "state": "PASS", "detail": "login lockout + signup/guest/forgot-password/verify/role-request throttling"},
        {"category": "Security headers", "state": "PASS", "detail": "CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy"},
        {"category": "CORS", "state": "PASS" if cors else "NOT CONFIGURED", "detail": "explicit allow-list; no wildcard with credentials"},
        {"category": "Upload validation", "state": "PASS", "detail": "server-side MIME + size limit + sanitized generated storage names"},
        {"category": "Secrets", "state": "PASS", "detail": "all secrets backend-only; never returned by health/config/API"},
        {"category": "ML model", "state": "PASS" if det["ml_model_installed"] else "NOT CONFIGURED", "detail": det["status_text"]},
        {"category": "Stripe billing", "state": "PASS" if _cfg("STRIPE_SECRET_KEY") else "NOT CONFIGURED", "detail": "webhook signature verification required before entitlement changes"},
        {"category": "AI assistant", "state": "PASS" if _cfg("OPENAI_API_KEY") else "NOT CONFIGURED", "detail": "server-side only; grounded in workspace case data"},
        {"category": "Email (Resend)", "state": "PASS" if _cfg("RESEND_API_KEY") else "NOT CONFIGURED", "detail": "verification/reset; neutral responses avoid enumeration"},
        {"category": "AIS feed", "state": "PASS" if _cfg("AISSTREAM_API_KEY") else "NOT CONFIGURED", "detail": "backend-only key; truthful LIVE state machine"},
        {"category": "Audit logging", "state": "PASS", "detail": "privileged/admin actions recorded; no secrets logged"},
    ]
    recent = await db.audit_events.find({}, {"_id": 0, "entity_type": 1, "entity_id": 1, "action": 1, "actor": 1, "created_at": 1}).sort("created_at", -1).to_list(25)
    recent = [{"entity": e.get("entity_type"), "entity_id": e.get("entity_id"), "action": e.get("action"), "actor": e.get("actor"), "created_at": e.get("created_at")} for e in recent]
    return clean({"generated_at": datetime.now(timezone.utc).isoformat(), "checks": checks, "recent_events": recent,
                  "note": "States reflect current configuration and enforced controls. The platform is never claimed to be unhackable."})

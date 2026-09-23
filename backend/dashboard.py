"""Canonical dashboard counters — pure MongoDB aggregation over live records. Demo/seed/test records are identified (never deleted) and excluded."""
from datetime import datetime, timezone

DEMO_SOURCES = ["mock_detector", "demo", "test", "seed"]
# origin: "detector" (automated candidate on a real Sentinel-1 scene) | "analyst" (registered with a real scene) | "imported" (API-registered polygon, no Sentinel scene — unverified) | "demo"
REAL_ORIGINS = ["detector", "analyst"]
REAL_CASE_FILTER = {"source": {"$nin": DEMO_SOURCES}, "is_demo": {"$ne": True}, "origin": {"$in": REAL_ORIGINS}}
DEMO_CASE_FILTER = {"$or": [{"source": {"$in": DEMO_SOURCES}}, {"is_demo": True}, {"origin": "demo"}]}
PENDING_FILTER = {"status": "open", "review_state": "pending"}
ORIGIN_LABEL = {"detector": "VARUNA DETECTED", "analyst": "ANALYST CREATED", "imported": "IMPORTED HISTORICAL", "demo": "DEMO", "reference": "REFERENCE CASE"}
DATA_STATE = {"detector": "STORED DATA", "analyst": "STORED DATA", "imported": "HISTORICAL DATA", "demo": "DEMO DATA", "reference": "STORED DATA"}
CORRELATION_STATE_LABEL = {"NOT_ANALYZED": "NOT ANALYZED", "NOT_ANALYZABLE": "NOT ANALYZABLE", "NO_AIS_COVERAGE": "AIS COVERAGE UNAVAILABLE", "NO_CANDIDATE_IN_TIME_WINDOW": "NO AIS CANDIDATE IN TIME WINDOW", "SCORED": "SCORED"}


def confidence_source(case: dict) -> str:
    """detector = value produced by the SAR dark-spot detector; registrant = number typed in at registration (API/analyst) — not a detector output."""
    return "detector" if case.get("source") == "dark_spot_detector" else "registrant"


def correlation_state(case: dict, result: dict | None) -> str:
    if not case.get("latest_result_version") or not result:
        return "NOT_ANALYZABLE" if case.get("not_analyzable_reason") else "NOT_ANALYZED"
    if not result.get("position_count"):
        return "NO_AIS_COVERAGE"
    if not result.get("vessel_count") or not case.get("candidate_count"):
        return "NO_CANDIDATE_IN_TIME_WINDOW"
    return "SCORED"


async def analyzability(db, case: dict) -> str | None:
    """Reason a correlation run would be pointless — or None when the case has the data it needs. Never invents inputs."""
    spill = await db.spill_observations.find_one({"id": case["spill_observation_id"]}, {"_id": 0, "geometry": 1, "centroid": 1, "acquisition_time": 1, "extent_km": 1})
    if not spill or not spill.get("geometry") or not spill.get("centroid"):
        return "SPILL GEOMETRY MISSING"
    if not spill.get("acquisition_time"):
        return "ACQUISITION TIMESTAMP MISSING"
    from models import CorrelationParams
    from datetime import timedelta
    p = CorrelationParams()
    t0 = spill["acquisition_time"]
    if t0.tzinfo is None:
        t0 = t0.replace(tzinfo=timezone.utc)
    lon, lat = spill["centroid"]["coordinates"]
    q = {"timestamp": {"$gte": t0 - timedelta(hours=p.window_hours_before), "$lte": t0 + timedelta(hours=p.window_hours_after)},
         "location": {"$geoWithin": {"$centerSphere": [[lon, lat], (p.corridor_km + (spill.get("extent_km") or 0)) / 6371.0088]}}}
    if not await db.ais_positions.find_one(q, {"_id": 1}):
        return "HISTORICAL AIS UNAVAILABLE FOR TIME WINDOW"
    return None


async def annotate_cases(db, rows: list) -> list:
    ids = [c["id"] for c in rows if c.get("latest_result_version")]
    latest = {}
    if ids:
        async for r in db.correlation_results.find({"case_id": {"$in": ids}}, {"_id": 0, "case_id": 1, "version": 1, "position_count": 1, "vessel_count": 1}).sort("version", -1):
            latest.setdefault(r["case_id"], r)
    for c in rows:
        st = correlation_state(c, latest.get(c["id"]))
        c["correlation_state"], c["correlation_state_label"] = st, CORRELATION_STATE_LABEL[st] + (f" — {c['not_analyzable_reason']}" if st == "NOT_ANALYZABLE" else "")
        c["detection_confidence_source"] = confidence_source(c)
        c["origin_label"] = ORIGIN_LABEL.get(c.get("origin"), c.get("origin_label"))
        c["data_state"] = DATA_STATE.get(c.get("origin"), "STORED DATA")
    return rows

SEMANTICS = {
    "live_cases": "ACTIVE CASES — status=open cases with origin detector/analyst (real Sentinel-1 scene attached at registration); imported API polygons and demo/seed records excluded",
    "active_cases": "status=open cases with origin detector/analyst; imported/demo excluded",
    "pending_review": "live cases with status=open AND review_state=pending (no analyst decision yet)",
    "probable_confirmed": "live cases with attribution_status probable or analyst_confirmed",
    "ais_fixes_indexed": "persisted ais_positions documents (estimated count)",
    "alerts": "unacknowledged alerts not demo-flagged and not attached to a demo/imported case",
}


def classify_origin(case: dict, spill: dict | None, actor: str | None = None) -> str:
    if case.get("is_demo") or case.get("source") in DEMO_SOURCES or (actor or "").lower() == "seed":
        return "demo"
    pv = ((spill or {}).get("processing_version") or ((spill or {}).get("raw_input") or {}).get("processing_version") or "")
    if not case.get("scene_id"):
        return "imported"  # no Sentinel scene attached at registration — polygon supplied via API/form, unverified
    if case.get("source") == "dark_spot_detector" or "darkspot" in pv:
        return "detector"
    return "analyst"


async def tag_origins(db) -> dict:
    """Idempotent: tags untagged cases with a provenance origin (never deletes). Seed actor discovered from the audit trail."""
    seed_ids = {a["entity_id"] for a in await db.audit_events.find({"action": "case.opened", "actor": "seed"}, {"_id": 0, "entity_id": 1}).to_list(5000)}
    counts = {}
    async for c in db.cases.find({"origin": {"$exists": False}}, {"_id": 0, "id": 1, "source": 1, "scene_id": 1, "is_demo": 1, "spill_observation_id": 1}):
        sp = await db.spill_observations.find_one({"id": c["spill_observation_id"]}, {"_id": 0, "processing_version": 1, "raw_input.processing_version": 1})
        o = classify_origin(c, sp, "seed" if c["id"] in seed_ids else None)
        await db.cases.update_one({"id": c["id"]}, {"$set": {"origin": o, "origin_label": ORIGIN_LABEL[o], "origin_tagged_at": datetime.now(timezone.utc)}})
        counts[o] = counts.get(o, 0) + 1
    return counts


async def demo_case_ids(db):
    return [c["id"] for c in await db.cases.find(DEMO_CASE_FILTER, {"_id": 0, "id": 1}).to_list(10000)]


def real_alert_filter(demo_ids, unacknowledged=None):
    q = {"is_demo": {"$ne": True}, "case_id": {"$nin": demo_ids}}
    if unacknowledged is not None:
        q["acknowledged"] = not unacknowledged
    return q


async def detector_calibration(db) -> dict:
    """Real operational precision of the automated dark-spot detector, grouped by the detector version
    that actually produced each flagged case — built ONLY from analyst review decisions on real detector
    cases (never demo/mock/imported/analyst-registered ones). Deliberately does NOT attempt recall: there is
    no ground truth for slicks the detector never flagged, so that number would have to be fabricated. This
    is why /validation's detection_metrics stay NOT YET VALIDATED even as this panel fills in with real data —
    the two measure different things and neither substitutes for a proper labeled evaluation dataset."""
    cases = await db.cases.find({**REAL_CASE_FILTER, "source": "dark_spot_detector"},
                                 {"_id": 0, "spill_observation_id": 1, "attribution_status": 1}).to_list(100000)
    if not cases:
        return {"versions": [], "overall": None, "note": "No automated detector cases recorded yet — nothing to calibrate."}
    spill_ids = [c["spill_observation_id"] for c in cases if c.get("spill_observation_id")]
    versions = {s["id"]: (s.get("processing_version") or "unknown") async for s in
                db.spill_observations.find({"id": {"$in": spill_ids}}, {"_id": 0, "id": 1, "processing_version": 1})}
    buckets: dict = {}
    for c in cases:
        v = versions.get(c.get("spill_observation_id"), "unknown")
        b = buckets.setdefault(v, {"detector_version": v, "flagged": 0, "confirmed": 0, "false_positive": 0, "unresolved": 0})
        b["flagged"] += 1
        attr = c.get("attribution_status")
        # analyst_confirmed / insufficient_evidence are terminal decisions (from a direct review OR a supervisor
        # override — both write attribution_status the same way); indeterminate/possible/probable are still open.
        b["confirmed" if attr == "analyst_confirmed" else "false_positive" if attr == "insufficient_evidence" else "unresolved"] += 1
    out = []
    for b in buckets.values():
        reviewed = b["confirmed"] + b["false_positive"]
        b["reviewed"] = reviewed
        b["precision"] = round(b["confirmed"] / reviewed, 3) if reviewed else None
        b["precision_note"] = (f"measured over {reviewed} analyst-reviewed case(s); {b['unresolved']} still awaiting review" if reviewed
                                else "NOT YET VALIDATED — no analyst review recorded yet for this detector version")
        out.append(b)
    out.sort(key=lambda b: -b["flagged"])
    tot_c, tot_fp, tot_flagged = (sum(b[k] for b in out) for k in ("confirmed", "false_positive", "flagged"))
    reviewed_total = tot_c + tot_fp
    overall = {"flagged": tot_flagged, "confirmed": tot_c, "false_positive": tot_fp, "unresolved": tot_flagged - reviewed_total, "reviewed": reviewed_total,
               "precision": round(tot_c / reviewed_total, 3) if reviewed_total else None}
    return {"versions": out, "overall": overall,
            "note": "Precision = analyst-confirmed \u00f7 analyst-reviewed, computed only from real detector-flagged cases with a terminal decision (analyst confirm/reject or supervisor override). Grows more meaningful as more cases are reviewed; small-n numbers should be read cautiously."}

    demo_ids = await demo_case_ids(db)
    excluded_ids = [c["id"] for c in await db.cases.find({"origin": {"$nin": REAL_ORIGINS}}, {"_id": 0, "id": 1}).to_list(10000)]
    cases, alerts = db.cases, db.alerts
    unread = real_alert_filter(excluded_ids, unacknowledged=True)
    by_attr = {r["_id"]: r["n"] for r in await cases.aggregate([{"$match": REAL_CASE_FILTER}, {"$group": {"_id": "$attribution_status", "n": {"$sum": 1}}}]).to_list(20)}
    by_review = {r["_id"]: r["n"] for r in await cases.aggregate([{"$match": REAL_CASE_FILTER}, {"$group": {"_id": "$review_state", "n": {"$sum": 1}}}]).to_list(20)}
    by_source = {r["_id"]: r["n"] for r in await cases.aggregate([{"$match": REAL_CASE_FILTER}, {"$group": {"_id": "$source", "n": {"$sum": 1}}}]).to_list(50)}
    by_origin = {(r["_id"] or "untagged"): r["n"] for r in await cases.aggregate([{"$group": {"_id": "$origin", "n": {"$sum": 1}}}]).to_list(10)}
    total = await cases.count_documents(REAL_CASE_FILTER)
    open_ = await cases.count_documents({**REAL_CASE_FILTER, "status": "open"})
    pending = await cases.count_documents({**REAL_CASE_FILTER, **PENDING_FILTER})
    prob = await cases.count_documents({**REAL_CASE_FILTER, "attribution_status": {"$in": ["probable", "analyst_confirmed"]}})
    ais_n = await db.ais_positions.estimated_document_count()
    return {
        "active_cases": open_, "live_cases": open_, "pending_review": pending, "probable_confirmed": prob, "ais_fixes_indexed": ais_n,
        "breakdown": {"total_records": await cases.count_documents({}), "active_real": open_, "closed_real": total - open_, "pending_review": pending,
                      **{k: await cases.count_documents({**REAL_CASE_FILTER, "attribution_status": k}) for k in ["probable", "possible", "indeterminate", "insufficient_evidence", "analyst_confirmed"]},
                      "confirmed_vessel": await cases.count_documents({**REAL_CASE_FILTER, "confirmed_vessel_mmsi": {"$nin": [None, ""]}}),
                      "imported": by_origin.get("imported", 0), "varuna_detected": by_origin.get("detector", 0), "analyst_created": by_origin.get("analyst", 0), "reference": by_origin.get("reference", 0), "demo": len(demo_ids)},
        "cases": {"total": total, "open": open_, "closed": total - open_, "by_review_state": by_review, "by_attribution_status": by_attr, "by_source": by_source, "by_origin": by_origin, "all_records": await cases.count_documents({})},
        "pending": {"total": pending, "definition": SEMANTICS["pending_review"]},
        "alerts": {"total": await alerts.count_documents(real_alert_filter(excluded_ids)), "unread": await alerts.count_documents(unread),
                   "critical": await alerts.count_documents({**unread, "severity": {"$in": ["high", "critical"]}}), "definition": SEMANTICS["alerts"]},
        "jobs": {"running": await db.jobs.count_documents({"status": {"$in": ["queued", "running"]}}), "failed": await db.jobs.count_documents({"status": "failed"})},
        "observations": {"spill_observations": await db.spill_observations.count_documents({"is_demo": {"$ne": True}}), "scenes": await db.scenes.count_documents({}), "ais_positions": ais_n},
        "demo": {"cases": len(demo_ids), "imported": by_origin.get("imported", 0), "alerts": await alerts.count_documents({"$or": [{"is_demo": True}, {"case_id": {"$in": excluded_ids}}]}), "filter": f"origin not in {REAL_ORIGINS}, or source in {DEMO_SOURCES}, or is_demo=true"},
        "semantics": SEMANTICS, "source": "database", "updated_at": datetime.now(timezone.utc),
    }

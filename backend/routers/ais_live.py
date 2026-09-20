from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

import ais_live
from auth import get_current_user, require_role
from db import db, clean, audit

router = APIRouter()


class Coverage(BaseModel):
    south: float
    west: float
    north: float
    east: float
    name: Optional[str] = None


@router.get("/ais/live/status")
@router.get("/ais/status")
async def live_status(user=Depends(get_current_user)):
    cov = await ais_live.get_coverage()
    st = await ais_live.status_async()
    lease = await db.settings.find_one({"key": ais_live.LEASE_KEY}, {"_id": 0, "owner": 1}) or {}
    return clean({**st, "socket_owner": lease.get("owner"), "selected_aoi": cov["name"], "coverage_mode": cov["mode"], "coverage_name": cov["name"], "coverage_bbox": cov["bboxes"], "coverage_bbox_format": "[S,W,N,E]",
                  "aisstream_bounding_boxes": ais_live.to_aisstream_boxes(cov["bboxes"]), "coverage_ref": cov.get("ref"), "regions": ais_live.REGIONS,
                  "note": None if st["connected"] else "Satellite analysis still operational; vessel attribution unavailable until AIS coverage is restored."})


def _bbox_query(bboxes: list, since: datetime) -> dict:
    return {"source": ais_live.SOURCE, "timestamp": {"$gte": since},
            "$or": [{"location": {"$geoWithin": {"$box": [[b[1], b[0]], [b[3], b[2]]]}}} for b in bboxes]}


@router.get("/ais/coverage/check")
async def coverage_check(minutes: int = Query(30, ge=5, le=1440), user=Depends(get_current_user)):
    """Genuine recent AISStream positions inside the selected AOI, plus the regions that DID receive positions — drives the 'switch to live region?' prompt. No fabricated vessels."""
    cov = await ais_live.get_coverage()
    st = await ais_live.status_async()
    since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    in_aoi = await db.ais_positions.count_documents(_bbox_query(cov["bboxes"], since))
    live_regions = []
    for k, r in ais_live.REGIONS.items():
        if k == "global":
            continue
        n = await db.ais_positions.count_documents(_bbox_query([r["bbox"]], since))
        if n:
            live_regions.append({"region": k, "name": r["name"], "recent_positions": n})
    live_regions.sort(key=lambda x: -x["recent_positions"])
    operational = st["state"] in ("LIVE", "CONNECTED", "STALE")
    return clean({"aoi": cov["name"], "coverage_mode": cov["mode"], "window_minutes": minutes, "recent_positions_in_aoi": in_aoi, "feed_state": st["state"], "feed_operational": operational,
                  "covered": in_aoi > 0, "prompt": operational and in_aoi == 0, "live_regions": live_regions, "suggested_region": live_regions[0] if live_regions else None,
                  "message": None if in_aoi else ("AISStream is operational, but no recent terrestrial AIS observations were received for this selected region." if operational else f"AIS feed is {st['state']} — no live observations are being received on this instance.")})


@router.post("/ais/coverage")
async def set_manual_coverage(body: Coverage, user=Depends(require_role("supervisor"))):
    try:
        bbox = ais_live.validate_bbox(body.south, body.west, body.north, body.east)
    except ValueError as e:
        raise HTTPException(400, str(e))
    doc = await ais_live.set_coverage([bbox], "manual", body.name or "custom AOI", user["email"])
    await audit("settings", "ais_coverage", "ais.coverage_set", {"mode": "manual", "bbox": bbox}, user["email"])
    return clean(doc)


@router.post("/ais/coverage/region/{region}")
async def set_region_coverage(region: str, user=Depends(require_role("supervisor"))):
    if region == "default":
        await db.settings.delete_one({"key": "ais_coverage"})
        ais_live._reconnect_event.set()
        return clean(await ais_live.get_coverage())
    r = ais_live.REGIONS.get(region)
    if not r:
        raise HTTPException(404, f"unknown region; choose one of {list(ais_live.REGIONS)} or default")
    doc = await ais_live.set_coverage([r["bbox"]], "manual", r["name"], user["email"], region)
    await audit("settings", "ais_coverage", "ais.coverage_set", {"mode": "region", "region": region}, user["email"])
    return clean(doc)


@router.get("/ais/vessels")
async def vessels(user=Depends(get_current_user)):
    """Canonical AIS vessel endpoint. `vessels` = live AISStream active cache (genuine messages only);
    `indexed` = per-MMSI summary of stored ais_positions history (AISStream + CSV/batch uploads, each with its source)."""
    st = await ais_live.status_async()
    live = sorted(ais_live.state["active"].values(), key=lambda v: v["received_at"], reverse=True)
    pipeline = [
        {"$match": {"timestamp": {"$gte": datetime.now(timezone.utc) - timedelta(days=90)}}},
        {"$sort": {"timestamp": -1}},
        {"$group": {"_id": "$mmsi", "vessel_name": {"$first": "$vessel_name"}, "imo": {"$first": "$imo"}, "vessel_type": {"$first": "$vessel_type"},
                    "fixes": {"$sum": 1}, "first_seen": {"$min": "$timestamp"}, "last_seen": {"$max": "$timestamp"},
                    "sources": {"$addToSet": "$source"}, "flags": {"$addToSet": "$quality_flags"}}},
        {"$sort": {"last_seen": -1}},
    ]
    rows = await db.ais_positions.aggregate(pipeline).to_list(1000)
    indexed = [{"mmsi": r["_id"], "vessel_name": r["vessel_name"], "imo": r["imo"], "vessel_type": r["vessel_type"], "fixes": r["fixes"],
                "first_seen": r["first_seen"], "last_seen": r["last_seen"], "sources": sorted(s for s in r["sources"] if s),
                "quality_flags": sorted({f for fl in r["flags"] for f in (fl or [])})} for r in rows]
    return clean({"source": ais_live.SOURCE, "mode": "live", "state": st["state"], "configured": st["configured"], "connected": st["connected"],
                  "count": len(live), "stale_after_min": ais_live.STALE_MIN, "vessels": live, "indexed_window_days": 90, "indexed_count": len(indexed), "indexed": indexed})


@router.get("/ais/tracks/{mmsi}")
async def track(mmsi: str, hours: int = Query(24, ge=1, le=168), user=Depends(get_current_user)):
    from datetime import timedelta
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    rows = await db.ais_positions.find({"mmsi": mmsi, "timestamp": {"$gte": since}}, {"_id": 0, "location": 0, "dedup_hash": 0}).sort("timestamp", 1).to_list(5000)
    return clean({"mmsi": mmsi, "count": len(rows), "positions": rows})


@router.post("/ais/reconnect")
async def reconnect(user=Depends(require_role("supervisor"))):
    """Reset the failure streak and redial AISStream immediately (e.g. after fixing a key conflict)."""
    await audit("ais", "feed", "ais.reconnect", {}, user["email"])
    return ais_live.reconnect_now()


@router.post("/ais/test-connection")
async def test_connection(user=Depends(require_role("admin"))):
    return clean(await ais_live.test_connection())


@router.get("/ais/debug/aoi")
async def debug_aoi(user=Depends(require_role("supervisor"))):
    cov = await ais_live.get_coverage()
    scene = await db.scenes.find_one({"provider_scene_id": {"$regex": "^S1"}}, {"_id": 0, "provider_scene_id": 1, "metadata.bbox": 1}, sort=[("created_at", -1)])
    return clean({"investigation_aoi": cov, "aisstream_bounding_boxes": ais_live.to_aisstream_boxes(cov["bboxes"]), "latest_sentinel_scene": scene})

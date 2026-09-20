"""AISStream live worker — genuine WebSocket client, no simulated vessels, no silent demo fallback.
Single authoritative coverage source: settings.ais_coverage (mode spill|scene|manual|default). AISStream bbox format: [[[lat,lon],[lat,lon]]]."""
import asyncio
import json
import logging
import os
import random
import socket
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

import websockets

from db import db
from models import AISPositionIn

logger = logging.getLogger("ais_live")
WS_URL = "wss://stream.aisstream.io/v0/stream"
SOURCE = "AISStream"
FILTER_TYPES = ["PositionReport", "StandardClassBPositionReport", "ExtendedClassBPositionReport", "ShipStaticData", "StaticDataReport"]
STALE_MIN, MARGIN_KM, BACKOFF = 30, 100.0, [1, 2, 4, 8, 16, 30]

# Regional defaults (S, W, N, E) — verified against AISStream docs: BoundingBoxes = [[[lat_min, lon_min], [lat_max, lon_max]]]
REGIONS = {
    "west_coast": {"name": "Arabian Sea / West Coast", "bbox": [8.0, 66.0, 24.5, 76.5]},
    "east_coast": {"name": "Bay of Bengal / East Coast", "bbox": [10.0, 78.5, 22.5, 90.0]},
    "south_india": {"name": "Southern India / Indian Ocean", "bbox": [5.5, 72.0, 10.5, 81.0]},
    "andaman_nicobar": {"name": "Andaman & Nicobar", "bbox": [5.5, 90.0, 15.0, 95.5]},
    # global monitoring regions (AISStream is worldwide; pick any)
    "persian_gulf": {"name": "Persian Gulf / Gulf of Oman", "bbox": [22.0, 47.0, 30.5, 60.0], "global": True},
    "malacca_singapore": {"name": "Malacca Strait / Singapore", "bbox": [-1.0, 98.0, 7.0, 105.0], "global": True},
    "south_china_sea": {"name": "South China Sea", "bbox": [5.0, 105.0, 23.0, 121.0], "global": True},
    "red_sea_suez": {"name": "Red Sea / Suez", "bbox": [12.0, 32.0, 31.0, 44.0], "global": True},
    "mediterranean": {"name": "Mediterranean", "bbox": [30.0, -6.0, 46.0, 36.5], "global": True},
    "north_sea": {"name": "North Sea / Channel", "bbox": [49.0, -6.0, 62.0, 10.0], "global": True},
    "gulf_of_mexico": {"name": "Gulf of Mexico", "bbox": [18.0, -98.0, 31.0, -80.0], "global": True},
    "west_africa": {"name": "Gulf of Guinea / West Africa", "bbox": [-8.0, -20.0, 10.0, 12.0], "global": True},
    "east_asia": {"name": "East China Sea / Japan / Korea", "bbox": [23.0, 117.0, 42.0, 146.0], "global": True},
    "us_east_coast": {"name": "US East Coast", "bbox": [24.0, -82.0, 45.0, -60.0], "global": True},
    "global": {"name": "Global (all AISStream traffic — very high volume)", "bbox": [-90.0, -180.0, 90.0, 180.0], "global": True},
}
DEFAULT_REGIONS = [k for k, v in REGIONS.items() if not v.get("global")]

state = {"connected": False, "subscription_confirmed": False, "socket_open": False, "subscription_sent_at": None, "subscription_kind": None, "last_connect_attempt": None, "last_close_code": None,
         "role": "starting", "messages_at_connect": 0, "messages": 0, "positions": 0, "inserted": 0, "last_message_at": None, "last_position_at": None,
         "connected_at": None, "last_disconnect_at": None, "error": None, "reconnects": 0, "msg_times": [], "active": {}, "last_close_reason": None, "last_exception": None, "kicks": 0, "handshake_fails": 0, "last_http_status": None}
_task: Optional[asyncio.Task] = None
_buffer: list = []
_reconnect_event = asyncio.Event()


def api_keys() -> list:
    """AISSTREAM_API_KEYS (comma-separated pool) + AISSTREAM_API_KEY, de-duplicated. Values never leave this module."""
    raw = [os.environ.get("AISSTREAM_API_KEY", "")] + os.environ.get("AISSTREAM_API_KEYS", "").split(",")
    out = []
    for k in (x.strip() for x in raw):
        if k and k not in out:
            out.append(k)
    return out


def key_configured() -> bool:
    return bool(api_keys())


def current_key() -> Optional[str]:
    keys = api_keys()
    return keys[state.get("key_index", 0) % len(keys)] if keys else None


def ingest_enabled() -> bool:
    """AIS_INGEST_ENABLED=false puts this deployment in STANDBY so it never competes with the production feed for the one-connection-per-key limit."""
    return os.environ.get("AIS_INGEST_ENABLED", "true").strip().lower() not in ("0", "false", "no")


KEY_CONFLICT_REASON = "Another environment/client currently owns this AISStream API key (one connection per key). Production must own the feed; set AIS_INGEST_ENABLED=false on preview or use a separate key."
STANDBY_DISABLED_REASON = "AIS ingestion disabled on this instance (AIS_INGEST_ENABLED=false) to protect the production live feed."


def validate_bbox(south: float, west: float, north: float, east: float) -> list:
    if not (-90 <= south <= 90 and -90 <= north <= 90 and -180 <= west <= 180 and -180 <= east <= 180):
        raise ValueError("coordinates out of range")
    if south >= north or west >= east:
        raise ValueError("south must be < north and west < east")
    return [south, west, north, east]


def to_aisstream_boxes(bboxes: list) -> list:
    """[S,W,N,E] → AISStream [[lat_min,lon_min],[lat_max,lon_max]]."""
    return [[[b[0], b[1]], [b[2], b[3]]] for b in bboxes]


def expand_bbox(south, west, north, east, margin_km: float = MARGIN_KM) -> list:
    import math
    dlat = margin_km / 110.574
    dlon = margin_km / (111.32 * max(math.cos(math.radians((south + north) / 2)), 0.1))
    return validate_bbox(max(-90, south - dlat), max(-180, west - dlon), min(90, north + dlat), min(180, east + dlon))


async def get_coverage() -> dict:
    default = {"mode": "default", "name": "Indian coastal regions", "bboxes": [REGIONS[r]["bbox"] for r in DEFAULT_REGIONS], "regions": DEFAULT_REGIONS}
    s = await db.settings.find_one({"key": "ais_coverage"}, {"_id": 0})
    if not s:
        return default
    if s.get("mode") == "spill" and s.get("ref") and not await db.cases.find_one({"id": s["ref"]}, {"_id": 1}):
        await db.settings.delete_one({"key": "ais_coverage"})  # followed spill was deleted → revert to regional defaults
        return default
    return s


async def set_coverage(bboxes: list, mode: str, name: str, actor: str = "system", ref: Optional[str] = None) -> dict:
    doc = {"key": "ais_coverage", "mode": mode, "name": name, "bboxes": [validate_bbox(*b) for b in bboxes], "ref": ref, "updated_at": datetime.now(timezone.utc), "updated_by": actor}
    await db.settings.update_one({"key": "ais_coverage"}, {"$set": doc}, upsert=True)
    _reconnect_event.set()
    return doc


async def coverage_for_spill(bbox_swne: list, case_id: str) -> Optional[dict]:
    """Automatic: follow a new real spill unless an operator pinned a manual AOI."""
    cur = await get_coverage()
    if cur.get("mode") == "manual":
        return None
    return await set_coverage([expand_bbox(*bbox_swne)], "spill", f"spill investigation {case_id[:8]} (+{MARGIN_KM:.0f} km)", "system", case_id)


def _parse_time(s: str) -> datetime:
    try:
        return datetime.strptime(s[:19], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    except Exception:  # noqa: BLE001
        return datetime.now(timezone.utc)


def decode_frame(raw) -> Optional[dict]:
    """AISStream may send text or binary UTF-8 JSON frames; malformed frames are skipped."""
    try:
        if isinstance(raw, (bytes, bytearray)):
            raw = raw.decode("utf-8")
        msg = json.loads(raw)
        return msg if isinstance(msg, dict) else None
    except Exception:  # noqa: BLE001
        return None


def to_position(msg: dict) -> Optional[AISPositionIn]:
    """PositionReport / Class B (Standard, Extended) → AISPositionIn (existing ais_positions schema). Never invents values."""
    body = msg.get("Message") or {}
    pr = body.get("PositionReport") or body.get("StandardClassBPositionReport") or body.get("ExtendedClassBPositionReport")
    if not pr:
        return None
    meta = msg.get("MetaData") or {}
    lat, lon = pr.get("Latitude", meta.get("Latitude")), pr.get("Longitude", meta.get("Longitude"))
    if lat is None or lon is None or not (-90 <= lat <= 90) or not (-180 <= lon <= 180) or lat == 91 or lon == 181:
        return None
    mmsi = pr.get("UserID") or meta.get("MMSI")
    if not mmsi:
        return None
    sog, cog, hdg = pr.get("Sog"), pr.get("Cog"), pr.get("TrueHeading")
    return AISPositionIn(mmsi=str(mmsi), vessel_name=(meta.get("ShipName") or "").strip() or None, timestamp=_parse_time(meta.get("time_utc") or ""), lat=lat, lon=lon,
                         sog_kn=sog if sog is not None and sog < 102.3 else None, cog_deg=cog if cog is not None and cog < 360 else None,
                         heading_deg=hdg if hdg is not None and hdg <= 511 else None, source=SOURCE)


def _touch_active(p: AISPositionIn, nav_status) -> None:
    state["active"][p.mmsi] = {"mmsi": p.mmsi, "ship_name": p.vessel_name, "lat": p.lat, "lon": p.lon, "sog": p.sog_kn, "cog": p.cog_deg, "heading": p.heading_deg,
                               "navigation_status": nav_status, "timestamp": p.timestamp, "received_at": datetime.now(timezone.utc)}
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=STALE_MIN)
    for k in [k for k, v in state["active"].items() if v["received_at"] < cutoff]:
        state["active"].pop(k, None)


def messages_per_min() -> int:
    now = time.time()
    state["msg_times"] = [t for t in state["msg_times"] if now - t <= 60]
    return len(state["msg_times"])


async def _flush() -> None:
    global _buffer
    if not _buffer:
        return
    batch, _buffer = _buffer, []
    from services import ingest_ais
    try:
        res = await ingest_ais(batch, source_batch_id=f"aisstream-{datetime.now(timezone.utc):%Y%m%dT%H%M%S}", actor=SOURCE)
        state["inserted"] += res["inserted"]
    except Exception as e:  # noqa: BLE001
        logger.error("aisstream flush failed: %s", e)


def _handle(msg: dict) -> None:
    state["messages"] += 1
    state["last_message_at"] = datetime.now(timezone.utc)
    state["msg_times"].append(time.time())
    if msg.get("error"):
        raise RuntimeError(f"AISStream error: {msg['error']}")
    if msg.get("MessageType") == "SubscriptionConfirmation" or not state["subscription_confirmed"]:
        state["subscription_confirmed"] = True  # any accepted data frame proves the subscription was accepted
        state["connected"] = True
    p = to_position(msg)
    if p:
        _buffer.append(p)
        state["positions"] += 1
        state["last_position_at"] = state["last_message_at"]
        nav = ((msg.get("Message") or {}).get("PositionReport") or {}).get("NavigationalStatus")
        _touch_active(p, nav)


async def _session(key: str, boxes: list) -> None:
    async with websockets.connect(WS_URL, ping_interval=20, close_timeout=5, open_timeout=20, max_size=2**22) as ws:
        state.update({"connected_at": datetime.now(timezone.utc), "socket_open": True, "error": None, "last_close_code": None, "handshake_fails": 0, "last_http_status": None})
        await ws.send(json.dumps({"APIKey": key, "BoundingBoxes": boxes, "FilterMessageTypes": FILTER_TYPES}))
        state["subscription_sent_at"] = datetime.now(timezone.utc)
        logger.info("aisstream websocket open, subscription sent for %d bbox(es)", len(boxes))
        last_flush = time.time()
        while not _reconnect_event.is_set():
            try:
                msg = decode_frame(await asyncio.wait_for(ws.recv(), timeout=10))
                if msg:
                    _handle(msg)
            except asyncio.TimeoutError:
                pass
            # AISStream sends an {"error": ...} frame within seconds when it rejects a key/subscription; a silent open socket 5 s after
            # the subscription means it was accepted (the feed can legitimately be empty for a sparsely covered region).
            if not state["subscription_confirmed"] and state["subscription_sent_at"] and (datetime.now(timezone.utc) - state["subscription_sent_at"]).total_seconds() > 5:
                state.update({"subscription_confirmed": True, "connected": True, "subscription_kind": "accepted (no error frame within 5 s)"})
            if time.time() - last_flush >= 8 or len(_buffer) >= 500:
                await _flush()
                await _snapshot()
                last_flush = time.time()
        await _flush()


LEASE_KEY, LEASE_TTL = "ais_worker_lease", 30
OWNER = f"{socket.gethostname()}:{os.getpid()}"


async def _acquire_lease() -> bool:
    """Exactly ONE AISStream socket per deployment, even with several backend workers/replicas: a Mongo lease with a 30 s heartbeat."""
    now = datetime.now(timezone.utc)
    try:
        r = await db.settings.update_one({"key": LEASE_KEY, "$or": [{"owner": OWNER}, {"expires_at": {"$lt": now}}, {"expires_at": {"$exists": False}}]},
                                         {"$set": {"owner": OWNER, "expires_at": now + timedelta(seconds=LEASE_TTL), "renewed_at": now}})
        if r.matched_count == 0:
            await db.settings.insert_one({"key": LEASE_KEY, "owner": OWNER, "expires_at": now + timedelta(seconds=LEASE_TTL), "renewed_at": now})
        return True
    except Exception:  # noqa: BLE001  (duplicate key → someone else holds it)
        cur = await db.settings.find_one({"key": LEASE_KEY}, {"_id": 0})
        return bool(cur and cur.get("owner") == OWNER)


async def _renew_lease_loop():
    while True:
        await asyncio.sleep(LEASE_TTL / 3)
        if state["role"] == "ingest":
            ok = await _acquire_lease()
            if not ok:
                state["role"] = "standby"
                _reconnect_event.set()


async def _snapshot() -> None:
    """Publish runtime telemetry so API workers that do not hold the socket still answer /api/ais/status truthfully."""
    try:
        await db.settings.update_one({"key": "ais_runtime_status"}, {"$set": {"key": "ais_runtime_status", "owner": OWNER, "at": datetime.now(timezone.utc), **_status_fields()}}, upsert=True)
    except Exception:  # noqa: BLE001
        pass


def _http_rejection(e: Exception) -> Optional[tuple]:
    """If the failure happened during the HTTP upgrade (server answered with a non-101 status), return (status, phrase, body).
    websockets raises InvalidStatus (v13+) / InvalidStatusCode (older) for this — it is NOT a 'key in use' signal."""
    resp = getattr(e, "response", None)
    status = getattr(resp, "status_code", None) or getattr(e, "status_code", None)
    if not status:
        return None
    phrase = getattr(resp, "reason_phrase", "") or ""
    body = getattr(resp, "body", b"") or b""
    try:
        body = body.decode("utf-8", "replace") if isinstance(body, (bytes, bytearray)) else str(body)
    except Exception:  # noqa: BLE001
        body = ""
    return int(status), phrase, " ".join(body.split())[:160]


def _handshake_message(status: int, phrase: str, body: str) -> tuple:
    """(operator message, retry delay in seconds) for an HTTP-level rejection."""
    extra = f' Server said: "{body}".' if body else ""
    if status in (401, 403):
        return (f"HANDSHAKE_REJECTED: AISStream answered HTTP {status} {phrase}".strip() + " before the socket opened. The key was refused or this host's IP is blocked — "
                f"create a fresh key at aisstream.io, make sure it is Active, and paste it into AISSTREAM_API_KEY with no spaces/quotes.{extra}", 120.0)
    if status == 429:
        return (f"HANDSHAKE_REJECTED: AISStream answered HTTP 429 (too many connection attempts from this host). Backing off automatically — do not redeploy repeatedly.{extra}", 300.0)
    if status >= 500:
        return (f"HANDSHAKE_REJECTED: AISStream answered HTTP {status} {phrase}".strip() + f" — their service is temporarily unavailable. Retrying automatically with back-off.{extra}", 90.0)
    return (f"HANDSHAKE_REJECTED: AISStream answered HTTP {status} {phrase}".strip() + f" instead of opening a WebSocket.{extra}", 120.0)


async def _sleep_or_reconnect(seconds: float) -> None:
    """Back-off sleep that a manual 'Reconnect now' (or a coverage change) can cut short."""
    try:
        await asyncio.wait_for(_reconnect_event.wait(), timeout=seconds)
    except asyncio.TimeoutError:
        pass


def reconnect_now() -> dict:
    """Operator action: forget the failure streak / conflict verdict and dial AISStream again immediately."""
    state["kicks"] = 0
    state["handshake_fails"] = 0
    if str(state.get("error") or "").startswith(("KEY_IN_USE_ELSEWHERE", "KEY_ROTATED", "HANDSHAKE_REJECTED")):
        state["error"] = None
    _reconnect_event.set()
    return {"ok": True, "message": "Reconnecting to AISStream now"}


async def _run() -> None:
    attempt = 0
    logger.info("AISStream API key configured: %s", key_configured())
    asyncio.create_task(_renew_lease_loop())
    while True:
        _reconnect_event.clear()
        key = current_key()
        if not ingest_enabled():
            state.update({"connected": False, "subscription_confirmed": False, "socket_open": False, "role": "disabled", "error": STANDBY_DISABLED_REASON})
            await _snapshot()
            await asyncio.sleep(30)
            continue
        if not key:
            state.update({"connected": False, "subscription_confirmed": False, "socket_open": False, "error": "API key not configured"})
            await _snapshot()
            try:
                await asyncio.wait_for(_reconnect_event.wait(), timeout=15)
            except asyncio.TimeoutError:
                pass
            continue
        if not await _acquire_lease():
            state["role"] = "standby"
            await asyncio.sleep(10)
            continue
        state["role"] = "ingest"
        cov = await get_coverage()
        state["last_connect_attempt"] = datetime.now(timezone.utc)
        await _snapshot()
        try:
            await _session(key, to_aisstream_boxes(cov["bboxes"]))
            attempt = 0  # clean coverage change → immediate reconnect
        except Exception as e:  # noqa: BLE001
            code = getattr(e, "code", None) or getattr(getattr(e, "rcvd", None), "code", None)
            session_s = (datetime.now(timezone.utc) - state["last_connect_attempt"]).total_seconds() if state["last_connect_attempt"] else 0
            got_msgs = state["messages"] > state.get("messages_at_connect", 0)
            http = _http_rejection(e)
            if http:  # the server refused the HTTP upgrade itself — a different problem from "another client took the key"
                state["kicks"] = 0
                state["handshake_fails"] = state.get("handshake_fails", 0) + 1
                state["last_http_status"] = http[0]
            else:
                state["kicks"] = 0 if got_msgs or session_s > 20 else state.get("kicks", 0) + 1  # accepted then dropped in <20 s with zero frames = another client took the key
            rcvd = getattr(e, "rcvd", None)
            reason_txt = (getattr(rcvd, "reason", "") or "").strip()
            state.update({"error": str(e)[:300], "last_close_code": code, "last_close_reason": reason_txt or None, "last_exception": f"{type(e).__name__}: {str(e)[:200]}",
                          "reconnects": state["reconnects"] + 1, "last_disconnect_at": datetime.now(timezone.utc)})
            if got_msgs:
                attempt = 0  # healthy session before the drop → restart the backoff ladder
            if http:
                msg_txt, base = _handshake_message(*http)
                state["error"] = msg_txt
                delay = min(600.0, base * (1.6 ** min(state["handshake_fails"] - 1, 3))) + random.uniform(0, 10)
            elif state["kicks"] >= 3:
                keys = api_keys()
                if len(keys) > 1:
                    state["key_index"] = (state.get("key_index", 0) + 1) % len(keys)
                    state["kicks"] = 0
                    state["key_rotations"] = state.get("key_rotations", 0) + 1
                    state["error"] = f"KEY_ROTATED: key #{state['key_index'] + 1}/{len(keys)} selected after the previous key was held by another client (one connection per key)"
                    delay = 5 + random.uniform(0, 3)
                    logger.warning("aisstream: key in use elsewhere — rotating to pool key #%d/%d", state["key_index"] + 1, len(keys))
                else:
                    state["error"] = (f"KEY_IN_USE_ELSEWHERE: AISStream closed the socket right after subscription 3× in a row without sending any data "
                                      f"(last close: code={code}, reason={reason_txt or 'none'}; {type(e).__name__}). Most often this key is also in use by another client "
                                      "(AISStream allows one connection per key — e.g. a second Render service, a local run, or a preview sharing the key). "
                                      "Give each deployment its own key, or set AIS_INGEST_ENABLED=false on the other one.")
                    delay = 45 + random.uniform(0, 15)  # back off, but retry soon so a fixed setup recovers by itself
            else:
                delay = BACKOFF[min(attempt, len(BACKOFF) - 1)] + random.uniform(0, 1)
            attempt += 1
            logger.warning("aisstream disconnected (%s: %s, close=%s, reason=%r); reconnect in %.1fs", type(e).__name__, str(e)[:120], code, reason_txt, delay)
            await _sleep_or_reconnect(delay)
        finally:
            state.update({"connected": False, "subscription_confirmed": False, "socket_open": False, "subscription_sent_at": None, "messages_at_connect": state["messages"]})
            await _snapshot()


def start() -> None:
    """Idempotent: exactly one worker task per process (and one socket per deployment via the Mongo lease)."""
    global _task
    if _task is None or _task.done():
        _task = asyncio.create_task(_run())


def stop() -> None:
    """Cancel the worker so the process shuts down promptly (supervisor SIGTERM → no 20 s SIGKILL wait)."""
    if _task and not _task.done():
        _task.cancel()


async def stop_and_wait(timeout: float = 6.0) -> None:
    """Shutdown path: cancel the worker AND wait for it, so the AISStream socket gets a proper close handshake.
    A container that is killed with the socket still open leaves AISStream believing the connection is alive for a few
    minutes — the replacement instance is then refused with HTTP 429 (concurrent connections per user exceeded)."""
    t = _task
    if t and not t.done():
        t.cancel()
        await asyncio.wait({t}, timeout=timeout)


def connection_state() -> str:
    """NOT_CONFIGURED | STANDBY (ingest disabled or another worker holds the lease) | CONNECTING | CONNECTED (no regional data yet) | LIVE | STALE | RECONNECTING | KEY_CONFLICT | OFFLINE."""
    if state["role"] == "disabled":
        return "STANDBY"
    if not key_configured():
        return "NOT_CONFIGURED"
    if state["role"] == "standby":
        return "STANDBY"
    now = datetime.now(timezone.utc)
    if state["socket_open"] and state["subscription_confirmed"]:
        if state["last_position_at"] and (now - state["last_position_at"]).total_seconds() < 300 and state["positions"] > 0:
            return "LIVE"
        if state["last_position_at"] and (now - state["last_position_at"]).total_seconds() > STALE_MIN * 60:
            return "STALE"
        return "CONNECTED"
    if str(state["error"] or "").startswith("KEY_IN_USE_ELSEWHERE"):
        return "KEY_CONFLICT"
    if state["socket_open"]:
        return "CONNECTING"  # handshake done, waiting ≤5 s for AISStream to accept/reject the subscription
    if state["error"] and state["error"] != "API key not configured":
        return "RECONNECTING" if state["last_disconnect_at"] and (now - state["last_disconnect_at"]).total_seconds() < 120 else "OFFLINE"
    if _task and not _task.done() and state["last_connect_attempt"] and (now - state["last_connect_attempt"]).total_seconds() < 15:
        return "CONNECTING"
    return "OFFLINE"


def _feed_label(st: str) -> str:
    return {"LIVE": "LIVE", "CONNECTED": "CONNECTED — NO REGIONAL AIS COVERAGE (no positions yet in the selected AOI)", "STALE": "STALE — connected, no positions for >%d min" % STALE_MIN,
            "CONNECTING": "CONNECTING", "RECONNECTING": "RECONNECTING", "OFFLINE": "OFFLINE", "NOT_CONFIGURED": "UNCONFIGURED", "KEY_CONFLICT": "KEY CONFLICT — another environment owns this AISStream key",
            "STANDBY": "STANDBY — AIS ingestion disabled on this instance" if state["role"] == "disabled" else "STANDBY (another backend worker holds the single AISStream connection)"}.get(st, st)


def _status_fields() -> dict:
    st = connection_state()
    from livemode import APP_ENV
    return {"source": SOURCE, "mode": "live", "state": st, "feed": _feed_label(st), "feed_state": st, "environment": APP_ENV, "ingest_enabled": ingest_enabled(), "key_configured": key_configured(), "configured": key_configured(),
            "keys_configured": len(api_keys()), "active_key_index": (state.get("key_index", 0) % len(api_keys()) + 1) if api_keys() else None, "key_rotations": state.get("key_rotations", 0),
            "connected": bool(state["socket_open"] and state["subscription_confirmed"]),
            "websocket_open": bool(state["socket_open"]), "subscription_confirmed": state["subscription_confirmed"], "subscription_kind": state.get("subscription_kind"),
            "messages_received": state["messages"], "positions_parsed": state["positions"], "regional_messages": state["positions"], "positions_stored": state["inserted"], "messages_per_min": messages_per_min(), "messages_per_minute": messages_per_min(),
            "vessels_active": len(state["active"]), "active_vessels": len(state["active"]),
            "last_connect_attempt": state["last_connect_attempt"], "last_connected_at": state["connected_at"], "last_message_at": state["last_message_at"], "last_position_at": state["last_position_at"],
            "last_disconnect_at": state["last_disconnect_at"], "last_close_reason": state.get("last_close_reason"), "last_exception": state.get("last_exception"), "failure_streak": state.get("kicks", 0), "last_http_status": state.get("last_http_status"), "last_error": state["error"], "error": state["error"], "last_close_code": state["last_close_code"], "reconnects": state["reconnects"], "reconnect_count": state["reconnects"],
            "worker_running": bool(_task and not _task.done()), "worker_role": state["role"], "worker_owner": OWNER,
            "reason": None if (state["socket_open"] and state["subscription_confirmed"]) else (
                STANDBY_DISABLED_REASON if state["role"] == "disabled" else
                "API key not configured" if not key_configured() else
                state["error"] if str(state["error"] or "").startswith("HANDSHAKE_REJECTED") else
                KEY_CONFLICT_REASON if st == "KEY_CONFLICT" else
                "WebSocket authentication failed (AISStream rejected the API key)" if state["error"] and ("api key" in str(state["error"]).lower() or "1008" in str(state["error"])) else
                "Connection lost — reconnecting with backoff" if state["error"] else "Connecting")}


def status() -> dict:
    """Runtime telemetry only — nothing hard-coded, key never included."""
    return _status_fields()


async def status_async() -> dict:
    """Same as status(), but a STANDBY process answers with the ingest worker's published snapshot (≤ 10 s old) instead of its own idle state."""
    s = status()
    if s["state"] == "STANDBY" and state["role"] != "disabled":
        snap = await db.settings.find_one({"key": "ais_runtime_status", "owner": {"$ne": OWNER}}, {"_id": 0, "key": 0})
        if snap:
            at = snap["at"] if snap["at"].tzinfo else snap["at"].replace(tzinfo=timezone.utc)
            age = (datetime.now(timezone.utc) - at).total_seconds()
            if age < 90:
                return {**snap, "served_by": OWNER, "snapshot_age_s": int(age)}
    return s


async def test_connection(timeout_s: float = 12.0) -> dict:
    """Diagnostic chain: key → websocket → subscription → confirmation/first message. Never returns the key."""
    out = {"configured": key_configured(), "websocket": False, "subscription": False, "message_received": False, "latency_ms": None, "error": None}
    if not out["configured"]:
        out["error"] = "API key not configured"
        return out
    if state["role"] == "ingest" and _task and not _task.done():
        # AISStream allows ONE connection per key: opening a second socket here would kick the live worker (and look like a key conflict).
        # So report the worker's own connection instead.
        out.update({"websocket": bool(state["socket_open"]), "subscription": bool(state["subscription_confirmed"]), "message_received": state["messages"] > 0,
                    "error": state["error"], "note": "Live worker owns the single AISStream connection — result reflects the worker, no second socket opened."})
        return out
    t = time.time()
    try:
        cov = await get_coverage()
        async with websockets.connect(WS_URL, close_timeout=3, max_size=2**22) as ws:
            out["websocket"] = True
            await ws.send(json.dumps({"APIKey": current_key(), "BoundingBoxes": to_aisstream_boxes(cov["bboxes"]), "FilterMessageTypes": FILTER_TYPES}))
            out["subscription"] = True
            msg = decode_frame(await asyncio.wait_for(ws.recv(), timeout=timeout_s))
            if msg and msg.get("error"):
                out["error"] = f"AISStream error: {msg['error']}"
            else:
                out["message_received"] = bool(msg)
        out["latency_ms"] = int((time.time() - t) * 1000)
    except asyncio.TimeoutError:
        out["error"] = "no AIS message within timeout (coverage may be empty right now)"
    except Exception as e:  # noqa: BLE001
        http = _http_rejection(e)
        out["error"] = _handshake_message(*http)[0] if http else str(e)[:200]
    return out

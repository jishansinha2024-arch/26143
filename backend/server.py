import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, APIRouter, Depends, Request
from starlette.middleware.cors import CORSMiddleware

from db import db, client, ensure_indexes
import jobs
import services  # noqa: F401  (registers job handlers)
from routers import ingest, cases, system, auth as auth_router, jurisdictions, watchlist, timeline, attachments, rules as rules_router, satellite, ais_live as ais_live_router, scene_watch as scene_watch_router, imagery, live, gazetteer, archive, prosecution, icg as icg_router, vulnerability as vulnerability_router, dark_vessel as dark_vessel_router, realtime as realtime_router, product as product_router, billing
from livemode import DEMO_MODE, APP_ENV, seed_india_watches
from icg import seed_icg
from vulnerability import seed_sites
import ais_live
import scene_watch  # noqa: F401  (registers scene_watch_poll job handler)
from storage import init_storage, storage_available
from auth import seed_users, require_role
from jurisdiction import seed_zones, apply_to_case
import marine_regions  # noqa: F401  (registers import_eez job handler)
from seed import seed_demo
from correlation import ALGORITHM_VERSION

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("sentinelmar")


async def _startup_tasks():
    """Indexes, seeds and background workers — run after the server is listening so health probes pass immediately."""
    try:
        await ensure_indexes()
        await seed_users()
        from dashboard import tag_origins
        tagged = await tag_origins(db)
        if tagged:
            logger.info("case origin tagging: %s", tagged)
        await gazetteer.seed_gazetteer()
        await archive.seed_archive()
        zones_added = await seed_zones()
        await seed_icg()
        await seed_sites()
        await seed_india_watches()
        if storage_available():
            try:
                await asyncio.to_thread(init_storage)
                logger.info("object storage initialised")
            except Exception as e:  # noqa: BLE001
                logger.error("object storage init failed: %s", e)
        purged = await db.settings.find_one({"key": "data_mode", "demo_purged": True}, {"_id": 1})
        res = await seed_demo() if (DEMO_MODE and not purged) else {"seeded": False, "reason": "LIVE mode — demo seeding disabled"}
        logger.info("seed: %s", res)
        if zones_added:
            for c in await db.cases.find({"primary_jurisdiction": {"$exists": False}}, {"id": 1}).to_list(1000):
                await apply_to_case(c["id"], "system")
        app.state.ready = True
    except Exception:
        logger.exception("startup tasks failed")
        app.state.startup_error = True


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.ready = False
    jobs.start()
    ais_live.start()
    task = asyncio.create_task(_startup_tasks())
    yield
    task.cancel()
    ais_live.stop()
    jobs_stop = getattr(jobs, "stop", None)
    if jobs_stop:
        jobs_stop()
    client.close()


app = FastAPI(title="Varuna Netra — Oil-Spill Detection & Vessel Correlation", version="0.1.0", lifespan=lifespan)
api = APIRouter(prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "ready": bool(getattr(app.state, "ready", False)), "environment": APP_ENV, "demo_mode": DEMO_MODE}


@api.get("/health")
async def api_health(request: Request):
    """Deployment health: production/demo mode, AIS key presence (boolean only) and truthful AIS runtime state. Never starts workers, never exposes secrets."""
    st = await ais_live.status_async()
    db_ok = True
    try:
        await db.command("ping")
    except Exception:  # noqa: BLE001
        db_ok = False
    from google_auth import capabilities
    return {"status": "ok" if db_ok else "degraded", "ready": bool(getattr(app.state, "ready", False)), "environment": APP_ENV, "request_origin_seen": request.headers.get("origin"), "demo_mode": DEMO_MODE, "database": "online" if db_ok else "offline",
            "authentication": capabilities()["authentication"],
            "ais": {"key_configured": st["configured"], "state": st["state"], "feed": st.get("feed"), "connected": st["connected"], "subscription_confirmed": st["subscription_confirmed"],
                    "messages_received": st["messages_received"], "positions_stored": st["positions_stored"], "vessels_active": st["vessels_active"], "last_message_at": st["last_message_at"],
                    "reconnect_count": st["reconnects"], "worker_role": st.get("worker_role"), "worker_owner": st.get("worker_owner")},
            "workers": {"this_process": ais_live.OWNER, "ais_socket_owner": (await db.settings.find_one({"key": "ais_worker_lease"}, {"_id": 0, "owner": 1}) or {}).get("owner")}}


@api.get("/")
async def root():
    return {"service": "sentinelmar", "algorithm_version": ALGORITHM_VERSION, "status": "ok"}


@api.post("/seed")
async def reseed(user=Depends(require_role("admin"))):
    return await seed_demo()


api.include_router(auth_router.router)
api.include_router(jurisdictions.router)
api.include_router(watchlist.router)
api.include_router(timeline.router)
api.include_router(attachments.router)
api.include_router(rules_router.router)
api.include_router(satellite.router)
api.include_router(ais_live_router.router)
api.include_router(scene_watch_router.router)
api.include_router(imagery.router)
api.include_router(live.router)
api.include_router(icg_router.router)
api.include_router(vulnerability_router.router)
api.include_router(dark_vessel_router.router)
api.include_router(realtime_router.router)
api.include_router(gazetteer.router)
api.include_router(archive.router)
api.include_router(prosecution.router)
api.include_router(ingest.router)
api.include_router(cases.router)
api.include_router(system.router)
api.include_router(product_router.router)
api.include_router(billing.router)
app.include_router(api)

def _cors_origins() -> list:
    """Explicit allow-list only: CORS_ORIGINS (comma-separated) or FRONTEND_URL. '*' is never combined with credentials."""
    raw = [o.strip().rstrip("/") for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip() and o.strip() != "*"]
    fe = (os.environ.get("FRONTEND_URL") or "").strip().rstrip("/")
    if fe and fe not in raw:
        raw.append(fe)
    if not raw:
        logger.warning("CORS: no CORS_ORIGINS/FRONTEND_URL configured — cross-origin browser requests will be refused")
    return raw


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins(),
    allow_origin_regex=os.environ.get("CORS_ORIGIN_REGEX") or r"^https?://(localhost|127\.0\.0\.1|.*\.onrender\.com)(:\d+)?$",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    resp.headers.setdefault("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
    resp.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
    resp.headers.setdefault("Content-Security-Policy", (
        "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; "
        "img-src 'self' data: blob: https:; media-src 'self' data: blob:; "
        "style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self' 'unsafe-inline'; "
        "connect-src 'self' https: wss:; frame-src 'self' https://js.stripe.com; form-action 'self'"))
    return resp

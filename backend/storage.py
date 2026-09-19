import asyncio
import logging
import os

import requests

logger = logging.getLogger("storage")
STORAGE_BASE = (os.environ.get("STORAGE_PROXY_URL") or os.environ.get("INTEGRATION_PROXY_URL") or "").strip()
STORAGE_URL = (STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage") if STORAGE_BASE else ""
APP_NAME = "sentinelmar"
_storage_key = None


def init_storage(force: bool = False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    key = os.environ.get("STORAGE_KEY") or os.environ.get("OBJECT_STORAGE_KEY")
    if not key or not STORAGE_URL:
        return None
    resp = requests.post(f"{STORAGE_URL}/init", json={"storage_key": key}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json().get("storage_key")
    return _storage_key


def _put(path: str, data: bytes, content_type: str) -> dict:
    for attempt in range(2):
        s_key = init_storage(force=attempt > 0) or ""
        resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": s_key, "Content-Type": content_type}, data=data, timeout=180)
        if resp.status_code == 404 and attempt == 0:
            continue
        resp.raise_for_status()
        return resp.json()


def _get(path: str):
    for attempt in range(2):
        s_key = init_storage(force=attempt > 0) or ""
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": s_key}, timeout=120)
        if resp.status_code == 404 and attempt == 0:
            continue
        resp.raise_for_status()
        return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


async def put_object(path: str, data: bytes, content_type: str) -> dict:
    return await asyncio.to_thread(_put, path, data, content_type)


async def get_object(path: str):
    return await asyncio.to_thread(_get, path)


def storage_available() -> bool:
    return bool(STORAGE_URL and (os.environ.get("STORAGE_KEY") or os.environ.get("OBJECT_STORAGE_KEY")))

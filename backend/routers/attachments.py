import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from auth import get_current_user, require_role
from db import db, clean, audit
from models import new_id
from storage import put_object, get_object, APP_NAME

router = APIRouter()
TMP = Path(__file__).resolve().parent.parent / ".uploads"
MAX_BYTES = 50 * 1024 * 1024
MIME = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp", "tif": "image/tiff", "tiff": "image/tiff",
        "pdf": "application/pdf", "csv": "text/csv", "txt": "text/plain", "json": "application/json", "geojson": "application/geo+json"}
IMAGE_EXT = {"png", "jpg", "jpeg", "webp"}
KINDS = ["sar_scene", "optical_scene", "aerial_photo", "report", "ais_export", "other"]


def _ext(name: str) -> str:
    return name.rsplit(".", 1)[-1].lower() if "." in name else ""


class UploadInit(BaseModel):
    case_id: str
    filename: str = Field(min_length=1)
    size: int = Field(gt=0, le=MAX_BYTES)
    total_chunks: int = Field(ge=1, le=200)


@router.post("/uploads/init", status_code=201)
async def upload_init(body: UploadInit, user=Depends(require_role("analyst"))):
    if _ext(body.filename) not in MIME:
        raise HTTPException(400, f"unsupported file type — allowed: {', '.join(sorted(MIME))}")
    if not await db.cases.find_one({"id": body.case_id}):
        raise HTTPException(404, "case not found")
    up = {"id": str(uuid.uuid4()), **body.model_dump(), "received": [], "uploaded_by": user["email"], "created_at": datetime.now(timezone.utc), "status": "open"}
    await db.uploads.insert_one(dict(up))
    (TMP / up["id"]).mkdir(parents=True, exist_ok=True)
    return clean(up)


@router.put("/uploads/{upload_id}/chunks/{index}")
async def upload_chunk(upload_id: str, index: int, chunk: UploadFile = File(...), user=Depends(require_role("analyst"))):
    up = await db.uploads.find_one({"id": upload_id, "status": "open"})
    if not up:
        raise HTTPException(404, "upload not found or already completed")
    if not 0 <= index < up["total_chunks"]:
        raise HTTPException(400, "chunk index out of range")
    data = await chunk.read()
    d = TMP / upload_id
    d.mkdir(parents=True, exist_ok=True)
    (d / f"{index:05d}").write_bytes(data)
    await db.uploads.update_one({"id": upload_id}, {"$addToSet": {"received": index}})
    return {"received": len(set(up["received"]) | {index}), "total": up["total_chunks"]}


class UploadComplete(BaseModel):
    caption: Optional[str] = None
    kind: str = "other"
    captured_at: Optional[datetime] = None


@router.post("/uploads/{upload_id}/complete", status_code=201)
async def upload_complete(upload_id: str, body: UploadComplete, user=Depends(require_role("analyst"))):
    up = await db.uploads.find_one({"id": upload_id, "status": "open"})
    if not up:
        raise HTTPException(404, "upload not found or already completed")
    if body.kind not in KINDS:
        raise HTTPException(400, f"kind must be one of {KINDS}")
    d = TMP / upload_id
    parts = sorted(d.glob("*")) if d.exists() else []
    if len(parts) != up["total_chunks"]:
        raise HTTPException(400, f"missing chunks: {len(parts)}/{up['total_chunks']} received")
    data = b"".join(p.read_bytes() for p in parts)
    shutil.rmtree(d, ignore_errors=True)
    if len(data) > MAX_BYTES:
        raise HTTPException(400, "file exceeds 50 MB limit")
    ext = _ext(up["filename"])
    path = f"{APP_NAME}/cases/{up['case_id']}/{uuid.uuid4()}.{ext}"
    try:
        res = await put_object(path, data, MIME[ext])
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"object storage upload failed: {str(e)[:200]}")
    case = await db.cases.find_one({"id": up["case_id"]}, {"_id": 0, "case_number": 1})
    doc = {"id": new_id(), "case_id": up["case_id"], "case_number": case["case_number"], "storage_path": res["path"], "original_filename": up["filename"],
           "content_type": MIME[ext], "size": len(data), "is_image": ext in IMAGE_EXT, "kind": body.kind, "caption": body.caption, "captured_at": body.captured_at,
           "uploaded_by": user["email"], "uploaded_by_role": user["role"], "is_deleted": False, "created_at": datetime.now(timezone.utc)}
    await db.attachments.insert_one(dict(doc))
    await db.uploads.update_one({"id": upload_id}, {"$set": {"status": "completed", "attachment_id": doc["id"]}})
    await audit("case", up["case_id"], "attachment.added", {"attachment_id": doc["id"], "filename": up["filename"], "kind": body.kind, "bytes": len(data), "caption": body.caption}, user["email"])
    return clean(doc)


@router.get("/cases/{case_id}/attachments")
async def list_attachments(case_id: str, user=Depends(get_current_user)):
    return clean(await db.attachments.find({"case_id": case_id, "is_deleted": False}, {"_id": 0}).sort("created_at", 1).to_list(200))


@router.get("/attachments/{att_id}/download")
async def download_attachment(att_id: str, user=Depends(get_current_user)):
    rec = await db.attachments.find_one({"id": att_id, "is_deleted": False})
    if not rec:
        raise HTTPException(404, "attachment not found")
    try:
        data, ct = await get_object(rec["storage_path"])
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"object storage fetch failed: {str(e)[:200]}")
    return Response(content=data, media_type=rec.get("content_type") or ct, headers={"Content-Disposition": f'inline; filename="{rec["original_filename"]}"'})


@router.delete("/attachments/{att_id}")
async def delete_attachment(att_id: str, user=Depends(require_role("supervisor"))):
    rec = await db.attachments.find_one_and_update({"id": att_id, "is_deleted": False}, {"$set": {"is_deleted": True, "deleted_by": user["email"], "deleted_at": datetime.now(timezone.utc)}})
    if not rec:
        raise HTTPException(404, "attachment not found")
    await audit("case", rec["case_id"], "attachment.removed", {"attachment_id": att_id, "filename": rec["original_filename"]}, user["email"])
    return {"ok": True}


async def case_attachments(case_id: str):
    return clean(await db.attachments.find({"case_id": case_id, "is_deleted": False}, {"_id": 0}).sort("created_at", 1).to_list(200))

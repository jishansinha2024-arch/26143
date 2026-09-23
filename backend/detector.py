import io
import logging
import math
from datetime import datetime, timezone
from typing import Optional

from lazy_libs import cv2
import numpy as np
from PIL import Image
from shapely.geometry import Polygon, shape

from db import db, audit
from ml_detector import ML_VERSION, FALLBACK_VERSION, load_session
from models import SpillObservationCreate, new_id
from satellite import fetch_preview
from storage import put_object, APP_NAME

DETECTOR_VERSION = "darkspot-otsu-0.1.0-experimental"  # kept for back-compat call sites; analyze() now reports the active version per-run
MIN_AREA_PX, MAX_AREA_FRAC, MIN_ELONGATION, MAX_SPOTS = 40, 0.02, 2.2, 5


def _affine(bbox, w, h):
    west, south, east, north = bbox
    return lambda x, y: (west + (x / w) * (east - west), north - (y / h) * (north - south))


def _dark_mask(vv: np.ndarray, valid: np.ndarray, sea: np.ndarray):
    """Otsu threshold (capped at the 12th percentile) + morphology → binary dark-spot mask and threshold used."""
    blur = cv2.GaussianBlur(vv, (5, 5), 0)
    thr, _ = cv2.threshold(sea.reshape(-1, 1), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    thr = min(thr, np.percentile(sea, 12))
    dark = ((blur < thr) & valid).astype(np.uint8) * 255
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    dark = cv2.morphologyEx(cv2.morphologyEx(dark, cv2.MORPH_OPEN, k), cv2.MORPH_CLOSE, k, iterations=2)
    return dark, float(thr)


def _ml_mask(vv: np.ndarray, valid: np.ndarray, session) -> np.ndarray:
    """Run the installed ONNX SAR segmentation model on the VV quicklook; same mask shape/contract as _dark_mask
    so the existing contour/shape/contrast filters in _contour_to_spot apply unchanged to either source."""
    x = (vv.astype(np.float32) / 255.0)[None, None, :, :]  # NCHW, single VV channel (quicklook-only for now)
    input_name = session.get_inputs()[0].name
    out = session.run(None, {input_name: x})[0]
    prob = np.asarray(out).reshape(vv.shape)
    mask = ((prob > 0.5) & valid).astype(np.uint8) * 255
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    mask = cv2.morphologyEx(cv2.morphologyEx(mask, cv2.MORPH_OPEN, k), cv2.MORPH_CLOSE, k, iterations=2)
    return mask


def _contour_to_spot(c, vv: np.ndarray, dark: np.ndarray, to_geo, fp, med: float) -> Optional[dict]:
    """Shape/contrast filters for one contour; returns a spot record or None when rejected."""
    h, w = dark.shape
    area = cv2.contourArea(c)
    if area < MIN_AREA_PX or area > MAX_AREA_FRAC * w * h or len(c) < 5:
        return None
    (cx, cy), (ma, mi), ang = cv2.fitEllipse(c)
    elong = max(ma, mi) / max(min(ma, mi), 1e-3)
    if elong < MIN_ELONGATION:
        return None
    mask = np.zeros_like(dark)
    cv2.drawContours(mask, [c], -1, 255, -1)
    contrast = max(0.0, (med - float(vv[mask > 0].mean())) / max(med, 1))
    pts = cv2.approxPolyDP(c, 1.5, True).reshape(-1, 2)
    ring = [list(to_geo(float(x), float(y))) for x, y in pts]
    ring.append(ring[0])
    poly = Polygon(ring)
    if not poly.is_valid or poly.is_empty or not poly.intersects(fp):
        return None
    conf = round(min(0.55, 0.2 + 0.25 * contrast + 0.05 * min(elong / 4, 1)), 2)
    return {"geometry": {"type": "Polygon", "coordinates": [[[round(x, 5), round(y, 5)] for x, y in ring]]}, "area_px": area, "elongation": round(elong, 2),
            "contrast": round(contrast, 3), "confidence": conf, "pixel_bbox": [int(v) for v in cv2.boundingRect(c)], "centroid_px": [cx, cy], "angle_deg": round(ang, 1)}


def analyze(png: bytes, bbox: list, footprint: dict) -> dict:
    """Otsu dark-spot heuristic on a rendered quicklook. Returns candidate GeoJSON polygons in pixel→lon/lat via bbox affine."""
    arr = np.array(Image.open(io.BytesIO(png)).convert("RGBA"))
    h, w = arr.shape[:2]
    vv = arr[:, :, 0].astype(np.uint8)  # rendered_preview: R = VV backscatter
    valid = (arr[:, :, 3] > 0) & (arr[:, :, :3].sum(axis=2) > 6)
    sea = vv[valid]
    if sea.size < 500:
        return {"spots": [], "note": "insufficient valid pixels", "width": w, "height": h, "detector_version": FALLBACK_VERSION, "detector_mode": "OTSU_FALLBACK"}
    session, thr, version, mode = load_session(), None, FALLBACK_VERSION, "OTSU_FALLBACK"
    if session is not None:
        try:
            dark = _ml_mask(vv, valid, session)
            version, mode = ML_VERSION, "ML"
        except Exception as e:  # noqa: BLE001 — any inference failure falls back to the always-available heuristic
            logging.getLogger("detector").warning("ML inference failed (%s); falling back to Otsu dark-spot heuristic", str(e)[:160])
            dark, thr = _dark_mask(vv, valid, sea)
    else:
        dark, thr = _dark_mask(vv, valid, sea)
    contours, _ = cv2.findContours(dark, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    to_geo, fp, med = _affine(bbox, w, h), shape(footprint), float(np.median(sea))
    spots = [s for s in (_contour_to_spot(c, vv, dark, to_geo, fp, med) for c in contours) if s]
    spots.sort(key=lambda s: (-s["contrast"] * math.log(s["area_px"] + 1)))
    return {"spots": spots[:MAX_SPOTS], "threshold": thr, "sea_median": med, "width": w, "height": h, "candidates_total": len(spots),
            "detector_version": version, "detector_mode": mode}


def thumbnail_webp(png: bytes, pixel_bbox: list, pad: int = 40) -> bytes:
    img = Image.open(io.BytesIO(png)).convert("RGB")
    x, y, bw, bh = pixel_bbox
    box = (max(0, x - pad), max(0, y - pad), min(img.width, x + bw + pad), min(img.height, y + bh + pad))
    crop = img.crop(box)
    crop.thumbnail((480, 480))
    out = io.BytesIO()
    crop.save(out, "WEBP", quality=70)
    return out.getvalue()


async def get_quicklook(scene: dict) -> bytes:
    """Quicklook PNG cached in object storage (scene.quicklook_path)."""
    from storage import get_object
    if scene.get("quicklook_path"):
        try:
            data, _ = await get_object(scene["quicklook_path"])
            return data
        except Exception:  # noqa: BLE001
            pass
    md = scene.get("metadata") or {}
    kind = "native"
    if md.get("preview_href") or md.get("thumbnail_href"):
        try:
            png, _ = await fetch_preview(md.get("preview_href") or md["thumbnail_href"], md.get("thumbnail_href"))
        except Exception as e:  # noqa: BLE001
            raise ValueError(f"Quicklook fetch failed from provider preview: {str(e)[:120]}")
    else:
        from sentinel_assets import generate_quicklook
        png, kind = await generate_quicklook(scene), "generated"
    path = f"{APP_NAME}/quicklooks/{scene['provider_scene_id']}.png"
    try:
        res = await put_object(path, png, "image/png")
        await db.scenes.update_one({"id": scene["id"]}, {"$set": {"quicklook_path": res["path"], "quicklook_bytes": len(png), "quicklook_kind": kind, "quicklook_status": "ready"}})
    except Exception as e:  # noqa: BLE001
        logging.getLogger("detector").warning("quicklook cache store failed for %s: %s", scene["provider_scene_id"], str(e)[:120])
    return png


async def run_dark_spot_detector(scene: dict, actor="system") -> dict:
    from services import create_spill_observation
    bbox = (scene.get("metadata") or {}).get("bbox") or list(shape(scene["footprint"]).bounds)
    png = await get_quicklook(scene)
    res = analyze(png, bbox, scene["footprint"])
    active_version, is_ml = res.get("detector_version", FALLBACK_VERSION), res.get("detector_mode") == "ML"
    cases = []
    now = datetime.now(timezone.utc)
    for i, s in enumerate(res["spots"]):
        flags = ["lookalike_suspect"] if is_ml else ["lookalike_suspect", "experimental_detector"]
        note = (f"ONNX SAR segmentation model output (elongation {s['elongation']}, contrast {s['contrast']}). Still analyst-review candidate evidence, not a legal determination."
                if is_ml else
                f"EXPERIMENTAL dark-spot heuristic (Otsu threshold on Sentinel-1 quicklook, elongation {s['elongation']}, contrast {s['contrast']}). Low-wind areas, upwelling and wakes cause false positives — analyst review required.")
        payload = SpillObservationCreate(
            scene_id=scene["id"], geometry=s["geometry"], acquisition_time=scene["acquisition_time"], source="dark_spot_detector",
            detection_confidence=s["confidence"], quality_flags=flags, processing_version=active_version, notes=note)
        spill, case = await create_spill_observation(payload, actor)
        try:
            thumb = thumbnail_webp(png, s["pixel_bbox"])
            path = f"{APP_NAME}/cases/{case['id']}/{new_id()}.webp"
            put = await put_object(path, thumb, "image/webp")
            att = {"id": new_id(), "case_id": case["id"], "case_number": case["case_number"], "storage_path": put["path"], "original_filename": f"{scene['provider_scene_id']}-spot{i + 1}.webp",
                   "content_type": "image/webp", "size": len(thumb), "is_image": True, "kind": "sar_scene", "caption": f"Dark-spot crop #{i + 1} — {scene['provider_scene_id']} (experimental detector)",
                   "uploaded_by": "dark_spot_detector", "uploaded_by_role": "system", "is_deleted": False, "created_at": now, "auto_thumbnail": True}
            await db.attachments.insert_one(dict(att))
            await db.cases.update_one({"id": case["id"]}, {"$set": {"thumbnail_attachment_id": att["id"]}})
        except Exception:  # noqa: BLE001
            pass
        cases.append({"case_id": case["id"], "case_number": case["case_number"], "confidence": s["confidence"], "elongation": s["elongation"], "contrast": s["contrast"]})
    await db.scenes.update_one({"id": scene["id"]}, {"$set": {"status": "detected", "detector_version": active_version, "detector_summary": {**{k: v for k, v in res.items() if k != "spots"}, "spots": len(res["spots"]), "at": now}}})
    await audit("scene", scene["id"], "scene.detected", {"detector": active_version, "spots": len(res["spots"]), "cases": [c["case_number"] for c in cases]}, actor)
    return {"detector": active_version, "experimental": not is_ml, "spots": len(res["spots"]), "cases": cases, "threshold": res.get("threshold"), "sea_median": res.get("sea_median"),
            "note": ("ONNX SAR segmentation model active for this run." if is_ml else
                     "EXPERIMENTAL: Otsu dark-spot heuristic on a quicklook — not a validated SAR segmentation model. Drop a model at OIL_MODEL_PATH to activate ML with no code change.")}


async def detect_scene(scene: dict, actor="system") -> dict:
    """Real Sentinel STAC scene (SAR asset or native preview) → dark-spot detector; manual scenes without imagery → mock placeholder (labelled)."""
    md = scene.get("metadata") or {}
    if md.get("preview_href") or md.get("stac_collection"):
        return await run_dark_spot_detector(scene, actor)
    from services import mock_detect
    spill, case = await mock_detect(scene, actor)
    return {"detector": "mock", "experimental": True, "spots": 1, "cases": [{"case_id": case["id"], "case_number": case["case_number"], "confidence": spill["detection_confidence"]}],
            "note": "Mock detector output — placeholder for scenes without imagery."}

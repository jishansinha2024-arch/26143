"""Iteration 26 backend checks: CORS allow-list, /api/health shape, WHY THIS VESSEL factors math, PROVENANCE panel, SIH demo data."""
import os
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")
ADMIN = ("shawpriyanshu950@gmail.com", "Admin#2026")
ANALYST = ("analyst@sentinelmar.demo", "Analyst#2026")


def _token(email, pw):
    r = requests.post(f"{BASE}/api/auth/login", json={"email": email, "password": pw}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _hdr(tok):
    return {"Authorization": f"Bearer {tok}"}


# --- CORS ---------------------------------------------------------------
def test_cors_allowed_origin():
    r = requests.options(f"{BASE}/api/auth/login", headers={
        "Origin": BASE, "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type"}, timeout=10)
    assert r.status_code == 200
    assert "access-control-allow-origin" in {k.lower() for k in r.headers}


def test_cors_disallowed_origin():
    r = requests.options(f"{BASE}/api/auth/login", headers={
        "Origin": "https://evil.example.com", "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type"}, timeout=10)
    assert r.status_code == 400
    assert "Disallowed CORS origin" in r.text


def test_health_shape():
    r = requests.get(f"{BASE}/api/health", timeout=10)
    assert r.status_code == 200
    j = r.json()
    assert j["environment"] == "production"
    assert j["demo_mode"] is False
    assert "request_origin_seen" in j


# --- WHY THIS VESSEL: factors math --------------------------------------
def test_why_this_vessel_factors_math():
    tok = _token(*ANALYST)
    cases = requests.get(f"{BASE}/api/cases?origin=all&limit=1000", headers=_hdr(tok), timeout=30).json()
    found = None
    for c in cases[:60]:
        cid = c["id"]
        resp = requests.get(f"{BASE}/api/cases/{cid}/candidates", headers=_hdr(tok), timeout=15).json()
        cands = resp.get("candidates") if isinstance(resp, dict) else resp
        if cands:
            found = (cid, cands[0])
            break
    if not found:
        import pytest
        pytest.skip("no case with candidates in DB right now")
    cid, cand = found
    f = cand["factors"]
    for k in ("spatial", "temporal", "continuity", "heading", "drift", "reliability"):
        assert k in f, f"missing factor {k}"
        assert "score" in f[k] and "weight" in f[k] and "contribution" in f[k] and "detail" in f[k]
    total_contrib = sum(f[k]["contribution"] for k in f)
    assert abs(total_contrib - cand["score"]) <= 0.01, f"Σcontrib={total_contrib} score={cand['score']}"
    print(f"CASE {cid} MMSI {cand['mmsi']} score={cand['score']} Σcontrib={total_contrib}")


# --- PROVENANCE ---------------------------------------------------------
def test_provenance_shape():
    tok = _token(*ANALYST)
    cases = requests.get(f"{BASE}/api/cases?origin=all&limit=1000", headers=_hdr(tok), timeout=30).json()
    case_with_scene = next((c for c in cases if c.get("scene_id")), None)
    assert case_with_scene, "no case with scene_id"
    p = requests.get(f"{BASE}/api/cases/{case_with_scene['id']}/provenance", headers=_hdr(tok), timeout=15).json()
    for k in ("satellite", "detection", "ais", "jurisdiction", "analysis", "data_mode", "case_origin"):
        assert k in p, f"missing {k}"
    assert "badge" in p["satellite"]
    assert p["satellite"].get("scene_id")
    assert "NOT YET VALIDATED" in p["detection"]["validation"]
    assert p["ais"]["badge"] in ("LIVE", "HISTORICAL", "UNAVAILABLE", "DEMO", "NONE")
    assert p["data_mode"] in ("LIVE", "REFERENCE", "DEMO")
    if case_with_scene.get("primary_jurisdiction"):
        assert p["jurisdiction"]["badge"] in ("REFERENCE", "USER-DEFINED", "UNAVAILABLE")
    print(f"provenance case={case_with_scene['id']} data_mode={p['data_mode']} sat_badge={p['satellite']['badge']} ais_badge={p['ais']['badge']}")


# --- SIH demo underlying endpoints --------------------------------------
def test_demo_summary_and_ais():
    tok = _token(*ANALYST)
    s = requests.get(f"{BASE}/api/dashboard/summary", headers=_hdr(tok), timeout=15).json()
    assert "live_cases" in s
    a = requests.get(f"{BASE}/api/ais/status", headers=_hdr(tok), timeout=15).json()
    assert "state" in a
    print(f"live_cases={s['live_cases']} ais_state={a['state']}")

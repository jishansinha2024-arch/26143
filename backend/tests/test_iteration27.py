"""Iteration 27: verify Why-This-Vessel end-to-end against real Chennai correlation.

Case 252e536c... (SPL-20260910-106) should have 5 real candidates from AIS.
"""
import os
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")
EMAIL = "analyst@sentinelmar.demo"
PWD = "Analyst#2026"

EXPECTED_WEIGHTS = {"spatial": 0.3, "temporal": 0.2, "continuity": 0.1, "heading": 0.1, "drift": 0.15, "reliability": 0.15}


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PWD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def sess(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="module")
def case_id(sess):
    r = sess.get(f"{BASE}/api/cases?origin=all&limit=1000")
    assert r.status_code == 200
    hits = [c for c in r.json() if c["id"].startswith("252e536c")]
    assert hits, "No case starting with 252e536c found"
    return hits[0]["id"]


def test_case_found(case_id):
    assert case_id.startswith("252e536c")


def test_candidates_dict_shape_and_five_real(sess, case_id):
    r = sess.get(f"{BASE}/api/cases/{case_id}/candidates")
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body, dict) and "candidates" in body, f"Expected dict with candidates, got {type(body).__name__}: {body}"
    cands = body["candidates"]
    assert len(cands) == 5, f"Expected 5 candidates, got {len(cands)}"
    mmsis = {str(c["mmsi"]) for c in cands}
    assert "419001814" in mmsis, f"Expected MMSI 419001814 in {mmsis}"
    top = next(c for c in cands if c["rank"] == 1)
    assert str(top["mmsi"]) == "419001814"
    assert abs(top["score"] - 0.373) < 0.05, f"top score {top['score']}"


def test_factor_invariants(sess, case_id):
    body = sess.get(f"{BASE}/api/cases/{case_id}/candidates").json()
    cands = body["candidates"]
    for c in cands:
        f = c["factors"]
        for k in EXPECTED_WEIGHTS:
            assert k in f, f"missing factor {k} on {c['mmsi']}"
            for key in ("score", "weight", "contribution", "detail"):
                assert key in f[k], f"missing {key} in factor {k} ({c['mmsi']})"
            assert abs(f[k]["weight"] - EXPECTED_WEIGHTS[k]) < 1e-6, f"weight {k}={f[k]['weight']} expected {EXPECTED_WEIGHTS[k]}"
        contrib_sum = sum(f[k]["contribution"] for k in EXPECTED_WEIGHTS)
        assert abs(contrib_sum - c["score"]) <= 0.001, f"MMSI {c['mmsi']} sum(contrib)={contrib_sum} score={c['score']}"


def test_top_candidate_status(sess, case_id):
    body = sess.get(f"{BASE}/api/cases/{case_id}/candidates").json()
    top = next(c for c in body["candidates"] if c["rank"] == 1)
    assert top["status"] == "insufficient_evidence", top["status"]


def test_health_and_dashboard():
    r = requests.get(f"{BASE}/api/health")
    assert r.status_code == 200
    j = r.json()
    assert j.get("environment") == "production", j


def test_dashboard_summary(sess):
    r = sess.get(f"{BASE}/api/dashboard/summary")
    assert r.status_code == 200


def test_cors_allowed_origin():
    origin = BASE  # own origin
    r = requests.options(f"{BASE}/api/health", headers={"Origin": origin, "Access-Control-Request-Method": "GET"})
    assert r.status_code == 200, r.status_code


def test_cors_disallowed_origin():
    r = requests.options(f"{BASE}/api/health", headers={"Origin": "https://evil.example.com", "Access-Control-Request-Method": "GET"})
    assert r.status_code == 400, r.status_code

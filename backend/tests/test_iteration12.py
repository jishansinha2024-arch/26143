"""Iteration 12 tests: httpOnly cookie sessions, ICG districts, shoreline vulnerability."""
import io
import os
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/backend/tests/.env.test")
BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "http://127.0.0.1:8000"
# Read from frontend .env if not set
if "REACT_APP_BACKEND_URL" not in os.environ:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE = line.split("=", 1)[1].strip().rstrip("/")

ADMIN = ("shawpriyanshu950@gmail.com", os.environ.get("TEST_ADMIN_PASSWORD", "Admin#2026"))
ANALYST = ("analyst@sentinelmar.demo", os.environ.get("TEST_ANALYST_PASSWORD", "Analyst#2026"))
CASE_MUMBAI = "1a87e9ad-329e-4023-80c7-8d4c01ebf336"


def _login_session(email, password):
    s = requests.Session()
    r = s.post(f"{BASE}/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return s, r


# ---------- AUTH: httpOnly cookie sessions ----------
class TestAuthCookies:
    def test_login_sets_httponly_cookie(self):
        s, r = _login_session(*ANALYST)
        # cookie present
        assert "access_token" in s.cookies, f"cookies={s.cookies.get_dict()}"
        # HttpOnly attribute (check via raw Set-Cookie header)
        set_cookie = r.headers.get("set-cookie", "")
        assert "HttpOnly" in set_cookie or "httponly" in set_cookie.lower(), set_cookie
        # response body still has token & user
        body = r.json()
        assert "access_token" in body and body["user"]["email"] == ANALYST[0]

    def test_me_with_cookie_only(self):
        s, _ = _login_session(*ANALYST)
        # bare session with cookie jar; no Authorization header
        r = s.get(f"{BASE}/api/auth/me")
        assert r.status_code == 200, r.text
        assert r.json()["email"] == ANALYST[0]

    def test_me_with_bearer_only(self):
        r = requests.post(f"{BASE}/api/auth/login", json={"email": ANALYST[0], "password": ANALYST[1]})
        tok = r.json()["access_token"]
        r2 = requests.get(f"{BASE}/api/auth/me", headers={"Authorization": f"Bearer {tok}"})
        assert r2.status_code == 200
        assert r2.json()["email"] == ANALYST[0]

    def test_sse_with_cookie_only(self):
        s, _ = _login_session(*ANALYST)
        with s.get(f"{BASE}/api/alerts/stream", stream=True, timeout=10) as r:
            assert r.status_code == 200, r.text
            # read first event
            first = b""
            for chunk in r.iter_content(chunk_size=256):
                first += chunk
                if b"\n\n" in first or len(first) > 512:
                    break
            text = first.decode("utf-8", errors="ignore")
            assert "hello" in text.lower(), text[:200]

    def test_sse_without_auth_401(self):
        r = requests.get(f"{BASE}/api/alerts/stream", timeout=10, stream=True)
        assert r.status_code == 401, r.status_code

    def test_logout_clears_cookie(self):
        s, _ = _login_session(*ANALYST)
        r = s.post(f"{BASE}/api/auth/logout")
        assert r.status_code in (200, 204)
        set_cookie = r.headers.get("set-cookie", "")
        # Expired or Max-Age=0
        assert ("Max-Age=0" in set_cookie or "max-age=0" in set_cookie.lower()
                or "1970" in set_cookie or "expires=" in set_cookie.lower()), set_cookie


# ---------- ICG ----------
class TestIcg:
    def test_districts_list(self):
        s, _ = _login_session(*ANALYST)
        r = s.get(f"{BASE}/api/icg/districts")
        assert r.status_code == 200
        body = r.json()
        # Could be list or {districts:[...], disclaimer:...}
        if isinstance(body, dict):
            districts = body.get("districts", [])
            disclaimer = body.get("disclaimer", "")
        else:
            districts = body
            disclaimer = ""
        assert len(districts) == 14, f"expected 14, got {len(districts)}"
        if disclaimer:
            assert "approximate" in disclaimer.lower(), disclaimer

    def test_geojson(self):
        s, _ = _login_session(*ANALYST)
        r = s.get(f"{BASE}/api/icg/districts/geojson")
        assert r.status_code == 200
        gj = r.json()
        assert gj.get("type") == "FeatureCollection"
        assert len(gj.get("features", [])) == 14

    def test_resolve_mumbai(self):
        s, _ = _login_session(*ANALYST)
        r = s.get(f"{BASE}/api/icg/resolve", params={"lat": 19.2, "lon": 72.0})
        assert r.status_code == 200
        body = r.json()
        code = body.get("code") or (body.get("icg") or {}).get("code")
        assert code == "ICG-MUM", body

    def test_resolve_chennai(self):
        s, _ = _login_session(*ANALYST)
        r = s.get(f"{BASE}/api/icg/resolve", params={"lat": 13.0, "lon": 80.5})
        assert r.status_code == 200
        code = r.json().get("code") or (r.json().get("icg") or {}).get("code")
        assert code == "ICG-CHN"

    def test_resolve_north_sea_null(self):
        s, _ = _login_session(*ANALYST)
        r = s.get(f"{BASE}/api/icg/resolve", params={"lat": 55.0, "lon": 4.0})
        assert r.status_code == 200
        body = r.json()
        # icg null / code null
        code = body.get("code") or (body.get("icg") or {}).get("code") if isinstance(body.get("icg"), dict) else None
        assert code is None, body

    def test_analyst_put_forbidden(self):
        s, _ = _login_session(*ANALYST)
        r = s.put(f"{BASE}/api/icg/districts/ICG-GOA", json={"district_hq": "Goa (Vasco)"})
        assert r.status_code == 403

    def test_admin_put_and_reflected(self):
        s, _ = _login_session(*ADMIN)
        r = s.put(f"{BASE}/api/icg/districts/ICG-GOA", json={"district_hq": "Goa (Vasco)"})
        assert r.status_code == 200, r.text
        r2 = s.get(f"{BASE}/api/icg/districts")
        body = r2.json()
        districts = body["districts"] if isinstance(body, dict) else body
        goa = [d for d in districts if d.get("code") == "ICG-GOA"][0]
        assert goa.get("district_hq") == "Goa (Vasco)"

    def test_case_icg_resolve(self):
        s, _ = _login_session(*ANALYST)
        r = s.post(f"{BASE}/api/cases/{CASE_MUMBAI}/icg/resolve")
        assert r.status_code == 200, r.text
        body = r.json()
        code = (body.get("icg") or {}).get("code") or body.get("code")
        assert code == "ICG-MUM", body
        # verify persisted
        r2 = s.get(f"{BASE}/api/cases/{CASE_MUMBAI}")
        assert (r2.json().get("icg") or {}).get("code") == "ICG-MUM"


# ---------- Vulnerability ----------
class TestVulnerability:
    def test_mumbai_case_vulnerability(self):
        s, _ = _login_session(*ANALYST)
        r = s.get(f"{BASE}/api/cases/{CASE_MUMBAI}/vulnerability")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("degraded") is False, body.get("degraded")
        env = body.get("envelopes") or {}
        # 24/48/72
        for h in ("24", "48", "72"):
            assert h in env or int(h) in env or f"h{h}" in env, list(env.keys())
        sites = body.get("sites", [])
        assert len(sites) > 0
        names = " ".join((s.get("name") or "") for s in sites).lower()
        assert "thane" in names or "juhu" in names, names[:300]
        # eta_hours numeric
        assert any(isinstance(s.get("eta_hours"), (int, float)) for s in sites)
        assert body.get("disclaimer")

    def test_north_sea_case_no_sites(self):
        s, _ = _login_session(*ANALYST)
        # find north sea case by SPL id
        cases = s.get(f"{BASE}/api/cases").json()
        case_list = cases if isinstance(cases, list) else cases.get("cases", [])
        target = [c for c in case_list if c.get("case_number") == "SPL-20260610-001" or c.get("spl_id") == "SPL-20260610-001"]
        if not target:
            pytest.skip("SPL-20260610-001 not seeded")
        cid = target[0]["id"] if "id" in target[0] else target[0]["_id"]
        r = s.get(f"{BASE}/api/cases/{cid}/vulnerability")
        assert r.status_code == 200, r.text
        assert r.json().get("sites") == []

    def test_enrich_job_graceful_fail(self):
        s, _ = _login_session(*ANALYST)
        r = s.post(f"{BASE}/api/cases/{CASE_MUMBAI}/vulnerability/enrich")
        assert r.status_code == 202, r.text
        jid = r.json().get("job_id") or r.json().get("id")
        assert jid
        # poll
        import time
        for _ in range(90):
            jr = s.get(f"{BASE}/api/jobs/{jid}").json()
            if jr.get("status") in ("succeeded", "failed"):
                break
            time.sleep(1)
        assert jr.get("status") == "succeeded", jr
        result = jr.get("result") or {}
        assert result.get("status") in ("failed", "ok"), result
        # Either graceful failure with error, or success with sites count
        if result.get("status") == "failed":
            assert result.get("error") or result.get("message")
        else:
            assert isinstance(result.get("sites"), int)
        # vulnerability osm.status reflects job outcome
        vr = s.get(f"{BASE}/api/cases/{CASE_MUMBAI}/vulnerability").json()
        osm = vr.get("osm") or {}
        assert osm.get("status") in ("failed", "ok")

    def test_sensitive_sites(self):
        s, _ = _login_session(*ANALYST)
        r = s.get(f"{BASE}/api/sensitive-sites")
        assert r.status_code == 200
        body = r.json()
        sites = body if isinstance(body, list) else body.get("sites", [])
        assert len(sites) == 34, f"expected 34, got {len(sites)}"

    def test_evidence_pdf_has_vulnerability_section(self):
        s, _ = _login_session(*ANALYST)
        r = s.get(f"{BASE}/api/cases/{CASE_MUMBAI}/evidence.pdf")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        try:
            import pymupdf as fitz  # type: ignore
        except ImportError:
            import fitz  # type: ignore
        doc = fitz.open(stream=r.content, filetype="pdf")
        text = "\n".join(page.get_text() for page in doc)
        doc.close()
        assert "Shoreline vulnerability" in text or "10. Shoreline" in text, text[:500]

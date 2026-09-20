# Varuna Netra — Project Brief & SIH Judge Q&A

_A truthful, provenance-first maritime oil-spill decision-support platform._

## 1. What the platform does (one line)
Detect potential marine oil spills from **Sentinel-1 radar (SAR)** imagery, **correlate nearby vessels** using **AIS** tracks over a space–time corridor, analyse **jurisdiction (EEZ)**, and present **explainable evidence** (Why This Vessel, Evidence Timeline, Data Provenance) for **analyst review** — explicitly **decision support, not a legal determination**.

## 2. End-to-end pipeline
1. **AOI + acquisition** — search Microsoft Planetary Computer STAC for a Sentinel-1 GRD scene over the area; adaptive attach windows ±36h → ±72h → ±5d → ±7d.
2. **Detection** — dark-spot heuristic on the SAR VV quicklook → candidate spill polygon(s).
3. **Spill observation → Case** — polygon, area/extent, detection confidence stored.
4. **AIS correlation** — pull AIS fixes inside the corridor (`25 km` default + spill extent, window `-24h/+3h`), gap-fill, back-drift, score each vessel on 6 factors → ranked candidates.
5. **Why This Vessel** — per-factor score / weight / contribution breakdown.
6. **Evidence Timeline** — stored timestamps only (acquisition, detection, AIS events, correlation, review).
7. **Jurisdiction** — point-in-polygon against Marine Regions EEZ layers.
8. **Provenance** — every value cites its source (scene ID, AIS batch, model version).
9. **Investigation case + report**.

Data is always labelled: **LIVE / LATEST AVAILABLE / HISTORICAL / STORED REFERENCE / UNAVAILABLE**. Nothing stored/replayed is ever shown as LIVE.

## 3. The detection "model" — what and why
- **What:** classical computer vision, not deep learning. Version `darkspot-otsu-0.1.0-experimental`.
  - Input: Sentinel-1 **C-band SAR**, **VV** backscatter (rendered quicklook).
  - Method: **Otsu threshold** (capped at the 12th percentile of sea pixels) → binary dark mask → **OpenCV morphology** (open+close) → contour extraction → **shape/contrast filters** (area, elongation, contrast vs sea median).
  - Output: candidate dark-spot polygons in lon/lat (pixel→geo affine from scene bbox).
  - Honestly labelled **EXPERIMENTAL**: low wind, upwelling, biogenic films and vessel wakes cause **look-alike false positives → analyst review required**. It is **not** a validated/trained SAR segmentation model.
- **Why this (not a deep CNN like U-Net):**
  - No large **labelled** SAR oil-spill dataset or GPU in scope; a classical detector is **explainable, deterministic, fast, and defensible** — which matches the project's truthfulness principle.
  - A black-box CNN would produce confidence numbers we cannot honestly justify to a judge without validation data.
- **Alternatives & why not (yet):**
  - **U-Net / DeepLab SAR segmentation** (trained on e.g. the Krestenitis oil-spill SAR dataset): higher accuracy but needs labelled data + GPU + validation; on the roadmap.
  - **Optical / multispectral (Sentinel-2)**: used only as **supplementary context**, never the primary detector — clouds and night defeat it.

## 4. Sensors — is any multispectral / PIR used?
**No PIR (passive infra-red), no thermal, no hyperspectral, no in-situ chemical sensor is used** — this is a **satellite remote-sensing** system, not a ship/buoy sensor rig.
- **Primary sensor: Synthetic Aperture Radar (SAR)** — Sentinel-1 C-band. Oil films **dampen small capillary/gravity waves** (Marangoni damping), so slicks appear as **dark low-backscatter patches** against a brighter wind-roughened sea.
- **Why SAR over multispectral/PIR for spaceborne spill detection:**
  - **All-weather, day & night, cloud-penetrating** (radar is active microwave) — optical/multispectral and thermal/PIR fail at night or under cloud, which is common over oceans.
  - Oil's radar signature (wave damping) is a **direct physical effect**, giving good spill contrast.
- **Supplementary layer:** Sentinel-2 **optical/multispectral** for visual confirmation when a cloud-free scene exists (explicitly not a SAR replacement).
- **If asked about PIR/thermal:** thermal IR can sometimes see oil's emissivity/temperature contrast, but it's weather/time-of-day limited and not in Sentinel-1; it would be a future multi-sensor fusion item, not a current claim.

## 5. Vessel correlation — "Why This Vessel" (decision support, NOT proof of guilt)
Six explainable factors, weighted sum ÷ total weight (defaults):
| Factor | Weight | Meaning |
|---|---|---|
| spatial | 0.30 | closest approach distance to slick boundary (exp decay) |
| temporal | 0.20 | time gap between vessel fix and acquisition |
| drift | 0.15 | does a back-drifted origin match the vessel's earlier position? |
| reliability | 0.15 | AIS quality (spoof/jump/stale/missing-identity penalties) |
| continuity | 0.10 | track completeness / gaps (possible dark period) |
| heading | 0.10 | course consistency with the slick's major axis |

- **Drift model:** backward **Lagrangian** back-track `lagrangian-backtrack-0.1.0` — surface drift = **3% of wind (downwind) + surface current**, hourly steps, growing **2σ uncertainty envelope**; likely-origin window reported.
- **AIS integrity:** dead-reckoning gap-fill (>30 min), **spoof/jump detection** (kinematically implausible transits flagged `spoof_suspect`, never silently interpolated).
- **Status thresholds:** `probable` ≥ 0.70, `possible` ≥ 0.45, else `insufficient_evidence`.
- **Honesty caps → capped at "possible":** two top candidates within 0.08 (ambiguity), detection confidence < 0.4, spill-quality flags, low AIS reliability, or no fixes before acquisition. No "confirmed/guilty" language anywhere.

## 6. Technology stack
- **Frontend:** React (CRA), React Router, TailwindCSS, shadcn/ui, lucide-react icons, **Leaflet** maps (OSM / Esri World Imagery / NASA GIBS tiles), sonner toasts.
- **Backend:** **FastAPI** (Python 3.11), **Motor** async MongoDB driver, **Pydantic v2**, **NumPy / SciPy / OpenCV (headless)** for detection, **Shapely** for geometry, aiohttp, websockets.
- **Database:** **MongoDB** with 2dsphere geospatial indexes (corridor queries, EEZ lookups).
- **External data sources:**
  - **Microsoft Planetary Computer STAC** — Sentinel-1 GRD (SAR) + Sentinel-2 (optical) scene search & signed assets.
  - **AISStream.io** — live AIS position reports over WebSocket (state machine: UNCONFIGURED→…→LIVE only after real parsed positions).
  - **Marine Regions** — EEZ / maritime jurisdiction polygons (sanitised, 2dsphere-indexed).
  - **Open-Meteo** — wind for the drift model; **OSM/Overpass** — coastal vulnerability enrichment.
- **Auth & security:** custom **JWT (PyJWT HS256) in httpOnly Secure cookies** + **bcrypt**; **Google OAuth** (public sign-in → auto Viewer); RBAC **guest < viewer < analyst < supervisor < admin**; scoped CORS + HSTS/nosniff/frame-deny headers.
- **Email:** **Resend** (currently sandbox) for password reset + access-request notifications.
- **Object storage:** persistent store for scene crops / attachments (never Base64).
- **LLM note:** the **detection & correlation pipeline is fully deterministic** — it does **not** rely on an LLM, by design, so every number is reproducible and defensible.

## 7. Access model (for the demo)
- **Guest (Explore / Start SIH Demo):** server-issued **read-only** session — view dashboard, demo, reference case, archive, zones, provenance; every write is 403 server-side.
- **Viewer:** authenticated read-only (Google or email signup, auto-provisioned).
- **Analyst / Supervisor:** require **admin approval** of a role request.
- **Admin:** only promoted by an existing admin — never via signup/Google/self-request.

---

# SIH Judge Q&A — hardest → easiest (with how to answer)

### A. Hardest / scientific & credibility
1. **"Your dark-spot detector is just Otsu thresholding — how is this better than a trained CNN, and what's your accuracy?"**
   → Be honest: it's an **explainable classical baseline**, labelled experimental, no fabricated accuracy. Its value is **transparency + the full correlation/provenance workflow**. Roadmap: swap in a validated U-Net once labelled SAR data + GPU are available; the architecture already treats detection as a pluggable stage.
2. **"How do you separate real oil slicks from look-alikes (low wind, algae, wakes)?"**
   → We don't claim certainty: shape/contrast filters reduce noise, every candidate is flagged experimental and **requires analyst review**; wind context (Open-Meteo) and multi-vessel/ambiguity caps prevent over-confident calls.
3. **"Can this legally attribute a spill to a vessel?"**
   → **No, and we never claim it.** It's decision support; the strongest status is "probable", explicitly capped, with a visible "not a legal determination" disclaimer. It shortlists candidates for investigators.
4. **"Explain the drift model and its uncertainty."**
   → Backward Lagrangian: surface drift ≈ 3% wind + current, hourly steps, a **growing 2σ origin envelope**; if wind/current are missing we mark attribution **DEGRADED** rather than guess.
5. **"How do you know the AIS 'LIVE' status is real and not faked?"**
   → A strict state machine: LIVE only after genuinely **parsed position reports** arrive; a configured key / open socket / sent subscription is **not** enough; shared-key conflicts and stale feeds are shown truthfully (NO REGIONAL COVERAGE, STALE, KEY_CONFLICT).
6. **"What if a vessel spoofs or turns off AIS?"**
   → Kinematically implausible transits are flagged `spoof_suspect` (not silently interpolated); AIS gaps adjacent to the slick are surfaced as possible **dark periods**; reliability factor penalises this.

### B. Medium / engineering & data
7. **"Why SAR instead of optical/thermal satellites?"** → All-weather, day/night, cloud-penetrating; oil's wave-damping gives a direct radar signature (see §4).
8. **"Latency — is this real-time?"** → Sentinel-1 is **revisit-based (not live)**; AIS can be live. We label LATEST AVAILABLE vs LIVE so no one is misled.
9. **"How does vessel correlation scale / how are corridor queries fast?"** → MongoDB 2dsphere geo-indexes with `$centerSphere` space + time-window queries; scoring is O(vessels × fixes) and bounded by the corridor.
10. **"How do you handle jurisdiction across the whole ocean?"** → Imported, sanitised Marine Regions EEZ polygons, 2dsphere point-in-polygon; if a region isn't imported we show **UNAVAILABLE**, never fabricate a boundary.
11. **"Security / who can do what?"** → Server-side RBAC (guest→admin), JWT httpOnly cookies + bcrypt, admin never self-assignable, scoped CORS + security headers, no secrets in the bundle.

### C. Easy / demo & product
12. **"Show me it working."** → Click **Start SIH Demo** → the pinned reference case walks through all 10 steps (scene → detection → AIS → ranking → Why This Vessel → timeline → jurisdiction → provenance → disclaimer).
13. **"Who are the users?"** → Coast guard / pollution-control analysts; judges can Explore as read-only Guest with no signup.
14. **"What's the tech stack?"** → React + FastAPI + MongoDB; Sentinel-1/2 via Planetary Computer; AISStream; Leaflet maps (see §6).
15. **"What's next?"** → Validated ML detector, multi-sensor fusion (optical/thermal), OpenDrift/HYCOM drift, verified Resend domain + email verification, wider EEZ coverage.

**Golden rule for every answer:** state exactly what is real, what is experimental/heuristic, and what is unavailable — the honesty *is* the differentiator.

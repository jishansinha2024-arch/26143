// Illustrative content for the entry (login) screen. Purely decorative — the
// signed-in console reads all real numbers from the API.

/** Dark-slick candidates drawn on the globe. */
export const DETECTIONS = [
  { id: "SPL-20260910-062", lat: 25.6, lon: 56.2, severity: "probable" },
  { id: "SPL-20260909-089", lat: 21.6, lon: 88.1, severity: "possible" },
  { id: "SPL-20260909-084", lat: 1.34, lon: 103.8, severity: "indeterminate" },
  { id: "SPL-20260908-041", lat: 53.4, lon: 4.6, severity: "probable" },
  { id: "SPL-20260908-017", lat: 28.9, lon: -90.1, severity: "possible" },
  { id: "SPL-20260907-233", lat: 4.1, lon: 5.6, severity: "indeterminate" },
  { id: "SPL-20260907-118", lat: 35.2, lon: 139.8, severity: "possible" },
  { id: "SPL-20260906-092", lat: 19.0, lon: 72.8, severity: "probable" },
];

/** AIS trajectories correlated against the open candidates. */
export const ROUTES = [
  [{ lat: 25.6, lon: 56.2 }, { lat: 19.0, lon: 72.8 }],
  [{ lat: 1.34, lon: 103.8 }, { lat: 21.6, lon: 88.1 }],
  [{ lat: 53.4, lon: 4.6 }, { lat: 36.1, lon: -5.3 }],
  [{ lat: 28.9, lon: -90.1 }, { lat: 9.3, lon: -79.9 }],
  [{ lat: 35.2, lon: 139.8 }, { lat: 1.34, lon: 103.8 }],
  [{ lat: 4.1, lon: 5.6 }, { lat: -33.9, lon: 18.4 }],
  [{ lat: 19.0, lon: 72.8 }, { lat: 12.9, lon: 45.0 }],
];

export const PIPELINE = [
  { step: "01", title: "Detect", detail: "Sentinel-1 synthetic aperture radar surfaces dark slicks and marine anomalies.", tag: "SAR · C-band" },
  { step: "02", title: "Correlate", detail: "Spatial and temporal alignment against vessel AIS tracks along drift corridors.", tag: "AIS trajectories" },
  { step: "03", title: "Attribute", detail: "Jurisdiction evaluated under UNCLOS, then sealed into a tamper-evident package.", tag: "UNCLOS" },
];

export const FEED = [
  { time: "20:06:40Z", code: "SPL-20260910-062", body: "dark_spot_detector · IND-EEZ · det. conf 38%", level: "indeterminate" },
  { time: "20:04:12Z", code: "S1D_IW_GRDH", body: "new sentinel-1d pass over Paradip — Haldia — Sundarbans", level: "possible" },
  { time: "19:58:03Z", code: "SPL-20260909-089", body: "2 dark spots · supervisor acknowledgement required", level: "probable" },
  { time: "19:51:47Z", code: "AIS-STREAM", body: "1 bbox + margin · Persian Gulf / Strait of Hormuz", level: "possible" },
  { time: "19:44:20Z", code: "SPL-20260908-041", body: "North Sea (BE / NL / UK sector) · 2 candidate vessels", level: "probable" },
  { time: "19:37:55Z", code: "ZONE-SYNC", body: "13 zones · 8 countries · Marine Regions v12 imported", level: "indeterminate" },
];

export const WATCH_AREAS = [
  "Persian Gulf / Hormuz",
  "North Sea",
  "Strait of Malacca",
  "Gulf of Mexico",
  "Gulf of Guinea",
  "Tokyo Bay",
];

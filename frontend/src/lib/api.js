import axios from "axios";

const BACKEND_BASE = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "");
export const SESSION_TOKEN_KEY = "varuna_netra_access_token";

export const api = axios.create({ baseURL: `${BACKEND_BASE}/api`, withCredentials: true });

// The normal deployment is same-origin and uses the httpOnly cookie.  A bearer
// fallback is also kept in sessionStorage so a separately hosted frontend can
// still complete the guest/login flow when the browser refuses a cross-origin
// cookie.  The token is cleared on logout and when the server rejects it.
api.interceptors.request.use((config) => {
  try {
    const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (token && !config.headers?.Authorization) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch { /* sessionStorage may be unavailable in privacy mode */ }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err.config?.url || "";
    if (err.response?.status === 401) {
      try {
        if (url.includes("/auth/")) sessionStorage.removeItem(SESSION_TOKEN_KEY);
      } catch { /* ignore storage failures */ }
      // Auth endpoints are allowed to return 401 without globally logging the
      // current user out. This prevents a failed/stale /auth request from
      // racing a successful guest login and sending the app back to /login.
      if (!url.includes("/auth/")) {
        window.dispatchEvent(new Event("sentinelmar:unauthorized"));
      }
    }
    return Promise.reject(err);
  }
);

export const apiError = (e) => {
  const status = e?.response?.status;
  const d = e?.response?.data?.detail;
  if (!e?.response) {
    // No HTTP response at all: offline, DNS, CORS or the service is still waking up.
    return e?.code === "ECONNABORTED"
      ? "The server took too long to respond. It may be waking up — try again in a few seconds."
      : "Cannot reach the server. Check your connection, or wait a few seconds if the service is waking up.";
  }
  if (!d) {
    if (status >= 500) return `The server hit an error (HTTP ${status}). Please retry in a moment; if it persists, check the service logs.`;
    return e.message || "Request failed";
  }
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(" ");
  return d.msg || String(d);
};

export const fmtTime = (iso) => (iso ? new Date(iso).toISOString().replace("T", " ").slice(0, 16) + "Z" : "—");
export const pct = (x) => `${Math.round((x || 0) * 100)}%`;

export const pollJob = async (jobId, onTick) => {
  for (let i = 0; i < 90; i++) {
    const { data } = await api.get(`/jobs/${jobId}`);
    onTick?.(data);
    if (data.status === "succeeded" || data.status === "failed") return data;
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error("job polling timed out");
};

export const ROLE_RANK = { analyst: 0, supervisor: 1, admin: 2 };
export const hasRole = (user, min) => !!user && ROLE_RANK[user.role] >= ROLE_RANK[min];
export const isGuest = (user) => user?.role === "guest";
export const isReadOnly = (user) => !!user && (user.role === "guest" || user.role === "viewer");
export const ROLE_LABEL = { guest: "Guest · read-only", viewer: "Viewer · read-only", analyst: "Analyst", supervisor: "Supervisor", admin: "Administrator" };

export const STATUS_LABEL = {
  indeterminate: "Indeterminate",
  insufficient_evidence: "Insufficient evidence",
  possible: "Possible",
  probable: "Probable",
  analyst_confirmed: "Analyst confirmed",
};

export const STATUS_STYLE = {
  possible: { color: "#C48A22", bg: "rgba(184,134,42,0.15)" },
  probable: { color: "#D9762E", bg: "rgba(217,118,46,0.18)" },
  insufficient_evidence: { color: "#7D919C", bg: "rgba(95,118,132,0.15)" },
  analyst_confirmed: { color: "#2E8B6A", bg: "rgba(46,139,106,0.15)" },
  indeterminate: { color: "#A98BDB", bg: "rgba(124,92,191,0.15)" },
};

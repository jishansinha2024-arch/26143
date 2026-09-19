import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const Ctx = createContext(null);
export const useLive = () => useContext(Ctx);

const siren = () => {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type = "square"; o.frequency.setValueAtTime(880, ac.currentTime + t); o.frequency.linearRampToValueAtTime(1320, ac.currentTime + t + 0.25);
      g.gain.setValueAtTime(0.08, ac.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t + 0.3);
      o.connect(g); g.connect(ac.destination); o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 0.3);
    });
  } catch (error) { console.warn("LiveFeed: siren audio blocked (needs user gesture)", error); }
};

export const LiveFeedProvider = ({ children }) => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [unread, setUnread] = useState(0);
  const [critical, setCritical] = useState(null);
  const [mode, setMode] = useState("idle");
  const [lastJob, setLastJob] = useState(null);
  const [muted, setMuted] = useState(() => localStorage.getItem("sm_mute") === "1");
  const sinceRef = useRef(new Date().toISOString());
  const seen = useRef(new Set());

  const onAlert = useCallback((a, notif) => {
    if (!a || seen.current.has(a.id)) return;
    seen.current.add(a.id);
    setAlerts((prev) => [{ ...a, notification: notif || a.notification }, ...prev].slice(0, 50));
    setUnread((n) => n + 1);
    const label = `${(a.kind || "high_confidence").replace("_", " ")} · ${a.case_number || ""}`;
    if (a.severity === "high") {
      setCritical(a);
      if (!muted) siren();
      toast.error(`CRITICAL ${label}`, { description: a.message, duration: 12000 });
    } else toast.warning(`Alert ${label}`, { description: a.message, duration: 8000 });
  }, [muted]);

  useEffect(() => {
    if (!user) return undefined;
    let es, poll, closed = false, failures = 0;
    const startPolling = () => {
      if (poll) return;
      setMode("polling");
      poll = setInterval(async () => {
        try {
          const { data } = await api.get("/alerts/latest", { params: { since: sinceRef.current, limit: 20 } });
          sinceRef.current = data.server_time;
          [...data.alerts].reverse().forEach((a) => onAlert(a));
        } catch (error) { console.warn("LiveFeed: /alerts/latest poll failed, will retry", error); }
      }, 10000);
    };
    const connect = () => {
      const base = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "");
      es = new EventSource(`${base}/api/alerts/stream`, { withCredentials: true });
      es.addEventListener("hello", () => { failures = 0; setMode("live"); if (poll) { clearInterval(poll); poll = null; } });
      es.addEventListener("alert", (e) => { const d = JSON.parse(e.data); sinceRef.current = d.at; onAlert(d.alert, d.notification); });
      es.addEventListener("job", (e) => { const d = JSON.parse(e.data); setLastJob(d); if (d.status === "failed") toast.error(`Job ${d.type} failed`, { description: d.error }); });
      es.onerror = () => { es.close(); failures += 1; if (failures >= 2) startPolling(); if (!closed) setTimeout(connect, Math.min(30000, 2000 * failures)); };
    };
    connect();
    return () => { closed = true; es?.close(); es = null; if (poll) { clearInterval(poll); poll = null; } };
  }, [user, onAlert]);

  const toggleMute = useCallback(() => setMuted((m) => { localStorage.setItem("sm_mute", m ? "0" : "1"); return !m; }), []);
  const clearUnread = useCallback(() => setUnread(0), []);
  const dismissCritical = useCallback(() => setCritical(null), []);
  const value = useMemo(() => ({ alerts, unread, clearUnread, critical, dismissCritical, mode, lastJob, muted, toggleMute }), [alerts, unread, clearUnread, critical, dismissCritical, mode, lastJob, muted, toggleMute]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

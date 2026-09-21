import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api, apiError } from "@/lib/api";
import { EntryScreen } from "@/components/landing/EntryScreen";

const REMEMBER_KEY = "varuna_netra_remember_email";

// Entry-screen tuning (from the redesign): "calm" nearly stills the globe.
const MOTION_LEVEL = "cinematic"; // "cinematic" | "calm"
const SPIN_SPEED = MOTION_LEVEL === "cinematic" ? 0.07 : 0.018;
const SHOW_SIGNAL_FEED = true;

/** Route component for /login — the redesigned entry screen, wired to the real auth API. */
export default function Login() {
  const { user, login, guestLogin } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState(() => { try { return localStorage.getItem(REMEMBER_KEY) || ""; } catch { return ""; } });
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [guestError, setGuestError] = useState("");
  const [caps, setCaps] = useState(null);

  useEffect(() => {
    let active = true;
    api.get("/auth/capabilities")
      .then((r) => { if (active) setCaps(r.data); })
      .catch(() => { if (active) setCaps(null); });
    return () => { active = false; };
  }, []);

  if (user) return <Navigate to={loc.state?.from || "/"} replace />;

  const explore = async () => {
    if (guestBusy) return;
    setGuestBusy(true); setGuestError("");
    try { await guestLogin(); nav(loc.state?.from || "/", { replace: true }); }
    catch (err) { setGuestError(apiError(err)); setGuestBusy(false); }
  };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setFormError("");
    try {
      if (email) { try { localStorage.setItem(REMEMBER_KEY, email); } catch { /* storage may be unavailable */ } }
      const u = await login(email, password);
      toast.success(`Signed in as ${u.name} (${u.role})`);
      nav(loc.state?.from || "/", { replace: true });
    } catch (err) { setFormError(apiError(err)); setBusy(false); }
  };

  const googleReady = caps?.authentication?.google?.enabled === true;
  const googleSignIn = () => {
    const redirectUrl = window.location.origin + "/";
    const base = process.env.REACT_APP_GOOGLE_AUTH_URL || `${(process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "")}/api/auth/google`;
    window.location.href = `${base}?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <EntryScreen
      spinSpeed={SPIN_SPEED}
      showSignalFeed={SHOW_SIGNAL_FEED}
      onGuest={explore}
      guestBusy={guestBusy}
      guestError={guestError}
      onGoogle={googleReady ? googleSignIn : undefined}
      onOpenSignIn={() => { setFormError(""); setGuestError(""); }}
      access={{
        onSubmit: submit,
        busy,
        error: formError,
        email,
        onEmailChange: setEmail,
        password,
        onPasswordChange: setPassword,
      }}
    />
  );
}

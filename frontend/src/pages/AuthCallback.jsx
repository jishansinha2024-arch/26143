import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiError } from "@/lib/api";

export default function AuthCallback() {
  const { loginWithGoogleSession } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const done = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const sid = new URLSearchParams(loc.hash.replace(/^#/, "")).get("session_id");
    window.history.replaceState(null, "", loc.pathname);
    if (!sid) { setError("Google sign-in did not return a session."); return; }
    loginWithGoogleSession(sid).then(() => nav("/", { replace: true })).catch((e) => setError(apiError(e)));
  }, [loc, loginWithGoogleSession, nav]);

  return (
    <div className="grid h-screen place-items-center p-6" style={{ background: "var(--bg-primary)" }} data-testid="auth-callback">
      {!error ? <p className="font-mono text-xs text-slate-400" data-testid="auth-callback-busy">Completing Google sign-in…</p> : (
        <div className="panel max-w-md p-6 text-center">
          <p className="text-sm" style={{ color: "#ba1a1a" }} data-testid="auth-callback-error">{error}</p>
          <Link to="/login" className="mt-4 inline-block font-mono text-[11px] uppercase tracking-wider text-cyan-300" data-testid="auth-callback-back">Back to sign in</Link>
        </div>
      )}
    </div>
  );
}

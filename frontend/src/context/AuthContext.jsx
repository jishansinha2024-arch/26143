import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, SESSION_TOKEN_KEY } from "@/lib/api";

const AuthCtx = createContext(null);

const saveSessionToken = (token) => {
  if (!token) return;
  try { sessionStorage.setItem(SESSION_TOKEN_KEY, token); } catch { /* ignore storage failures */ }
};

const clearSessionToken = () => {
  try { sessionStorage.removeItem(SESSION_TOKEN_KEY); } catch { /* ignore storage failures */ }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null = checking, false = anonymous
  const authEpoch = useRef(0);

  useEffect(() => {
    // Returning from Google OAuth: AuthCallback exchanges the session_id first,
    // so skip the /me probe here. Also protect the probe from racing a user
    // action (guest/login/signup) that starts immediately after page load.
    if (window.location.hash?.includes("session_id=")) return undefined;

    const epochAtStart = authEpoch.current;
    let active = true;
    api.get("/auth/me")
      .then((r) => {
        if (active && authEpoch.current === epochAtStart) setUser(r.data);
      })
      .catch(() => {
        if (active && authEpoch.current === epochAtStart) setUser(false);
      });

    const onUnauth = () => {
      authEpoch.current += 1;
      clearSessionToken();
      setUser(false);
    };
    window.addEventListener("sentinelmar:unauthorized", onUnauth);
    return () => {
      active = false;
      window.removeEventListener("sentinelmar:unauthorized", onUnauth);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    authEpoch.current += 1;
    const { data } = await api.post("/auth/login", { email, password });
    saveSessionToken(data.access_token);
    // Verify the cookie/bearer session before telling the router that auth is ready.
    const session = await api.get("/auth/me");
    setUser(session.data);
    return session.data;
  }, []);

  const guestLogin = useCallback(async () => {
    authEpoch.current += 1;
    const { data } = await api.post("/auth/guest");
    saveSessionToken(data.access_token);
    // This also makes the flow work when the frontend and backend are deployed
    // separately and the browser does not retain the cross-origin cookie.
    const session = await api.get("/auth/me");
    setUser(session.data);
    return session.data;
  }, []);

  const signup = useCallback(async (payload) => {
    authEpoch.current += 1;
    const { data } = await api.post("/auth/signup", payload);
    saveSessionToken(data.access_token);
    const session = await api.get("/auth/me");
    setUser(session.data);
    return session.data;
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get("/auth/me");
    setUser(data);
    return data;
  }, []);

  const loginWithGoogleSession = useCallback(async (sessionId) => {
    authEpoch.current += 1;
    const { data } = await api.post("/auth/google/session", { session_id: sessionId });
    saveSessionToken(data.access_token);
    const session = await api.get("/auth/me");
    setUser(session.data);
    return session.data;
  }, []);

  const logout = useCallback(async () => {
    authEpoch.current += 1;
    try { await api.post("/auth/logout"); } catch (error) { console.warn("AuthContext: server logout failed, clearing local session anyway", error); }
    clearSessionToken();
    setUser(false);
  }, []);

  const value = useMemo(() => ({ user, login, guestLogin, signup, refreshUser, loginWithGoogleSession, logout }), [user, login, guestLogin, signup, refreshUser, loginWithGoogleSession, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => useContext(AuthCtx);

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const AUTH_KEY = "ss_auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { localStorage.removeItem(AUTH_KEY); return null; }
  });

  const user = auth?.user ?? null;
  const token = auth?.token ?? null;

  const login = useCallback((payload) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
    setAuth(payload);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setAuth(null);
  }, []);

  const value = useMemo(() => ({ auth, user, token, login, logout }), [auth, user, token, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

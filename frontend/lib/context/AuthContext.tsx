"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { User, LoginPayload } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true";
const STORAGE_KEY = "aapstart_user";
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const LAST_ACTIVITY_KEY = "aapstart_last_activity";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------- Inactivity auto-logout ----------

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
  }, []);

  const performAutoLogout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    setUser(null);
    fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    window.location.href = "/login";
  }, []);

  const resetInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    inactivityTimer.current = setTimeout(performAutoLogout, INACTIVITY_TIMEOUT_MS);
  }, [clearInactivityTimer, performAutoLogout]);

  // Set up activity listeners when a user is logged in
  useEffect(() => {
    if (!user) {
      clearInactivityTimer();
      return;
    }

    // Check if the session already expired while the tab/browser was closed
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        performAutoLogout();
        return;
      }
      // Start timer with remaining time
      inactivityTimer.current = setTimeout(
        performAutoLogout,
        INACTIVITY_TIMEOUT_MS - elapsed,
      );
    } else {
      // First activity stamp
      resetInactivityTimer();
    }

    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    const handleActivity = () => resetInactivityTimer();
    events.forEach((e) => window.addEventListener(e, handleActivity));

    return () => {
      clearInactivityTimer();
      events.forEach((e) => window.removeEventListener(e, handleActivity));
    };
  }, [user, clearInactivityTimer, resetInactivityTimer, performAutoLogout]);

  // ---------- Hydrate user from localStorage ----------

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        // Check if session expired while browser was closed
        const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
        if (lastActivity) {
          const elapsed = Date.now() - parseInt(lastActivity, 10);
          if (elapsed >= INACTIVITY_TIMEOUT_MS) {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LAST_ACTIVITY_KEY);
            setLoading(false);
            return;
          }
        }
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    // Dev bypass: skip API call entirely, create a local-only user
    if (DEV_AUTH_BYPASS) {
      const devUser: User = {
        employee_id: payload.employee_id,
        first_name: payload.first_name,
        last_name: payload.last_name,
        full_name: `${payload.first_name} ${payload.last_name}`.trim(),
        track: "administrative",
        is_admin: false,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(devUser));
      setUser(devUser);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Request timed out — is the backend running?");
      }
      throw new Error("Cannot reach the server. Make sure the backend is running on port 8000.");
    }
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail ?? "Login failed");
    }

    const data = await res.json();
    const loggedInUser: User = {
      employee_id: data.employee_id ?? payload.employee_id,
      first_name: data.first_name ?? payload.first_name,
      last_name: data.last_name ?? payload.last_name,
      full_name: data.full_name ?? `${payload.first_name} ${payload.last_name}`.trim(),
      track: data.track ?? "administrative",
      is_admin: data.is_admin ?? false,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(async () => {
    clearInactivityTimer();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    setUser(null);
    // Fire backend logout as best-effort, don't wait for it
    fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    window.location.href = "/login";
  }, [clearInactivityTimer]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

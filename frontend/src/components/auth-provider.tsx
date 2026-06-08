"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  clearSession,
  loadSession,
  saveSession,
  type SessionUser,
} from "@/lib/session";

type AuthContextValue = {
  user: SessionUser | null;
  ready: boolean;
  setUser: (u: SessionUser | null) => void;
  login: (u: SessionUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setUserState(loadSession());
    setReady(true);
  }, []);

  const setUser = useCallback((u: SessionUser | null) => {
    if (u) saveSession(u);
    else clearSession();
    setUserState(u);
  }, []);

  const login = useCallback(
    (u: SessionUser) => {
      saveSession(u);
      setUserState(u);
    },
    []
  );

  const logout = useCallback(() => {
    clearSession();
    setUserState(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      ready,
      setUser,
      login,
      logout,
    }),
    [user, ready, setUser, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

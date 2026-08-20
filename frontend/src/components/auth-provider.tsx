"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import type { SessionUser } from "@/lib/session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return <>{children}</>;
}

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const ready = useAuthStore((state) => state.ready);
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);
  const login = useAuthStore((state) => state.login);
  const logoutStore = useAuthStore((state) => state.logout);
  const router = useRouter();

  const logout = useCallback(() => {
    logoutStore();
    router.push("/login");
  }, [logoutStore, router]);

  return {
    user,
    ready,
    status,
    isAuthenticated,
    setUser,
    login,
    logout,
  };
}

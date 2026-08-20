"use client";

import { create } from "zustand";
import {
  clearSession,
  loadSession,
  saveSession,
  type SessionUser,
} from "@/lib/session";
import { api } from "@/lib/api";
import { disconnectSocket } from "@/lib/socket";

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

export interface AuthState {
  user: SessionUser | null;
  ready: boolean;
  status: AuthStatus;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  setUser: (user: SessionUser | null) => void;
  login: (user: SessionUser) => void;
  logout: () => void;
  initialize: () => void;
  syncUser: () => Promise<void>;
  updateUser: (partial: Partial<SessionUser>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  ready: false,
  status: "idle",
  isAuthenticated: false,
  error: null,

  setUser: (user: SessionUser | null) => {
    if (user) {
      saveSession(user);
      set({
        user,
        ready: true,
        status: "authenticated",
        isAuthenticated: true,
        error: null,
      });
    } else {
      clearSession();
      set({
        user: null,
        ready: true,
        status: "unauthenticated",
        isAuthenticated: false,
        error: null,
      });
    }
  },

  login: (user: SessionUser) => {
    saveSession(user);
    set({
      user,
      ready: true,
      status: "authenticated",
      isAuthenticated: true,
      error: null,
    });
  },

  logout: () => {
    disconnectSocket();
    clearSession();
    set({
      user: null,
      ready: true,
      status: "unauthenticated",
      isAuthenticated: false,
      error: null,
    });
  },

  updateUser: (partial: Partial<SessionUser>) => {
    const currentUser = get().user;
    if (!currentUser) return;
    const updated = { ...currentUser, ...partial };
    saveSession(updated);
    set({ user: updated });
  },

  syncUser: async () => {
    const currentUser = get().user;
    if (!currentUser) return;

    try {
      const data = await api.get<{
        userId: string;
        tenantId: string;
        role: "ADMIN" | "AGENT";
        employeeId?: string | null;
        routingMode?: "DEPARTMENT" | "EMPLOYEE";
        tenantName?: string;
      }>("/api/auth/me");

      if (data && data.userId && data.tenantId) {
        const updatedSession: SessionUser = {
          userId: data.userId,
          tenantId: data.tenantId,
          role: data.role,
          employeeId: data.employeeId || currentUser.employeeId || undefined,
          routingMode: data.routingMode || currentUser.routingMode || "DEPARTMENT",
          tenantName: data.tenantName || currentUser.tenantName || "",
        };
        saveSession(updatedSession);
        set({
          user: updatedSession,
          isAuthenticated: true,
          status: "authenticated",
        });
      }
    } catch (err: unknown) {
      console.warn("[AuthStore Sync Warning]:", err);
    }
  },

  initialize: () => {
    if (get().ready) return;

    set({ status: "loading" });
    const initialSession = loadSession();

    if (initialSession) {
      set({
        user: initialSession,
        ready: true,
        status: "authenticated",
        isAuthenticated: true,
      });
      // Background sync with backend
      get().syncUser();
    } else {
      set({
        user: null,
        ready: true,
        status: "unauthenticated",
        isAuthenticated: false,
      });
    }
  },
}));

"use client";

import { create } from "zustand";

export interface NotificationItem {
  id: string;
  complaintId: string;
  title: string;
  message: string;
  priority?: string;
  customerName?: string;
  timestamp: string;
  read: boolean;
}

export interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  activeUserId: string | null;

  // Actions
  initializeForUser: (userId: string) => void;
  addNotification: (item: Omit<NotificationItem, "id" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const STORAGE_PREFIX = "sf_notifications_";

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  activeUserId: null,

  initializeForUser: (userId: string) => {
    if (!userId || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
      let list: NotificationItem[] = [];
      if (raw) {
        list = JSON.parse(raw);
      }
      const unread = list.filter((n) => !n.read).length;
      set({ notifications: list, unreadCount: unread, activeUserId: userId });
    } catch (e) {
      console.warn("Failed loading notifications from storage:", e);
    }
  },

  addNotification: (item) => {
    const newNotif: NotificationItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      read: false,
    };

    const currentList = get().notifications;
    // Check if notification for same complaintId already exists recently to avoid duplicate toasts
    const exists = currentList.some(
      (n) => n.complaintId === item.complaintId && n.timestamp === item.timestamp
    );
    if (exists) return;

    const next = [newNotif, ...currentList].slice(0, 50); // Keep last 50
    const unread = next.filter((n) => !n.read).length;

    set({ notifications: next, unreadCount: unread });

    const userId = get().activeUserId;
    if (userId && typeof window !== "undefined") {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(next));
      } catch (e) {}
    }
  },

  markAsRead: (id: string) => {
    const next = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    const unread = next.filter((n) => !n.read).length;
    set({ notifications: next, unreadCount: unread });

    const userId = get().activeUserId;
    if (userId && typeof window !== "undefined") {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(next));
      } catch (e) {}
    }
  },

  markAllAsRead: () => {
    const next = get().notifications.map((n) => ({ ...n, read: true }));
    set({ notifications: next, unreadCount: 0 });

    const userId = get().activeUserId;
    if (userId && typeof window !== "undefined") {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(next));
      } catch (e) {}
    }
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 });
    const userId = get().activeUserId;
    if (userId && typeof window !== "undefined") {
      try {
        localStorage.removeItem(`${STORAGE_PREFIX}${userId}`);
      } catch (e) {}
    }
  },
}));

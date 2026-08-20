"use client";

import { create } from "zustand";

export interface AppState {
  sidebarOpen: boolean;
  activeFilterPriority: string | null;
  activeFilterStatus: string | null;
  searchQuery: string;
  unreadCount: number;

  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setFilterPriority: (priority: string | null) => void;
  setFilterStatus: (status: string | null) => void;
  setSearchQuery: (query: string) => void;
  setUnreadCount: (count: number) => void;
  resetFilters: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: false,
  activeFilterPriority: null,
  activeFilterStatus: null,
  searchQuery: "",
  unreadCount: 0,

  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setFilterPriority: (priority: string | null) =>
    set({ activeFilterPriority: priority }),
  setFilterStatus: (status: string | null) => set({ activeFilterStatus: status }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setUnreadCount: (count: number) => set({ unreadCount: count }),
  resetFilters: () =>
    set({
      activeFilterPriority: null,
      activeFilterStatus: null,
      searchQuery: "",
    }),
}));

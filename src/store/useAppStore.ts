import { create } from "zustand";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  agency_name: string;
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  activeModule: string;
  setActiveModule: (module: string) => void;
  viewMode: "table" | "cards";
  setViewMode: (mode: "table" | "cards") => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isGlobalSearch: boolean;
  setIsGlobalSearch: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  activeModule: "emails",
  setActiveModule: (activeModule) => set({ activeModule }),
  viewMode: "table",
  setViewMode: (viewMode) => set({ viewMode }),
  searchQuery: "",
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  isGlobalSearch: false,
  setIsGlobalSearch: (isGlobalSearch) => set({ isGlobalSearch }),
}));

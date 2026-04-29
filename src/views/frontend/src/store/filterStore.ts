import { create } from "zustand";

interface FilterState {
  company: string;
  location: string;
  skill: string;
  seniority: string;
  category: string;
  search: string;
  page: number;
  perPage: number;
  setFilter: (key: "company" | "location" | "skill" | "seniority" | "category" | "search", value: string) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
}

const DEFAULTS = {
  company: "",
  location: "",
  skill: "",
  seniority: "",
  category: "",
  search: "",
  page: 1,
  perPage: 20,
};

export const useFilterStore = create<FilterState>((set) => ({
  ...DEFAULTS,
  setFilter: (key, value) => set({ [key]: value, page: 1 }),
  setPage: (page) => set({ page }),
  resetFilters: () => set(DEFAULTS),
}));

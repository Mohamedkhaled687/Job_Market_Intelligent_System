import { create } from "zustand";

type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && systemDark);
  root.classList.toggle("dark", isDark);
}

const stored = (typeof localStorage !== "undefined" ? localStorage.getItem("theme") : null) as Theme | null;
const initial: Theme = stored || "system";
if (typeof document !== "undefined") applyTheme(initial);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initial,
  setTheme: (theme) => {
    localStorage.setItem("theme", theme);
    applyTheme(theme);
    set({ theme });
  },
}));

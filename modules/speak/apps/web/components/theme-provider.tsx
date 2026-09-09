"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";
// Tương thích ngược cho các hook/component cũ nếu có
export type JapaneseThemeId = Theme | "matcha" | "aizome" | "kohaku" | "haru";
export type LegacyTheme = "light" | "dark";

export interface ThemeMeta {
  id: Theme;
  name: string;
  isDark: boolean;
}

interface ThemeContextValue {
  theme: Theme;
  legacyTheme: LegacyTheme;
  isDark: boolean;
  setTheme: (t: Theme | string) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  legacyTheme: "dark",
  isDark: true,
  setTheme: () => {},
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function normalizeTheme(val: string | null): Theme {
  if (!val) return "dark";
  if (val === "light" || val === "haru") return "light";
  return "dark";
}

function applyThemeClasses(themeMode: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const allThemeClasses = [
    "theme-haru",
    "theme-matcha",
    "theme-kyoto",
    "theme-tokyo",
    "theme-aizome",
    "theme-kohaku",
    "dark",
    "light",
  ];
  root.classList.remove(...allThemeClasses);

  if (themeMode === "light") {
    root.classList.add("light");
  } else {
    root.classList.add("dark");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("hanasu-theme");
    const normalized = normalizeTheme(stored);
    setThemeState(normalized);
    applyThemeClasses(normalized);
    setMounted(true);
  }, []);

  const setTheme = useCallback((t: Theme | string) => {
    const normalized = normalizeTheme(t);
    setThemeState(normalized);
    localStorage.setItem("hanasu-theme", normalized);
    applyThemeClasses(normalized);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  const isDark = theme === "dark";

  return (
    <ThemeContext.Provider
      value={{
        theme,
        legacyTheme: theme,
        isDark,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}


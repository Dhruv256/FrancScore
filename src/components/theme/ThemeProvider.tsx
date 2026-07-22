/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type AppTheme = "light" | "dark";
export type ThemeChoice = AppTheme | "system";
const STORAGE_KEY = "francscore_theme_v1";
const ThemeContext = createContext<{ theme: AppTheme; choice: ThemeChoice; setTheme: (theme: ThemeChoice) => void }>({ theme: "light", choice: "system", setTheme: () => undefined });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("light");
  const [choice, setChoice] = useState<ThemeChoice>("system");
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeChoice | null;
    const nextChoice = saved === "dark" || saved === "light" || saved === "system" ? saved : "system";
    const next = nextChoice === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : nextChoice;
    setChoice(nextChoice); setThemeState(next); document.documentElement.dataset.theme = next;
  }, []);
  const setTheme = (nextChoice: ThemeChoice) => { const next = nextChoice === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : nextChoice; setChoice(nextChoice); setThemeState(next); document.documentElement.dataset.theme = next; window.localStorage.setItem(STORAGE_KEY, nextChoice); };
  return <ThemeContext.Provider value={{ theme, choice, setTheme }}>{children}</ThemeContext.Provider>;
}
export function useTheme() { return useContext(ThemeContext); }

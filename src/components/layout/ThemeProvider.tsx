"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { Gender, ThemeColors, ThemeContextValue } from "@/types";
import { MALE_THEME, FEMALE_THEME } from "@/lib/theme-config";

const NEUTRAL_THEME: ThemeColors = {
  background: "#f5f5f5",
  foreground: "#1a1a2e",
  accent: "#6b7280",
  muted: "#e5e7eb",
};

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultGender?: Gender | null;
}

export function ThemeProvider({ children, defaultGender = null }: ThemeProviderProps) {
  const [gender, setGenderState] = useState<Gender | null>(defaultGender);

  const theme = useMemo<ThemeColors>(() => {
    if (gender === "male") return MALE_THEME;
    if (gender === "female") return FEMALE_THEME;
    return NEUTRAL_THEME;
  }, [gender]);

  const setGender = useCallback((newGender: Gender) => {
    setGenderState(newGender);
  }, []);

  // Sync data-theme attribute on the root element
  useEffect(() => {
    if (gender) {
      document.documentElement.setAttribute("data-theme", gender);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [gender]);

  const value = useMemo<ThemeContextValue>(
    () => ({ gender, setGender, theme }),
    [gender, setGender, theme]
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

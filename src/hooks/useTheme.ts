"use client";

import { useContext } from "react";
import { ThemeContext } from "@/components/layout/ThemeProvider";
import type { ThemeContextValue } from "@/types";

/**
 * Hook to access the current theme context.
 * Must be used within a ThemeProvider.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

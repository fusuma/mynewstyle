import type { ThemeColors } from "@/types";

/**
 * Male theme colors - Dark mode with charcoal, amber, cream
 */
export const MALE_THEME: ThemeColors = {
  background: "#1A1A2E",
  accent: "#F5A623",
  foreground: "#FAF3E0",
  muted: "#2D2D3A",
};

/**
 * Female theme colors - Light mode with warm white, dusty rose, charcoal
 */
export const FEMALE_THEME: ThemeColors = {
  background: "#FFF8F0",
  accent: "#A85C60",
  foreground: "#2D2D3A",
  muted: "#F5E6D3",
};

/**
 * Spacing system based on 4px base unit
 */
export const SPACING = {
  "1": "4px",
  "2": "8px",
  "3": "12px",
  "4": "16px",
  "6": "24px",
  "8": "32px",
  "12": "48px",
  "16": "64px",
  "24": "96px",
} as const;

/**
 * Border radius tokens
 */
export const RADIUS = {
  card: "16px",
  button: "12px",
  badge: "8px",
} as const;

/**
 * Shadow tokens
 */
export const SHADOWS = {
  card: "0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)",
  elevated: "0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)",
  "preview-image": "0 4px 16px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)",
} as const;

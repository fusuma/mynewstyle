import { describe, it, expect } from "vitest";
import { MALE_THEME, FEMALE_THEME, SPACING, RADIUS, SHADOWS } from "@/lib/theme-config";

describe("Theme Configuration", () => {
  describe("Male Theme Colors", () => {
    it("should define background as charcoal #1A1A2E", () => {
      expect(MALE_THEME.background).toBe("#1A1A2E");
    });

    it("should define accent as amber #F5A623", () => {
      expect(MALE_THEME.accent).toBe("#F5A623");
    });

    it("should define foreground as cream #FAF3E0", () => {
      expect(MALE_THEME.foreground).toBe("#FAF3E0");
    });

    it("should define muted as #2D2D3A", () => {
      expect(MALE_THEME.muted).toBe("#2D2D3A");
    });
  });

  describe("Female Theme Colors", () => {
    it("should define background as warm white #FFF8F0", () => {
      expect(FEMALE_THEME.background).toBe("#FFF8F0");
    });

    it("should define accent as dusty rose #A85C60 (WCAG AA accessible)", () => {
      expect(FEMALE_THEME.accent).toBe("#A85C60");
    });

    it("should define foreground as charcoal #2D2D3A", () => {
      expect(FEMALE_THEME.foreground).toBe("#2D2D3A");
    });

    it("should define muted as #F5E6D3", () => {
      expect(FEMALE_THEME.muted).toBe("#F5E6D3");
    });
  });

  describe("Spacing System", () => {
    it("should use 4px base unit", () => {
      expect(SPACING["1"]).toBe("4px");
    });

    it("should define all spacing scale values", () => {
      expect(SPACING["2"]).toBe("8px");
      expect(SPACING["3"]).toBe("12px");
      expect(SPACING["4"]).toBe("16px");
      expect(SPACING["6"]).toBe("24px");
      expect(SPACING["8"]).toBe("32px");
      expect(SPACING["12"]).toBe("48px");
      expect(SPACING["16"]).toBe("64px");
      expect(SPACING["24"]).toBe("96px");
    });
  });

  describe("Border Radius Tokens", () => {
    it("should define card radius as 16px", () => {
      expect(RADIUS.card).toBe("16px");
    });

    it("should define button radius as 12px", () => {
      expect(RADIUS.button).toBe("12px");
    });

    it("should define badge radius as 8px", () => {
      expect(RADIUS.badge).toBe("8px");
    });
  });

  describe("Shadow Tokens", () => {
    it("should define card shadow", () => {
      expect(SHADOWS.card).toBeDefined();
      expect(typeof SHADOWS.card).toBe("string");
    });

    it("should define elevated shadow", () => {
      expect(SHADOWS.elevated).toBeDefined();
      expect(typeof SHADOWS.elevated).toBe("string");
    });

    it("should define preview-image shadow", () => {
      expect(SHADOWS["preview-image"]).toBeDefined();
      expect(typeof SHADOWS["preview-image"]).toBe("string");
    });
  });
});

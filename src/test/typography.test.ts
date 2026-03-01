import { describe, it, expect } from "vitest";
import { TYPOGRAPHY } from "@/lib/typography";

describe("Typography Configuration", () => {
  it("should define display role with 32/48px sizes", () => {
    expect(TYPOGRAPHY.display).toBeDefined();
    expect(TYPOGRAPHY.display.fontSize).toContain("32px");
  });

  it("should define heading role with 24/32px sizes", () => {
    expect(TYPOGRAPHY.heading).toBeDefined();
    expect(TYPOGRAPHY.heading.fontSize).toContain("24px");
  });

  it("should define subheading role with 18/22px sizes", () => {
    expect(TYPOGRAPHY.subheading).toBeDefined();
    expect(TYPOGRAPHY.subheading.fontSize).toContain("18px");
  });

  it("should define body role with 16px size", () => {
    expect(TYPOGRAPHY.body).toBeDefined();
    expect(TYPOGRAPHY.body.fontSize).toBe("16px");
  });

  it("should define caption role with 13/14px sizes", () => {
    expect(TYPOGRAPHY.caption).toBeDefined();
    expect(TYPOGRAPHY.caption.fontSize).toContain("13px");
  });

  it("should define badge role with 12px size", () => {
    expect(TYPOGRAPHY.badge).toBeDefined();
    expect(TYPOGRAPHY.badge.fontSize).toBe("12px");
  });

  it("should map display font to Space Grotesk", () => {
    expect(TYPOGRAPHY.display.fontFamily).toContain("Space Grotesk");
  });

  it("should map heading font to Space Grotesk", () => {
    expect(TYPOGRAPHY.heading.fontFamily).toContain("Space Grotesk");
  });

  it("should map body font to Inter", () => {
    expect(TYPOGRAPHY.body.fontFamily).toContain("Inter");
  });

  it("should map caption font to Inter", () => {
    expect(TYPOGRAPHY.caption.fontFamily).toContain("Inter");
  });
});

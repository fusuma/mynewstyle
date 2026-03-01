import { describe, it, expect } from "vitest";
import {
  microTransition,
  pageTransition,
  loadingTransition,
  resultsRevealContainer,
  resultsRevealItem,
  getReducedMotionTransition,
} from "@/lib/motion";

describe("Motion Tokens", () => {
  describe("Micro transition", () => {
    it("should have 0.2s duration", () => {
      expect(microTransition.duration).toBe(0.2);
    });

    it("should use easeOut ease", () => {
      expect(microTransition.ease).toBe("easeOut");
    });
  });

  describe("Page transition", () => {
    it("should have 0.35s duration", () => {
      expect(pageTransition.duration).toBe(0.35);
    });

    it("should use easeInOut ease", () => {
      expect(pageTransition.ease).toBe("easeInOut");
    });
  });

  describe("Loading transition", () => {
    it("should have 1.5s duration", () => {
      expect(loadingTransition.duration).toBe(1.5);
    });

    it("should repeat infinitely", () => {
      expect(loadingTransition.repeat).toBe(Infinity);
    });
  });

  describe("Results reveal", () => {
    it("should stagger children at 150ms (0.15s)", () => {
      expect(resultsRevealContainer.staggerChildren).toBe(0.15);
    });

    it("should define item animation properties", () => {
      expect(resultsRevealItem.hidden).toBeDefined();
      expect(resultsRevealItem.visible).toBeDefined();
    });
  });

  describe("Reduced motion", () => {
    it("should return zero-duration transition when reduced motion preferred", () => {
      const reduced = getReducedMotionTransition(true);
      expect(reduced.duration).toBe(0);
    });

    it("should return original transition when reduced motion not preferred", () => {
      const original = getReducedMotionTransition(false);
      expect(original.duration).toBeGreaterThan(0);
    });
  });
});

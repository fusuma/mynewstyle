import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ============================================================
// Mock framer-motion
// ============================================================
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, transition, whileTap, ...htmlProps } = props;
      return <div {...htmlProps}>{children}</div>;
    },
  },
  useReducedMotion: () => false,
}));

// ============================================================
// Tests
// ============================================================
describe("SessionRecoveryBanner component", () => {
  const defaultProps = {
    onUseRecovered: vi.fn(),
    onRetake: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ----------------------------------------------------------
  // 1. Renders recovery message in Portuguese
  // ----------------------------------------------------------
  it("renders recovery message in Portuguese", async () => {
    const { SessionRecoveryBanner } =
      await import("@/components/consultation/SessionRecoveryBanner");
    render(<SessionRecoveryBanner {...defaultProps} />);

    expect(screen.getByText("Encontramos a sua foto anterior")).toBeInTheDocument();
    expect(screen.getByText("Deseja continuar com esta foto?")).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // 2. Calls onUseRecovered when "Continuar" clicked
  // ----------------------------------------------------------
  it('calls onUseRecovered when "Continuar" clicked', async () => {
    const onUseRecovered = vi.fn();
    const { SessionRecoveryBanner } =
      await import("@/components/consultation/SessionRecoveryBanner");
    render(<SessionRecoveryBanner onUseRecovered={onUseRecovered} onRetake={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Continuar/i }));
    expect(onUseRecovered).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------------
  // 3. Calls onRetake when "Tirar outra foto" clicked
  // ----------------------------------------------------------
  it('calls onRetake when "Tirar outra foto" clicked', async () => {
    const onRetake = vi.fn();
    const { SessionRecoveryBanner } =
      await import("@/components/consultation/SessionRecoveryBanner");
    render(<SessionRecoveryBanner onUseRecovered={vi.fn()} onRetake={onRetake} />);

    fireEvent.click(screen.getByRole("button", { name: /Tirar outra foto/i }));
    expect(onRetake).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------------
  // 4. Uses theme CSS variables (no hardcoded hex)
  // ----------------------------------------------------------
  it("uses theme CSS variables (no hardcoded hex)", async () => {
    const { SessionRecoveryBanner } =
      await import("@/components/consultation/SessionRecoveryBanner");
    const { container } = render(<SessionRecoveryBanner {...defaultProps} />);

    // Check that no inline styles with hex colors exist
    const allElements = container.querySelectorAll("*");
    allElements.forEach((el) => {
      const style = el.getAttribute("style");
      if (style) {
        expect(style).not.toMatch(/#[0-9a-fA-F]{3,8}/);
      }
    });

    // Check that Tailwind theme classes are used
    const html = container.innerHTML;
    expect(html).toMatch(/bg-background|bg-accent|text-foreground|text-accent/);
  });

  // ----------------------------------------------------------
  // 5. ARIA labels on interactive elements
  // ----------------------------------------------------------
  it("has ARIA labels on interactive elements", async () => {
    const { SessionRecoveryBanner } =
      await import("@/components/consultation/SessionRecoveryBanner");
    render(<SessionRecoveryBanner {...defaultProps} />);

    const continueBtn = screen.getByRole("button", { name: /Continuar/i });
    const retakeBtn = screen.getByRole("button", {
      name: /Tirar outra foto/i,
    });

    expect(continueBtn).toBeInTheDocument();
    expect(retakeBtn).toBeInTheDocument();

    // Check that the banner has a role for accessibility
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // 6. Minimum 48px touch targets on buttons
  // ----------------------------------------------------------
  it("has minimum 48px touch targets on buttons", async () => {
    const { SessionRecoveryBanner } =
      await import("@/components/consultation/SessionRecoveryBanner");
    const { container } = render(<SessionRecoveryBanner {...defaultProps} />);

    const buttons = container.querySelectorAll("button");
    buttons.forEach((btn) => {
      // Check for min-h-[48px] Tailwind class
      expect(btn.className).toMatch(/min-h-\[48px\]/);
    });
  });
});

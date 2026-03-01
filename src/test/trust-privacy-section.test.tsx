import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { TrustPrivacySection } from "@/components/landing/TrustPrivacySection";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe("TrustPrivacySection", () => {
  it("renders privacy messaging text", () => {
    renderWithTheme(<TrustPrivacySection />);
    expect(
      screen.getByText(
        /A sua foto é processada com segurança e nunca é partilhada/
      )
    ).toBeInTheDocument();
  });

  it("renders supporting privacy text about encryption and deletion", () => {
    renderWithTheme(<TrustPrivacySection />);
    expect(
      screen.getByText(
        /Utilizamos encriptação de ponta e eliminamos fotos após 90 dias/
      )
    ).toBeInTheDocument();
  });

  it("renders Shield icon with aria-hidden for accessibility", () => {
    renderWithTheme(<TrustPrivacySection />);
    const section = screen.getByTestId("trust-privacy-section");
    const icons = section.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThanOrEqual(1);
    const shieldIcon = icons[0];
    expect(shieldIcon).toHaveAttribute("aria-hidden", "true");
  });

  it("renders a link to /privacidade with correct href", () => {
    renderWithTheme(<TrustPrivacySection />);
    const link = screen.getByRole("link", {
      name: /Leia a nossa política de privacidade/,
    });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/privacidade");
  });

  it("renders social proof text with placeholder count '500+'", () => {
    renderWithTheme(<TrustPrivacySection />);
    expect(
      screen.getByText(/500\+/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/pessoas a encontrar o seu estilo/)
    ).toBeInTheDocument();
  });

  it("has id='trust' for anchor navigation", () => {
    renderWithTheme(<TrustPrivacySection />);
    const section = screen.getByTestId("trust-privacy-section");
    expect(section).toHaveAttribute("id", "trust");
  });

  it("has data-testid='trust-privacy-section'", () => {
    renderWithTheme(<TrustPrivacySection />);
    const section = screen.getByTestId("trust-privacy-section");
    expect(section).toBeInTheDocument();
  });

  it("renders without errors in neutral theme", () => {
    const { container } = renderWithTheme(<TrustPrivacySection />);
    expect(container.firstChild).toBeTruthy();
  });

  it("all icons have aria-hidden='true' for accessibility", () => {
    renderWithTheme(<TrustPrivacySection />);
    const section = screen.getByTestId("trust-privacy-section");
    const icons = section.querySelectorAll("svg");
    icons.forEach((icon) => {
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("uses semantic section element", () => {
    renderWithTheme(<TrustPrivacySection />);
    const section = screen.getByTestId("trust-privacy-section");
    expect(section.tagName).toBe("SECTION");
  });

  it("privacy policy link has proper accessible name", () => {
    renderWithTheme(<TrustPrivacySection />);
    const link = screen.getByRole("link", {
      name: /Leia a nossa política de privacidade/,
    });
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe("A");
  });

  it("respects prefers-reduced-motion by using useReducedMotion hook", async () => {
    // Mock matchMedia to report prefers-reduced-motion: reduce
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    renderWithTheme(<TrustPrivacySection />);
    // Component should still render all content even with reduced motion
    expect(
      screen.getByText(
        /A sua foto é processada com segurança e nunca é partilhada/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/500\+/)
    ).toBeInTheDocument();

    // Restore original matchMedia
    window.matchMedia = originalMatchMedia;
  });
});

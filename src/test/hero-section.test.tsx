import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { HeroSection } from "@/components/landing/HeroSection";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe("HeroSection", () => {
  it("renders the headline text", () => {
    renderWithTheme(<HeroSection />);
    expect(
      screen.getByText("Descubra o corte perfeito para o seu rosto")
    ).toBeInTheDocument();
  });

  it("renders the subheadline text", () => {
    renderWithTheme(<HeroSection />);
    expect(
      screen.getByText(
        /Consultoria de visagismo com IA.*personalizada em 3 minutos/
      )
    ).toBeInTheDocument();
  });

  it("renders the CTA button with correct text", () => {
    renderWithTheme(<HeroSection />);
    const cta = screen.getByRole("link", { name: /Comecar Agora/i });
    expect(cta).toBeInTheDocument();
  });

  it("CTA button links to /start", () => {
    renderWithTheme(<HeroSection />);
    const cta = screen.getByRole("link", { name: /Comecar Agora/i });
    expect(cta).toHaveAttribute("href", "/start");
  });

  it("renders social proof text", () => {
    renderWithTheme(<HeroSection />);
    expect(
      screen.getByText(/Ja ajudamos.*pessoas a encontrar o seu estilo/)
    ).toBeInTheDocument();
  });

  it("renders without errors in neutral theme", () => {
    const { container } = renderWithTheme(<HeroSection />);
    expect(container.firstChild).toBeTruthy();
  });

  it("applies the gradient background CSS class", () => {
    renderWithTheme(<HeroSection />);
    const section = screen.getByTestId("hero-section");
    expect(section.className).toContain("hero-gradient");
  });

  it("headline uses display font class", () => {
    renderWithTheme(<HeroSection />);
    const headline = screen.getByText(
      "Descubra o corte perfeito para o seu rosto"
    );
    expect(headline.className).toContain("font-display");
  });

  it("subheadline uses body font class", () => {
    renderWithTheme(<HeroSection />);
    const subheadline = screen.getByText(
      /Consultoria de visagismo com IA.*personalizada em 3 minutos/
    );
    expect(subheadline.className).toContain("font-body");
  });

  it("uses min-h-dvh for mobile viewport height", () => {
    renderWithTheme(<HeroSection />);
    const section = screen.getByTestId("hero-section");
    expect(section.className).toContain("min-h-dvh");
  });

  it("has aria-labelledby linking to headline for accessibility", () => {
    renderWithTheme(<HeroSection />);
    const section = screen.getByTestId("hero-section");
    expect(section).toHaveAttribute("aria-labelledby", "hero-headline");
    const headline = screen.getByText(
      "Descubra o corte perfeito para o seu rosto"
    );
    expect(headline).toHaveAttribute("id", "hero-headline");
  });

  it("has id attribute for anchor navigation", () => {
    renderWithTheme(<HeroSection />);
    const section = screen.getByTestId("hero-section");
    expect(section).toHaveAttribute("id", "hero");
  });
});

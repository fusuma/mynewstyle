import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe("HowItWorksSection", () => {
  it("renders the section heading 'Como funciona'", () => {
    renderWithTheme(<HowItWorksSection />);
    expect(
      screen.getByText("Como funciona")
    ).toBeInTheDocument();
  });

  it("renders all 3 steps with correct title text", () => {
    renderWithTheme(<HowItWorksSection />);
    expect(screen.getByText("Tire uma selfie")).toBeInTheDocument();
    expect(screen.getByText("A IA analisa o seu rosto")).toBeInTheDocument();
    expect(screen.getByText("Receba o seu estilo ideal")).toBeInTheDocument();
  });

  it("renders description text for all 3 steps", () => {
    renderWithTheme(<HowItWorksSection />);
    expect(
      screen.getByText(/Tire uma foto com a câmera ou escolha da galeria/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Nossa inteligência artificial identifica o formato/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Receba recomendações personalizadas de cortes/)
    ).toBeInTheDocument();
  });

  it("has id='how-it-works' for anchor navigation", () => {
    renderWithTheme(<HowItWorksSection />);
    const section = screen.getByTestId("how-it-works-section");
    expect(section).toHaveAttribute("id", "how-it-works");
  });

  it("renders without errors in neutral theme", () => {
    const { container } = renderWithTheme(<HowItWorksSection />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders icons with aria-hidden for accessibility", () => {
    renderWithTheme(<HowItWorksSection />);
    const section = screen.getByTestId("how-it-works-section");
    const icons = section.querySelectorAll("svg");
    expect(icons.length).toBe(3);
    icons.forEach((icon) => {
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("has correct aria attributes for accessibility", () => {
    renderWithTheme(<HowItWorksSection />);
    const section = screen.getByTestId("how-it-works-section");
    expect(section).toHaveAttribute(
      "aria-labelledby",
      "how-it-works-heading"
    );
    const heading = screen.getByText("Como funciona");
    expect(heading).toHaveAttribute("id", "how-it-works-heading");
  });

  it("heading uses display font class", () => {
    renderWithTheme(<HowItWorksSection />);
    const heading = screen.getByText("Como funciona");
    expect(heading.className).toContain("font-display");
  });

  it("renders step numbers for each step", () => {
    renderWithTheme(<HowItWorksSection />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("has data-testid attribute on the section", () => {
    renderWithTheme(<HowItWorksSection />);
    const section = screen.getByTestId("how-it-works-section");
    expect(section).toBeInTheDocument();
  });

  it("uses an ordered list for semantic step sequence", () => {
    renderWithTheme(<HowItWorksSection />);
    const section = screen.getByTestId("how-it-works-section");
    const list = section.querySelector("ol");
    expect(list).toBeInTheDocument();
    const items = section.querySelectorAll("li");
    expect(items.length).toBe(3);
  });
});

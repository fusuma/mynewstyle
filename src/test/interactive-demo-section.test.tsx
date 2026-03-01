import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { InteractiveDemoSection } from "@/components/landing/InteractiveDemoSection";
import { BeforeAfterSlider } from "@/components/landing/BeforeAfterSlider";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe("InteractiveDemoSection", () => {
  it("renders section with id='interactive-demo'", () => {
    renderWithTheme(<InteractiveDemoSection />);
    const section = screen.getByTestId("interactive-demo-section");
    expect(section).toHaveAttribute("id", "interactive-demo");
  });

  it("renders section with data-testid='interactive-demo-section'", () => {
    renderWithTheme(<InteractiveDemoSection />);
    const section = screen.getByTestId("interactive-demo-section");
    expect(section).toBeInTheDocument();
  });

  it("renders caption text 'Veja como funciona'", () => {
    renderWithTheme(<InteractiveDemoSection />);
    expect(
      screen.getByText(/Veja como funciona — sem precisar de foto/)
    ).toBeInTheDocument();
  });

  it("renders section heading 'Veja o resultado'", () => {
    renderWithTheme(<InteractiveDemoSection />);
    expect(screen.getByText(/Veja o resultado/)).toBeInTheDocument();
  });

  it("renders the before/after slider via data-testid", () => {
    renderWithTheme(<InteractiveDemoSection />);
    expect(screen.getByTestId("before-after-slider")).toBeInTheDocument();
  });

  it("uses semantic section element with aria-labelledby", () => {
    renderWithTheme(<InteractiveDemoSection />);
    const section = screen.getByTestId("interactive-demo-section");
    expect(section.tagName).toBe("SECTION");
    expect(section).toHaveAttribute(
      "aria-labelledby",
      "interactive-demo-heading"
    );
  });

  it("renders without errors in neutral theme", () => {
    const { container } = renderWithTheme(<InteractiveDemoSection />);
    expect(container.firstChild).toBeTruthy();
  });

  it("respects prefers-reduced-motion by rendering all content", () => {
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

    renderWithTheme(<InteractiveDemoSection />);
    expect(
      screen.getByText(/Veja como funciona — sem precisar de foto/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Veja o resultado/)).toBeInTheDocument();
    expect(screen.getByTestId("before-after-slider")).toBeInTheDocument();

    window.matchMedia = originalMatchMedia;
  });
});

describe("BeforeAfterSlider", () => {
  const defaultProps = {
    beforeSrc: "/demo/before.jpg",
    afterSrc: "/demo/after.jpg",
    beforeAlt: "Rosto com estilo original",
    afterAlt: "Rosto com novo corte de cabelo recomendado",
  };

  it("renders with data-testid='before-after-slider'", () => {
    renderWithTheme(<BeforeAfterSlider {...defaultProps} />);
    expect(screen.getByTestId("before-after-slider")).toBeInTheDocument();
  });

  it("has role='slider' with correct aria-label", () => {
    renderWithTheme(<BeforeAfterSlider {...defaultProps} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute(
      "aria-label",
      "Comparação antes e depois"
    );
  });

  it("has aria-valuemin, aria-valuemax, and aria-valuenow attributes", () => {
    renderWithTheme(<BeforeAfterSlider {...defaultProps} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "100");
    expect(slider).toHaveAttribute("aria-valuenow", "50");
  });

  it("renders before image with correct alt text", () => {
    renderWithTheme(<BeforeAfterSlider {...defaultProps} />);
    const beforeImg = screen.getByAltText("Rosto com estilo original");
    expect(beforeImg).toBeInTheDocument();
  });

  it("renders after image with correct alt text", () => {
    renderWithTheme(<BeforeAfterSlider {...defaultProps} />);
    const afterImg = screen.getByAltText(
      "Rosto com novo corte de cabelo recomendado"
    );
    expect(afterImg).toBeInTheDocument();
  });

  it("updates aria-valuenow on right arrow key press", () => {
    renderWithTheme(<BeforeAfterSlider {...defaultProps} />);
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(slider).toHaveAttribute("aria-valuenow", "55");
  });

  it("updates aria-valuenow on left arrow key press", () => {
    renderWithTheme(<BeforeAfterSlider {...defaultProps} />);
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(slider).toHaveAttribute("aria-valuenow", "45");
  });

  it("clamps slider value to 0 at minimum", () => {
    renderWithTheme(<BeforeAfterSlider {...defaultProps} />);
    const slider = screen.getByRole("slider");
    // Press left arrow 11 times (50 - 11*5 = -5, clamped to 0)
    for (let i = 0; i < 11; i++) {
      fireEvent.keyDown(slider, { key: "ArrowLeft" });
    }
    expect(slider).toHaveAttribute("aria-valuenow", "0");
  });

  it("clamps slider value to 100 at maximum", () => {
    renderWithTheme(<BeforeAfterSlider {...defaultProps} />);
    const slider = screen.getByRole("slider");
    // Press right arrow 11 times (50 + 11*5 = 105, clamped to 100)
    for (let i = 0; i < 11; i++) {
      fireEvent.keyDown(slider, { key: "ArrowRight" });
    }
    expect(slider).toHaveAttribute("aria-valuenow", "100");
  });

  it("renders without errors with custom props", () => {
    const { container } = renderWithTheme(
      <BeforeAfterSlider
        beforeSrc="/custom/before.png"
        afterSrc="/custom/after.png"
        beforeAlt="Custom before"
        afterAlt="Custom after"
      />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("initiates drag on mouseDown and updates position on mouseMove", () => {
    renderWithTheme(<BeforeAfterSlider {...defaultProps} />);
    const container = screen.getByTestId("before-after-slider");

    // Mock getBoundingClientRect for the container
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        right: 600,
        width: 600,
        top: 0,
        bottom: 1000,
        height: 1000,
        x: 0,
        y: 0,
        toJSON: () => {},
      }),
    });

    // Start drag at 25% (150px of 600px)
    fireEvent.mouseDown(container, { clientX: 150 });
    // Move to 75% (450px of 600px)
    fireEvent.mouseMove(document, { clientX: 450 });
    fireEvent.mouseUp(document);

    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuenow", "75");
  });

  it("has cursor-col-resize class on the container for drag affordance", () => {
    renderWithTheme(<BeforeAfterSlider {...defaultProps} />);
    const container = screen.getByTestId("before-after-slider");
    expect(container.className).toContain("cursor-col-resize");
  });
});

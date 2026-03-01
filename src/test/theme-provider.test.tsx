import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { useTheme } from "@/hooks/useTheme";

function TestConsumer() {
  const { gender, setGender, theme } = useTheme();
  return (
    <div>
      <span data-testid="gender">{gender ?? "null"}</span>
      <span data-testid="bg">{theme.background}</span>
      <button data-testid="set-male" onClick={() => setGender("male")}>
        Male
      </button>
      <button data-testid="set-female" onClick={() => setGender("female")}>
        Female
      </button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders children correctly", () => {
    render(
      <ThemeProvider>
        <div data-testid="child">Hello</div>
      </ThemeProvider>
    );
    expect(screen.getByTestId("child")).toHaveTextContent("Hello");
  });

  it("defaults to neutral (null gender) before selection", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    expect(screen.getByTestId("gender")).toHaveTextContent("null");
  });

  it("switches to male theme and sets data-theme attribute", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    act(() => {
      screen.getByTestId("set-male").click();
    });

    expect(screen.getByTestId("gender")).toHaveTextContent("male");
    expect(screen.getByTestId("bg")).toHaveTextContent("#1A1A2E");
    expect(document.documentElement.getAttribute("data-theme")).toBe("male");
  });

  it("switches to female theme and sets data-theme attribute", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    act(() => {
      screen.getByTestId("set-female").click();
    });

    expect(screen.getByTestId("gender")).toHaveTextContent("female");
    expect(screen.getByTestId("bg")).toHaveTextContent("#FFF8F0");
    expect(document.documentElement.getAttribute("data-theme")).toBe("female");
  });

  it("can switch from male to female theme", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    act(() => {
      screen.getByTestId("set-male").click();
    });
    expect(screen.getByTestId("gender")).toHaveTextContent("male");

    act(() => {
      screen.getByTestId("set-female").click();
    });
    expect(screen.getByTestId("gender")).toHaveTextContent("female");
    expect(document.documentElement.getAttribute("data-theme")).toBe("female");
  });

  it("provides correct male theme colors", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    act(() => {
      screen.getByTestId("set-male").click();
    });

    expect(screen.getByTestId("bg")).toHaveTextContent("#1A1A2E");
  });

  it("provides correct female theme colors", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    act(() => {
      screen.getByTestId("set-female").click();
    });

    expect(screen.getByTestId("bg")).toHaveTextContent("#FFF8F0");
  });

  it("provides neutral theme background color by default", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId("bg")).toHaveTextContent("#f5f5f5");
  });

  it("throws error when useTheme is used outside ThemeProvider", () => {
    // Suppress console.error for expected error
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      "useTheme must be used within a ThemeProvider"
    );

    consoleSpy.mockRestore();
  });
});

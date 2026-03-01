import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

// Test the ThemeProvider integration in a layout-like context
// Note: We can't fully test Next.js root layout in a unit test,
// but we can test the component tree structure
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

describe("Layout Integration", () => {
  it("renders ThemeProvider wrapping children", () => {
    render(
      <ThemeProvider>
        <div data-testid="page-content">Page content</div>
      </ThemeProvider>
    );
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("renders Toaster component within ThemeProvider", () => {
    render(
      <ThemeProvider>
        <Toaster />
        <div data-testid="page-content">Page content</div>
      </ThemeProvider>
    );
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
  });

  it("ThemeProvider does not set data-theme when no gender selected", () => {
    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>
    );
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
});

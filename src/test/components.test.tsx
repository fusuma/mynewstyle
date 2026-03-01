import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe("Button Component", () => {
  it("renders with default variant", () => {
    renderWithTheme(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toBeInTheDocument();
  });

  it("renders primary variant (default)", () => {
    renderWithTheme(<Button variant="default">Primary</Button>);
    const button = screen.getByRole("button", { name: "Primary" });
    expect(button).toHaveAttribute("data-variant", "default");
    expect(button.className).toContain("bg-primary");
  });

  it("renders secondary variant", () => {
    renderWithTheme(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole("button", { name: "Secondary" });
    expect(button).toHaveAttribute("data-variant", "secondary");
    expect(button.className).toContain("bg-secondary");
  });

  it("renders ghost variant", () => {
    renderWithTheme(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole("button", { name: "Ghost" });
    expect(button).toHaveAttribute("data-variant", "ghost");
  });

  it("has 48px min height for mobile touch targets", () => {
    renderWithTheme(<Button>Touch Target</Button>);
    const button = screen.getByRole("button", { name: "Touch Target" });
    expect(button.className).toContain("min-h-[48px]");
  });

  it("uses rounded-button border radius (12px)", () => {
    renderWithTheme(<Button>Rounded</Button>);
    const button = screen.getByRole("button", { name: "Rounded" });
    expect(button.className).toContain("rounded-button");
  });
});

describe("Card Component", () => {
  it("renders card with content", () => {
    renderWithTheme(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
        </CardHeader>
        <CardContent>Card content</CardContent>
      </Card>
    );
    expect(screen.getByTestId("card")).toBeInTheDocument();
    expect(screen.getByText("Test Card")).toBeInTheDocument();
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("uses rounded-card border radius (16px)", () => {
    renderWithTheme(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("rounded-card");
  });

  it("uses card shadow", () => {
    renderWithTheme(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("shadow-card");
  });

  it("uses theme-aware card colors", () => {
    renderWithTheme(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("bg-card");
    expect(card.className).toContain("text-card-foreground");
  });
});

describe("Badge Component", () => {
  it("renders badge with text", () => {
    renderWithTheme(<Badge>New</Badge>);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("uses rounded-badge border radius (8px)", () => {
    renderWithTheme(<Badge data-testid="badge">Label</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("rounded-badge");
  });

  it("renders default variant with theme-aware colors", () => {
    renderWithTheme(<Badge data-testid="badge">Label</Badge>);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("bg-primary");
  });

  it("renders secondary variant", () => {
    renderWithTheme(
      <Badge data-testid="badge" variant="secondary">
        Secondary
      </Badge>
    );
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("bg-secondary");
  });
});

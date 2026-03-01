import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Footer } from "@/components/layout/Footer";
import PrivacidadePage from "@/app/privacidade/page";
import TermosPage from "@/app/termos/page";

// ============================================================
// Footer Component Tests
// ============================================================
describe("Footer", () => {
  it("renders with id='footer' and data-testid='footer-section'", () => {
    render(<Footer />);
    const footer = screen.getByTestId("footer-section");
    expect(footer).toHaveAttribute("id", "footer");
  });

  it("contains a link to /privacidade", () => {
    render(<Footer />);
    const link = screen.getByRole("link", { name: /privacidade/i });
    expect(link).toHaveAttribute("href", "/privacidade");
  });

  it("contains a link to /termos", () => {
    render(<Footer />);
    const link = screen.getByRole("link", { name: /termos de uso/i });
    expect(link).toHaveAttribute("href", "/termos");
  });

  it("contains 'Contato' link or text", () => {
    render(<Footer />);
    expect(screen.getByText(/contato/i)).toBeInTheDocument();
  });

  it("contains copyright text", () => {
    render(<Footer />);
    expect(
      screen.getByText(/© 2026 MyNewStyle\. Todos os direitos reservados\./)
    ).toBeInTheDocument();
  });

  it("uses semantic <footer> element", () => {
    render(<Footer />);
    const footer = screen.getByTestId("footer-section");
    expect(footer.tagName).toBe("FOOTER");
  });

  it("all links have accessible names", () => {
    render(<Footer />);
    const footer = screen.getByTestId("footer-section");
    const links = within(footer).getAllByRole("link");
    links.forEach((link) => {
      expect(link).toHaveAccessibleName();
    });
  });

  it("has role='contentinfo' on footer element", () => {
    render(<Footer />);
    const footer = screen.getByRole("contentinfo");
    expect(footer).toBeInTheDocument();
  });

  it("has scroll-mt-16 class for fixed header offset", () => {
    render(<Footer />);
    const footer = screen.getByTestId("footer-section");
    expect(footer.className).toContain("scroll-mt-16");
  });
});

// ============================================================
// Privacy Page (/privacidade) Tests
// ============================================================
describe("PrivacidadePage", () => {
  it("renders with heading 'Politica de Privacidade'", () => {
    render(<PrivacidadePage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /Pol.tica de Privacidade/i })
    ).toBeInTheDocument();
  });

  it("contains LGPD-related content about biometric data", () => {
    render(<PrivacidadePage />);
    const matches = screen.getAllByText(/dados biom.tricos/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("contains user rights information (direito a exclusao)", () => {
    render(<PrivacidadePage />);
    const matches = screen.getAllByText(/exclus.o/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("contains data retention information", () => {
    render(<PrivacidadePage />);
    expect(
      screen.getByText(/90 dias/i)
    ).toBeInTheDocument();
  });

  it("uses semantic heading hierarchy (h1 > h2)", () => {
    render(<PrivacidadePage />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toBeInTheDocument();
    const h2Elements = screen.getAllByRole("heading", { level: 2 });
    expect(h2Elements.length).toBeGreaterThanOrEqual(1);
  });

  it("uses semantic article element", () => {
    const { container } = render(<PrivacidadePage />);
    const article = container.querySelector("article");
    expect(article).toBeInTheDocument();
  });

  it("contains back to home link", () => {
    render(<PrivacidadePage />);
    const link = screen.getByRole("link", { name: /voltar/i });
    expect(link).toHaveAttribute("href", "/");
  });
});

// ============================================================
// Terms Page (/termos) Tests
// ============================================================
describe("TermosPage", () => {
  it("renders with heading 'Termos de Uso'", () => {
    render(<TermosPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /Termos de Uso/i })
    ).toBeInTheDocument();
  });

  it("contains AI disclaimer text with entretenimento framing", () => {
    render(<TermosPage />);
    expect(
      screen.getByText(/entretenimento/i)
    ).toBeInTheDocument();
  });

  it("contains artistic suggestions framing", () => {
    render(<TermosPage />);
    expect(
      screen.getByText(/sugest.es art.sticas/i)
    ).toBeInTheDocument();
  });

  it("contains refund policy information", () => {
    render(<TermosPage />);
    const matches = screen.getAllByText(/reembolso/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("uses semantic heading hierarchy (h1 > h2)", () => {
    render(<TermosPage />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toBeInTheDocument();
    const h2Elements = screen.getAllByRole("heading", { level: 2 });
    expect(h2Elements.length).toBeGreaterThanOrEqual(1);
  });

  it("uses semantic article element", () => {
    const { container } = render(<TermosPage />);
    const article = container.querySelector("article");
    expect(article).toBeInTheDocument();
  });

  it("contains back to home link", () => {
    render(<TermosPage />);
    const link = screen.getByRole("link", { name: /voltar/i });
    expect(link).toHaveAttribute("href", "/");
  });
});

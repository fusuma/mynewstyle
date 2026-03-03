import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivacidadePage from "@/app/privacidade/page";

// ============================================================
// Story 11.1: Privacy Policy (LGPD Compliant) Tests
// ============================================================

// Task 3.1 — Privacy policy page renders all required LGPD sections
describe("PrivacidadePage - renders all required LGPD sections", () => {
  it("renders the main heading 'Politica de Privacidade'", () => {
    render(<PrivacidadePage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Pol.tica de Privacidade/i,
      })
    ).toBeInTheDocument();
  });

  it("renders as a semantic article element", () => {
    const { container } = render(<PrivacidadePage />);
    const article = container.querySelector("article");
    expect(article).toBeInTheDocument();
  });
});

// Task 3.2 — All section headings present
describe("PrivacidadePage - section headings (AC #2)", () => {
  it("has a 'Dados Coletados' heading", () => {
    render(<PrivacidadePage />);
    expect(
      screen.getByRole("heading", { name: /Dados Coletados/i })
    ).toBeInTheDocument();
  });

  it("has a 'Finalidade' heading", () => {
    render(<PrivacidadePage />);
    expect(
      screen.getByRole("heading", { name: /Finalidade/i })
    ).toBeInTheDocument();
  });

  it("has a 'Dados Biom.tricos' heading", () => {
    render(<PrivacidadePage />);
    const matches = screen.getAllByRole("heading", { name: /Dados Biom.tricos/i });
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("has a 'Reten' heading for retention section", () => {
    render(<PrivacidadePage />);
    expect(
      screen.getByRole("heading", { name: /Reten/i })
    ).toBeInTheDocument();
  });

  it("has a 'Direitos' heading", () => {
    render(<PrivacidadePage />);
    const matches = screen.getAllByRole("heading", { name: /Direitos/i });
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("has a 'Terceiros' or 'Compartilhamento' heading", () => {
    render(<PrivacidadePage />);
    const headings = screen.getAllByRole("heading");
    const hasThirdParty = headings.some(
      (h) =>
        /terceiros/i.test(h.textContent ?? "") ||
        /compartilhamento/i.test(h.textContent ?? "")
    );
    expect(hasThirdParty).toBe(true);
  });

  it("has a 'Seguran' or 'Seguridade' heading for security section", () => {
    render(<PrivacidadePage />);
    const headings = screen.getAllByRole("heading");
    const hasSecurity = headings.some((h) =>
      /seguran/i.test(h.textContent ?? "")
    );
    expect(hasSecurity).toBe(true);
  });

  it("has a 'Transfer' heading for international transfers section", () => {
    render(<PrivacidadePage />);
    const headings = screen.getAllByRole("heading");
    const hasTransfer = headings.some((h) =>
      /transfer/i.test(h.textContent ?? "")
    );
    expect(hasTransfer).toBe(true);
  });

  it("has an automated decision-making heading", () => {
    render(<PrivacidadePage />);
    const headings = screen.getAllByRole("heading");
    const hasAutomated = headings.some(
      (h) =>
        /autom/i.test(h.textContent ?? "") ||
        /decisão/i.test(h.textContent ?? "") ||
        /decisoes/i.test(h.textContent ?? "") ||
        /decis.es/i.test(h.textContent ?? "")
    );
    expect(hasAutomated).toBe(true);
  });

  it("has a children's data heading (menores)", () => {
    render(<PrivacidadePage />);
    const headings = screen.getAllByRole("heading");
    const hasChildren = headings.some(
      (h) =>
        /menor/i.test(h.textContent ?? "") ||
        /crian/i.test(h.textContent ?? "") ||
        /infan/i.test(h.textContent ?? "")
    );
    expect(hasChildren).toBe(true);
  });

  it("has a controller or DPO heading", () => {
    render(<PrivacidadePage />);
    const headings = screen.getAllByRole("heading");
    const hasController = headings.some(
      (h) =>
        /controlador/i.test(h.textContent ?? "") ||
        /encarregado/i.test(h.textContent ?? "") ||
        /DPO/i.test(h.textContent ?? "")
    );
    expect(hasController).toBe(true);
  });

  it("has a cookies heading", () => {
    render(<PrivacidadePage />);
    const headings = screen.getAllByRole("heading");
    const hasCookies = headings.some((h) =>
      /cookie/i.test(h.textContent ?? "")
    );
    expect(hasCookies).toBe(true);
  });

  it("has an updates heading", () => {
    render(<PrivacidadePage />);
    const headings = screen.getAllByRole("heading");
    const hasUpdates = headings.some(
      (h) =>
        /atualiza/i.test(h.textContent ?? "") ||
        /altera/i.test(h.textContent ?? "")
    );
    expect(hasUpdates).toBe(true);
  });
});

// Task 3.3 — Contact email present and linked
describe("PrivacidadePage - contact email (AC #4)", () => {
  it("contains contact email privacidade@mynewstyle.com.br", () => {
    render(<PrivacidadePage />);
    const emailLinks = screen.getAllByRole("link", {
      name: /privacidade@mynewstyle\.com\.br/i,
    });
    expect(emailLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("email link has correct mailto href", () => {
    render(<PrivacidadePage />);
    const emailLinks = screen.getAllByRole("link", {
      name: /privacidade@mynewstyle\.com\.br/i,
    });
    emailLinks.forEach((link) => {
      expect(link).toHaveAttribute(
        "href",
        "mailto:privacidade@mynewstyle.com.br"
      );
    });
  });

  it("mentions 15 business days response SLA", () => {
    render(<PrivacidadePage />);
    const matches = screen.getAllByText(/15 dias/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});

// Task 3.4 — Back to home link
describe("PrivacidadePage - navigation (AC #5)", () => {
  it("renders 'Voltar para a p.gina inicial' link", () => {
    render(<PrivacidadePage />);
    const link = screen.getByRole("link", { name: /voltar/i });
    expect(link).toBeInTheDocument();
  });

  it("back link points to '/'", () => {
    render(<PrivacidadePage />);
    const link = screen.getByRole("link", { name: /voltar/i });
    expect(link).toHaveAttribute("href", "/");
  });
});

// Task 3.5 — Metadata
describe("PrivacidadePage - metadata", () => {
  it("page module exports metadata object", async () => {
    const mod = await import("@/app/privacidade/page");
    expect(mod.metadata).toBeDefined();
  });

  it("metadata has a title containing 'Privacidade'", async () => {
    const mod = await import("@/app/privacidade/page");
    const title =
      typeof mod.metadata?.title === "string"
        ? mod.metadata.title
        : JSON.stringify(mod.metadata?.title);
    expect(title).toMatch(/privacidade/i);
  });

  it("metadata has a description", async () => {
    const mod = await import("@/app/privacidade/page");
    expect(mod.metadata?.description).toBeTruthy();
  });
});

// External link security tests
describe("PrivacidadePage - external link security", () => {
  it("all external links have target='_blank'", () => {
    const { container } = render(<PrivacidadePage />);
    const externalLinks = container.querySelectorAll('a[href^="https://"]');
    expect(externalLinks.length).toBeGreaterThanOrEqual(6);
    externalLinks.forEach((link) => {
      expect(link).toHaveAttribute("target", "_blank");
    });
  });

  it("all external links have rel='noopener noreferrer' for security", () => {
    const { container } = render(<PrivacidadePage />);
    const externalLinks = container.querySelectorAll('a[href^="https://"]');
    expect(externalLinks.length).toBeGreaterThanOrEqual(6);
    externalLinks.forEach((link) => {
      const rel = link.getAttribute("rel") ?? "";
      expect(rel).toContain("noopener");
      expect(rel).toContain("noreferrer");
    });
  });

  it("has external links to all 6 third-party privacy policies", () => {
    const { container } = render(<PrivacidadePage />);
    const hrefs = Array.from(container.querySelectorAll("a[href]")).map(
      (a) => a.getAttribute("href") ?? ""
    );
    expect(hrefs.some((h) => h.includes("policies.google.com"))).toBe(true);
    expect(hrefs.some((h) => h.includes("openai.com/privacy"))).toBe(true);
    expect(hrefs.some((h) => h.includes("kie.ai/privacy"))).toBe(true);
    expect(hrefs.some((h) => h.includes("stripe.com/privacy"))).toBe(true);
    expect(hrefs.some((h) => h.includes("supabase.com/privacy"))).toBe(true);
    expect(hrefs.some((h) => h.includes("vercel.com/legal/privacy-policy"))).toBe(true);
  });
});

// Additional content tests for LGPD compliance (AC #1, #2, #3)
describe("PrivacidadePage - LGPD content compliance", () => {
  it("mentions LGPD or Lei 13.709", () => {
    render(<PrivacidadePage />);
    const content = document.body.textContent ?? "";
    expect(/LGPD|13\.709/i.test(content)).toBe(true);
  });

  it("mentions biometric data (dados biometricos)", () => {
    render(<PrivacidadePage />);
    const matches = screen.getAllByText(/dados biom.tricos/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("mentions explicit consent (consentimento)", () => {
    render(<PrivacidadePage />);
    const content = document.body.textContent ?? "";
    expect(/consentimento/i.test(content)).toBe(true);
  });

  it("mentions LGPD Art. 11 for biometric processing legal basis", () => {
    render(<PrivacidadePage />);
    const content = document.body.textContent ?? "";
    expect(/art\.?\s*11|artigo\s*11/i.test(content)).toBe(true);
  });

  it("mentions that no biometric templates are stored long-term", () => {
    render(<PrivacidadePage />);
    const content = document.body.textContent ?? "";
    expect(/n.o.*armazen|armazen.*template|modelo biom/i.test(content)).toBe(
      true
    );
  });

  it("lists Google Gemini as a third-party processor (AC #2)", () => {
    render(<PrivacidadePage />);
    const content = document.body.textContent ?? "";
    expect(/gemini|google/i.test(content)).toBe(true);
  });

  it("lists OpenAI as a third-party processor (AC #2)", () => {
    render(<PrivacidadePage />);
    const content = document.body.textContent ?? "";
    expect(/openai/i.test(content)).toBe(true);
  });

  it("lists Kie.ai as a third-party processor (AC #2)", () => {
    render(<PrivacidadePage />);
    const content = document.body.textContent ?? "";
    expect(/kie\.ai|nano banana/i.test(content)).toBe(true);
  });

  it("lists Stripe as a third-party processor (AC #2)", () => {
    render(<PrivacidadePage />);
    const content = document.body.textContent ?? "";
    expect(/stripe/i.test(content)).toBe(true);
  });

  it("lists Supabase as a third-party processor (AC #2)", () => {
    render(<PrivacidadePage />);
    const content = document.body.textContent ?? "";
    expect(/supabase/i.test(content)).toBe(true);
  });

  it("lists Vercel as a third-party processor (AC #2)", () => {
    render(<PrivacidadePage />);
    const content = document.body.textContent ?? "";
    expect(/vercel/i.test(content)).toBe(true);
  });

  it("mentions photos retention period of 90 days", () => {
    render(<PrivacidadePage />);
    const content = document.body.textContent ?? "";
    expect(/90 dias/i.test(content)).toBe(true);
  });

  it("mentions share card retention period of 30 days", () => {
    render(<PrivacidadePage />);
    const content = document.body.textContent ?? "";
    expect(/30 dias/i.test(content)).toBe(true);
  });

  it("mentions all 9 LGPD Art. 18 rights: access, correction, deletion, portability, consent revocation, anonymization, info sharing, opposition, automated review", () => {
    render(<PrivacidadePage />);
    const content = document.body.textContent ?? "";
    // Right 1: Access
    expect(/acesso/i.test(content)).toBe(true);
    // Right 2: Correction
    expect(/corre/i.test(content)).toBe(true);
    // Right 3: Deletion
    expect(/exclus/i.test(content)).toBe(true);
    // Right 4: Portability
    expect(/portabilidade/i.test(content)).toBe(true);
    // Right 5: Consent revocation
    expect(/revoga/i.test(content)).toBe(true);
    // Right 6: Anonymization or blocking
    expect(/anonimiza/i.test(content)).toBe(true);
    // Right 7: Information about sharing
    expect(/compartilhamento/i.test(content)).toBe(true);
    // Right 8: Opposition to processing
    expect(/oposi/i.test(content)).toBe(true);
    // Right 9: Review of automated decisions
    expect(/revis.o.*decis|decis.*autom/i.test(content)).toBe(true);
  });

  it("mentions LGPD Art. 18 for data subject rights", () => {
    render(<PrivacidadePage />);
    const content = document.body.textContent ?? "";
    expect(/art\.?\s*18|artigo\s*18/i.test(content)).toBe(true);
  });

  it("mentions international transfers (LGPD Art. 33)", () => {
    render(<PrivacidadePage />);
    const content = document.body.textContent ?? "";
    expect(/internacion|brasil|fora do brasil|exterior/i.test(content)).toBe(
      true
    );
  });

  it("references LGPD Art. 5 II for biometric data definition", () => {
    render(<PrivacidadePage />);
    const content = document.body.textContent ?? "";
    expect(/art\.?\s*5|artigo\s*5/i.test(content)).toBe(true);
  });

  it("references LGPD Art. 33 explicitly for international data transfers", () => {
    render(<PrivacidadePage />);
    const content = document.body.textContent ?? "";
    expect(/art\.?\s*33|artigo\s*33/i.test(content)).toBe(true);
  });

  it("references LGPD Art. 20 for automated decision review right", () => {
    render(<PrivacidadePage />);
    const content = document.body.textContent ?? "";
    expect(/art\.?\s*20|artigo\s*20/i.test(content)).toBe(true);
  });

  it("mentions that service is not intended for minors under 18", () => {
    render(<PrivacidadePage />);
    const content = document.body.textContent ?? "";
    expect(/18 anos|menor de 18|menores/i.test(content)).toBe(true);
  });

  it("mentions automated decision-making (Art. 20)", () => {
    render(<PrivacidadePage />);
    const content = document.body.textContent ?? "";
    expect(/autom.tica|algoritmo|ia.*decis|decis.*ia/i.test(content)).toBe(
      true
    );
  });

  it("mentions data security measures (encryption/RLS)", () => {
    render(<PrivacidadePage />);
    const content = document.body.textContent ?? "";
    expect(/criptograf|seguran|RLS|SSL|TLS/i.test(content)).toBe(true);
  });

  it("mentions email, name in data collected section (AC #2)", () => {
    render(<PrivacidadePage />);
    const content = document.body.textContent ?? "";
    expect(/e-mail|email/i.test(content)).toBe(true);
    expect(/nome/i.test(content)).toBe(true);
  });
});

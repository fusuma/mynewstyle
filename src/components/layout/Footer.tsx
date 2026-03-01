import Link from "next/link";

const footerLinkClass =
  "font-body text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

export function Footer() {
  return (
    <footer
      id="footer"
      data-testid="footer-section"
      role="contentinfo"
      className="scroll-mt-16 bg-muted py-8 md:py-12"
    >
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <div className="flex flex-col items-center gap-6">
          {/* Navigation links */}
          <nav aria-label="Links do rodapé">
            <ul className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
              <li>
                <Link href="/privacidade" className={footerLinkClass}>
                  Privacidade
                </Link>
              </li>
              <li>
                <Link href="/termos" className={footerLinkClass}>
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link
                  href="mailto:contato@mynewstyle.com.br"
                  className={footerLinkClass}
                >
                  Contato
                </Link>
              </li>
            </ul>
          </nav>

          {/* Copyright */}
          <p className="font-body text-xs text-muted-foreground">
            &copy; 2026 MyNewStyle. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}

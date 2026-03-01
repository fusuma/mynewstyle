"use client";

import { useState } from "react";
import { AlertTriangle, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getExternalBrowserUrl } from "@/lib/photo/detect-webview";

interface WebViewBlockerProps {
  url?: string;
}

/**
 * Blocking screen shown when the app is running inside an in-app browser.
 * Prompts user to open in external browser for camera access.
 * Portuguese (pt-BR) text with correct diacritical marks.
 */
export function WebViewBlocker({ url }: WebViewBlockerProps) {
  const [copied, setCopied] = useState(false);
  const externalUrl = getExternalBrowserUrl(url);

  const handleOpenBrowser = () => {
    // Attempt to open in external browser
    window.open(externalUrl, "_blank");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(externalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text from a temporary input
      const input = document.createElement("input");
      input.value = externalUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle
            className="h-10 w-10 text-destructive"
            aria-hidden="true"
          />
        </div>

        <div className="space-y-3">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Abra no seu navegador
          </h1>
          <p className="text-base text-muted-foreground">
            Navegadores integrados (como o do Instagram) podem não suportar a
            câmera. Para a melhor experiência, abra este link no seu navegador.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Button
            onClick={handleOpenBrowser}
            size="lg"
            className="w-full"
            aria-label="Abrir no Navegador"
          >
            <ExternalLink className="mr-2 h-5 w-5" aria-hidden="true" />
            Abrir no Navegador
          </Button>

          <Button
            onClick={handleCopyLink}
            variant="outline"
            size="default"
            className="w-full"
            aria-label="Copiar Link"
          >
            <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
            {copied ? "Link copiado!" : "Copiar Link"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Copie o link acima e cole no navegador do seu dispositivo.
        </p>
      </div>
    </div>
  );
}

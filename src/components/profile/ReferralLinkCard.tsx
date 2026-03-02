'use client';

import { useState, useEffect, useCallback } from 'react';
import { Copy, Check, Link, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ReferralData {
  referralCode: string;
  referralLink: string;
}

/**
 * ReferralLinkCard — profile page card showing user's referral link.
 *
 * AC #6: Displays referral URL, "Copiar link" button, copies to clipboard,
 * shows "Link copiado!" toast. Loading skeleton while fetching. Error state
 * with retry. Uses Card from shadcn/ui.
 */
export function ReferralLinkCard() {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchReferralCode = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);

    try {
      const response = await fetch('/api/referral/code');
      if (!response.ok) {
        throw new Error(`Failed to fetch referral code: ${response.status}`);
      }
      const data: ReferralData = await response.json();
      setReferralData(data);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferralCode();
  }, [fetchReferralCode]);

  const handleCopy = async () => {
    if (!referralData) return;

    try {
      // Primary: navigator.clipboard (modern browsers)
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(referralData.referralLink);
      } else {
        // Fallback: document.execCommand('copy') for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = referralData.referralLink;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopied(true);
      toast.success('Link copiado!');

      // Reset copy state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Falha ao copiar. Tente novamente.');
    }
  };

  // Loading state — skeleton shimmer
  if (isLoading) {
    return (
      <Card className="w-full max-w-[1200px] mx-auto" data-testid="referral-skeleton">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-28" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state — retry button
  if (hasError) {
    return (
      <Card className="w-full max-w-[1200px] mx-auto">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="size-4 text-destructive" aria-hidden="true" />
            <span className="text-sm">Não foi possível carregar o link.</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchReferralCode}
              aria-label="Tentar novamente"
            >
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loaded state
  return (
    <Card className="w-full max-w-[1200px] mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link className="size-4 text-primary" aria-hidden="true" />
          Convide amigos
        </CardTitle>
        <CardDescription>
          Partilhe este link e acompanhe quem você convidou.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Referral link display */}
          <div
            className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono text-muted-foreground select-all overflow-x-auto"
            role="textbox"
            aria-readonly="true"
            aria-label="Link de convite"
          >
            {referralData?.referralLink}
          </div>

          {/* Copy button */}
          <Button
            variant="default"
            onClick={handleCopy}
            disabled={copied}
            aria-label={copied ? 'Link copiado!' : 'Copiar link'}
            className="shrink-0"
          >
            {copied ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            Copiar link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

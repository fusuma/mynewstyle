"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import "./hero-gradient.css";

export function HeroSection() {
  return (
    <section
      id="hero"
      data-testid="hero-section"
      aria-labelledby="hero-headline"
      className="hero-gradient relative flex min-h-dvh w-full flex-col items-center px-4 pb-[env(safe-area-inset-bottom)] md:px-6"
    >
      {/* Top spacer — pushes content toward center-lower area */}
      <div className="flex-[3]" aria-hidden="true" />

      <div className="flex w-full max-w-[1200px] flex-col items-center text-center">
        {/* Headline */}
        <h1
          id="hero-headline"
          className="font-display text-[32px] font-bold leading-tight text-foreground text-balance md:text-[48px]"
        >
          Descubra o corte perfeito para o seu rosto
        </h1>

        {/* Subheadline */}
        <p className="font-body mt-4 max-w-[600px] text-lg text-muted-foreground md:mt-6 md:text-xl">
          Consultoria de visagismo com IA — personalizada em 3 minutos
        </p>
      </div>

      {/* Middle spacer — creates gap between text and CTA */}
      <div className="flex-[1]" aria-hidden="true" />

      {/* CTA Button — positioned in lower area for thumb-zone optimization */}
      <div className="flex flex-col items-center">
        <Button asChild size="lg" className="text-base font-semibold">
          <Link href="/start">Comecar Agora</Link>
        </Button>

        {/* Social Proof */}
        <p className="mt-6 text-sm text-muted-foreground md:mt-8">
          Ja ajudamos X pessoas a encontrar o seu estilo
        </p>

        {/* Secondary link — scroll to How It Works */}
        <a
          href="#how-it-works"
          className="mt-4 text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
        >
          Como funciona?
        </a>
      </div>

      {/* Bottom spacer — provides bottom padding */}
      <div className="flex-[1]" aria-hidden="true" />
    </section>
  );
}

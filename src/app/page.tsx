import type { Metadata } from "next";
import { Suspense } from "react";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { TrustPrivacySection } from "@/components/landing/TrustPrivacySection";
import { InteractiveDemoSection } from "@/components/landing/InteractiveDemoSection";
import { Footer } from "@/components/layout/Footer";
import { AccountDeletedNotifier } from "@/components/landing/AccountDeletedNotifier";

export const metadata: Metadata = {
  title: "MyNewStyle - Consultoria de Visagismo com IA",
  description:
    "Descubra o corte de cabelo perfeito para o formato do seu rosto. Consultoria de visagismo personalizada com inteligencia artificial em apenas 3 minutos.",
  openGraph: {
    title: "MyNewStyle - Consultoria de Visagismo com IA",
    description:
      "Descubra o corte de cabelo perfeito para o formato do seu rosto. Consultoria personalizada com IA em 3 minutos.",
    type: "website",
    locale: "pt_BR",
    siteName: "MyNewStyle",
  },
  keywords: [
    "visagismo",
    "corte de cabelo",
    "formato do rosto",
    "consultoria capilar",
    "inteligencia artificial",
    "hairstyle",
    "face shape",
  ],
  robots: {
    index: true,
    follow: true,
  },
};

export default function Home() {
  return (
    <>
      <main>
        <HeroSection />
        <HowItWorksSection />
        <TrustPrivacySection />
        <InteractiveDemoSection />
      </main>
      <Footer />
      {/* Story 11-3: Show success toast after account deletion redirect (AC #5) */}
      <Suspense fallback={null}>
        <AccountDeletedNotifier />
      </Suspense>
    </>
  );
}

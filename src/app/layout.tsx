import type { Metadata } from "next";
import { Suspense } from "react";
import { Space_Grotesk, Inter } from "next/font/google";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import GuestClaimHandler from "@/components/auth/GuestClaimHandler";
import { ReferralCapture } from "@/components/referral/ReferralCapture";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MyNewStyle - AI-Powered Hairstyle Consultation",
  description:
    "Discover your perfect hairstyle with AI-powered face shape analysis and personalized recommendations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body className="antialiased">
        <ThemeProvider>
          {children}
          <Toaster />
          {/* Story 8-5: Handles ?claim_guest=1 param after OAuth redirect to trigger guest migration */}
          <Suspense fallback={null}>
            <GuestClaimHandler />
          </Suspense>
          {/* Story 9-5: Captures ?ref=CODE URL param and stores in localStorage for referral attribution */}
          <Suspense fallback={null}>
            <ReferralCapture />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tirar Foto | MyNewStyle",
  description:
    "Tire uma selfie para receber recomendações de corte de cabelo personalizadas com inteligência artificial.",
};

export default function PhotoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

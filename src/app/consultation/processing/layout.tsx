import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Processando... | MyNewStyle',
  description: 'A sua consulta de estilo está a ser processada.',
};

export default function ProcessingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

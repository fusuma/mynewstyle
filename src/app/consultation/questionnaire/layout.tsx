import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Questionário - mynewstyle',
  description: 'Responda algumas perguntas para personalizar sua consultoria de estilo.',
};

export default function QuestionnaireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

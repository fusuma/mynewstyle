'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface EmptyStateProps {
  type: 'consultations' | 'favorites';
}

export function EmptyState({ type }: EmptyStateProps) {
  const router = useRouter();

  if (type === 'consultations') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-4">
        {/* Illustration */}
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
          <span className="text-4xl" role="img" aria-label="espelho">
            🪞
          </span>
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-foreground">
            Ainda nao tem consultorias. Descubra o seu estilo!
          </p>
          <p className="text-sm text-muted-foreground">
            Comece uma análise personalizada para encontrar os estilos ideais para si
          </p>
        </div>
        <Button
          onClick={() => router.push('/start')}
          aria-label="Iniciar consultoria"
        >
          Iniciar consultoria
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-4">
      {/* Illustration */}
      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
        <span className="text-4xl" role="img" aria-label="coração">
          ❤️
        </span>
      </div>
      <div className="space-y-2">
        <p className="text-lg font-semibold text-foreground">
          Guarde os seus estilos favoritos aqui
        </p>
        <p className="text-sm text-muted-foreground">
          Depois de fazer uma consultoria, guarde os estilos de que mais gosta
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() => router.push('/start')}
        aria-label="Fazer consultoria"
      >
        Fazer consultoria
      </Button>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FavoriteCard } from './FavoriteCard';
import { EmptyState } from './EmptyState';
import type { FavoriteItem } from '@/types';

type FetchState = 'idle' | 'loading' | 'success' | 'error';

export function FavoritesTab() {
  const [state, setState] = useState<FetchState>('loading');
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchFavorites = async (signal?: AbortSignal) => {
    setState('loading');
    setErrorMessage(null);
    try {
      const response = await fetch('/api/profile/favorites', { signal });
      if (!response.ok) {
        throw new Error('Erro ao carregar favoritos');
      }
      const data = await response.json();
      setFavorites(data.favorites ?? []);
      setState('success');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Erro ao carregar favoritos';
      setErrorMessage(message);
      setState('error');
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchFavorites(controller.signal);
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loading state: skeleton grid cards
  if (state === 'loading') {
    return (
      <div
        data-testid="favorites-loading"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4"
        aria-label="A carregar favoritos"
        aria-busy="true"
      >
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-2 p-4 border rounded-card">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-4">
        <p className="text-sm text-destructive">{errorMessage}</p>
        <Button variant="outline" onClick={() => fetchFavorites()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  // Empty state
  if (favorites.length === 0) {
    return <EmptyState type="favorites" />;
  }

  // Success: responsive grid with staggered animation
  // 1 col mobile, 2 col tablet+, 3 col desktop
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
      {favorites.map((favorite, index) => (
        <motion.div
          key={favorite.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: index * 0.15 }}
        >
          <FavoriteCard favorite={favorite} />
        </motion.div>
      ))}
    </div>
  );
}

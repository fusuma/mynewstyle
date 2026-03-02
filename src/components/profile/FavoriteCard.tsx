'use client';

import { useRouter } from 'next/navigation';
import { Calendar, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FACE_SHAPE_LABELS } from '@/lib/consultation/face-shape-labels';
import type { FavoriteItem } from '@/types';

interface FavoriteCardProps {
  favorite: FavoriteItem;
}

/**
 * Formats an ISO date string to a human-readable Portuguese date.
 */
function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

export function FavoriteCard({ favorite }: FavoriteCardProps) {
  const router = useRouter();
  const faceShapeLabel = FACE_SHAPE_LABELS[favorite.faceShape] ?? favorite.faceShape;

  const handleClick = () => {
    router.push(`/consultation/results/${favorite.consultationId}`);
  };

  return (
    <Card
      data-testid="favorite-card"
      className="w-full cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`${favorite.styleName} — ver consultoria de ${formatDate(favorite.consultationDate)}`}
    >
      <CardContent className="p-4">
        {/* Style name */}
        <p className="text-base font-semibold text-foreground truncate mb-2">
          {favorite.styleName}
        </p>

        {/* Match score badge */}
        <div className="flex items-center gap-1.5 mb-2">
          <Star className="size-3.5 text-yellow-500 flex-shrink-0" aria-hidden="true" />
          <Badge variant="outline" className="text-xs font-medium">
            {favorite.matchScore}% match
          </Badge>
        </div>

        {/* Face shape badge */}
        <Badge variant="secondary" className="text-xs mb-2">
          {faceShapeLabel}
        </Badge>

        {/* Consultation date */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="size-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{formatDate(favorite.consultationDate)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

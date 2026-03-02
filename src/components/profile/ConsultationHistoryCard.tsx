'use client';

import { useRouter } from 'next/navigation';
import { Calendar, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FACE_SHAPE_LABELS } from '@/lib/consultation/face-shape-labels';
import { formatProfileDate } from '@/lib/profile/format-date';
import type { ConsultationHistoryItem } from '@/types';

interface ConsultationHistoryCardProps {
  consultation: ConsultationHistoryItem;
}

export function ConsultationHistoryCard({ consultation }: ConsultationHistoryCardProps) {
  const router = useRouter();
  const faceShapeLabel = FACE_SHAPE_LABELS[consultation.faceShape] ?? consultation.faceShape;

  const handleViewAgain = () => {
    router.push(`/consultation/results/${consultation.id}`);
  };

  return (
    <Card
      data-testid="consultation-history-card"
      className="w-full"
    >
      <CardContent className="flex items-start gap-4 pt-4">
        {/* Left: Date and face shape info */}
        <div className="flex-1 min-w-0">
          {/* Date */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
            <Calendar className="size-4 flex-shrink-0" aria-hidden="true" />
            <span>{formatProfileDate(consultation.createdAt)}</span>
          </div>

          {/* Face shape badge + gender */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {faceShapeLabel}
            </Badge>
            <span className="text-xs text-muted-foreground capitalize">
              {consultation.gender === 'male' ? 'Masculino' : 'Feminino'}
            </span>
          </div>

          {/* Top recommendation */}
          {consultation.topRecommendation ? (
            <p className="text-sm font-medium text-foreground truncate">
              {consultation.topRecommendation.styleName}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Sem recomendação disponível
            </p>
          )}
        </div>

        {/* Right: Action button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewAgain}
          aria-label={`Ver novamente — consultoria de ${formatProfileDate(consultation.createdAt)}`}
          className="flex-shrink-0"
        >
          <span>Ver novamente</span>
          <ChevronRight className="size-4 ml-1" aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  );
}

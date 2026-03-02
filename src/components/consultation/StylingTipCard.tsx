'use client';

import { Card, CardContent } from '@/components/ui/card';

/**
 * Props for StylingTipCard.
 *
 * AC: #1, #2, #5 (Story 6.6)
 */
interface StylingTipCardProps {
  /** The tip text to display in the card body */
  tipText: string;
  /** Icon name string (e.g. "scissors", "spray-can") — informational only */
  icon: string;
  /** Category label string */
  category: string;
  /**
   * Pre-resolved Lucide icon component to render.
   * Resolved outside of render by the parent to avoid creating components during render.
   */
  IconComponent: React.ComponentType<{
    className?: string;
    'aria-hidden'?: boolean | 'true' | 'false';
    'aria-label'?: string;
  }>;
}

/**
 * StylingTipCard — Individual card for a single styling tip.
 *
 * Visual: icon at 24px accent color, tip body text.
 * Card uses rounded-2xl, standard shadow.
 * Icon is decorative (aria-hidden="true") per WCAG 2.1 AA.
 *
 * AC: #1, #2, #5 (Story 6.6)
 */
export function StylingTipCard({ tipText, IconComponent }: StylingTipCardProps) {
  return (
    // role="listitem" — for accessibility within list context
    <div role="listitem">
      <Card className="rounded-2xl shadow-sm h-full">
        <CardContent className="flex flex-col gap-3 pt-4">
          {/* Icon + tip text row (AC: #2) */}
          <div className="flex items-start gap-3">
            <IconComponent
              className="w-6 h-6 text-accent-foreground shrink-0 mt-0.5"
              aria-hidden="true"
            />

            {/* Tip text body — Inter 400, 16px */}
            <p className="text-base font-normal text-card-foreground leading-snug">
              {tipText}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

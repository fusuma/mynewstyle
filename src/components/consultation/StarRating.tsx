'use client';

import { useState, useCallback, KeyboardEvent } from 'react';
import { Star } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number | null;
  onChange: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  label?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

/**
 * StarRating — Reusable 1-5 star rating input component.
 * Story 10.5: Post-Consultation Rating — AC #1, #9, #10
 *
 * Accessibility:
 * - role="radiogroup" wrapper with aria-label from prop
 * - Each star: role="radio", aria-checked, aria-label="N estrela(s)"
 * - Keyboard: ArrowLeft/ArrowRight to navigate, click to set
 * - Respects prefers-reduced-motion (hover animation disabled when true)
 */
export function StarRating({
  value,
  onChange,
  size = 'md',
  disabled = false,
  label = 'Avaliacao da consultoria',
}: StarRatingProps) {
  const shouldReduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState<number | null>(null);

  const handleClick = useCallback(
    (starValue: number) => {
      if (!disabled) {
        onChange(starValue);
      }
    },
    [disabled, onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      const current = value ?? 0;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onChange(Math.min(5, current + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onChange(Math.max(1, current - 1));
      } else if (e.key === 'Enter' && value !== null) {
        e.preventDefault();
        onChange(value);
      }
    },
    [disabled, value, onChange]
  );

  const effectiveDisplay = hovered !== null && !shouldReduceMotion ? hovered : (value ?? 0);

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('flex items-center gap-1', disabled && 'opacity-50 cursor-not-allowed')}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
    >
      {[1, 2, 3, 4, 5].map((starValue) => {
        const isFilled = starValue <= effectiveDisplay;
        const isChecked = starValue === value;
        const starLabel = starValue === 1 ? '1 estrela' : `${starValue} estrelas`;

        return (
          <button
            key={starValue}
            role="radio"
            aria-label={starLabel}
            aria-checked={isChecked ? 'true' : 'false'}
            type="button"
            disabled={disabled}
            tabIndex={-1}
            className={cn(
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
              'transition-transform',
              !disabled && !shouldReduceMotion && 'hover:scale-110',
              disabled ? 'cursor-not-allowed' : 'cursor-pointer'
            )}
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => {
              if (!shouldReduceMotion && !disabled) setHovered(starValue);
            }}
            onMouseLeave={() => {
              if (!shouldReduceMotion) setHovered(null);
            }}
          >
            <Star
              className={cn(
                sizeClasses[size],
                isFilled
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-muted-foreground',
                'transition-colors'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

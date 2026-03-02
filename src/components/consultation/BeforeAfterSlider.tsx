'use client';

import { useState, useRef, useCallback } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BeforeAfterSliderProps {
  /** The user's original photo URL */
  originalSrc: string;
  /** The AI-generated preview URL */
  previewSrc: string;
  /** Alt text for original image */
  originalAlt?: string;
  /** Alt text for preview image (should include styleName) */
  previewAlt: string;
  /** Optional className for the root container */
  className?: string;
}

/**
 * BeforeAfterSlider — Interactive before/after comparison slider.
 *
 * Features:
 * - Dual-image layout: original photo on left, preview on right
 * - Clip-path reveal: dragging the handle adjusts how much of each image is visible
 * - Draggable handle with 48px touch target (AC: 7)
 * - Pointer events for unified mouse + touch support (AC: 7)
 * - Keyboard support: ArrowLeft/Right (5% increments), Home (0%), End (100%) (AC: 12)
 * - Accessible: role="slider", aria-label, aria-valuemin/max/now (AC: 12)
 * - Initializes at 50% center (AC: 6)
 * - Respects prefers-reduced-motion (AC: 10)
 * - Uses design system tokens (AC: 11)
 *
 * Story 7.5, Task 1
 */
export function BeforeAfterSlider({
  originalSrc,
  previewSrc,
  originalAlt = 'Foto original',
  previewAlt,
  className,
}: BeforeAfterSliderProps) {
  const shouldReduceMotion = useReducedMotion();
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(Math.round(percent));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    // setPointerCapture ensures we keep receiving events even if pointer moves off element
    const target = e.target as HTMLElement;
    if (target.setPointerCapture) {
      target.setPointerCapture(e.pointerId);
    }
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  }, [isDragging, updatePosition]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        setPosition((prev) => Math.min(100, prev + 5));
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setPosition((prev) => Math.max(0, prev - 5));
        break;
      case 'Home':
        e.preventDefault();
        setPosition(0);
        break;
      case 'End':
        e.preventDefault();
        setPosition(100);
        break;
    }
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="before-after-slider-container"
      className={cn('relative w-full overflow-hidden rounded-xl select-none', className)}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ cursor: isDragging ? 'grabbing' : 'col-resize' }}
    >
      {/* Original image — establishes the container height (background layer) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={originalSrc}
        alt={originalAlt}
        className="block w-full object-cover"
        draggable={false}
      />

      {/* Preview image — uses clip-path to reveal left portion up to slider position */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={previewSrc}
        alt={previewAlt}
        className="absolute inset-0 block h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        draggable={false}
      />

      {/* Divider line */}
      <div
        className="absolute inset-y-0 w-0.5 bg-primary/60"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
        aria-hidden="true"
      />

      {/* Drag handle — accessible slider */}
      <div
        data-testid="slider-handle"
        role="slider"
        tabIndex={0}
        aria-label="Comparador antes e depois"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={position}
        aria-valuetext={`${position}% preview`}
        className={cn(
          'absolute top-1/2 -translate-x-1/2 -translate-y-1/2',
          'flex h-12 w-12 items-center justify-center',
          'rounded-full bg-background border-2 border-primary',
          'shadow-md',
          shouldReduceMotion ? 'transition-none' : '',
          'cursor-grab active:cursor-grabbing',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
        )}
        style={{ left: `${position}%` }}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
      >
        {/* Left/Right chevron arrows */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="text-primary"
        >
          <polyline points="15 18 9 12 15 6" />
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>
  );
}

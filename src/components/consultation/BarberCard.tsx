'use client';

import React from 'react';
import type { FaceAnalysisOutput } from '@/lib/ai/schemas';
import type { StyleRecommendation, GroomingTip } from '@/types/index';
import { FACE_SHAPE_LABELS } from '@/lib/consultation/face-shape-labels';

// Gender-themed accent colors for high-contrast card
const ACCENT_COLORS = {
  male: '#F5A623',   // Amber
  female: '#C4787A', // Dusty rose
} as const;

// Difficulty label translations
const DIFFICULTY_LABELS = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
} as const;

interface BarberCardProps {
  faceAnalysis: FaceAnalysisOutput;
  recommendation: StyleRecommendation;
  photoPreview: string;
  previewUrl: string | undefined;
  gender: 'male' | 'female';
  groomingTips: GroomingTip[];
}

/**
 * BarberCard
 *
 * A static render target (390x600px) used as the source for PNG generation.
 * This component is NOT displayed on screen — it is rendered off-screen inside
 * BarberCardRenderer and captured by html-to-image's toPng().
 *
 * Design principles:
 * - Always white background for barbershop readability (regardless of theme)
 * - Dark text (#1A1A2E) for high contrast
 * - Gender-themed accent color for badges/dividers
 * - Clean, print-friendly layout (no shadows or complex borders)
 */
export function BarberCard({
  faceAnalysis,
  recommendation,
  photoPreview,
  previewUrl,
  gender,
  groomingTips,
}: BarberCardProps) {
  const accentColor = ACCENT_COLORS[gender];
  const faceShapeLabel = FACE_SHAPE_LABELS[faceAnalysis.faceShape] ?? faceAnalysis.faceShape;
  const hasPreview = Boolean(previewUrl);

  // Extract style notes (2-3 notes depending on layout)
  const notes = extractStyleNotes(recommendation, groomingTips, hasPreview);

  return (
    // Fixed 390x600 container — consistent PNG output
    <div
      data-testid="barber-card-container"
      style={{
        width: '390px',
        height: '600px',
        backgroundColor: '#FFFFFF',
        color: '#1A1A2E',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Top section: Photo + AI Preview (or centered photo) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: hasPreview ? 'space-between' : 'center',
          marginBottom: '16px',
          gap: '16px',
        }}
      >
        {/* User photo */}
        {/* Note: className intentionally omitted — html-to-image uses SVG foreignObject which
            may not apply Tailwind classes. All sizing is driven by inline styles only. */}
        <img
          data-testid="barber-card-photo"
          src={photoPreview}
          alt="Sua foto"
          style={{
            width: hasPreview ? '120px' : '160px',
            height: hasPreview ? '120px' : '160px',
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0,
            border: `3px solid ${accentColor}`,
          }}
        />

        {/* AI Preview image (only when available) */}
        {hasPreview && previewUrl && (
          <img
            data-testid="barber-card-ai-preview"
            src={previewUrl}
            alt="Preview do estilo"
            style={{
              width: '200px',
              height: '260px',
              objectFit: 'cover',
              borderRadius: '8px',
              flexShrink: 0,
            }}
          />
        )}
      </div>

      {/* Face shape badge */}
      <div style={{ marginBottom: '10px' }}>
        <span
          data-testid="barber-card-face-shape-badge"
          className={gender === 'male' ? 'gender-male' : 'gender-female'}
          style={{
            display: 'inline-block',
            backgroundColor: accentColor,
            // Use dark text on badge — white-on-amber is only 2.03:1 (fails WCAG 4.5:1)
            // Dark #1A1A2E on amber = 8.42:1, dark on dusty rose = 5.13:1 (both pass)
            color: '#1A1A2E',
            fontSize: '14px',
            fontWeight: 600,
            padding: '4px 12px',
            borderRadius: '20px',
          }}
          data-accent={accentColor}
          data-gender={gender}
        >
          Rosto {faceShapeLabel}
        </span>
      </div>

      {/* Divider */}
      <div
        style={{
          height: '2px',
          backgroundColor: accentColor,
          marginBottom: '10px',
          borderRadius: '1px',
        }}
      />

      {/* Style name */}
      <h2
        data-testid="barber-card-style-name"
        style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#1A1A2E',
          margin: '0 0 12px 0',
          lineHeight: 1.2,
        }}
      >
        {recommendation.styleName}
      </h2>

      {/* Style notes */}
      <ul
        data-testid="barber-card-notes"
        style={{
          listStyle: 'none',
          padding: 0,
          margin: '0 0 auto 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {notes.map((note, i) => (
          <li
            key={i}
            style={{
              fontSize: '14px',
              color: '#2D2D3A',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px',
              lineHeight: 1.4,
            }}
          >
            {/* Use dark text color for bullet — accent colors fail 4.5:1 on white (AC#7) */}
            <span style={{ color: '#1A1A2E', fontWeight: 700, flexShrink: 0 }}>•</span>
            <span>{note}</span>
          </li>
        ))}
      </ul>

      {/* Subtle footer */}
      {/* Use #737380 instead of #9999A8: achieves 4.67:1 on white, passes WCAG AA minimum 4.5:1 */}
      <div
        data-testid="barber-card-footer"
        style={{
          marginTop: '12px',
          textAlign: 'center',
          fontSize: '11px',
          color: '#737380',
          borderTop: '1px solid #E5E5EA',
          paddingTop: '8px',
        }}
      >
        mynewstyle.com
      </div>
    </div>
  );
}

/**
 * Extract 2-3 key style notes from the consultation data.
 * Logic per Dev Notes Section "Key Style Notes Extraction Logic":
 * 1. First sentence of justification (the core "why")
 * 2. Difficulty level formatted as "Manutenção: Baixa/Média/Alta"
 * 3. First barber_tips tip (or first routine tip as fallback)
 * 4. Without preview: also add match score and styles-to-avoid note
 */
function extractStyleNotes(
  recommendation: StyleRecommendation,
  groomingTips: GroomingTip[],
  hasPreview: boolean
): string[] {
  const notes: string[] = [];

  // 1. First sentence of justification
  const firstSentence = recommendation.justification.split(/\.\s/)[0];
  if (firstSentence) {
    notes.push(firstSentence.endsWith('.') ? firstSentence : firstSentence + '.');
  }

  // 2. Difficulty level
  const diffLabel = DIFFICULTY_LABELS[recommendation.difficultyLevel] ?? recommendation.difficultyLevel;
  notes.push(`Manutenção: ${diffLabel}`);

  // 3. Barber tip (barber_tips category first, fallback to first routine)
  const barberTip = groomingTips.find((t) => t.category === 'barber_tips');
  const routineTip = groomingTips.find((t) => t.category === 'routine');
  const tipToShow = barberTip ?? routineTip;
  if (tipToShow) {
    notes.push(tipToShow.tipText);
  }

  // 4. Without preview: add match score + additional note
  if (!hasPreview) {
    notes.push(`${recommendation.matchScore}% compatível com o seu rosto`);
  }

  return notes;
}

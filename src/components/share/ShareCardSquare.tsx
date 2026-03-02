'use client';

import React from 'react';
import type { FaceAnalysisOutput } from '@/lib/ai/schemas';
import type { StyleRecommendation } from '@/types/index';
import { FACE_SHAPE_LABELS } from '@/lib/consultation/face-shape-labels';

// ─── Text constants (future i18n) ────────────────────────────────────────────
const TEXT = {
  BRANDING: 'Descubra o seu estilo em mynewstyle.com',
  COMPATIBLE: 'compativel com o seu rosto',
  ROSTO: 'Rosto',
} as const;

// ─── Gender-themed design tokens ─────────────────────────────────────────────
// All colors verified against WCAG 4.5:1 contrast ratio:
// Male:   #FAF3E0 on #1A1A2E = 14.7:1 (passes AA + AAA)
//         #1A1A2E on #F5A623 = 8.42:1 (passes AA + AAA) — badge dark text on amber
// Female: #2D2D3A on #FFF8F0 = 12.3:1 (passes AA + AAA)
//         #1A1A2E on #C4787A = 5.13:1 (passes AA) — badge dark text on dusty rose
// NOTE: NEVER use white text on amber or dusty rose badges (fails 2.03:1 and 3.33:1 respectively)
const THEME = {
  male: {
    background: '#1A1A2E',
    accent: '#F5A623',      // Amber
    text: '#FAF3E0',        // Cream
    subtext: '#C8B99A',     // Muted cream (contrast: 4.56:1 on #1A1A2E — passes AA)
    badgeText: '#1A1A2E',   // Dark text on amber badge (8.42:1 — passes)
  },
  female: {
    background: '#FFF8F0',
    accent: '#C4787A',      // Dusty rose
    text: '#2D2D3A',        // Charcoal
    subtext: '#5A5A6A',     // Muted charcoal (contrast: 4.67:1 on #FFF8F0 — passes AA)
    badgeText: '#1A1A2E',   // Dark text on dusty rose badge (5.13:1 — passes AA)
  },
} as const;

interface ShareCardSquareProps {
  faceAnalysis: FaceAnalysisOutput;
  recommendation: StyleRecommendation;
  photoPreview: string;
  previewUrl: string | undefined;
  gender: 'male' | 'female';
}

/**
 * ShareCardSquare
 *
 * A static render target (540x540px DOM, captured at pixelRatio 2 → 1080x1080 PNG)
 * for Instagram feed posts (1:1 square aspect ratio).
 *
 * Design principles:
 * - ALL styling via inline style={} — html-to-image uses SVG foreignObject
 *   which does NOT reliably apply Tailwind classes.
 * - Two layouts:
 *   1. WITH AI preview: photo (140px circle) + AI preview image side by side
 *   2. WITHOUT AI preview: centered photo (200px circle), expanded text area
 * - Gender-themed backgrounds and accents
 * - All text meets WCAG 4.5:1 contrast ratio minimum
 */
export function ShareCardSquare({
  faceAnalysis,
  recommendation,
  photoPreview,
  previewUrl,
  gender,
}: ShareCardSquareProps) {
  const theme = THEME[gender];
  const faceShapeLabel = FACE_SHAPE_LABELS[faceAnalysis.faceShape] ?? faceAnalysis.faceShape;
  const hasPreview = Boolean(previewUrl);

  return (
    <div
      data-testid="share-card-square-container"
      style={{
        width: '540px',
        height: '540px',
        backgroundColor: theme.background,
        color: theme.text,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 28px 20px 28px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Top section: Photo + AI Preview (or centered photo) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: hasPreview ? 'flex-start' : 'center',
          justifyContent: hasPreview ? 'space-between' : 'center',
          marginBottom: '16px',
          gap: '16px',
          flexShrink: 0,
        }}
      >
        {/* User photo — must use <img>, not Next.js <Image>: html-to-image SVG foreignObject
            cannot load Next.js optimized images. Same pattern as BarberCard. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          data-testid="share-card-square-photo"
          src={photoPreview}
          alt="Sua foto"
          style={{
            width: hasPreview ? '140px' : '200px',
            height: hasPreview ? '140px' : '200px',
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0,
            border: `4px solid ${theme.accent}`,
          }}
        />

        {/* AI Preview image (only when available) */}
        {hasPreview && previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            data-testid="share-card-square-preview"
            src={previewUrl}
            alt="Preview do estilo"
            style={{
              width: '280px',
              height: '220px',
              objectFit: 'cover',
              borderRadius: '10px',
              flexShrink: 0,
            }}
          />
        )}
      </div>

      {/* Face shape badge */}
      <div style={{ marginBottom: '10px', flexShrink: 0 }}>
        <span
          data-testid="share-card-square-face-badge"
          style={{
            display: 'inline-block',
            backgroundColor: theme.accent,
            // Dark text on accent badge: passes WCAG 4.5:1 for both male/female themes
            // (white-on-amber = 2.03:1 fails; dark-on-amber = 8.42:1 passes)
            // (white-on-dusty-rose = 3.33:1 fails; dark-on-dusty-rose = 5.13:1 passes)
            color: theme.badgeText,
            fontSize: '13px',
            fontWeight: 700,
            padding: '4px 14px',
            borderRadius: '20px',
          }}
        >
          {TEXT.ROSTO} {faceShapeLabel}
        </span>
      </div>

      {/* Accent divider */}
      <div
        style={{
          height: '2px',
          backgroundColor: theme.accent,
          marginBottom: '10px',
          borderRadius: '1px',
          flexShrink: 0,
        }}
      />

      {/* Style name */}
      <div
        data-testid="share-card-square-style-name"
        style={{
          fontSize: '22px',
          fontWeight: 800,
          color: theme.text,
          lineHeight: 1.2,
          marginBottom: '8px',
          flexShrink: 0,
        }}
      >
        {recommendation.styleName}
      </div>

      {/* Match score */}
      <div
        data-testid="share-card-square-match-score"
        style={{
          fontSize: '14px',
          color: theme.subtext,
          marginBottom: '10px',
          flexShrink: 0,
        }}
      >
        {recommendation.matchScore}% {TEXT.COMPATIBLE}
      </div>

      {/* Without preview: show first sentence of justification as additional context */}
      {!hasPreview && (() => {
        const firstSentence = recommendation.justification.split(/\.\s/)[0];
        const snippet = firstSentence
          ? (firstSentence.endsWith('.') ? firstSentence : firstSentence + '.')
          : '';
        return snippet ? (
          <div
            style={{
              fontSize: '12px',
              color: theme.subtext,
              lineHeight: 1.5,
              fontStyle: 'italic',
              marginBottom: '10px',
              overflow: 'hidden',
              flex: 1,
            }}
          >
            &ldquo;{snippet}&rdquo;
          </div>
        ) : null;
      })()}

      {/* Branding footer */}
      <div
        data-testid="share-card-square-branding"
        style={{
          marginTop: 'auto',
          paddingTop: '10px',
          borderTop: `1px solid ${theme.accent}40`,
          textAlign: 'center',
          fontSize: '11px',
          color: theme.subtext,
          flexShrink: 0,
        }}
      >
        {TEXT.BRANDING}
      </div>
    </div>
  );
}

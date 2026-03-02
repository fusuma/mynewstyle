'use client';

import React from 'react';
import type { FaceAnalysisOutput } from '@/lib/ai/schemas';
import type { StyleRecommendation } from '@/types/index';
import { FACE_SHAPE_LABELS } from '@/lib/consultation/face-shape-labels';

// ─── Text constants (future i18n) ────────────────────────────────────────────
const TEXT = {
  ANTES: 'ANTES',
  DEPOIS: 'DEPOIS',
  BRANDING: 'Descubra o seu estilo em mynewstyle.com',
  COMPATIBLE: 'compatível',
} as const;

// ─── Gender-themed design tokens ─────────────────────────────────────────────
const THEME = {
  male: {
    background: '#1A1A2E',
    accent: '#F5A623',     // Amber
    text: '#FAF3E0',
    subtext: '#E0D4B8',
    badgeText: '#1A1A2E',
  },
  female: {
    background: '#FFF8F0',
    accent: '#C4787A',     // Dusty rose
    text: '#2D2D3A',
    subtext: '#5A5A6A',
    badgeText: '#FFFFFF',
  },
} as const;

interface ShareCardStoryProps {
  faceAnalysis: FaceAnalysisOutput;
  recommendation: StyleRecommendation;
  photoPreview: string;
  previewUrl: string | undefined;
  gender: 'male' | 'female';
}

/**
 * ShareCardStory
 *
 * A static render target (540x960px DOM, captured at pixelRatio 2 → 1080x1920 PNG)
 * for social story sharing (9:16 aspect ratio, Instagram Stories / WhatsApp Status).
 *
 * Design principles:
 * - ALL styling via inline style={} — html-to-image uses SVG foreignObject
 *   which does NOT reliably apply Tailwind classes.
 * - Two layouts:
 *   1. WITH AI preview: before/after split (ANTES / DEPOIS)
 *   2. WITHOUT AI preview: analysis-only (photo + face shape + recommendation)
 * - Gender-themed backgrounds and accents
 */
export function ShareCardStory({
  faceAnalysis,
  recommendation,
  photoPreview,
  previewUrl,
  gender,
}: ShareCardStoryProps) {
  const theme = THEME[gender];
  const faceShapeLabel = FACE_SHAPE_LABELS[faceAnalysis.faceShape] ?? faceAnalysis.faceShape;
  const hasPreview = Boolean(previewUrl);

  // First sentence of justification for analysis-only layout
  const firstSentence = recommendation.justification.split(/\.\s/)[0];
  const justificationSnippet = firstSentence
    ? (firstSentence.endsWith('.') ? firstSentence : firstSentence + '.')
    : '';

  return (
    <div
      data-testid="share-card-story-container"
      style={{
        width: '540px',
        height: '960px',
        backgroundColor: theme.background,
        color: theme.text,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {hasPreview ? (
        <BeforeAfterLayout
          photoPreview={photoPreview}
          previewUrl={previewUrl!}
          faceShapeLabel={faceShapeLabel}
          recommendation={recommendation}
          theme={theme}
        />
      ) : (
        <AnalysisOnlyLayout
          photoPreview={photoPreview}
          faceShapeLabel={faceShapeLabel}
          recommendation={recommendation}
          justificationSnippet={justificationSnippet}
          theme={theme}
        />
      )}

      {/* Branding footer */}
      <div
        data-testid="share-card-story-branding"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 24px',
          textAlign: 'center',
          fontSize: '13px',
          color: theme.subtext,
          backgroundColor: theme.background,
        }}
      >
        {TEXT.BRANDING}
      </div>
    </div>
  );
}

// ─── Before/After Layout ──────────────────────────────────────────────────────

interface BeforeAfterLayoutProps {
  photoPreview: string;
  previewUrl: string;
  faceShapeLabel: string;
  recommendation: StyleRecommendation;
  theme: typeof THEME['male'] | typeof THEME['female'];
}

function BeforeAfterLayout({
  photoPreview,
  previewUrl,
  faceShapeLabel,
  recommendation,
  theme,
}: BeforeAfterLayoutProps) {
  return (
    <>
      {/* ANTES section — top half */}
      <div
        style={{
          position: 'relative',
          flex: '1 1 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ANTES label */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            backgroundColor: 'rgba(0,0,0,0.55)',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '3px',
            padding: '4px 14px',
            borderRadius: '20px',
          }}
        >
          {TEXT.ANTES}
        </div>

        {/* User photo — must use <img>, not Next.js <Image>: html-to-image SVG foreignObject
            cannot load Next.js optimized images. Same pattern as BarberCard. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          data-testid="share-card-story-user-photo"
          src={photoPreview}
          alt="Foto original"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>

      {/* Face shape badge at split point */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '8px 0',
          zIndex: 20,
          position: 'relative',
        }}
      >
        <span
          data-testid="share-card-story-face-badge"
          style={{
            backgroundColor: theme.accent,
            color: theme.badgeText,
            fontSize: '14px',
            fontWeight: 700,
            padding: '5px 18px',
            borderRadius: '24px',
            letterSpacing: '0.5px',
          }}
        >
          Rosto {faceShapeLabel}
        </span>
      </div>

      {/* DEPOIS section — bottom half */}
      <div
        style={{
          position: 'relative',
          flex: '1 1 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* DEPOIS label */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            backgroundColor: 'rgba(0,0,0,0.55)',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '3px',
            padding: '4px 14px',
            borderRadius: '20px',
          }}
        >
          {TEXT.DEPOIS}
        </div>

        {/* AI Preview image — must use <img>, not Next.js <Image>: html-to-image SVG foreignObject
            cannot load Next.js optimized images. Same pattern as BarberCard. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          data-testid="share-card-story-preview"
          src={previewUrl}
          alt="Preview do estilo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>

      {/* Style name — bottom padding must clear the absolute-positioned branding footer (~51px tall) */}
      <div
        style={{
          padding: '10px 24px 56px 24px',
          textAlign: 'center',
        }}
      >
        <div
          data-testid="share-card-story-style-name"
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: theme.text,
            letterSpacing: '0.5px',
          }}
        >
          {recommendation.styleName}
        </div>
      </div>
    </>
  );
}

// ─── Analysis-Only Layout ─────────────────────────────────────────────────────

interface AnalysisOnlyLayoutProps {
  photoPreview: string;
  faceShapeLabel: string;
  recommendation: StyleRecommendation;
  justificationSnippet: string;
  theme: typeof THEME['male'] | typeof THEME['female'];
}

function AnalysisOnlyLayout({
  photoPreview,
  faceShapeLabel,
  recommendation,
  justificationSnippet,
  theme,
}: AnalysisOnlyLayoutProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        padding: '40px 32px 60px 32px',
        gap: '20px',
        boxSizing: 'border-box',
      }}
    >
      {/* Circular user photo — must use <img>, not Next.js <Image>: html-to-image SVG foreignObject
          cannot load Next.js optimized images. Same pattern as BarberCard. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        data-testid="share-card-story-user-photo"
        src={photoPreview}
        alt="Foto original"
        style={{
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          objectFit: 'cover',
          border: `4px solid ${theme.accent}`,
          flexShrink: 0,
        }}
      />

      {/* Face shape badge */}
      <span
        data-testid="share-card-story-face-badge"
        style={{
          backgroundColor: theme.accent,
          color: theme.badgeText,
          fontSize: '15px',
          fontWeight: 700,
          padding: '6px 20px',
          borderRadius: '24px',
          letterSpacing: '0.5px',
        }}
      >
        Rosto {faceShapeLabel}
      </span>

      {/* Style name (prominent) */}
      <div
        data-testid="share-card-story-style-name"
        style={{
          fontSize: '28px',
          fontWeight: 800,
          color: theme.text,
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {recommendation.styleName}
      </div>

      {/* Match score */}
      <div
        style={{
          fontSize: '16px',
          color: theme.accent,
          fontWeight: 600,
        }}
      >
        {recommendation.matchScore}% {TEXT.COMPATIBLE}
      </div>

      {/* First sentence of justification */}
      {justificationSnippet && (
        <div
          style={{
            fontSize: '14px',
            color: theme.subtext,
            textAlign: 'center',
            lineHeight: 1.5,
            fontStyle: 'italic',
            maxWidth: '420px',
          }}
        >
          &ldquo;{justificationSnippet}&rdquo;
        </div>
      )}
    </div>
  );
}

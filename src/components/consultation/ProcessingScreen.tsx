'use client';

import React, { useState, useEffect } from 'react';

interface ProcessingScreenProps {
  photoPreview: string | null;
}

const EDUCATIONAL_TIPS = [
  'Sabia que existem 7 formatos de rosto?',
  'O visagismo combina ciência com arte para harmonizar o seu visual',
  'Cada formato de rosto tem cortes que criam equilíbrio visual',
];

function FaceMeshOverlay() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 192 192"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Forehead dots */}
      <circle className="animate-pulse" cx="96" cy="30" r="3" fill="currentColor" opacity="0.6" />
      <circle className="animate-pulse" cx="70" cy="38" r="2.5" fill="currentColor" opacity="0.5" style={{ animationDelay: '0.2s' }} />
      <circle className="animate-pulse" cx="122" cy="38" r="2.5" fill="currentColor" opacity="0.5" style={{ animationDelay: '0.4s' }} />
      {/* Cheekbone dots */}
      <circle className="animate-pulse" cx="45" cy="90" r="3" fill="currentColor" opacity="0.6" style={{ animationDelay: '0.6s' }} />
      <circle className="animate-pulse" cx="147" cy="90" r="3" fill="currentColor" opacity="0.6" style={{ animationDelay: '0.8s' }} />
      {/* Jawline dots */}
      <circle className="animate-pulse" cx="60" cy="145" r="2.5" fill="currentColor" opacity="0.5" style={{ animationDelay: '1.0s' }} />
      <circle className="animate-pulse" cx="96" cy="162" r="3" fill="currentColor" opacity="0.6" style={{ animationDelay: '1.2s' }} />
      <circle className="animate-pulse" cx="132" cy="145" r="2.5" fill="currentColor" opacity="0.5" style={{ animationDelay: '1.4s' }} />
      {/* Connecting lines */}
      <line x1="96" y1="30" x2="70" y2="38" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="96" y1="30" x2="122" y2="38" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="70" y1="38" x2="45" y2="90" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="122" y1="38" x2="147" y2="90" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="45" y1="90" x2="60" y2="145" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="147" y1="90" x2="132" y2="145" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="60" y1="145" x2="96" y2="162" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="132" y1="145" x2="96" y2="162" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

function EducationalTip() {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % EDUCATIONAL_TIPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <p className="mt-6 text-sm text-muted-foreground italic px-4">
      {EDUCATIONAL_TIPS[tipIndex]}
    </p>
  );
}

export function ProcessingScreen({ photoPreview }: ProcessingScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      {/* User's photo with animated pulsing glow */}
      {photoPreview && (
        <div className="relative mb-8">
          <div className="animate-pulse rounded-full border-4 border-primary/50 p-1 text-primary">
            <img
              src={photoPreview}
              alt="A sua foto a ser analisada"
              className="h-48 w-48 rounded-full object-cover"
            />
          </div>
          {/* Face mesh overlay dots */}
          <FaceMeshOverlay />
        </div>
      )}
      <h1 className="text-lg font-semibold text-foreground">
        A analisar o formato do seu rosto...
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Normalmente demora menos de 10 segundos
      </p>
      <EducationalTip />
    </div>
  );
}

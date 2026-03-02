'use client';

import type { FaceAnalysisOutput } from '@/lib/ai/schemas';

// SVG paths for each face shape (simplified outlines, viewBox 0 0 100 100)
const FACE_SHAPE_PATHS: Record<FaceAnalysisOutput['faceShape'], string> = {
  oval: 'M50,10 C70,10 85,30 85,55 C85,75 70,95 50,95 C30,95 15,75 15,55 C15,30 30,10 50,10 Z',
  round: 'M50,10 C75,10 90,30 90,50 C90,70 75,90 50,90 C25,90 10,70 10,50 C10,30 25,10 50,10 Z',
  square: 'M20,15 L80,15 C85,15 88,18 88,23 L88,80 C88,85 85,88 80,88 L20,88 C15,88 12,85 12,80 L12,23 C12,18 15,15 20,15 Z',
  oblong: 'M50,5 C68,5 80,20 80,50 C80,75 68,95 50,95 C32,95 20,75 20,50 C20,20 32,5 50,5 Z',
  heart: 'M50,90 C35,75 10,55 10,35 C10,20 25,10 40,10 C45,10 48,12 50,15 C52,12 55,10 60,10 C75,10 90,20 90,35 C90,55 65,75 50,90 Z',
  diamond: 'M50,8 C60,25 88,45 88,50 C88,55 60,75 50,92 C40,75 12,55 12,50 C12,45 40,25 50,8 Z',
  triangle: 'M50,10 C60,10 70,15 75,20 L90,85 C90,88 87,90 85,90 L15,90 C13,90 10,88 10,85 L25,20 C30,15 40,10 50,10 Z',
};

interface FaceShapeOverlayProps {
  photoPreview: string;
  faceShape: FaceAnalysisOutput['faceShape'];
}

export function FaceShapeOverlay({ photoPreview, faceShape }: FaceShapeOverlayProps) {
  const shapePath = FACE_SHAPE_PATHS[faceShape];

  return (
    <div className="relative mx-auto max-w-[280px] md:max-w-[320px]">
      {/* Photo container with 3:4 aspect ratio */}
      <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: '3/4' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoPreview}
          alt="Foto do rosto"
          className="h-full w-full object-cover"
        />
        {/* SVG overlay centered on the photo */}
        <div className="absolute inset-0 flex items-start justify-center pt-[5%]">
          <svg
            viewBox="0 0 100 100"
            className="h-[80%] w-[70%]"
            aria-hidden="true"
            style={{ opacity: 0.5 }}
          >
            <path
              d={shapePath}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

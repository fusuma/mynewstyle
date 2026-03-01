"use client";

import { useState } from "react";
import { PhotoCapture } from "@/components/consultation/PhotoCapture";

/**
 * Photo capture page route: /consultation/photo
 * Renders the PhotoCapture component and stores captured photo in local state.
 * In future stories, this will navigate to photo review (Story 2.5).
 */
export default function PhotoPage() {
  const [capturedPhoto, setCapturedPhoto] = useState<Blob | null>(null);

  const handleCapture = (blob: Blob) => {
    setCapturedPhoto(blob);
    // Future: navigate to photo review screen (Story 2.5)
  };

  if (capturedPhoto) {
    // Placeholder: In Story 2.5, this will show the photo review screen
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <p className="text-foreground">Foto capturada com sucesso!</p>
      </div>
    );
  }

  return <PhotoCapture onCapture={handleCapture} />;
}

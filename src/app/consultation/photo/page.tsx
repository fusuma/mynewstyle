"use client";

import { useState, useCallback } from "react";
import { PhotoCapture } from "@/components/consultation/PhotoCapture";
import { GalleryUpload } from "@/components/consultation/GalleryUpload";

type PhotoMode = "camera" | "gallery";

/**
 * Photo capture page route: /consultation/photo
 * Supports two modes:
 * - camera: Renders PhotoCapture for live camera capture (default)
 * - gallery: Renders GalleryUpload for file picker / drag-and-drop upload
 *
 * Both modes use the same handlePhotoReady handler for the captured/uploaded photo.
 * In future stories, this will navigate to photo review (Story 2.5).
 */
export default function PhotoPage() {
  const [capturedPhoto, setCapturedPhoto] = useState<Blob | null>(null);
  const [mode, setMode] = useState<PhotoMode>("camera");

  const handlePhotoReady = useCallback((blob: Blob) => {
    setCapturedPhoto(blob);
    // Future: navigate to photo review screen (Story 2.5)
  }, []);

  const handleSwitchToGallery = useCallback(() => {
    setMode("gallery");
  }, []);

  const handleSwitchToCamera = useCallback(() => {
    setMode("camera");
  }, []);

  if (capturedPhoto) {
    // Placeholder: In Story 2.5, this will show the photo review screen
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <p className="text-foreground">Foto capturada com sucesso!</p>
      </div>
    );
  }

  if (mode === "gallery") {
    return (
      <GalleryUpload
        onUpload={handlePhotoReady}
        onSwitchToCamera={handleSwitchToCamera}
      />
    );
  }

  return (
    <PhotoCapture
      onCapture={handlePhotoReady}
      onSwitchToGallery={handleSwitchToGallery}
    />
  );
}

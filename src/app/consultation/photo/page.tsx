"use client";

import { useState, useCallback } from "react";
import { PhotoCapture } from "@/components/consultation/PhotoCapture";
import { GalleryUpload } from "@/components/consultation/GalleryUpload";
import { compressPhoto } from "@/lib/photo/compress";
import { Loader2 } from "lucide-react";

type PhotoMode = "camera" | "gallery";
type CompressionState = "idle" | "compressing" | "done" | "error";

/**
 * Photo capture page route: /consultation/photo
 * Supports two modes:
 * - camera: Renders PhotoCapture for live camera capture (default)
 * - gallery: Renders GalleryUpload for file picker / drag-and-drop upload
 *
 * After capture/upload, photos are compressed client-side before storing.
 * Compression uses Canvas API to resize to max 800px width, JPEG 85% quality, <500KB.
 *
 * In future stories, this will navigate to photo review (Story 2.5).
 */
export default function PhotoPage() {
  const [capturedPhoto, setCapturedPhoto] = useState<Blob | null>(null);
  const [mode, setMode] = useState<PhotoMode>("camera");
  const [compressionState, setCompressionState] =
    useState<CompressionState>("idle");
  const [rawBlob, setRawBlob] = useState<Blob | null>(null);

  const handleCompressAndStore = useCallback(async (blob: Blob) => {
    setRawBlob(blob);
    setCompressionState("compressing");

    try {
      const result = await compressPhoto(blob);

      // Log metadata in development mode
      if (process.env.NODE_ENV === "development") {
        console.log("[Photo Compression]", {
          originalSize: `${(result.metadata.originalSizeBytes / 1024).toFixed(1)}KB`,
          compressedSize: `${(result.metadata.compressedSizeBytes / 1024).toFixed(1)}KB`,
          ratio: `${(result.metadata.compressionRatio * 100).toFixed(1)}%`,
          dimensions: `${result.metadata.originalWidth}x${result.metadata.originalHeight} -> ${result.metadata.outputWidth}x${result.metadata.outputHeight}`,
        });
      }

      setCapturedPhoto(result.blob);
      setCompressionState("done");
    } catch {
      setCompressionState("error");
    }
  }, []);

  const handleRetry = useCallback(() => {
    setCompressionState("idle");
    setCapturedPhoto(null);
    setRawBlob(null);
  }, []);

  const handleRetryCompression = useCallback(() => {
    if (rawBlob) {
      handleCompressAndStore(rawBlob);
    } else {
      handleRetry();
    }
  }, [rawBlob, handleCompressAndStore, handleRetry]);

  const handleSwitchToGallery = useCallback(() => {
    setMode("gallery");
  }, []);

  const handleSwitchToCamera = useCallback(() => {
    setMode("camera");
  }, []);

  // Compression loading state
  if (compressionState === "compressing") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-accent" />
        <p className="text-muted-foreground">A otimizar a foto...</p>
      </div>
    );
  }

  // Compression error state
  if (compressionState === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <p className="mb-4 text-foreground">
          Erro ao processar a foto. Tente novamente.
        </p>
        <button
          onClick={handleRetryCompression}
          className="rounded-lg bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

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
        onUpload={handleCompressAndStore}
        onSwitchToCamera={handleSwitchToCamera}
      />
    );
  }

  return (
    <PhotoCapture
      onCapture={handleCompressAndStore}
      onSwitchToGallery={handleSwitchToGallery}
    />
  );
}

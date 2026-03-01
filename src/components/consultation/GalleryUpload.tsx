"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, AlertCircle, Loader2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { validatePhotoFile } from "@/lib/photo/validate-file";
import { correctExifOrientation } from "@/lib/photo/exif";

interface GalleryUploadProps {
  onUpload: (blob: Blob) => void;
  onSwitchToCamera?: () => void;
}

/**
 * Format file size for display.
 * KB for files under 1MB, MB with one decimal for files over 1MB.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Gallery upload component for selecting photos from device gallery.
 * Supports file picker and drag-and-drop with EXIF orientation correction.
 * Requires consent checkbox before upload proceeds.
 *
 * Portuguese (pt-BR) text with correct diacritical marks.
 */
export function GalleryUpload({
  onUpload,
  onSwitchToCamera,
}: GalleryUploadProps) {
  const prefersReducedMotion = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentReminder, setConsentReminder] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Process a valid file: correct EXIF orientation and call onUpload.
   */
  const processFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setError(null);

      try {
        const correctedBlob = await correctExifOrientation(file);
        setIsProcessing(false);
        onUpload(correctedBlob);
      } catch {
        setIsProcessing(false);
        setError("Erro ao processar a foto. Tente novamente.");
      }
    },
    [onUpload]
  );

  /**
   * Handle file selection from input or drop.
   */
  const handleFileSelected = useCallback(
    async (file: File) => {
      setError(null);
      setConsentReminder(false);

      // Validate file
      const result = validatePhotoFile(file);
      if (!result.valid) {
        setError(result.error || "Erro ao processar a foto. Tente novamente.");
        setSelectedFile(null);
        return;
      }

      // Store the file reference
      setSelectedFile(file);

      // Check consent
      if (!consentChecked) {
        setConsentReminder(true);
        return;
      }

      // Process the file
      await processFile(file);
    },
    [consentChecked, processFile]
  );

  /**
   * Handle consent checkbox change.
   * If a file is pending and consent is now given, process it.
   */
  const handleConsentChange = useCallback(
    async (checked: boolean) => {
      setConsentChecked(checked);

      if (checked && selectedFile) {
        setConsentReminder(false);
        await processFile(selectedFile);
      }
    },
    [selectedFile, processFile]
  );

  /**
   * Handle file input change event.
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelected(file);
      }
      // Reset input value to allow re-selecting the same file
      e.target.value = "";
    },
    [handleFileSelected]
  );

  /**
   * Drag-and-drop event handlers.
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelected(file);
      }
    },
    [handleFileSelected]
  );

  /**
   * Handle keyboard activation of drop zone.
   */
  const handleDropZoneKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openFilePicker();
      }
    },
    [openFilePicker]
  );

  const containerVariants = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35, ease: "easeOut" as const },
      };

  return (
    <motion.div
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center"
      {...containerVariants}
    >
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif"
          className="hidden"
          onChange={handleInputChange}
          aria-hidden="true"
          tabIndex={-1}
        />

        {/* Drag-and-drop zone */}
        <div
          data-testid="drop-zone"
          role="button"
          tabIndex={0}
          aria-label="Arraste a sua foto aqui ou clique para selecionar"
          className={`flex w-full cursor-pointer flex-col items-center gap-4 rounded-lg border-2 border-dashed p-8 transition-colors ${
            isDragOver
              ? "border-accent bg-accent/10"
              : "border-border bg-muted/50 hover:border-muted-foreground"
          }`}
          onClick={openFilePicker}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onKeyDown={handleDropZoneKeyDown}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
            <Upload
              className="h-6 w-6 text-accent"
              aria-hidden="true"
            />
          </div>

          {isDragOver ? (
            <p className="text-sm font-medium text-accent">
              Solte a foto aqui
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Arraste a sua foto aqui ou clique para selecionar
            </p>
          )}
        </div>

        {/* File info display */}
        {selectedFile && !error && (
          <p className="text-sm text-muted-foreground">
            {selectedFile.name} ({formatFileSize(selectedFile.size)})
          </p>
        )}

        {/* Loading state */}
        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2
              className="h-4 w-4 animate-spin"
              aria-hidden="true"
            />
            <span>A processar a foto...</span>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Consent reminder */}
        {consentReminder && !error && (
          <div
            role="alert"
            className="text-sm text-destructive"
          >
            Por favor, confirme que a foto é sua antes de continuar
          </div>
        )}

        {/* Consent checkbox */}
        <label className="flex items-start gap-3 text-left">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => handleConsentChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-accent accent-accent focus:ring-accent"
            aria-label="Confirmo que esta foto é minha e consinto no seu processamento"
          />
          <span className="text-sm text-muted-foreground">
            Confirmo que esta foto é minha e consinto no seu processamento
          </span>
        </label>

        {/* Upload button */}
        <Button
          onClick={openFilePicker}
          size="lg"
          className="w-full"
          aria-label="Escolher foto da galeria"
          disabled={isProcessing}
        >
          <Upload className="h-5 w-5" aria-hidden="true" />
          Escolher foto da galeria
        </Button>

        {/* Switch to camera link */}
        {onSwitchToCamera && (
          <button
            onClick={onSwitchToCamera}
            className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            aria-label="Prefiro usar a câmera"
          >
            Prefiro usar a câmera
          </button>
        )}
      </div>
    </motion.div>
  );
}

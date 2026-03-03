"use client";

import { Camera } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface CameraPermissionPromptProps {
  onRequestPermission: () => void;
  onUploadFromGallery?: () => void;
}

/**
 * Pre-permission explanation screen shown before requesting camera access.
 * Explains why camera is needed and reassures privacy.
 * Portuguese (pt-BR) text with correct diacritical marks.
 */
export function CameraPermissionPrompt({
  onRequestPermission,
  onUploadFromGallery,
}: CameraPermissionPromptProps) {
  const prefersReducedMotion = useReducedMotion();

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
      <div className="mx-auto flex max-w-sm flex-col items-center gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
          <Camera className="h-10 w-10 text-accent" aria-hidden="true" />
        </div>

        <div className="space-y-3">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Precisamos da sua câmera
          </h1>
          <p className="text-base text-muted-foreground">
            Para analisar o seu rosto, precisamos de uma foto. A sua foto é
            processada com segurança e nunca é partilhada.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Button
            onClick={onRequestPermission}
            size="lg"
            className="w-full"
            aria-label="Permitir Câmera"
          >
            Permitir Câmera
          </Button>

          <button
            onClick={onUploadFromGallery}
            disabled={!onUploadFromGallery}
            className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Prefiro enviar uma foto da galeria"
          >
            Prefiro enviar uma foto da galeria
          </button>
        </div>
      </div>
    </motion.div>
  );
}

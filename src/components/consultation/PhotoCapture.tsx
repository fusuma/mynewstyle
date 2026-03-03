"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, RefreshCw, AlertTriangle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCamera, type CameraError } from "@/hooks/useCamera";
import { isInAppBrowser } from "@/lib/photo/detect-webview";
import { CameraPermissionPrompt } from "./CameraPermissionPrompt";
import { WebViewBlocker } from "./WebViewBlocker";
import { FaceOvalOverlay } from "./FaceOvalOverlay";
import { CameraGuidanceTips } from "./CameraGuidanceTips";
import { trackEvent } from "@/lib/analytics/tracker";
import { AnalyticsEventType } from "@/lib/analytics/types";

type CaptureState =
  | "webview-blocked"
  | "pre-permission"
  | "camera-active"
  | "error";

interface PhotoCaptureProps {
  onCapture?: (blob: Blob) => void;
  onSwitchToGallery?: () => void;
  /**
   * When false, the capture button is disabled until the user checks the
   * LGPD consent checkbox on the parent photo page. Story 11.2.
   */
  consentChecked?: boolean;
}

/**
 * Error messages in Portuguese (pt-BR) with correct diacritical marks.
 */
function getErrorMessage(error: CameraError): string {
  switch (error) {
    case "permission-denied":
      return "Acesso à câmera foi negado. Ative a câmera nas configurações do seu navegador.";
    case "not-found":
      return "Nenhuma câmera encontrada no dispositivo.";
    case "not-readable":
      return "A câmera está sendo usada por outro aplicativo. Feche outros aplicativos e tente novamente.";
    case "overconstrained":
      return "Erro ao acessar a câmera. Tente novamente.";
    default:
      return "Erro ao acessar a câmera. Tente novamente.";
  }
}

/**
 * Main photo capture component.
 * State machine: webview-blocked -> pre-permission -> camera-active -> error
 *
 * Handles camera lifecycle, WebView detection, permission prompts,
 * face oval overlay, guidance tips, and photo capture.
 */
export function PhotoCapture({ onCapture, onSwitchToGallery, consentChecked = true }: PhotoCaptureProps) {
  const prefersReducedMotion = useReducedMotion();
  const {
    stream,
    error,
    isLoading,
    facingMode,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
  } = useCamera();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [captureState, setCaptureState] = useState<CaptureState>(() => {
    if (typeof navigator !== "undefined" && isInAppBrowser()) {
      return "webview-blocked";
    }
    return "pre-permission";
  });
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Check if camera permission is already granted (skip pre-permission screen)
  useEffect(() => {
    if (captureState !== "pre-permission") return;

    async function checkExistingPermission() {
      try {
        if (typeof navigator !== "undefined" && navigator.permissions) {
          const result = await navigator.permissions.query({
            name: "camera" as PermissionName,
          });
          if (result.state === "granted") {
            setCaptureState("camera-active");
            startCamera();
          }
        }
      } catch {
        // Permissions API not supported (e.g. Safari) - show prompt as fallback
      }
    }
    checkExistingPermission();
  }, [captureState, startCamera]);

  // Check for multiple cameras
  useEffect(() => {
    async function checkCameras() {
      try {
        if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === "videoinput");
          setHasMultipleCameras(videoInputs.length > 1);
        }
      } catch {
        // Silently fail - don't show switch button
      }
    }
    checkCameras();
  }, []);

  // Assign stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Handle errors from useCamera
  useEffect(() => {
    if (error) {
      setCaptureState("error");
    }
  }, [error]);

  const handleRequestPermission = useCallback(async () => {
    setCaptureState("camera-active");
    await startCamera();
  }, [startCamera]);

  const handleRetry = useCallback(async () => {
    setCaptureState("camera-active");
    await startCamera();
  }, [startCamera]);

  const handleCapture = useCallback(async () => {
    const blob = await capturePhoto(videoRef);
    if (blob) {
      stopCamera();
      trackEvent(AnalyticsEventType.PHOTO_CAPTURED, {
        method: 'camera',
        sizeKb: Math.round(blob.size / 1024),
      });
      onCapture?.(blob);
    } else {
      trackEvent(AnalyticsEventType.PHOTO_REJECTED, { reason: 'capture_failed' });
    }
  }, [capturePhoto, stopCamera, onCapture]);

  // Render based on state machine
  if (captureState === "webview-blocked") {
    return <WebViewBlocker />;
  }

  if (captureState === "pre-permission") {
    return (
      <CameraPermissionPrompt
        onRequestPermission={handleRequestPermission}
        onUploadFromGallery={onSwitchToGallery}
      />
    );
  }

  if (captureState === "error" && error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle
              className="h-10 w-10 text-destructive"
              aria-hidden="true"
            />
          </div>

          <div className="space-y-3">
            <p className="text-base text-muted-foreground" role="alert">
              {getErrorMessage(error)}
            </p>
          </div>

          <Button
            onClick={handleRetry}
            size="lg"
            className="w-full"
            aria-label="Tentar novamente"
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  // camera-active state
  return (
    <div
      className="relative flex h-dvh max-h-screen flex-col bg-black"
      data-testid="camera-viewfinder"
    >
      {/* Camera switch button */}
      {hasMultipleCameras && (
        <div className="absolute right-4 top-4 z-20">
          <button
            onClick={switchCamera}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Alternar câmera"
            type="button"
          >
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Video viewfinder */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
          style={{
            transform: facingMode === "user" ? "scaleX(-1)" : "none",
          }}
          data-testid="camera-video"
        />

        {/* Face oval overlay */}
        <FaceOvalOverlay />
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 flex flex-col items-center gap-2 bg-background/90 px-6 pb-8 pt-4 backdrop-blur-sm">
        {/* Guidance tips */}
        <CameraGuidanceTips />

        {/* Capture button — disabled until LGPD consent is given (Story 11.2) */}
        <motion.button
          onClick={handleCapture}
          disabled={isLoading || !stream || !consentChecked}
          className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-foreground bg-foreground/10 text-foreground transition-colors hover:bg-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 md:h-[72px] md:w-[72px]"
          aria-label="Capturar foto"
          type="button"
          whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
          transition={{ duration: 0.1 }}
        >
          <Camera className="h-6 w-6 md:h-7 md:w-7" aria-hidden="true" />
        </motion.button>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50">
          <div className="text-sm text-white">Carregando câmera...</div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { GripVertical } from "lucide-react";

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt: string;
  afterAlt: string;
  /** Width of the source images in pixels */
  width?: number;
  /** Height of the source images in pixels */
  height?: number;
}

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt,
  afterAlt,
  width = 800,
  height = 1000,
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const updatePosition = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const percentage = ((clientX - rect.left) / rect.width) * 100;
      setPosition(clamp(percentage, 0, 100));
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      updatePosition(e.clientX);
    },
    [updatePosition]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setIsDragging(true);
      updatePosition(e.touches[0].clientX);
    },
    [updatePosition]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = 5;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPosition((prev) => clamp(prev - step, 0, 100));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setPosition((prev) => clamp(prev + step, 0, 100));
      }
    },
    []
  );

  useEffect(() => {
    if (!isDragging) return;

    // Prevent text selection and show grabbing cursor during drag
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    const handleMouseMove = (e: MouseEvent) => {
      updatePosition(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      updatePosition(e.touches[0].clientX);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging, updatePosition]);

  return (
    <div
      ref={containerRef}
      data-testid="before-after-slider"
      className="relative w-full cursor-col-resize select-none overflow-hidden rounded-card shadow-card"
      style={{ touchAction: "pan-y", aspectRatio: `${width} / ${height}` }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Before image (full, bottom layer) */}
      <Image
        src={beforeSrc}
        alt={beforeAlt}
        width={width}
        height={height}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
        priority
      />

      {/* After image (clipped, top layer) */}
      <div
        className="absolute inset-0 will-change-[clip-path]"
        style={{
          clipPath: `inset(0 ${100 - position}% 0 0)`,
        }}
      >
        <Image
          src={afterSrc}
          alt={afterAlt}
          width={width}
          height={height}
          className="h-full w-full object-cover"
          draggable={false}
          priority
        />
      </div>

      {/* Divider line */}
      <div
        className="pointer-events-none absolute inset-y-0 z-10"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        <div className="h-full w-0.5 bg-accent shadow-sm" />
      </div>

      {/* Drag handle */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="Comparação antes e depois"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        onKeyDown={handleKeyDown}
        className="absolute z-20 flex h-12 w-12 cursor-grab items-center justify-center rounded-full border-2 border-accent bg-background shadow-md active:cursor-grabbing"
        style={{
          left: `${position}%`,
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <GripVertical
          className="h-5 w-5 text-accent"
          aria-hidden="true"
          strokeWidth={1.5}
        />
      </div>

      {/* Labels */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-between px-3">
        <span className="font-body rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur-sm">
          Antes
        </span>
        <span className="font-body rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur-sm">
          Depois
        </span>
      </div>
    </div>
  );
}

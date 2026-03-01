import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ============================================================
// Mock framer-motion to avoid animation issues in tests
// ============================================================
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      // Filter out framer-motion specific props
      const {
        initial,
        animate,
        transition,
        whileTap,
        ...htmlProps
      } = props;
      return <div {...htmlProps}>{children}</div>;
    },
  },
  useReducedMotion: () => false,
}));

// ============================================================
// Import component after mocks
// ============================================================
import { PhotoReview } from "@/components/consultation/PhotoReview";
import type { PhotoValidationResult } from "@/lib/photo/validate";

// ============================================================
// Helpers / Fixtures
// ============================================================

const mockObjectUrl = "blob:mock-photo-url";

function createValidResult(overrides?: Partial<PhotoValidationResult>): PhotoValidationResult {
  return {
    valid: true,
    status: "valid",
    faces: [
      {
        boundingBox: { x: 10, y: 10, width: 200, height: 200 },
        keypoints: [],
        confidence: 0.92,
      },
    ],
    message: "Rosto detectado com sucesso!",
    details: { faceCount: 1, faceAreaPercent: 45.2, confidenceScore: 0.92 },
    ...overrides,
  };
}

function createMediumConfidenceResult(): PhotoValidationResult {
  return createValidResult({
    details: { faceCount: 1, faceAreaPercent: 40.0, confidenceScore: 0.72 },
  });
}

function createLowConfidenceResult(): PhotoValidationResult {
  return createValidResult({
    details: { faceCount: 1, faceAreaPercent: 35.0, confidenceScore: 0.55 },
  });
}

function createPhotoBlob(): Blob {
  return new Blob(["fake-image-data"], { type: "image/jpeg" });
}

const defaultProps = {
  photo: createPhotoBlob(),
  validationResult: createValidResult(),
  isOverridden: false,
  onConfirm: vi.fn(),
  onRetake: vi.fn(),
};

// ============================================================
// Setup / Teardown
// ============================================================

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(URL, "createObjectURL").mockReturnValue(mockObjectUrl);
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================
// Tests
// ============================================================

describe("PhotoReview", () => {
  // ----------------------------------------------------------
  // AC1: Photo displayed with correct border radius
  // ----------------------------------------------------------
  it("displays photo with correct border radius class (rounded-[20px])", async () => {
    render(<PhotoReview {...defaultProps} />);

    const img = await waitFor(() => screen.getByAltText("Foto para revis\u00e3o"));
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toBe(mockObjectUrl);

    // Check the container has the 20px border radius
    const container = img.closest("div");
    expect(container?.className).toContain("rounded-[20px]");
    expect(container?.className).toContain("overflow-hidden");
  });

  // ----------------------------------------------------------
  // AC2: "Usar esta foto" primary button present
  // ----------------------------------------------------------
  it('shows "Usar esta foto" primary button', () => {
    render(<PhotoReview {...defaultProps} />);

    const button = screen.getByRole("button", { name: /Usar esta foto/i });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("bg-accent");
  });

  // ----------------------------------------------------------
  // AC3: "Tirar outra" secondary button present
  // ----------------------------------------------------------
  it('shows "Tirar outra" secondary button', () => {
    render(<PhotoReview {...defaultProps} />);

    const button = screen.getByRole("button", { name: /Tirar outra/i });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("border");
  });

  // ----------------------------------------------------------
  // AC4: Green validation badge when validation passed
  // ----------------------------------------------------------
  it("shows green validation badge when validation passed", () => {
    render(<PhotoReview {...defaultProps} />);

    expect(screen.getByText("Rosto detectado")).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // AC4: Shows confidence quality indicator (Alta)
  // ----------------------------------------------------------
  it("shows high quality indicator for high confidence score", () => {
    render(<PhotoReview {...defaultProps} validationResult={createValidResult()} />);

    expect(screen.getByText(/Qualidade: Alta/)).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // AC4: Shows medium quality indicator
  // ----------------------------------------------------------
  it("shows medium quality indicator for medium confidence score", () => {
    render(
      <PhotoReview {...defaultProps} validationResult={createMediumConfidenceResult()} />
    );

    expect(screen.getByText(/Qualidade: M\u00e9dia/)).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // AC4: Shows low quality indicator
  // ----------------------------------------------------------
  it("shows low quality indicator for low confidence score", () => {
    render(
      <PhotoReview {...defaultProps} validationResult={createLowConfidenceResult()} />
    );

    expect(screen.getByText(/Qualidade: Baixa/)).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // AC4: Shows face area percentage
  // ----------------------------------------------------------
  it("shows face area percentage from validation details", () => {
    render(<PhotoReview {...defaultProps} validationResult={createValidResult()} />);

    expect(screen.getByText(/rea do rosto: 45%/)).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // AC12: Warning badge when validation was overridden
  // ----------------------------------------------------------
  it("shows warning badge when validation was overridden", () => {
    render(
      <PhotoReview
        {...defaultProps}
        isOverridden={true}
        validationResult={null}
      />
    );

    expect(screen.getByText("Valida\u00e7\u00e3o ignorada")).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // Confirm button calls onConfirm callback
  // ----------------------------------------------------------
  it("confirm button calls onConfirm callback", () => {
    const onConfirm = vi.fn();
    render(<PhotoReview {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: /Usar esta foto/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------------
  // Retake button calls onRetake callback
  // ----------------------------------------------------------
  it("retake button calls onRetake callback", () => {
    const onRetake = vi.fn();
    render(<PhotoReview {...defaultProps} onRetake={onRetake} />);

    fireEvent.click(screen.getByRole("button", { name: /Tirar outra/i }));
    expect(onRetake).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------------
  // AC5: Buttons positioned at bottom of viewport
  // ----------------------------------------------------------
  it("buttons are positioned at bottom of viewport (fixed bottom)", () => {
    render(<PhotoReview {...defaultProps} />);

    const confirmButton = screen.getByRole("button", { name: /Usar esta foto/i });
    const buttonContainer = confirmButton.closest(
      "div[class*='fixed'][class*='bottom-0']"
    );
    expect(buttonContainer).not.toBeNull();
    expect(buttonContainer?.className).toContain("fixed");
    expect(buttonContainer?.className).toContain("bottom-0");
  });

  // ----------------------------------------------------------
  // AC8: Portuguese text with correct diacritical marks
  // ----------------------------------------------------------
  it("displays Portuguese text with correct diacritical marks", () => {
    render(
      <PhotoReview
        {...defaultProps}
        isOverridden={true}
        validationResult={null}
      />
    );

    const warningText = screen.getByText("Valida\u00e7\u00e3o ignorada");
    expect(warningText).toBeInTheDocument();
    // Verify diacritics
    expect(warningText.textContent).toContain("\u00e7"); // c-cedilla
    expect(warningText.textContent).toContain("\u00e3"); // a-tilde
  });

  // ----------------------------------------------------------
  // AC10: ARIA labels present on interactive elements
  // ----------------------------------------------------------
  it("has ARIA labels on interactive elements", () => {
    render(<PhotoReview {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: /Usar esta foto/i })
    ).toHaveAttribute("aria-label");
    expect(
      screen.getByRole("button", { name: /Tirar outra/i })
    ).toHaveAttribute("aria-label");
  });

  // ----------------------------------------------------------
  // Handles null validationResult gracefully
  // ----------------------------------------------------------
  it("handles null validationResult gracefully (no badge shown when not overridden)", () => {
    render(
      <PhotoReview
        {...defaultProps}
        validationResult={null}
        isOverridden={false}
      />
    );

    // Should not show any validation badge text
    expect(screen.queryByText("Rosto detectado")).not.toBeInTheDocument();
    expect(screen.queryByText("Valida\u00e7\u00e3o ignorada")).not.toBeInTheDocument();
    expect(screen.queryByText(/Qualidade:/)).not.toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // AC10: Validation badge has aria-live for screen readers
  // ----------------------------------------------------------
  it("validation badge container has role=status and aria-live=polite", () => {
    render(<PhotoReview {...defaultProps} />);

    const statusRegion = screen.getByRole("status");
    expect(statusRegion).toBeInTheDocument();
    expect(statusRegion).toHaveAttribute("aria-live", "polite");
  });

  // ----------------------------------------------------------
  // AC5: Buttons have minimum 48px touch target
  // ----------------------------------------------------------
  it("buttons have min-h-[48px] class for touch target", () => {
    render(<PhotoReview {...defaultProps} />);

    const confirmButton = screen.getByRole("button", { name: /Usar esta foto/i });
    const retakeButton = screen.getByRole("button", { name: /Tirar outra/i });
    expect(confirmButton.className).toContain("min-h-[48px]");
    expect(retakeButton.className).toContain("min-h-[48px]");
  });

  // ----------------------------------------------------------
  // AC7: Uses design system theme tokens
  // ----------------------------------------------------------
  it("uses design system theme tokens (bg-background, text-foreground)", () => {
    render(<PhotoReview {...defaultProps} />);

    const reviewContainer = screen.getByTestId("photo-review");
    expect(reviewContainer.className).toContain("bg-background");
  });

  // ----------------------------------------------------------
  // Object URL cleanup on unmount
  // ----------------------------------------------------------
  it("cleans up object URL on unmount", () => {
    const { unmount } = render(<PhotoReview {...defaultProps} />);

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockObjectUrl);
  });
});

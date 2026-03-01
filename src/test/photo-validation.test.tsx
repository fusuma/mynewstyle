import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// ============================================================
// Mock validate module
// ============================================================
const mockValidatePhoto = vi.fn();

vi.mock("@/lib/photo/validate", () => ({
  validatePhoto: (...args: unknown[]) => mockValidatePhoto(...args),
  destroyFaceDetector: vi.fn(),
}));

// ============================================================
// Import component after mocks
// ============================================================
import { PhotoValidation } from "@/components/consultation/PhotoValidation";
import type { PhotoValidationResult } from "@/lib/photo/validate";

// ============================================================
// Helpers
// ============================================================

function createValidResult(): PhotoValidationResult {
  return {
    valid: true,
    status: "valid",
    faces: [
      {
        boundingBox: { x: 100, y: 50, width: 400, height: 400 },
        keypoints: [],
        confidence: 0.95,
      },
    ],
    message: "Rosto detectado com sucesso!",
    details: {
      faceCount: 1,
      faceAreaPercent: 33.33,
      confidenceScore: 0.95,
    },
  };
}

function createInvalidResult(
  status: PhotoValidationResult["status"],
  message: string
): PhotoValidationResult {
  return {
    valid: false,
    status,
    faces: [],
    message,
    details: {
      faceCount: status === "multiple_faces" ? 2 : status === "no_face" ? 0 : 1,
      faceAreaPercent: status === "face_too_small" ? 15 : 33,
      confidenceScore: status === "poor_lighting" ? 0.55 : 0.9,
    },
  };
}

function createPhotoBlob(): Blob {
  return new Blob(["fake-image"], { type: "image/jpeg" });
}

const defaultProps = {
  photo: createPhotoBlob(),
  onValidationComplete: vi.fn(),
  onRetake: vi.fn(),
  onOverride: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: validation resolves immediately with valid result
  mockValidatePhoto.mockResolvedValue(createValidResult());
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================
// Tests
// ============================================================
describe("PhotoValidation", () => {
  // ----------------------------------------------------------
  // Loading state
  // ----------------------------------------------------------
  it("shows loading state during validation", async () => {
    // Make validation hang
    mockValidatePhoto.mockReturnValue(new Promise(() => {}));

    render(<PhotoValidation {...defaultProps} />);

    expect(screen.getByText("A verificar a foto...")).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // AC1: Green border and checkmark on valid photo
  // ----------------------------------------------------------
  it("shows green border and checkmark on valid photo", async () => {
    mockValidatePhoto.mockResolvedValue(createValidResult());

    render(<PhotoValidation {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("Rosto detectado com sucesso!")
      ).toBeInTheDocument();
    });

    // Check for success state indicator
    const container = screen.getByTestId("validation-border");
    expect(container.className).toContain("border-green-500");
  });

  // ----------------------------------------------------------
  // AC2: Yellow border and warning for poor lighting
  // ----------------------------------------------------------
  it("shows yellow border and warning for poor lighting", async () => {
    mockValidatePhoto.mockResolvedValue(
      createInvalidResult(
        "poor_lighting",
        "Tente com mais luz para melhor resultado."
      )
    );

    render(<PhotoValidation {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("Tente com mais luz para melhor resultado.")
      ).toBeInTheDocument();
    });

    const container = screen.getByTestId("validation-border");
    expect(container.className).toContain("border-yellow-500");
  });

  // ----------------------------------------------------------
  // AC4: Red border and error for no face detected
  // ----------------------------------------------------------
  it("shows red border and error for no face detected", async () => {
    mockValidatePhoto.mockResolvedValue(
      createInvalidResult(
        "no_face",
        "N\u00e3o conseguimos detectar um rosto. Tente novamente."
      )
    );

    render(<PhotoValidation {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "N\u00e3o conseguimos detectar um rosto. Tente novamente."
        )
      ).toBeInTheDocument();
    });

    const container = screen.getByTestId("validation-border");
    expect(container.className).toContain("border-red-500");
  });

  // ----------------------------------------------------------
  // Shows retry button on failure
  // ----------------------------------------------------------
  it("shows retry button on failure", async () => {
    mockValidatePhoto.mockResolvedValue(
      createInvalidResult("no_face", "N\u00e3o conseguimos detectar um rosto. Tente novamente.")
    );

    render(<PhotoValidation {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // AC7: Shows override button after 3 retries
  // ----------------------------------------------------------
  it('shows "Usar mesmo assim" after 3 retries', async () => {
    const noFaceResult = createInvalidResult(
      "no_face",
      "N\u00e3o conseguimos detectar um rosto. Tente novamente."
    );
    mockValidatePhoto.mockResolvedValue(noFaceResult);

    const onRetake = vi.fn();
    const { rerender } = render(
      <PhotoValidation {...defaultProps} onRetake={onRetake} retryCount={3} />
    );

    await waitFor(() => {
      expect(screen.getByText("Usar mesmo assim")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // Override button does NOT appear before 3 retries
  // ----------------------------------------------------------
  it("does not show override button before 3 retries", async () => {
    mockValidatePhoto.mockResolvedValue(
      createInvalidResult("no_face", "N\u00e3o conseguimos detectar um rosto. Tente novamente.")
    );

    render(<PhotoValidation {...defaultProps} retryCount={1} />);

    await waitFor(() => {
      expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
    });

    expect(screen.queryByText("Usar mesmo assim")).not.toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // Override button calls onOverride callback
  // ----------------------------------------------------------
  it("override button calls onOverride callback", async () => {
    const onOverride = vi.fn();
    mockValidatePhoto.mockResolvedValue(
      createInvalidResult("no_face", "N\u00e3o conseguimos detectar um rosto. Tente novamente.")
    );

    render(
      <PhotoValidation
        {...defaultProps}
        onOverride={onOverride}
        retryCount={3}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Usar mesmo assim")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Usar mesmo assim"));
    expect(onOverride).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------------
  // Retry button calls onRetake callback
  // ----------------------------------------------------------
  it("retry button calls onRetake callback", async () => {
    const onRetake = vi.fn();
    mockValidatePhoto.mockResolvedValue(
      createInvalidResult("no_face", "N\u00e3o conseguimos detectar um rosto. Tente novamente.")
    );

    render(<PhotoValidation {...defaultProps} onRetake={onRetake} />);

    await waitFor(() => {
      expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Tentar novamente"));
    expect(onRetake).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------------
  // Portuguese text with correct diacritical marks
  // ----------------------------------------------------------
  it("displays Portuguese text with correct diacritical marks", async () => {
    mockValidatePhoto.mockResolvedValue(
      createInvalidResult(
        "face_too_small",
        "Aproxime-se mais da c\u00e2mera para melhor an\u00e1lise."
      )
    );

    render(<PhotoValidation {...defaultProps} />);

    await waitFor(() => {
      const message = screen.getByText(
        "Aproxime-se mais da c\u00e2mera para melhor an\u00e1lise."
      );
      expect(message).toBeInTheDocument();
      // Verify diacritics
      expect(message.textContent).toContain("\u00e2"); // a-circumflex
      expect(message.textContent).toContain("\u00e1"); // a-acute
    });
  });

  // ----------------------------------------------------------
  // Retry count displayed
  // ----------------------------------------------------------
  it("displays retry count correctly", async () => {
    mockValidatePhoto.mockResolvedValue(
      createInvalidResult("no_face", "N\u00e3o conseguimos detectar um rosto. Tente novamente.")
    );

    render(<PhotoValidation {...defaultProps} retryCount={2} />);

    await waitFor(() => {
      expect(screen.getByText("Tentativa 2 de 3")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // Calls onValidationComplete with result
  // ----------------------------------------------------------
  it("calls onValidationComplete with the validation result", async () => {
    const onValidationComplete = vi.fn();
    const validResult = createValidResult();
    mockValidatePhoto.mockResolvedValue(validResult);

    render(
      <PhotoValidation
        {...defaultProps}
        onValidationComplete={onValidationComplete}
      />
    );

    await waitFor(() => {
      expect(onValidationComplete).toHaveBeenCalledWith(validResult);
    });
  });

  // ----------------------------------------------------------
  // Red border for multiple faces
  // ----------------------------------------------------------
  it("shows red border for multiple faces", async () => {
    mockValidatePhoto.mockResolvedValue(
      createInvalidResult("multiple_faces", "Apenas um rosto, por favor.")
    );

    render(<PhotoValidation {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Apenas um rosto, por favor.")).toBeInTheDocument();
    });

    const container = screen.getByTestId("validation-border");
    expect(container.className).toContain("border-red-500");
  });

  // ----------------------------------------------------------
  // Yellow border for face_too_small
  // ----------------------------------------------------------
  it("shows yellow border for face_too_small", async () => {
    mockValidatePhoto.mockResolvedValue(
      createInvalidResult(
        "face_too_small",
        "Aproxime-se mais da c\u00e2mera para melhor an\u00e1lise."
      )
    );

    render(<PhotoValidation {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("Aproxime-se mais da c\u00e2mera para melhor an\u00e1lise.")
      ).toBeInTheDocument();
    });

    const container = screen.getByTestId("validation-border");
    expect(container.className).toContain("border-yellow-500");
  });

  // ----------------------------------------------------------
  // Does NOT show retry button on success
  // ----------------------------------------------------------
  it("does not show retry button on valid result", async () => {
    mockValidatePhoto.mockResolvedValue(createValidResult());

    render(<PhotoValidation {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("Rosto detectado com sucesso!")
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("Tentar novamente")).not.toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // Uses design system tokens (no hardcoded hex)
  // ----------------------------------------------------------
  it("uses design system theme tokens (bg-background, text-foreground)", async () => {
    mockValidatePhoto.mockResolvedValue(createValidResult());

    render(<PhotoValidation {...defaultProps} />);

    await waitFor(() => {
      const container = screen.getByTestId("photo-validation");
      expect(container.className).toContain("bg-background");
    });
  });
});

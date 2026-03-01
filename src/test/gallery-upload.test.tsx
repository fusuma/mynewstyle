import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GalleryUpload } from "@/components/consultation/GalleryUpload";

// ============================================================
// Mock dependencies
// ============================================================
vi.mock("@/lib/photo/validate-file", () => ({
  validatePhotoFile: vi.fn(),
}));

vi.mock("@/lib/photo/exif", () => ({
  correctExifOrientation: vi.fn(),
}));

import { validatePhotoFile } from "@/lib/photo/validate-file";
import { correctExifOrientation } from "@/lib/photo/exif";

const mockValidate = vi.mocked(validatePhotoFile);
const mockCorrectExif = vi.mocked(correctExifOrientation);

function createMockFile(
  name: string,
  size: number,
  type: string
): File {
  const content = new Uint8Array(size);
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

beforeEach(() => {
  vi.clearAllMocks();

  // Default: validation passes
  mockValidate.mockReturnValue({ valid: true });

  // Default: EXIF correction returns a blob
  mockCorrectExif.mockResolvedValue(
    new Blob(["corrected"], { type: "image/jpeg" })
  );
});

// ============================================================
// Rendering Tests
// ============================================================
describe("GalleryUpload", () => {
  describe("Rendering", () => {
    it("renders upload button with correct text", () => {
      render(<GalleryUpload onUpload={vi.fn()} />);
      expect(
        screen.getByText("Escolher foto da galeria")
      ).toBeInTheDocument();
    });

    it("renders drag-and-drop zone", () => {
      render(<GalleryUpload onUpload={vi.fn()} />);
      expect(
        screen.getByText("Arraste a sua foto aqui ou clique para selecionar")
      ).toBeInTheDocument();
    });

    it("renders consent checkbox", () => {
      render(<GalleryUpload onUpload={vi.fn()} />);
      expect(
        screen.getByLabelText(/Confirmo que esta foto é minha/)
      ).toBeInTheDocument();
    });

    it('renders "Prefiro usar a câmera" link when onSwitchToCamera provided', () => {
      render(
        <GalleryUpload onUpload={vi.fn()} onSwitchToCamera={vi.fn()} />
      );
      expect(
        screen.getByText("Prefiro usar a câmera")
      ).toBeInTheDocument();
    });

    it('does not render "Prefiro usar a câmera" link when onSwitchToCamera not provided', () => {
      render(<GalleryUpload onUpload={vi.fn()} />);
      expect(
        screen.queryByText("Prefiro usar a câmera")
      ).not.toBeInTheDocument();
    });

    it("renders hidden file input with correct accept attribute", () => {
      render(<GalleryUpload onUpload={vi.fn()} />);
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.accept).toContain("image/jpeg");
      expect(input.accept).toContain("image/png");
      expect(input.accept).toContain("image/heic");
      expect(input.accept).toContain(".heic");
      expect(input.accept).toContain(".heif");
    });
  });

  // ============================================================
  // File Picker Interaction
  // ============================================================
  describe("File Picker", () => {
    it("opens file picker when upload button is clicked", async () => {
      render(<GalleryUpload onUpload={vi.fn()} />);
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const clickSpy = vi.spyOn(input, "click");

      const button = screen.getByText("Escolher foto da galeria");
      fireEvent.click(button);

      expect(clickSpy).toHaveBeenCalled();
    });

    it("opens file picker when drop zone is clicked", async () => {
      render(<GalleryUpload onUpload={vi.fn()} />);
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const clickSpy = vi.spyOn(input, "click");

      const dropZone = screen.getByText(
        "Arraste a sua foto aqui ou clique para selecionar"
      ).closest("[data-testid='drop-zone']")!;
      fireEvent.click(dropZone);

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Validation Error Display
  // ============================================================
  describe("Validation Errors", () => {
    it("shows error for unsupported file type", async () => {
      mockValidate.mockReturnValue({
        valid: false,
        error: "Formato não suportado. Use JPG, PNG ou HEIC.",
      });

      render(<GalleryUpload onUpload={vi.fn()} />);
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = createMockFile("image.gif", 1024, "image/gif");

      fireEvent.change(input, { target: { files: [file] } });

      expect(
        screen.getByText("Formato não suportado. Use JPG, PNG ou HEIC.")
      ).toBeInTheDocument();
    });

    it("shows error for file too large", async () => {
      mockValidate.mockReturnValue({
        valid: false,
        error: "Ficheiro demasiado grande. O tamanho máximo é 10MB.",
      });

      render(<GalleryUpload onUpload={vi.fn()} />);
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = createMockFile(
        "huge.jpg",
        11 * 1024 * 1024,
        "image/jpeg"
      );

      fireEvent.change(input, { target: { files: [file] } });

      expect(
        screen.getByText(
          "Ficheiro demasiado grande. O tamanho máximo é 10MB."
        )
      ).toBeInTheDocument();
    });
  });

  // ============================================================
  // Consent Checkbox
  // ============================================================
  describe("Consent Checkbox", () => {
    it("prevents upload when consent checkbox is unchecked", async () => {
      const onUpload = vi.fn();
      render(<GalleryUpload onUpload={onUpload} />);

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = createMockFile("photo.jpg", 1024 * 1024, "image/jpeg");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(
          screen.getByText(
            "Por favor, confirme que a foto é sua antes de continuar"
          )
        ).toBeInTheDocument();
      });

      expect(onUpload).not.toHaveBeenCalled();
    });

    it("shows consent reminder when file selected without checkbox checked", async () => {
      render(<GalleryUpload onUpload={vi.fn()} />);

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = createMockFile("photo.jpg", 1024 * 1024, "image/jpeg");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(
          screen.getByText(
            "Por favor, confirme que a foto é sua antes de continuar"
          )
        ).toBeInTheDocument();
      });
    });

    it("calls onUpload with corrected blob when valid file selected and consent given", async () => {
      const onUpload = vi.fn();
      const correctedBlob = new Blob(["corrected"], { type: "image/jpeg" });
      mockCorrectExif.mockResolvedValue(correctedBlob);

      render(<GalleryUpload onUpload={onUpload} />);

      // Check consent first
      const checkbox = screen.getByLabelText(
        /Confirmo que esta foto é minha/
      );
      fireEvent.click(checkbox);

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = createMockFile("photo.jpg", 1024 * 1024, "image/jpeg");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(onUpload).toHaveBeenCalledWith(correctedBlob);
      });
    });

    it("processes upload after checking consent with pending file", async () => {
      const onUpload = vi.fn();
      const correctedBlob = new Blob(["corrected"], { type: "image/jpeg" });
      mockCorrectExif.mockResolvedValue(correctedBlob);

      render(<GalleryUpload onUpload={onUpload} />);

      // Select file first (without consent)
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = createMockFile("photo.jpg", 1024 * 1024, "image/jpeg");
      fireEvent.change(input, { target: { files: [file] } });

      // Should show consent reminder
      await waitFor(() => {
        expect(
          screen.getByText(
            "Por favor, confirme que a foto é sua antes de continuar"
          )
        ).toBeInTheDocument();
      });

      // Now check consent
      const checkbox = screen.getByLabelText(
        /Confirmo que esta foto é minha/
      );
      fireEvent.click(checkbox);

      // Should now process the file
      await waitFor(() => {
        expect(onUpload).toHaveBeenCalledWith(correctedBlob);
      });
    });
  });

  // ============================================================
  // Loading State
  // ============================================================
  describe("Loading State", () => {
    it("shows loading state during EXIF processing", async () => {
      // Make EXIF correction slow
      let resolveExif: (value: Blob) => void;
      mockCorrectExif.mockImplementation(
        () =>
          new Promise<Blob>((resolve) => {
            resolveExif = resolve;
          })
      );

      render(<GalleryUpload onUpload={vi.fn()} />);

      // Check consent
      const checkbox = screen.getByLabelText(
        /Confirmo que esta foto é minha/
      );
      fireEvent.click(checkbox);

      // Select file
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = createMockFile("photo.jpg", 1024 * 1024, "image/jpeg");
      fireEvent.change(input, { target: { files: [file] } });

      // Should show loading
      await waitFor(() => {
        expect(screen.getByText("A processar a foto...")).toBeInTheDocument();
      });

      // Resolve EXIF processing
      resolveExif!(new Blob(["done"], { type: "image/jpeg" }));

      // Loading should disappear
      await waitFor(() => {
        expect(
          screen.queryByText("A processar a foto...")
        ).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // File Info Display
  // ============================================================
  describe("File Info Display", () => {
    it("shows file name and size after selection (MB)", async () => {
      render(<GalleryUpload onUpload={vi.fn()} />);

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = createMockFile(
        "foto-perfil.jpg",
        2.3 * 1024 * 1024,
        "image/jpeg"
      );

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/foto-perfil\.jpg/)).toBeInTheDocument();
        expect(screen.getByText(/2\.3 MB/)).toBeInTheDocument();
      });
    });

    it("shows file size in KB for files under 1MB", async () => {
      render(<GalleryUpload onUpload={vi.fn()} />);

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = createMockFile("selfie.png", 843 * 1024, "image/png");

      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/selfie\.png/)).toBeInTheDocument();
        expect(screen.getByText(/843 KB/)).toBeInTheDocument();
      });
    });
  });

  // ============================================================
  // Drag-and-Drop
  // ============================================================
  describe("Drag and Drop", () => {
    it("shows drag-over visual feedback", async () => {
      render(<GalleryUpload onUpload={vi.fn()} />);
      const dropZone = screen.getByTestId("drop-zone");

      fireEvent.dragOver(dropZone, {
        dataTransfer: { types: ["Files"] },
      });
      fireEvent.dragEnter(dropZone, {
        dataTransfer: { types: ["Files"] },
      });

      await waitFor(() => {
        expect(screen.getByText("Solte a foto aqui")).toBeInTheDocument();
      });
    });

    it("reverts drag-over feedback on drag leave", async () => {
      render(<GalleryUpload onUpload={vi.fn()} />);
      const dropZone = screen.getByTestId("drop-zone");

      fireEvent.dragEnter(dropZone, {
        dataTransfer: { types: ["Files"] },
      });

      await waitFor(() => {
        expect(screen.getByText("Solte a foto aqui")).toBeInTheDocument();
      });

      fireEvent.dragLeave(dropZone);

      await waitFor(() => {
        expect(
          screen.getByText(
            "Arraste a sua foto aqui ou clique para selecionar"
          )
        ).toBeInTheDocument();
      });
    });

    it("handles file drop correctly", async () => {
      const onUpload = vi.fn();
      const correctedBlob = new Blob(["corrected"], { type: "image/jpeg" });
      mockCorrectExif.mockResolvedValue(correctedBlob);

      render(<GalleryUpload onUpload={onUpload} />);

      // Check consent first
      const checkbox = screen.getByLabelText(
        /Confirmo que esta foto é minha/
      );
      fireEvent.click(checkbox);

      const dropZone = screen.getByTestId("drop-zone");
      const file = createMockFile("photo.jpg", 1024 * 1024, "image/jpeg");

      fireEvent.drop(dropZone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(onUpload).toHaveBeenCalledWith(correctedBlob);
      });
    });
  });

  // ============================================================
  // Switch to Camera
  // ============================================================
  describe("Switch to Camera", () => {
    it("calls onSwitchToCamera when link clicked", () => {
      const onSwitchToCamera = vi.fn();
      render(
        <GalleryUpload
          onUpload={vi.fn()}
          onSwitchToCamera={onSwitchToCamera}
        />
      );

      fireEvent.click(screen.getByText("Prefiro usar a câmera"));
      expect(onSwitchToCamera).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================
  // Accessibility
  // ============================================================
  describe("Accessibility", () => {
    it("upload button has aria-label", () => {
      render(<GalleryUpload onUpload={vi.fn()} />);
      expect(
        screen.getByRole("button", {
          name: /Escolher foto da galeria/,
        })
      ).toBeInTheDocument();
    });

    it("consent checkbox has associated label", () => {
      render(<GalleryUpload onUpload={vi.fn()} />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toHaveAccessibleName(
        /Confirmo que esta foto é minha/
      );
    });

    it("drop zone has appropriate role", () => {
      render(<GalleryUpload onUpload={vi.fn()} />);
      const dropZone = screen.getByTestId("drop-zone");
      expect(dropZone).toHaveAttribute("role", "button");
      expect(dropZone).toHaveAttribute("tabIndex", "0");
    });

    it("error messages have role alert", () => {
      mockValidate.mockReturnValue({
        valid: false,
        error: "Formato não suportado. Use JPG, PNG ou HEIC.",
      });

      render(<GalleryUpload onUpload={vi.fn()} />);

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = createMockFile("image.gif", 1024, "image/gif");
      fireEvent.change(input, { target: { files: [file] } });

      const errorElement = screen.getByRole("alert");
      expect(errorElement).toBeInTheDocument();
    });

    it("keyboard navigation: Enter activates drop zone", () => {
      render(<GalleryUpload onUpload={vi.fn()} />);
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const clickSpy = vi.spyOn(input, "click");

      const dropZone = screen.getByTestId("drop-zone");
      fireEvent.keyDown(dropZone, { key: "Enter" });

      expect(clickSpy).toHaveBeenCalled();
    });

    it("keyboard navigation: Space activates drop zone", () => {
      render(<GalleryUpload onUpload={vi.fn()} />);
      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const clickSpy = vi.spyOn(input, "click");

      const dropZone = screen.getByTestId("drop-zone");
      fireEvent.keyDown(dropZone, { key: " " });

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  // ============================================================
  // Error Handling
  // ============================================================
  describe("Error Handling", () => {
    it("shows read failure error when EXIF processing fails", async () => {
      mockCorrectExif.mockRejectedValue(new Error("Processing failed"));

      render(<GalleryUpload onUpload={vi.fn()} />);

      // Check consent first
      const checkbox = screen.getByLabelText(
        /Confirmo que esta foto é minha/
      );
      fireEvent.click(checkbox);

      const input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
      const file = createMockFile("photo.jpg", 1024 * 1024, "image/jpeg");
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(
          screen.getByText("Erro ao processar a foto. Tente novamente.")
        ).toBeInTheDocument();
      });
    });
  });
});

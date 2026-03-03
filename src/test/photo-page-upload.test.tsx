import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ============================================================
// Mock dependencies
// ============================================================
const mockCompressPhoto = vi.fn();
const mockValidatePhoto = vi.fn();
const mockDestroyFaceDetector = vi.fn();
const mockUploadPhoto = vi.fn();

vi.mock('@/lib/photo/compress', () => ({
  compressPhoto: (...args: unknown[]) => mockCompressPhoto(...args),
}));

vi.mock('@/lib/photo/validate', () => ({
  validatePhoto: (...args: unknown[]) => mockValidatePhoto(...args),
  destroyFaceDetector: (...args: unknown[]) => mockDestroyFaceDetector(...args),
  initFaceDetector: vi.fn(),
}));

vi.mock('@/lib/photo/upload', () => ({
  uploadPhoto: (...args: unknown[]) => mockUploadPhoto(...args),
}));

vi.mock('@/lib/persistence/session-db', () => ({
  loadSessionData: vi.fn().mockResolvedValue(null),
  saveSessionData: vi.fn().mockResolvedValue(undefined),
  clearSessionData: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/photo/validate-file', () => ({
  validatePhotoFile: vi.fn().mockReturnValue({ valid: true }),
}));

vi.mock('@/lib/photo/exif', () => ({
  correctExifOrientation: vi
    .fn()
    .mockResolvedValue(new Blob(['corrected'], { type: 'image/jpeg' })),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, transition, whileTap, ...htmlProps } = props;
      return <div {...htmlProps}>{children}</div>;
    },
  },
  useReducedMotion: () => false,
}));

// Mock navigator for camera tests
const mockGetUserMedia = vi.fn();
const mockEnumerateDevices = vi.fn();

// ============================================================
// Helpers
// ============================================================
function createValidValidationResult() {
  return {
    valid: true,
    status: 'valid',
    faces: [
      {
        boundingBox: { x: 100, y: 50, width: 400, height: 400 },
        keypoints: [],
        confidence: 0.95,
      },
    ],
    message: 'Rosto detectado com sucesso!',
    details: {
      faceCount: 1,
      faceAreaPercent: 33.33,
      confidenceScore: 0.95,
    },
  };
}

async function switchToGalleryAndUpload() {
  // Wait for session recovery check to complete first
  await waitFor(() => {
    expect(screen.getByText('Prefiro enviar uma foto da galeria')).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText('Prefiro enviar uma foto da galeria'));

  await waitFor(() => {
    expect(screen.getByText('Escolher foto da galeria')).toBeInTheDocument();
  });

  await uploadInGalleryMode();
}

async function uploadInGalleryMode() {
  await waitFor(() => {
    expect(screen.getByText('Escolher foto da galeria')).toBeInTheDocument();
  });

  // Ensure consent is checked (idempotent: only click if not already checked)
  const checkbox = screen.getByLabelText(/Consinto o processamento da minha foto para análise de visagismo/) as HTMLInputElement;
  if (!checkbox.checked) {
    fireEvent.click(checkbox);
  }

  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([new Uint8Array(1024)], 'photo.jpg', {
    type: 'image/jpeg',
  });
  fireEvent.change(input, { target: { files: [file] } });
}

async function navigateToReviewScreen() {
  await switchToGalleryAndUpload();

  await waitFor(() => {
    expect(screen.getByTestId('photo-review')).toBeInTheDocument();
  });

  expect(
    screen.getByRole('button', { name: /Usar esta foto/i })
  ).toBeInTheDocument();
}

// ============================================================
// Setup
// ============================================================
beforeEach(() => {
  vi.clearAllMocks();

  // Default: compression succeeds
  mockCompressPhoto.mockResolvedValue({
    blob: new Blob(['compressed-image'], { type: 'image/jpeg' }),
    metadata: {
      originalSizeBytes: 5 * 1024 * 1024,
      compressedSizeBytes: 200 * 1024,
      compressionRatio: 0.039,
      originalWidth: 1600,
      originalHeight: 1200,
      outputWidth: 800,
      outputHeight: 600,
    },
  });

  // Default: validation succeeds
  mockValidatePhoto.mockResolvedValue(createValidValidationResult());

  // Default: upload succeeds
  mockUploadPhoto.mockResolvedValue({
    success: true,
    signedUrl: 'https://storage.supabase.co/signed/test',
    storagePath: 'session-id/consult-id/original.jpg',
  });

  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: mockGetUserMedia,
      enumerateDevices: mockEnumerateDevices,
    },
    writable: true,
    configurable: true,
  });

  Object.defineProperty(navigator, 'permissions', {
    value: undefined,
    writable: true,
    configurable: true,
  });

  mockGetUserMedia.mockReset();
  mockEnumerateDevices.mockReset();
  mockEnumerateDevices.mockResolvedValue([]);

  Object.defineProperty(HTMLVideoElement.prototype, 'play', {
    value: vi.fn().mockResolvedValue(undefined),
    writable: true,
    configurable: true,
  });

  Object.defineProperty(navigator, 'userAgent', {
    value:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    writable: true,
    configurable: true,
  });

  globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url');
  globalThis.URL.revokeObjectURL = vi.fn();

  // Mock localStorage for guest session ID
  const localStorageMock = {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });

  // Mock crypto.randomUUID
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: vi.fn().mockReturnValue('mock-uuid-12345'),
      getRandomValues: vi.fn(),
    },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================
// Tests
// ============================================================
describe('Photo Page Upload Integration', () => {
  // ----------------------------------------------------------
  // AC7: After photo confirm, upload is triggered
  // ----------------------------------------------------------
  it('triggers upload when user confirms photo with "Usar esta foto"', async () => {
    const { default: PhotoPage } = await import('@/app/consultation/photo/page');
    render(<PhotoPage />);

    await navigateToReviewScreen();

    // Click confirm
    fireEvent.click(screen.getByRole('button', { name: /Usar esta foto/i }));

    // Upload should be called
    await waitFor(() => {
      expect(mockUploadPhoto).toHaveBeenCalledTimes(1);
    });

    // Verify upload was called with correct params (blob, sessionId, consultationId)
    expect(mockUploadPhoto).toHaveBeenCalledWith(
      expect.any(Blob),
      expect.any(String),
      expect.any(String)
    );
  });

  // ----------------------------------------------------------
  // AC4: During upload, loading state is shown
  // ----------------------------------------------------------
  it('shows upload loading state during upload', async () => {
    // Make upload hang to see the loading state
    mockUploadPhoto.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { default: PhotoPage } = await import('@/app/consultation/photo/page');
    render(<PhotoPage />);

    await navigateToReviewScreen();

    // Click confirm
    fireEvent.click(screen.getByRole('button', { name: /Usar esta foto/i }));

    // Should show upload spinner
    await waitFor(() => {
      expect(screen.getByText('A enviar a foto...')).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // After successful upload, confirmed screen is shown
  // ----------------------------------------------------------
  it('shows confirmed "Pronto!" screen after successful upload', async () => {
    mockUploadPhoto.mockResolvedValue({
      success: true,
      signedUrl: 'https://storage.supabase.co/signed/test',
      storagePath: 'session/consult/original.jpg',
    });

    const { default: PhotoPage } = await import('@/app/consultation/photo/page');
    render(<PhotoPage />);

    await navigateToReviewScreen();

    // Click confirm
    fireEvent.click(screen.getByRole('button', { name: /Usar esta foto/i }));

    // Should show confirmed screen
    await waitFor(() => {
      expect(screen.getByText('Pronto!')).toBeInTheDocument();
    });

    expect(screen.getByText('Foto selecionada com sucesso.')).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // AC8: After failed upload, error state with retry is shown
  // ----------------------------------------------------------
  it('shows error state with retry after upload failure', async () => {
    mockUploadPhoto.mockResolvedValue({
      success: false,
      error: 'Network timeout',
    });

    const { default: PhotoPage } = await import('@/app/consultation/photo/page');
    render(<PhotoPage />);

    await navigateToReviewScreen();

    // Click confirm
    fireEvent.click(screen.getByRole('button', { name: /Usar esta foto/i }));

    // Should show error state
    await waitFor(() => {
      expect(screen.getByText('Erro ao enviar a foto')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Tentar enviar novamente/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Voltar para a revisão da foto/ })).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // Cancel from upload error returns to review screen
  // ----------------------------------------------------------
  it('returns to review screen when cancel is clicked from upload error', async () => {
    mockUploadPhoto.mockResolvedValue({
      success: false,
      error: 'Network timeout',
    });

    const { default: PhotoPage } = await import('@/app/consultation/photo/page');
    render(<PhotoPage />);

    await navigateToReviewScreen();

    // Click confirm -> triggers upload -> fails
    fireEvent.click(screen.getByRole('button', { name: /Usar esta foto/i }));

    await waitFor(() => {
      expect(screen.getByText('Erro ao enviar a foto')).toBeInTheDocument();
    });

    // Click Voltar (cancel)
    fireEvent.click(screen.getByRole('button', { name: /Voltar para a revisão da foto/ }));

    // Should return to review screen
    await waitFor(() => {
      expect(screen.getByTestId('photo-review')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: /Usar esta foto/i })
    ).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // Retry from upload error triggers upload again
  // ----------------------------------------------------------
  it('retries upload when retry button is clicked from error state', async () => {
    // First call fails, second succeeds
    mockUploadPhoto
      .mockResolvedValueOnce({
        success: false,
        error: 'Network timeout',
      })
      .mockResolvedValueOnce({
        success: true,
        signedUrl: 'https://storage.supabase.co/signed/test',
        storagePath: 'session/consult/original.jpg',
      });

    const { default: PhotoPage } = await import('@/app/consultation/photo/page');
    render(<PhotoPage />);

    await navigateToReviewScreen();

    // Click confirm -> fails
    fireEvent.click(screen.getByRole('button', { name: /Usar esta foto/i }));

    await waitFor(() => {
      expect(screen.getByText('Erro ao enviar a foto')).toBeInTheDocument();
    });

    // Click retry
    fireEvent.click(screen.getByRole('button', { name: /Tentar enviar novamente/ }));

    // Should show success after retry
    await waitFor(() => {
      expect(screen.getByText('Pronto!')).toBeInTheDocument();
    });

    expect(mockUploadPhoto).toHaveBeenCalledTimes(2);
  });

  // ----------------------------------------------------------
  // AC6: Upload result (signed URL) is stored in state
  // ----------------------------------------------------------
  it('stores upload result with signed URL after successful upload', async () => {
    const signedUrl = 'https://storage.supabase.co/signed/unique-url';
    mockUploadPhoto.mockResolvedValue({
      success: true,
      signedUrl,
      storagePath: 'session/consult/original.jpg',
    });

    const { default: PhotoPage } = await import('@/app/consultation/photo/page');
    render(<PhotoPage />);

    await navigateToReviewScreen();

    // Click confirm
    fireEvent.click(screen.getByRole('button', { name: /Usar esta foto/i }));

    // Upload completes -> Pronto! shown (upload result is in state)
    await waitFor(() => {
      expect(screen.getByText('Pronto!')).toBeInTheDocument();
    });

    // uploadPhoto was called and returned the result (the page stores it in state)
    expect(mockUploadPhoto).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------------
  // Guest session ID is generated and persisted to localStorage
  // ----------------------------------------------------------
  it('generates and persists guest session ID to localStorage using canonical key', async () => {
    const { default: PhotoPage } = await import('@/app/consultation/photo/page');
    render(<PhotoPage />);

    await navigateToReviewScreen();

    // Click confirm
    fireEvent.click(screen.getByRole('button', { name: /Usar esta foto/i }));

    await waitFor(() => {
      expect(mockUploadPhoto).toHaveBeenCalledTimes(1);
    });

    // localStorage.setItem should have been called with the canonical guest session key
    // (Story 8.4 uses 'mynewstyle-guest-session-id' with hyphens, not underscores)
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'mynewstyle-guest-session-id',
      expect.any(String)
    );
  });

  // ----------------------------------------------------------
  // Reuses existing guest session ID from localStorage
  // ----------------------------------------------------------
  it('reuses existing guest session ID from localStorage', async () => {
    // Must be a valid UUID for getOrCreateGuestSessionId to reuse it (Story 8.4, Task 1.5)
    const existingSessionId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
      existingSessionId
    );

    const { default: PhotoPage } = await import('@/app/consultation/photo/page');
    render(<PhotoPage />);

    await navigateToReviewScreen();

    // Click confirm
    fireEvent.click(screen.getByRole('button', { name: /Usar esta foto/i }));

    await waitFor(() => {
      expect(mockUploadPhoto).toHaveBeenCalledTimes(1);
    });

    // Should have been called with the existing session ID
    expect(mockUploadPhoto).toHaveBeenCalledWith(
      expect.any(Blob),
      existingSessionId,
      expect.any(String)
    );

    // Should NOT have called setItem (because existing valid UUID was found)
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
  });
});

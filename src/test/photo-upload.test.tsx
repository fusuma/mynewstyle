import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhotoUpload } from '@/components/consultation/PhotoUpload';

// ============================================================
// Setup
// ============================================================
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================
// Tests
// ============================================================
describe('PhotoUpload', () => {
  const defaultProps = {
    isUploading: true,
    onRetry: vi.fn(),
    onCancel: vi.fn(),
  };

  // ----------------------------------------------------------
  // AC4: Shows upload spinner with Portuguese message during upload
  // ----------------------------------------------------------
  it('shows upload spinner with Portuguese message during upload', () => {
    render(<PhotoUpload {...defaultProps} isUploading={true} />);

    expect(screen.getByText('A enviar a foto...')).toBeInTheDocument();
    expect(screen.getByText('Aguarde um momento')).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // AC4: Shows spinner icon (Loader2 with animate-spin)
  // ----------------------------------------------------------
  it('shows spinning loader icon during upload', () => {
    const { container } = render(<PhotoUpload {...defaultProps} isUploading={true} />);

    // Loader2 renders as SVG with animate-spin class
    const spinners = container.querySelectorAll('svg.animate-spin');
    expect(spinners.length).toBeGreaterThan(0);
  });

  // ----------------------------------------------------------
  // AC4: Shows CloudUpload icon during upload
  // ----------------------------------------------------------
  it('shows CloudUpload icon during upload', () => {
    const { container } = render(<PhotoUpload {...defaultProps} isUploading={true} />);

    // CloudUpload renders as SVG
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2); // CloudUpload + Loader2
  });

  // ----------------------------------------------------------
  // AC8: Shows error message with retry button on failure
  // ----------------------------------------------------------
  it('shows error message with retry button on failure', () => {
    render(
      <PhotoUpload
        isUploading={false}
        error="Upload failed"
        onRetry={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Erro ao enviar a foto')).toBeInTheDocument();
    expect(screen.getByText(/Verifique a sua ligação e tente novamente/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tentar enviar novamente/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Voltar para a revisão da foto/ })).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // Calls onRetry when retry button clicked
  // ----------------------------------------------------------
  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(
      <PhotoUpload
        isUploading={false}
        error="Upload failed"
        onRetry={onRetry}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Tentar enviar novamente/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------------
  // Calls onCancel when cancel button clicked
  // ----------------------------------------------------------
  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(
      <PhotoUpload
        isUploading={false}
        error="Upload failed"
        onRetry={vi.fn()}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Voltar para a revisão da foto/ }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // ----------------------------------------------------------
  // Uses theme CSS variables (no hardcoded hex)
  // ----------------------------------------------------------
  it('uses theme CSS variables (no hardcoded hex colors)', () => {
    const { container } = render(<PhotoUpload {...defaultProps} isUploading={true} />);

    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv.className).toContain('bg-background');
    expect(mainDiv.className).toContain('text-center');
  });

  // ----------------------------------------------------------
  // Error state uses theme CSS variables
  // ----------------------------------------------------------
  it('error state uses theme CSS variables', () => {
    const { container } = render(
      <PhotoUpload
        isUploading={false}
        error="Upload failed"
        onRetry={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv.className).toContain('bg-background');

    const retryButton = screen.getByText('Tentar novamente');
    expect(retryButton.className).toContain('bg-accent');
    expect(retryButton.className).toContain('text-accent-foreground');
  });

  // ----------------------------------------------------------
  // AC10: Portuguese text with correct diacritical marks
  // ----------------------------------------------------------
  it('displays Portuguese text with correct diacritical marks', () => {
    render(
      <PhotoUpload
        isUploading={false}
        error="Upload failed"
        onRetry={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const errorSubtext = screen.getByText(/Verifique a sua ligação e tente novamente/);
    expect(errorSubtext).toBeInTheDocument();
    // Verify diacritics: ç (c-cedilla) and ã (a-tilde) in "ligação"
    expect(errorSubtext.textContent).toContain('ç');
    expect(errorSubtext.textContent).toContain('ã');
  });

  // ----------------------------------------------------------
  // ARIA labels on interactive elements
  // ----------------------------------------------------------
  it('has ARIA labels on interactive elements', () => {
    render(
      <PhotoUpload
        isUploading={false}
        error="Upload failed"
        onRetry={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const retryButton = screen.getByRole('button', { name: /Tentar enviar novamente/ });
    const cancelButton = screen.getByRole('button', { name: /Voltar para a revisão da foto/ });

    expect(retryButton).toHaveAttribute('aria-label');
    expect(cancelButton).toHaveAttribute('aria-label');
  });

  // ----------------------------------------------------------
  // Upload state has role=status for screen readers
  // ----------------------------------------------------------
  it('uploading state has role=status for accessibility', () => {
    render(<PhotoUpload {...defaultProps} isUploading={true} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // Error state has role=alert for screen readers
  // ----------------------------------------------------------
  it('error state has role=alert for accessibility', () => {
    render(
      <PhotoUpload
        isUploading={false}
        error="Upload failed"
        onRetry={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  // ----------------------------------------------------------
  // Buttons have min-h-[48px] touch target
  // ----------------------------------------------------------
  it('buttons have min-h-[48px] for mobile touch targets', () => {
    render(
      <PhotoUpload
        isUploading={false}
        error="Upload failed"
        onRetry={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const retryButton = screen.getByText('Tentar novamente');
    const cancelButton = screen.getByText('Voltar');

    expect(retryButton.className).toContain('min-h-[48px]');
    expect(cancelButton.className).toContain('min-h-[48px]');
  });
});

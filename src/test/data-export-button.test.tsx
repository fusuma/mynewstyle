import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Download: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-download" className={className} />
  ),
  Loader2: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-loader2" className={className} />
  ),
}));

// Mock sonner toast
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: mockToastError,
    success: vi.fn(),
  },
}));

// Global fetch mock
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL / URL.revokeObjectURL
global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock document.createElement to track anchor click
const mockAnchorClick = vi.fn();
const originalCreateElement = document.createElement.bind(document);
vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  if (tag === 'a') {
    const anchor = originalCreateElement('a');
    anchor.click = mockAnchorClick;
    return anchor;
  }
  return originalCreateElement(tag);
});

describe('DataExportButton - rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the "Exportar os meus dados" button', async () => {
    const { DataExportButton } = await import('@/components/profile/DataExportButton');
    render(<DataExportButton />);

    expect(screen.getByRole('button', { name: /exportar os meus dados/i })).toBeInTheDocument();
  });

  it('renders Download icon', async () => {
    const { DataExportButton } = await import('@/components/profile/DataExportButton');
    render(<DataExportButton />);

    expect(screen.getByTestId('icon-download')).toBeInTheDocument();
  });

  it('button is initially enabled', async () => {
    const { DataExportButton } = await import('@/components/profile/DataExportButton');
    render(<DataExportButton />);

    const button = screen.getByRole('button', { name: /exportar os meus dados/i });
    expect(button).not.toBeDisabled();
  });
});

describe('DataExportButton - loading state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state text while export is in progress', async () => {
    // Simulate a slow fetch that never resolves
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { DataExportButton } = await import('@/components/profile/DataExportButton');
    render(<DataExportButton />);

    const button = screen.getByRole('button', { name: /exportar os meus dados/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/a preparar exportação/i)).toBeInTheDocument();
    });
  });

  it('disables button during loading', async () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { DataExportButton } = await import('@/components/profile/DataExportButton');
    render(<DataExportButton />);

    const button = screen.getByRole('button', { name: /exportar os meus dados/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
    });
  });
});

describe('DataExportButton - success flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers browser download on successful export', async () => {
    const mockBlob = new Blob(['{"data": "test"}'], { type: 'application/json' });
    const mockHeaders = new Headers({
      'content-type': 'application/json',
      'content-disposition': 'attachment; filename="mynewstyle-data-export-user-1.json"',
    });

    mockFetch.mockResolvedValue({
      ok: true,
      headers: mockHeaders,
      blob: async () => mockBlob,
    });

    const { DataExportButton } = await import('@/components/profile/DataExportButton');
    render(<DataExportButton />);

    const button = screen.getByRole('button', { name: /exportar os meus dados/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockAnchorClick).toHaveBeenCalled();
    });

    expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('restores button to enabled state after successful download', async () => {
    const mockBlob = new Blob(['{"data": "test"}'], { type: 'application/json' });
    const mockHeaders = new Headers({
      'content-type': 'application/json',
      'content-disposition': 'attachment; filename="mynewstyle-data-export-user-1.json"',
    });

    mockFetch.mockResolvedValue({
      ok: true,
      headers: mockHeaders,
      blob: async () => mockBlob,
    });

    const { DataExportButton } = await import('@/components/profile/DataExportButton');
    render(<DataExportButton />);

    const button = screen.getByRole('button', { name: /exportar os meus dados/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });
});

describe('DataExportButton - error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows error toast when fetch fails with non-ok status', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { DataExportButton } = await import('@/components/profile/DataExportButton');
    render(<DataExportButton />);

    const button = screen.getByRole('button', { name: /exportar os meus dados/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringMatching(/erro ao exportar dados/i)
      );
    });
  });

  it('shows error toast when fetch throws a network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { DataExportButton } = await import('@/components/profile/DataExportButton');
    render(<DataExportButton />);

    const button = screen.getByRole('button', { name: /exportar os meus dados/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringMatching(/erro ao exportar dados/i)
      );
    });
  });

  it('shows error toast when rate-limited (429)', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
    });

    const { DataExportButton } = await import('@/components/profile/DataExportButton');
    render(<DataExportButton />);

    const button = screen.getByRole('button', { name: /exportar os meus dados/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
  });

  it('re-enables button after error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { DataExportButton } = await import('@/components/profile/DataExportButton');
    render(<DataExportButton />);

    const button = screen.getByRole('button', { name: /exportar os meus dados/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });
});

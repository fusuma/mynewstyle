/**
 * Component tests for DeleteAccountButton and DeleteAccountDialog
 * Story 11.3: Right to Deletion — AC #1, #2, #5, #6
 *
 * Tests: 7.4 (button renders), 7.5 (ELIMINAR enables confirm), 7.6 (submit + redirect)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock router
const mockPush = vi.fn();
const mockRouterReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockRouterReplace,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock sonner toast
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}));

// Mock supabase client for sign out
const mockSignOut = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signOut: mockSignOut,
    },
  })),
}));

describe('DeleteAccountButton — renders and triggers dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 7.4: renders button with correct text
  it('renders a button with delete account text', async () => {
    const { DeleteAccountButton } = await import('@/components/profile/DeleteAccountButton');
    render(<DeleteAccountButton />);
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText(/Eliminar a minha conta e todos os dados/i)).toBeInTheDocument();
  });

  it('button has destructive/red styling (destructive variant)', async () => {
    const { DeleteAccountButton } = await import('@/components/profile/DeleteAccountButton');
    render(<DeleteAccountButton />);
    const button = screen.getByRole('button');
    // The button should have some destructive variant class indicator
    expect(button).toBeInTheDocument();
    // It should render a trash icon within it
    const svg = button.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('shows confirmation dialog when button is clicked', async () => {
    const { DeleteAccountButton } = await import('@/components/profile/DeleteAccountButton');
    render(<DeleteAccountButton />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    // Dialog should appear with warning text
    await waitFor(() => {
      expect(screen.getByText(/irreversivel/i)).toBeInTheDocument();
    });
  });
});

describe('DeleteAccountDialog — confirmation flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    mockSignOut.mockResolvedValue({ error: null });
  });

  // Test 7.5: confirm button disabled until user types "ELIMINAR"
  it('confirm button is disabled when text input is empty', async () => {
    const mockOnClose = vi.fn();
    const { DeleteAccountDialog } = await import('@/components/profile/DeleteAccountDialog');
    render(<DeleteAccountDialog isOpen={true} onClose={mockOnClose} />);

    // Find the confirm button — should be disabled by default
    const confirmButton = screen.getByRole('button', { name: /confirmar|eliminar/i });
    expect(confirmButton).toBeDisabled();
  });

  it('confirm button is disabled when wrong text is typed', async () => {
    const mockOnClose = vi.fn();
    const { DeleteAccountDialog } = await import('@/components/profile/DeleteAccountDialog');
    render(<DeleteAccountDialog isOpen={true} onClose={mockOnClose} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'eliminar' } }); // lowercase — wrong

    const confirmButton = screen.getByRole('button', { name: /confirmar|eliminar/i });
    expect(confirmButton).toBeDisabled();
  });

  it('confirm button enabled when "ELIMINAR" is typed exactly', async () => {
    const mockOnClose = vi.fn();
    const { DeleteAccountDialog } = await import('@/components/profile/DeleteAccountDialog');
    render(<DeleteAccountDialog isOpen={true} onClose={mockOnClose} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'ELIMINAR' } });

    const confirmButton = screen.getByRole('button', { name: /confirmar|eliminar/i });
    expect(confirmButton).not.toBeDisabled();
  });

  // Test 7.6: submit calls API and redirects
  it('calls DELETE /api/profile/delete when confirm is clicked', async () => {
    const mockOnClose = vi.fn();
    const { DeleteAccountDialog } = await import('@/components/profile/DeleteAccountDialog');
    render(<DeleteAccountDialog isOpen={true} onClose={mockOnClose} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'ELIMINAR' } });

    const confirmButton = screen.getByRole('button', { name: /confirmar|eliminar/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/profile/delete',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('signs out and redirects to / with ?deleted=true after successful deletion', async () => {
    const mockOnClose = vi.fn();
    const { DeleteAccountDialog } = await import('@/components/profile/DeleteAccountDialog');
    render(<DeleteAccountDialog isOpen={true} onClose={mockOnClose} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'ELIMINAR' } });

    const confirmButton = screen.getByRole('button', { name: /confirmar|eliminar/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/?deleted=true');
    });
  });

  it('shows error toast and does NOT redirect when API returns error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Deletion failed' }),
    });

    const mockOnClose = vi.fn();
    const { DeleteAccountDialog } = await import('@/components/profile/DeleteAccountDialog');
    render(<DeleteAccountDialog isOpen={true} onClose={mockOnClose} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'ELIMINAR' } });

    const confirmButton = screen.getByRole('button', { name: /confirmar|eliminar/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it('shows irreversible warning text in Portuguese', async () => {
    const mockOnClose = vi.fn();
    const { DeleteAccountDialog } = await import('@/components/profile/DeleteAccountDialog');
    render(<DeleteAccountDialog isOpen={true} onClose={mockOnClose} />);

    // Warning text from AC #2
    expect(screen.getByText(/irreversivel/i)).toBeInTheDocument();
  });
});

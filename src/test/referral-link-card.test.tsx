import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock navigator.clipboard
const mockWriteText = vi.fn();
Object.defineProperty(global.navigator, 'clipboard', {
  value: { writeText: mockWriteText },
  writable: true,
  configurable: true,
});

// Mock sonner toast
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Copy: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-copy" className={className} />
  ),
  Check: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-check" className={className} />
  ),
  Link: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-link" className={className} />
  ),
  AlertCircle: ({ className }: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="icon-alert" className={className} />
  ),
}));

describe('ReferralLinkCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteText.mockResolvedValue(undefined);
  });

  it('shows loading skeleton while fetching', async () => {
    // Simulate a pending fetch
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { ReferralLinkCard } = await import('@/components/profile/ReferralLinkCard');

    await act(async () => {
      render(<ReferralLinkCard />);
    });

    // Skeleton should be visible before data arrives
    const skeleton = document.querySelector('[data-testid="referral-skeleton"]');
    expect(skeleton).not.toBeNull();
  });

  it('renders referral link after successful fetch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        referralCode: 'ABC1234',
        referralLink: 'https://mynewstyle.com/?ref=ABC1234',
      }),
    });

    const { ReferralLinkCard } = await import('@/components/profile/ReferralLinkCard');

    await act(async () => {
      render(<ReferralLinkCard />);
    });

    await waitFor(() => {
      expect(screen.getByText(/mynewstyle\.com\/\?ref=ABC1234/)).toBeTruthy();
    });
  });

  it('renders "Copiar link" button', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        referralCode: 'ABC1234',
        referralLink: 'https://mynewstyle.com/?ref=ABC1234',
      }),
    });

    const { ReferralLinkCard } = await import('@/components/profile/ReferralLinkCard');

    await act(async () => {
      render(<ReferralLinkCard />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copiar link/i })).toBeTruthy();
    });
  });

  it('copies referral link to clipboard when copy button is clicked', async () => {
    const referralLink = 'https://mynewstyle.com/?ref=ABC1234';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        referralCode: 'ABC1234',
        referralLink,
      }),
    });

    const { ReferralLinkCard } = await import('@/components/profile/ReferralLinkCard');

    await act(async () => {
      render(<ReferralLinkCard />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copiar link/i })).toBeTruthy();
    });

    const copyButton = screen.getByRole('button', { name: /Copiar link/i });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(mockWriteText).toHaveBeenCalledWith(referralLink);
  });

  it('shows success toast "Link copiado!" after copy', async () => {
    const referralLink = 'https://mynewstyle.com/?ref=ABC1234';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ referralCode: 'ABC1234', referralLink }),
    });

    const { ReferralLinkCard } = await import('@/components/profile/ReferralLinkCard');

    await act(async () => {
      render(<ReferralLinkCard />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copiar link/i })).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Copiar link/i }));
    });

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Link copiado!');
    });
  });

  it('shows error state when fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { ReferralLinkCard } = await import('@/components/profile/ReferralLinkCard');

    await act(async () => {
      render(<ReferralLinkCard />);
    });

    await waitFor(() => {
      // Look for retry button
      expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeTruthy();
    });
  });

  it('shows error state when fetch returns non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    });

    const { ReferralLinkCard } = await import('@/components/profile/ReferralLinkCard');

    await act(async () => {
      render(<ReferralLinkCard />);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeTruthy();
    });
  });
});

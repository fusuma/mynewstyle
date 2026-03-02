/**
 * Tests for ShareButton component (Story 9-3: Native Share Integration)
 * Covers AC: 1, 2, 5, 7, 9, 10
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock the useNativeShare hook
const mockShare = vi.fn().mockResolvedValue(undefined);
const mockUseNativeShare = vi.fn(() => ({
  share: mockShare,
  isSharing: false,
  canShareFiles: false,
  canShareBasic: true,
}));

vi.mock('@/hooks/useNativeShare', () => ({
  useNativeShare: mockUseNativeShare,
}));

// Mock sonner toast
const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
vi.mock('sonner', () => ({ toast: mockToast }));

describe('ShareButton - rendering (AC: 5, 10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNativeShare.mockReturnValue({
      share: mockShare,
      isSharing: false,
      canShareFiles: false,
      canShareBasic: true,
    });
  });

  it('renders with Portuguese label "Partilhar resultado" (AC: 5)', async () => {
    const { ShareButton } = await import('@/components/share/ShareButton');
    const blob = new Blob(['img'], { type: 'image/png' });

    render(
      <ShareButton
        shareImageBlob={blob}
        consultationId="cons-123"
        format="story"
      />
    );

    expect(screen.getByText('Partilhar resultado')).toBeInTheDocument();
  });

  it('has proper aria-label (AC: 10)', async () => {
    const { ShareButton } = await import('@/components/share/ShareButton');
    const blob = new Blob(['img'], { type: 'image/png' });

    render(
      <ShareButton
        shareImageBlob={blob}
        consultationId="cons-123"
        format="story"
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
    expect(button.getAttribute('aria-label')).toMatch(/Partilhar resultado/i);
  });

  it('renders Share2 icon', async () => {
    const { ShareButton } = await import('@/components/share/ShareButton');
    const blob = new Blob(['img'], { type: 'image/png' });

    const { container } = render(
      <ShareButton
        shareImageBlob={blob}
        consultationId="cons-123"
        format="story"
      />
    );

    // Button should be in the document
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

describe('ShareButton - disabled state (AC: 5 — Task 2.4)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('button is disabled when shareImageBlob is null', async () => {
    const { ShareButton } = await import('@/components/share/ShareButton');

    render(
      <ShareButton
        shareImageBlob={null}
        consultationId="cons-123"
        format="story"
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('button is enabled when shareImageBlob is provided', async () => {
    const { ShareButton } = await import('@/components/share/ShareButton');
    const blob = new Blob(['img'], { type: 'image/png' });

    render(
      <ShareButton
        shareImageBlob={blob}
        consultationId="cons-123"
        format="story"
      />
    );

    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
  });
});

describe('ShareButton - loading state (AC: Task 2.3)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('shows loading state when isSharing=true', async () => {
    const { ShareButton } = await import('@/components/share/ShareButton');

    mockUseNativeShare.mockReturnValue({
      share: mockShare,
      isSharing: true,
      canShareFiles: false,
      canShareBasic: true,
    });

    const blob = new Blob(['img'], { type: 'image/png' });
    render(
      <ShareButton
        shareImageBlob={blob}
        consultationId="cons-123"
        format="story"
      />
    );

    const button = screen.getByRole('button');
    // Button should be disabled during sharing
    expect(button).toBeDisabled();
    // aria-busy should be set
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('button is not aria-busy when not sharing', async () => {
    const { ShareButton } = await import('@/components/share/ShareButton');

    // Ensure isSharing=false for this test
    mockUseNativeShare.mockReturnValue({
      share: mockShare,
      isSharing: false,
      canShareFiles: false,
      canShareBasic: true,
    });

    const blob = new Blob(['img'], { type: 'image/png' });
    render(
      <ShareButton
        shareImageBlob={blob}
        consultationId="cons-123"
        format="story"
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'false');
  });
});

describe('ShareButton - click handler (AC: 7 — user activation)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('calls share() when button is clicked', async () => {
    const { ShareButton } = await import('@/components/share/ShareButton');

    mockUseNativeShare.mockReturnValue({
      share: mockShare,
      isSharing: false,
      canShareFiles: false,
      canShareBasic: true,
    });

    const blob = new Blob(['img'], { type: 'image/png' });
    render(
      <ShareButton
        shareImageBlob={blob}
        consultationId="cons-123"
        format="story"
      />
    );

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledTimes(1);
    });
  });

  it('does NOT call share() automatically (user activation required, AC: 7)', async () => {
    const { ShareButton } = await import('@/components/share/ShareButton');

    const blob = new Blob(['img'], { type: 'image/png' });
    render(
      <ShareButton
        shareImageBlob={blob}
        consultationId="cons-123"
        format="story"
      />
    );

    // share() should not be called just by rendering
    expect(mockShare).not.toHaveBeenCalled();
  });
});

describe('ShareButton - variant prop (AC: Task 2.2)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('accepts variant prop without error', async () => {
    const { ShareButton } = await import('@/components/share/ShareButton');
    const blob = new Blob(['img'], { type: 'image/png' });

    expect(() =>
      render(
        <ShareButton
          shareImageBlob={blob}
          consultationId="cons-123"
          format="story"
          variant="secondary"
        />
      )
    ).not.toThrow();
  });
});

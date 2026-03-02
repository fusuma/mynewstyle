import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Use vi.hoisted to avoid variable initialization issues with vi.mock hoisting
const { mockGetUser, mockOnAuthStateChange, mockSignOut, mockUnsubscribe } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockOnAuthStateChange: vi.fn(),
  mockSignOut: vi.fn(),
  mockUnsubscribe: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn().mockReturnValue({
    auth: {
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut,
    },
  }),
}));

import { useAuth } from '@/hooks/useAuth';

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: subscription returns unsubscribe function
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 11.5 Unit test: useAuth hook returns loading state initially, then user/session
  it('returns isLoading=true initially', () => {
    mockGetUser.mockReturnValue(new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('returns user after getUser resolves', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    mockGetUser.mockResolvedValueOnce({ data: { user: mockUser } });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
  });

  it('returns null user when not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });

  it('updates state on auth state change event', async () => {
    const mockUser = { id: 'user-456', email: 'new@example.com' };
    const mockSession = { user: mockUser, access_token: 'token-abc' };

    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    let capturedCallback: ((event: string, session: unknown) => void) | null = null;
    mockOnAuthStateChange.mockImplementation((callback: (event: string, session: unknown) => void) => {
      capturedCallback = callback;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Simulate auth state change
    act(() => {
      capturedCallback?.('SIGNED_IN', mockSession);
    });

    expect(result.current.session).toEqual(mockSession);
    expect(result.current.user).toEqual(mockUser);
  });

  // 11.6 Unit test: useAuth hook handles sign-out correctly
  it('signOut calls supabase.auth.signOut()', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    mockSignOut.mockResolvedValueOnce({});

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(window.location.href).toBe('/');
  });

  // Error resilience: getUser() failure must not leave isLoading=true forever
  it('sets isLoading=false even when getUser() returns an error', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Network error' } });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // User should remain null when getUser errors
    expect(result.current.user).toBeNull();
  });

  // Subscription cleanup on unmount
  it('unsubscribes from auth state changes on unmount', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const { unmount } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(mockOnAuthStateChange).toHaveBeenCalled();
    });

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledOnce();
  });
});

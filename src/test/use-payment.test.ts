import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock consultation store
const mockSetPaymentStatus = vi.fn();
vi.mock('@/stores/consultation', () => ({
  useConsultationStore: vi.fn((selector: (state: { setPaymentStatus: typeof mockSetPaymentStatus }) => unknown) => {
    if (typeof selector === 'function') {
      return selector({ setPaymentStatus: mockSetPaymentStatus });
    }
    return { setPaymentStatus: mockSetPaymentStatus };
  }),
}));

describe('usePayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initial state has null clientSecret and isLoading false', async () => {
    const { usePayment } = await import('@/hooks/usePayment');
    const { result } = renderHook(() => usePayment('test-consultation-id'));
    expect(result.current.clientSecret).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.amount).toBeNull();
    expect(result.current.currency).toBeNull();
    expect(result.current.userType).toBeNull();
  });

  it('calls create-intent API with correct consultationId', async () => {
    const { usePayment } = await import('@/hooks/usePayment');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          clientSecret: 'pi_test_secret',
          amount: 599,
          currency: 'eur',
          userType: 'guest',
        }),
    });

    const { result } = renderHook(() => usePayment('test-uuid-123'));

    await act(async () => {
      await result.current.createPaymentIntent();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/payment/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consultationId: 'test-uuid-123' }),
    });
  });

  it('sets clientSecret on successful API response', async () => {
    const { usePayment } = await import('@/hooks/usePayment');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          clientSecret: 'pi_test_secret_xyz',
          amount: 599,
          currency: 'eur',
          userType: 'guest',
        }),
    });

    const { result } = renderHook(() => usePayment('test-consultation-id'));

    await act(async () => {
      await result.current.createPaymentIntent();
    });

    expect(result.current.clientSecret).toBe('pi_test_secret_xyz');
    expect(result.current.amount).toBe(599);
    expect(result.current.currency).toBe('eur');
    expect(result.current.userType).toBe('guest');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error on API failure with error message', async () => {
    const { usePayment } = await import('@/hooks/usePayment');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Consultation not found' }),
    });

    const { result } = renderHook(() => usePayment('test-consultation-id'));

    await act(async () => {
      await result.current.createPaymentIntent();
    });

    expect(result.current.error).toBe('Consultation not found');
    expect(result.current.clientSecret).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('sets error on network failure', async () => {
    const { usePayment } = await import('@/hooks/usePayment');
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePayment('test-consultation-id'));

    await act(async () => {
      await result.current.createPaymentIntent();
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.clientSecret).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('sets isLoading to false after successful API call', async () => {
    const { usePayment } = await import('@/hooks/usePayment');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          clientSecret: 'pi_test_secret',
          amount: 599,
          currency: 'eur',
          userType: 'guest',
        }),
    });

    const { result } = renderHook(() => usePayment('test-consultation-id'));

    await act(async () => {
      await result.current.createPaymentIntent();
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('updates store paymentStatus to pending on success', async () => {
    const { usePayment } = await import('@/hooks/usePayment');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          clientSecret: 'pi_test_secret',
          amount: 599,
          currency: 'eur',
          userType: 'guest',
        }),
    });

    const { result } = renderHook(() => usePayment('test-consultation-id'));

    await act(async () => {
      await result.current.createPaymentIntent();
    });

    expect(mockSetPaymentStatus).toHaveBeenCalledWith('pending');
  });

  it('does not call setPaymentStatus on API failure', async () => {
    const { usePayment } = await import('@/hooks/usePayment');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    const { result } = renderHook(() => usePayment('test-consultation-id'));

    await act(async () => {
      await result.current.createPaymentIntent();
    });

    expect(mockSetPaymentStatus).not.toHaveBeenCalled();
  });

  it('handles API error with fallback message when no error field in response', async () => {
    const { usePayment } = await import('@/hooks/usePayment');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => usePayment('test-consultation-id'));

    await act(async () => {
      await result.current.createPaymentIntent();
    });

    expect(result.current.error).toContain('500');
  });
});

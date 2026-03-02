/**
 * Tests for guestSessionId in ConsultationStore.
 * Story 8.4, Task 5 (AC: #1, #2)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const GUEST_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

describe('ConsultationStore — guestSessionId', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.resetModules();
  });

  it('exposes guestSessionId field in the store', async () => {
    const { useConsultationStore } = await import('@/stores/consultation');
    const state = useConsultationStore.getState();
    // Field must exist (may be string or null)
    expect('guestSessionId' in state).toBe(true);
  });

  it('initializes guestSessionId from localStorage via getOrCreateGuestSessionId', async () => {
    // Pre-seed localStorage so getOrCreateGuestSessionId returns a known value
    localStorage.setItem('mynewstyle-guest-session-id', GUEST_UUID);

    const { useConsultationStore } = await import('@/stores/consultation');
    const state = useConsultationStore.getState();
    expect(state.guestSessionId).toBe(GUEST_UUID);
  });

  it('guestSessionId persists to sessionStorage (partialize includes it)', async () => {
    localStorage.setItem('mynewstyle-guest-session-id', GUEST_UUID);

    const { useConsultationStore } = await import('@/stores/consultation');
    // Trigger a state change to flush persist
    useConsultationStore.getState().setGender('male');

    const stored = sessionStorage.getItem('mynewstyle-consultation');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.state.guestSessionId).toBe(GUEST_UUID);
  });

  it('reset() does NOT clear guestSessionId', async () => {
    localStorage.setItem('mynewstyle-guest-session-id', GUEST_UUID);

    const { useConsultationStore } = await import('@/stores/consultation');
    useConsultationStore.getState().setGender('male');
    useConsultationStore.getState().reset();

    const state = useConsultationStore.getState();
    expect(state.guestSessionId).toBe(GUEST_UUID);
    // Other fields are reset
    expect(state.gender).toBeNull();
  });

  it('setGuestSessionId action updates guestSessionId', async () => {
    const { useConsultationStore } = await import('@/stores/consultation');
    const newId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    useConsultationStore.getState().setGuestSessionId(newId);
    expect(useConsultationStore.getState().guestSessionId).toBe(newId);
  });
});

/**
 * Integration tests for server-side guest session handling.
 * Story 8.4, Task 3 (AC: #8, #9)
 *
 * Tests:
 *  - POST /api/consultation/start accepts optional guestSessionId
 *  - GET /api/consultation/:id/status handles x-guest-session-id header
 *  - x-guest-session-id header validated (UUID format)
 *  - guest-context.ts helper
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const VALID_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

// ----------------------------------------------------------------
// POST /api/consultation/start — guest session integration
// ----------------------------------------------------------------
describe('POST /api/consultation/start with guestSessionId', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  function createRequest(
    body: unknown,
    headers?: Record<string, string>
  ): NextRequest {
    return new NextRequest('http://localhost:3000/api/consultation/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(headers ?? {}) },
      body: JSON.stringify(body),
    });
  }

  const validPayload = {
    gender: 'male',
    photoUrl: 'data:image/jpeg;base64,/9j/4AAQ',
    questionnaire: { q1: 'answer1' },
  };

  it('returns 201 when guestSessionId is omitted (backward compatible)', async () => {
    const { POST } = await import('@/app/api/consultation/start/route');
    const request = createRequest(validPayload);
    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  it('returns 201 and stores guestSessionId when a valid UUID is supplied in body', async () => {
    const { POST, consultations } = await import(
      '@/app/api/consultation/start/route'
    );
    const request = createRequest({
      ...validPayload,
      guestSessionId: VALID_UUID,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty('consultationId');

    // Verify the record has guest_session_id set
    const record = consultations.get(data.consultationId);
    expect(record?.guest_session_id).toBe(VALID_UUID);
  });

  it('returns 400 when guestSessionId is not a valid UUID', async () => {
    const { POST } = await import('@/app/api/consultation/start/route');
    const request = createRequest({
      ...validPayload,
      guestSessionId: 'not-a-uuid',
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('guest record has null guest_session_id when not provided', async () => {
    const { POST, consultations } = await import(
      '@/app/api/consultation/start/route'
    );
    const request = createRequest(validPayload);
    const response = await POST(request);
    const data = await response.json();

    const record = consultations.get(data.consultationId);
    expect(record?.guest_session_id).toBeNull();
  });
});

// ----------------------------------------------------------------
// GET /api/consultation/:id/status — guest session header handling
// ----------------------------------------------------------------
// Captured rpc calls for assertion (module-level so they can be accessed inside describe)
const statusRpcCalls: unknown[][] = [];

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { id: VALID_UUID, status: 'pending', payment_status: 'none' },
            error: null,
          }),
        }),
      }),
    }),
    rpc: (...args: unknown[]) => {
      statusRpcCalls.push(args);
      return Promise.resolve({ data: null, error: null });
    },
  }),
}));

describe('GET /api/consultation/:id/status with x-guest-session-id', () => {
  beforeEach(() => {
    vi.resetModules();
    statusRpcCalls.length = 0;
  });

  function createStatusRequest(
    consultationId: string,
    headers?: Record<string, string>
  ): NextRequest {
    return new NextRequest(
      `http://localhost:3000/api/consultation/${consultationId}/status`,
      {
        method: 'GET',
        headers: { ...(headers ?? {}) },
      }
    );
  }

  it('returns 200 when no x-guest-session-id header is present', async () => {
    const { GET } = await import('@/app/api/consultation/[id]/status/route');
    const request = createStatusRequest(VALID_UUID);
    const response = await GET(request, { params: Promise.resolve({ id: VALID_UUID }) });
    expect(response.status).toBe(200);
  });

  it('returns 400 when x-guest-session-id header is malformed', async () => {
    const { GET } = await import('@/app/api/consultation/[id]/status/route');
    const request = createStatusRequest(VALID_UUID, {
      'x-guest-session-id': 'not-a-uuid',
    });
    const response = await GET(request, { params: Promise.resolve({ id: VALID_UUID }) });
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('calls setGuestContext (rpc set_config with is_local) when valid x-guest-session-id header present', async () => {
    const { GET } = await import('@/app/api/consultation/[id]/status/route');
    const GUEST_UUID_LOCAL = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const request = createStatusRequest(VALID_UUID, {
      'x-guest-session-id': GUEST_UUID_LOCAL,
    });
    const response = await GET(request, { params: Promise.resolve({ id: VALID_UUID }) });
    expect(response.status).toBe(200);
    // Verify set_config was called with the guest session ID and is_local: true
    expect(statusRpcCalls).toContainEqual([
      'set_config',
      { setting: 'app.guest_session_id', value: GUEST_UUID_LOCAL, is_local: true },
    ]);
  });
});

// ----------------------------------------------------------------
// x-guest-session-id header validation helper
// ----------------------------------------------------------------
describe('validateGuestSessionHeader', () => {
  it('returns the UUID when the header is a valid UUID', async () => {
    const { validateGuestSessionHeader } = await import(
      '@/lib/supabase/guest-context'
    );
    expect(validateGuestSessionHeader(VALID_UUID)).toBe(VALID_UUID);
  });

  it('returns null when the header value is not a valid UUID', async () => {
    const { validateGuestSessionHeader } = await import(
      '@/lib/supabase/guest-context'
    );
    expect(validateGuestSessionHeader('not-a-uuid')).toBeNull();
  });

  it('returns null for empty string', async () => {
    const { validateGuestSessionHeader } = await import(
      '@/lib/supabase/guest-context'
    );
    expect(validateGuestSessionHeader('')).toBeNull();
  });

  it('returns null for null/undefined', async () => {
    const { validateGuestSessionHeader } = await import(
      '@/lib/supabase/guest-context'
    );
    expect(validateGuestSessionHeader(null as unknown as string)).toBeNull();
    expect(validateGuestSessionHeader(undefined as unknown as string)).toBeNull();
  });
});

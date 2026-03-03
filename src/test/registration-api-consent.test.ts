/**
 * Tests for Story 11.2: Consent Flow
 * Registration API - lgpd_consent_given_at timestamp
 *
 * Tests cover:
 * - Task 7.6: registration API stores consent timestamp in user metadata
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock @supabase/ssr and server client before importing route
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}));

// Mock next/headers (required by server.ts)
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  name: 'João Silva',
  email: 'joao@example.com',
  password: 'senha123',
  lgpdConsent: true,
};

describe('POST /api/auth/register - LGPD consent timestamp (Story 11.2)', () => {
  let mockSignUp: ReturnType<typeof vi.fn>;
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.resetModules();

    mockSignUp = vi.fn().mockResolvedValue({
      data: {
        user: { id: 'user-123', email: 'joao@example.com' },
        session: null,
      },
      error: null,
    });

    const serverModule = await import('@/lib/supabase/server');
    vi.mocked(serverModule.createClient).mockResolvedValue({
      auth: { signUp: mockSignUp },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'user-123' }, error: null }),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof serverModule.createClient> extends Promise<infer T> ? T : never);

    const routeModule = await import('@/app/api/auth/register/route');
    POST = routeModule.POST;
  });

  it('includes lgpd_consent_given_at in user metadata on successful registration', async () => {
    const response = await POST(createRequest(validPayload));

    expect(response.status).toBe(201);
    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: expect.objectContaining({
            lgpd_consent_given_at: expect.any(String),
          }),
        }),
      })
    );
  });

  it('lgpd_consent_given_at is a valid ISO 8601 timestamp', async () => {
    await POST(createRequest(validPayload));

    const callArgs = mockSignUp.mock.calls[0][0];
    const timestamp = callArgs.options.data.lgpd_consent_given_at;

    // Should be a valid ISO string
    expect(typeof timestamp).toBe('string');
    expect(() => new Date(timestamp).toISOString()).not.toThrow();

    // Should be parseable and close to current time
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = Math.abs(now.getTime() - date.getTime());
    // Within 5 seconds of current time
    expect(diffMs).toBeLessThan(5000);
  });

  it('does not include lgpd_consent_given_at when lgpdConsent is false (blocked by validation)', async () => {
    const response = await POST(createRequest({ ...validPayload, lgpdConsent: false }));

    // Request should be rejected at validation
    expect(response.status).toBe(400);
    // signUp should NOT have been called
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('still passes full_name and display_name metadata alongside consent timestamp', async () => {
    await POST(createRequest(validPayload));

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: expect.objectContaining({
            full_name: 'João Silva',
            display_name: 'João Silva',
            lgpd_consent_given_at: expect.any(String),
          }),
        }),
      })
    );
  });
});

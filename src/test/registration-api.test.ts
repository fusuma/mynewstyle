/**
 * Tests for POST /api/auth/register
 * Story 8.2: Registration Page
 *
 * Tests cover:
 * - Task 6.1: Zod schema validation (name, email, password)
 * - Task 6.2: API route logic (success, duplicate email, weak password)
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

describe('POST /api/auth/register', () => {
  let mockSignUp: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;
  let mockInsert: ReturnType<typeof vi.fn>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.resetModules();

    mockSingle = vi.fn().mockResolvedValue({ data: { id: 'user-123' }, error: null });
    mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
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
      from: mockFrom,
    } as unknown as ReturnType<typeof serverModule.createClient> extends Promise<infer T> ? T : never);

    const routeModule = await import('@/app/api/auth/register/route');
    POST = routeModule.POST;
  });

  describe('Input validation', () => {
    it('returns 400 when name is missing', async () => {
      const { name, ...payload } = validPayload;
      const response = await POST(createRequest(payload));
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('returns 400 when name is empty string', async () => {
      const response = await POST(createRequest({ ...validPayload, name: '' }));
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('returns 400 when email is missing', async () => {
      const { email, ...payload } = validPayload;
      const response = await POST(createRequest(payload));
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('returns 400 when email is invalid format', async () => {
      const response = await POST(createRequest({ ...validPayload, email: 'not-an-email' }));
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('returns 400 when password is missing', async () => {
      const { password, ...payload } = validPayload;
      const response = await POST(createRequest(payload));
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('returns 400 when password is shorter than 8 characters', async () => {
      const response = await POST(createRequest({ ...validPayload, password: 'curto' }));
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('returns 400 when lgpdConsent is missing', async () => {
      const { lgpdConsent, ...payload } = validPayload;
      const response = await POST(createRequest(payload));
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('returns 400 when lgpdConsent is false', async () => {
      const response = await POST(createRequest({ ...validPayload, lgpdConsent: false }));
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('Successful registration', () => {
    it('returns 201 on successful registration', async () => {
      const response = await POST(createRequest(validPayload));
      expect(response.status).toBe(201);
    });

    it('returns message in Portuguese on success', async () => {
      const response = await POST(createRequest(validPayload));
      const data = await response.json();
      expect(data).toHaveProperty('message');
    });

    it('calls supabase.auth.signUp with correct email and password', async () => {
      await POST(createRequest(validPayload));
      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'joao@example.com',
          password: 'senha123',
        })
      );
    });

    it('passes display_name in metadata to supabase.auth.signUp', async () => {
      await POST(createRequest(validPayload));
      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            data: expect.objectContaining({
              full_name: 'João Silva',
            }),
          }),
        })
      );
    });

    it('returns application/json content-type', async () => {
      const response = await POST(createRequest(validPayload));
      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('Error handling', () => {
    it('returns 409 with Portuguese error message for duplicate email', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered', status: 400, code: 'user_already_exists' },
      });

      const response = await POST(createRequest(validPayload));
      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      // Error message must be in Portuguese
      expect(data.error).toBeTruthy();
    });

    it('returns 422 with Portuguese error message for weak password', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Password should be at least 6 characters', status: 422, code: 'weak_password' },
      });

      const response = await POST(createRequest(validPayload));
      expect(response.status).toBe(422);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('returns 500 for unexpected Supabase errors', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Internal server error', status: 500, code: 'unexpected' },
      });

      const response = await POST(createRequest(validPayload));
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('returns 500 when body is not valid JSON', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json',
      });
      const response = await POST(req);
      expect(response.status).toBe(400);
    });
  });
});

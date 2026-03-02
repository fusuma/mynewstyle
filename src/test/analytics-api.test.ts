import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Shared mock state
const mockInsert = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

// Mock @/lib/supabase/server — both service role and user client
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({
    from: mockFrom,
  }),
  createClient: () =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
    }),
}));

function createPostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validEvent = {
  eventType: 'gender_selected',
  eventData: { gender: 'male' },
  sessionId: '550e8400-e29b-41d4-a716-446655440000',
  deviceInfo: { browser: 'Chrome', os: 'macOS', isMobile: false },
  timestamp: '2026-03-02T10:00:00.000Z',
};

describe('POST /api/analytics/events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: unauthenticated user
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  it('returns 200 on valid single event', async () => {
    const { POST } = await import('@/app/api/analytics/events/route');
    const req = createPostRequest({ events: [validEvent] });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('success', true);
  });

  it('returns 200 on valid batch of events', async () => {
    const { POST } = await import('@/app/api/analytics/events/route');
    const events = Array(5).fill(null).map((_, i) => ({
      ...validEvent,
      eventType: 'gender_selected',
      timestamp: new Date(Date.now() + i * 1000).toISOString(),
    }));
    const req = createPostRequest({ events });
    const res = await POST(req);

    expect(res.status).toBe(200);
  });

  it('returns 400 when events array is missing', async () => {
    const { POST } = await import('@/app/api/analytics/events/route');
    const req = createPostRequest({});
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty('error');
  });

  it('returns 400 when events array is empty', async () => {
    const { POST } = await import('@/app/api/analytics/events/route');
    const req = createPostRequest({ events: [] });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 when eventType is missing', async () => {
    const { POST } = await import('@/app/api/analytics/events/route');
    const invalidEvent = { ...validEvent };
    // @ts-expect-error intentional invalid data
    delete invalidEvent.eventType;
    const req = createPostRequest({ events: [invalidEvent] });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('returns 400 when sessionId is missing', async () => {
    const { POST } = await import('@/app/api/analytics/events/route');
    const invalidEvent = { ...validEvent };
    // @ts-expect-error intentional invalid data
    delete invalidEvent.sessionId;
    const req = createPostRequest({ events: [invalidEvent] });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it('inserts events using service role client (bypasses RLS)', async () => {
    const { POST } = await import('@/app/api/analytics/events/route');
    const req = createPostRequest({ events: [validEvent] });
    await POST(req);

    expect(mockFrom).toHaveBeenCalledWith('analytics_events');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          event_type: 'gender_selected',
          session_id: '550e8400-e29b-41d4-a716-446655440000',
        }),
      ])
    );
  });

  it('returns 500 on database insertion error', async () => {
    mockInsert.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const { POST } = await import('@/app/api/analytics/events/route');
    const req = createPostRequest({ events: [validEvent] });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    // Error message should not expose internal DB details to client
    expect(data.error).not.toContain('DB error');
  });

  it('populates user_id from auth session when user is authenticated', async () => {
    // Set mockGetUser to return authenticated user for this test
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-user-uuid' } },
      error: null,
    });

    const { POST } = await import('@/app/api/analytics/events/route');
    const req = createPostRequest({ events: [validEvent] });
    await POST(req);

    expect(mockInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          user_id: 'auth-user-uuid',
        }),
      ])
    );
  });

  it('inserts all events in a single batch call', async () => {
    const { POST } = await import('@/app/api/analytics/events/route');
    const events = [
      { ...validEvent, eventType: 'gender_selected' },
      { ...validEvent, eventType: 'photo_captured' },
      { ...validEvent, eventType: 'questionnaire_started' },
    ];
    const req = createPostRequest({ events });
    await POST(req);

    // Should call insert exactly once with all events
    expect(mockInsert).toHaveBeenCalledTimes(1);
    const insertedEvents = mockInsert.mock.calls[0][0];
    expect(insertedEvents).toHaveLength(3);
  });
});

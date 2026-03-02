/**
 * POST /api/analytics/events
 * Story 10.1, Task 4
 *
 * Receives batched analytics events from the client, validates with Zod,
 * and inserts into the analytics_events table using the service role client
 * (bypasses RLS so anon/guest events are always stored).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { createServiceRoleClient, createClient } from '@/lib/supabase/server';

// Zod schema: validates batched event payload from client
const AnalyticsEventSchema = z.object({
  eventType: z.string().min(1),
  eventData: z.record(z.string(), z.unknown()).optional().default({}),
  sessionId: z.string().min(1),
  userId: z.string().optional(),
  deviceInfo: z.record(z.string(), z.unknown()).optional().default({}),
  timestamp: z.string().min(1),
});

const AnalyticsBatchSchema = z.object({
  events: z.array(AnalyticsEventSchema).min(1),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = AnalyticsBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request payload', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { events } = parsed.data;

  // Extract user_id server-side from auth session (more reliable than client-provided)
  // If user is authenticated, their Supabase auth cookies will be present
  let serverUserId: string | null = null;
  try {
    const supabaseUser = await createClient();
    const { data } = await supabaseUser.auth.getUser();
    serverUserId = data?.user?.id ?? null;
  } catch {
    // Auth extraction failure is non-fatal — analytics events still get stored
    serverUserId = null;
  }

  // Map events to database row format
  const rows = events.map((event) => ({
    session_id: event.sessionId,
    user_id: serverUserId, // Always prefer server-side user_id (avoids spoofing)
    event_type: event.eventType,
    event_data: event.eventData ?? {},
    device_info: event.deviceInfo ?? {},
    created_at: event.timestamp,
  }));

  // Insert all events in a single batch using service role client (bypasses RLS)
  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient.from('analytics_events').insert(rows);

  if (error) {
    // Log server-side but do not expose DB error details to client
    console.error('[analytics/events] Database insertion error:', error.message);
    return NextResponse.json(
      { error: 'Failed to store analytics events' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, count: rows.length });
}

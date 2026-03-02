import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  validateGuestSessionHeader,
  setGuestContext,
} from '@/lib/supabase/guest-context';

const ParamsSchema = z.object({
  id: z.string().uuid('Invalid consultation ID'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const parseResult = ParamsSchema.safeParse(resolvedParams);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid consultation ID' },
      { status: 400 }
    );
  }

  // Validate x-guest-session-id header if present (Story 8.4, Task 3.2 / AC #9)
  const rawGuestHeader = request.headers.get('x-guest-session-id');
  if (rawGuestHeader !== null) {
    const validatedGuestId = validateGuestSessionHeader(rawGuestHeader);
    if (!validatedGuestId) {
      return NextResponse.json(
        { error: 'x-guest-session-id must be a valid UUID' },
        { status: 400 }
      );
    }
  }

  const { id } = parseResult.data;
  const supabase = createServerSupabaseClient();

  // Set PostgreSQL session variable so RLS policy grants guest access (Story 8.4, AC #10)
  const guestSessionId = rawGuestHeader
    ? validateGuestSessionHeader(rawGuestHeader)
    : null;
  if (guestSessionId) {
    await setGuestContext(supabase, guestSessionId);
  }

  const { data: consultation, error } = await supabase
    .from('consultations')
    .select('id, status, payment_status')
    .eq('id', id)
    .single();

  // PGRST116 = "no rows found" -- return 404 only for genuine not-found
  // Any other error code is an unexpected DB failure -- return 500
  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      );
    }
    console.error('[GET /api/consultation/[id]/status] Supabase error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }

  if (!consultation) {
    return NextResponse.json(
      { error: 'Consultation not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: consultation.id,
    status: consultation.status,
    paymentStatus: consultation.payment_status,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/auth-server';

/**
 * POST /api/consultation/[id]/rate
 *
 * Submits (or updates) a satisfaction rating for a paid consultation.
 * Story 10.5: Post-Consultation Rating — AC #4
 *
 * Supports both authenticated users (Supabase Auth cookies) and
 * guest users (x-guest-session-id header matching consultation.guest_session_id).
 *
 * Returns:
 *   200 - { success: true, rating, details }
 *   400 - Invalid input (bad UUID, Zod validation failure)
 *   401 - Unauthorized (not authenticated and no matching guest session)
 *   404 - Consultation not found, not owned by user, or not paid
 *   500 - Database error
 */

const ParamsSchema = z.object({
  id: z.string().uuid('Invalid consultation ID'),
});

const RatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  details: z
    .object({
      faceShapeAccuracy: z.number().int().min(1).max(5).optional(),
      recommendationQuality: z.number().int().min(1).max(5).optional(),
      previewRealism: z.number().int().min(1).max(5).optional(),
    })
    .optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // 1. Validate consultation ID param
  const resolvedParams = await params;
  const parseResult = ParamsSchema.safeParse(resolvedParams);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid consultation ID' },
      { status: 400 }
    );
  }

  const { id } = parseResult.data;

  // 2. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const bodyResult = RatingSchema.safeParse(body);
  if (!bodyResult.success) {
    return NextResponse.json(
      { error: 'Invalid rating data', details: bodyResult.error.issues },
      { status: 400 }
    );
  }

  const { rating, details } = bodyResult.data;

  // 3. Auth check: try authenticated user first
  const supabase = createAuthenticatedSupabaseClient(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Guest session fallback
  const guestSessionId = request.headers.get('x-guest-session-id') ?? null;

  if ((authError || !user) && !guestSessionId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  // 4. Fetch consultation — verify it exists, belongs to user, and is paid
  // Build the query — if authenticated, scope to user_id; otherwise let RLS/guest handle it
  const fetchQuery = supabase
    .from('consultations')
    .select('id, payment_status, user_id, guest_session_id')
    .eq('id', id);

  const { data: consultation, error: fetchError } = user
    ? await fetchQuery.eq('user_id', user.id).single()
    : await fetchQuery.single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
    }
    console.error('[POST /api/consultation/[id]/rate] fetch error:', fetchError);
    return NextResponse.json({ error: 'Erro ao carregar consultoria' }, { status: 500 });
  }

  if (!consultation) {
    return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
  }

  // Guest session validation: if no authenticated user, verify guest_session_id matches
  if (!user && guestSessionId) {
    if (consultation.guest_session_id !== guestSessionId) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 });
    }
  }

  // Only paid consultations can be rated
  if (consultation.payment_status !== 'paid') {
    return NextResponse.json(
      { error: 'Only paid consultations can be rated' },
      { status: 404 }
    );
  }

  // 5. Build rating_details with ratedAt timestamp
  const ratingDetails = details
    ? {
        ...details,
        ratedAt: new Date().toISOString(),
      }
    : { ratedAt: new Date().toISOString() };

  // 6. Update the consultation record
  const { error: updateError } = await supabase
    .from('consultations')
    .update({
      rating,
      rating_details: ratingDetails,
    })
    .eq('id', id);

  if (updateError) {
    console.error('[POST /api/consultation/[id]/rate] update error:', updateError);
    return NextResponse.json({ error: 'Erro ao salvar avaliação' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    rating,
    details: details ?? null,
  });
}

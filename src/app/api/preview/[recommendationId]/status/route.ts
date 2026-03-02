import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const RecommendationIdSchema = z.string().uuid('recommendationId must be a valid UUID');

/**
 * GET /api/preview/[recommendationId]/status
 *
 * Returns the current preview_status and preview_url for a recommendation.
 * Used by the client to poll preview generation progress.
 *
 * Response: { status: preview_status, previewUrl: preview_url | null }
 *
 * preview_status values: 'none' | 'generating' | 'ready' | 'failed' | 'unavailable'
 * previewUrl: Supabase Storage URL when status is 'ready', null otherwise
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ recommendationId: string }> }
) {
  const { recommendationId } = await params;

  // Validate recommendationId as UUID (AC #11)
  const parsed = RecommendationIdSchema.safeParse(recommendationId);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid recommendationId: must be a valid UUID' },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();

  // Fetch recommendation's preview status and URL
  const { data: recommendation, error } = await supabase
    .from('recommendations')
    .select('id, preview_status, preview_url')
    .eq('id', recommendationId)
    .single();

  if (error || !recommendation) {
    return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
  }

  return NextResponse.json({
    status: recommendation.preview_status as string,
    previewUrl: (recommendation.preview_url as string | null) ?? null,
  });
}

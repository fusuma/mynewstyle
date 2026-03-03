import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/auth-server';
import { AnalyticsEventType } from '@/lib/analytics/types';

/**
 * GET /api/profile/export
 *
 * Returns a JSON file containing all user personal data for LGPD right to access.
 * Respects RLS — uses the authenticated user's session, NOT the service role client.
 *
 * Returns:
 *   200 - JSON file with Content-Disposition attachment header
 *   401 - User not authenticated
 *   429 - Rate limit exceeded (3 requests per hour per user)
 *   500 - Database error
 *
 * Story 11.4 — LGPD Article 18, III: Right to confirmation and access to personal data.
 */

// In-memory rate limiting (acceptable for serverless MVP)
// Each serverless instance is short-lived; state resets between cold starts.
const exportRateLimits = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const hourAgo = now - 3600000;
  const timestamps = (exportRateLimits.get(userId) ?? []).filter(t => t > hourAgo);
  if (timestamps.length >= 3) return false;
  timestamps.push(now);
  exportRateLimits.set(userId, timestamps);
  return true;
}

/**
 * Generate a signed URL for a Supabase Storage path.
 * Returns null if the file doesn't exist or signing fails — non-fatal.
 */
async function getSignedUrl(
  supabase: ReturnType<typeof createAuthenticatedSupabaseClient>,
  bucket: string,
  path: string | null | undefined
): Promise<string | null> {
  if (!path) return null;

  // Extract just the path portion if full URL was stored
  // Storage paths look like: "bucket-name/user-id/filename" or just "user-id/filename"
  let storagePath = path;
  // Strip leading bucket name if present (e.g., "consultation-photos/user-id/file.jpg")
  const bucketPrefix = `${bucket}/`;
  if (storagePath.startsWith(bucketPrefix)) {
    storagePath = storagePath.slice(bucketPrefix.length);
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, 900); // 15-minute expiry

    if (error || !data?.signedUrl) {
      return null;
    }
    return data.signedUrl;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = createAuthenticatedSupabaseClient(request);

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Não autenticado' },
      { status: 401 }
    );
  }

  // Rate limiting: 3 requests per hour per user
  if (!checkRateLimit(user.id)) {
    return NextResponse.json(
      { error: 'Limite de exportações excedido. Tente novamente em 1 hora.' },
      { status: 429 }
    );
  }

  // Query profile data
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name, gender_preference, created_at, updated_at, email')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('[GET /api/profile/export] Profile query error:', profileError);
    return NextResponse.json(
      { error: 'Erro ao exportar dados' },
      { status: 500 }
    );
  }

  // Query consultations with nested data
  const { data: consultationsData, error: consultationsError } = await supabase
    .from('consultations')
    .select(`
      id,
      gender,
      photo_url,
      questionnaire_responses,
      face_analysis,
      status,
      payment_status,
      created_at,
      completed_at,
      rating,
      rating_details,
      recommendations(
        id,
        consultation_id,
        rank,
        style_name,
        justification,
        match_score,
        difficulty_level,
        preview_url,
        preview_status,
        created_at
      ),
      styles_to_avoid(
        id,
        consultation_id,
        style_name,
        reason
      ),
      grooming_tips(
        id,
        consultation_id,
        category,
        tip_text,
        icon
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (consultationsError) {
    console.error('[GET /api/profile/export] Consultations query error:', consultationsError);
    return NextResponse.json(
      { error: 'Erro ao exportar dados' },
      { status: 500 }
    );
  }

  // Query favorites with recommendation style names
  const { data: favoritesData, error: favoritesError } = await supabase
    .from('favorites')
    .select(`
      id,
      recommendation_id,
      created_at,
      recommendations(
        style_name
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (favoritesError) {
    console.error('[GET /api/profile/export] Favorites query error:', favoritesError);
    return NextResponse.json(
      { error: 'Erro ao exportar dados' },
      { status: 500 }
    );
  }

  // Build consultations with signed URLs and mapped fields
  const consultations = await Promise.all(
    (consultationsData ?? []).map(async (consultation) => {
      // Generate signed URL for photo_url
      const photoUrl = await getSignedUrl(supabase, 'consultation-photos', consultation.photo_url);

      // Map recommendations, generating signed URLs for preview_url
      const recommendations = await Promise.all(
        ((consultation.recommendations as Array<{
          id: string;
          consultation_id: string;
          rank: number;
          style_name: string;
          justification: string;
          match_score: number;
          difficulty_level: string;
          preview_url: string | null;
          preview_status: string;
          created_at: string;
        }>) ?? []).map(async (rec) => {
          const previewUrl = await getSignedUrl(supabase, 'preview-images', rec.preview_url);
          return {
            id: rec.id,
            rank: rec.rank,
            styleName: rec.style_name,
            justification: rec.justification,
            matchScore: rec.match_score,
            difficultyLevel: rec.difficulty_level,
            previewUrl,
            previewStatus: rec.preview_status,
            createdAt: rec.created_at,
          };
        })
      );

      const stylesToAvoid = ((consultation.styles_to_avoid as Array<{
        id: string;
        consultation_id: string;
        style_name: string;
        reason: string;
      }>) ?? []).map((sta) => ({
        styleName: sta.style_name,
        reason: sta.reason,
      }));

      const groomingTips = ((consultation.grooming_tips as Array<{
        id: string;
        consultation_id: string;
        category: string;
        tip_text: string;
        icon: string;
      }>) ?? []).map((tip) => ({
        category: tip.category,
        tipText: tip.tip_text,
        icon: tip.icon,
      }));

      // Internal fields explicitly excluded:
      // ai_cost_cents, ai_model_versions, guest_session_id, payment_intent_id, photo_quality_score
      return {
        id: consultation.id,
        gender: consultation.gender,
        photoUrl,
        questionnaireResponses: consultation.questionnaire_responses,
        faceAnalysis: consultation.face_analysis,
        status: consultation.status,
        paymentStatus: consultation.payment_status,
        createdAt: consultation.created_at,
        completedAt: consultation.completed_at,
        rating: consultation.rating,
        ratingDetails: consultation.rating_details,
        recommendations,
        stylesToAvoid,
        groomingTips,
      };
    })
  );

  // Map favorites
  // Note: Supabase PostgREST returns nested relations as arrays; take the first element.
  const favorites = (favoritesData ?? []).map((fav) => {
    const recs = fav.recommendations as { style_name: string }[] | null;
    const rec = Array.isArray(recs) && recs.length > 0 ? recs[0] : null;
    return {
      recommendationId: fav.recommendation_id,
      styleName: rec?.style_name ?? '',
      favoritedAt: fav.created_at,
    };
  });

  // Build the export payload
  const profile = profileData
    ? {
        displayName: profileData.display_name,
        email: profileData.email ?? user.email,
        genderPreference: profileData.gender_preference,
        createdAt: profileData.created_at,
        updatedAt: profileData.updated_at,
      }
    : {
        displayName: null,
        email: user.email,
        genderPreference: null,
        createdAt: null,
        updatedAt: null,
      };

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    platform: 'mynewstyle',
    userId: user.id,
    profile,
    consultations,
    favorites,
  };

  // Emit analytics event (server-side — fire and forget via direct Supabase insert)
  try {
    await supabase.from('analytics_events').insert({
      user_id: user.id,
      event_type: AnalyticsEventType.DATA_EXPORT_REQUESTED,
      event_data: { userId: user.id },
      session_id: 'server',
      device_info: {},
    });
  } catch {
    // Non-fatal — don't fail the export if analytics insert fails
    console.error('[GET /api/profile/export] Analytics event insert failed');
  }

  // Return as downloadable JSON attachment
  const userId = user.id;
  const userIdPrefix = userId.slice(0, 8);
  const filename = `mynewstyle-data-export-${userIdPrefix}.json`;
  const jsonBody = JSON.stringify(exportPayload, null, 2);

  return new NextResponse(jsonBody, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

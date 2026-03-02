import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/auth-server';
import type { FavoriteItem } from '@/types';

const addFavoriteSchema = z.object({
  recommendationId: z.string().uuid('ID de recomendação inválido'),
});

/**
 * GET /api/profile/favorites
 *
 * Returns the authenticated user's saved favorites, sorted by date (newest first).
 * Joins recommendations and consultations data for card rendering.
 * Respects RLS — uses the authenticated user's session.
 *
 * Returns:
 *   200 - { favorites: FavoriteItem[] }
 *   401 - User not authenticated
 *   500 - Database error
 */
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

  // Query favorites joined with recommendations and consultations
  const { data, error } = await supabase
    .from('favorites')
    .select(`
      id,
      created_at,
      recommendation_id,
      recommendations!inner(
        id,
        style_name,
        match_score,
        consultation_id,
        consultations!inner(
          face_analysis,
          gender,
          created_at
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[GET /api/profile/favorites] DB error:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar favoritos' },
      { status: 500 }
    );
  }

  // Map DB rows to FavoriteItem shape
  const favorites: FavoriteItem[] = (data ?? []).map((row) => {
    const rec = row.recommendations as {
      id: string;
      style_name: string;
      match_score: number;
      consultation_id: string;
      consultations: {
        face_analysis: { faceShape?: string; confidence?: number } | null;
        gender: string;
        created_at: string;
      };
    } | null;

    const consultation = rec?.consultations ?? null;
    const faceAnalysis = consultation?.face_analysis as { faceShape?: string } | null;

    return {
      id: row.id,
      favoritedAt: row.created_at,
      recommendationId: row.recommendation_id,
      styleName: rec?.style_name ?? '',
      matchScore: rec?.match_score ?? 0,
      consultationId: rec?.consultation_id ?? '',
      faceShape: (faceAnalysis?.faceShape ?? 'oval') as FavoriteItem['faceShape'],
      gender: (consultation?.gender ?? 'male') as FavoriteItem['gender'],
      consultationDate: consultation?.created_at ?? '',
    };
  });

  return NextResponse.json({ favorites });
}

/**
 * POST /api/profile/favorites
 *
 * Adds a recommendation to the user's favorites.
 * Body: { recommendationId: string }
 *
 * Returns:
 *   201 - { id: string, message: string }
 *   400 - Invalid or missing recommendationId
 *   401 - User not authenticated
 *   409 - Already favorited
 *   500 - Database error
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = createAuthenticatedSupabaseClient(request);

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Não autenticado' },
      { status: 401 }
    );
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requisição inválida' }, { status: 400 });
  }

  const parseResult = addFavoriteSchema.safeParse(body);
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? 'Dados inválidos' },
      { status: 400 }
    );
  }

  const { recommendationId } = parseResult.data;

  // Insert into favorites (unique constraint will reject duplicates)
  const { data, error } = await supabase
    .from('favorites')
    .insert({ user_id: user.id, recommendation_id: recommendationId })
    .select('id')
    .single();

  if (error) {
    // Unique constraint violation = already favorited
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Esta recomendação já está nos favoritos' },
        { status: 409 }
      );
    }
    console.error('[POST /api/profile/favorites] DB error:', error);
    return NextResponse.json(
      { error: 'Erro ao adicionar favorito' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { id: data?.id, message: 'Adicionado aos favoritos' },
    { status: 201 }
  );
}

/**
 * DELETE /api/profile/favorites
 *
 * Removes a recommendation from the user's favorites.
 * Query param: ?recommendationId=<uuid>
 *
 * Returns:
 *   200 - { message: string }
 *   400 - Missing recommendationId
 *   401 - User not authenticated
 *   500 - Database error
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const supabase = createAuthenticatedSupabaseClient(request);

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Não autenticado' },
      { status: 401 }
    );
  }

  // Get recommendationId from query params
  const { searchParams } = new URL(request.url);
  const recommendationId = searchParams.get('recommendationId');

  if (!recommendationId) {
    return NextResponse.json(
      { error: 'recommendationId é obrigatório' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('recommendation_id', recommendationId);

  if (error) {
    console.error('[DELETE /api/profile/favorites] DB error:', error);
    return NextResponse.json(
      { error: 'Erro ao remover favorito' },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: 'Removido dos favoritos' });
}

/**
 * POST /api/auth/claim-guest
 * Story 8.5: Guest-to-Auth Migration
 *
 * Migrates guest consultation data to an authenticated user's account.
 * - Requires a valid Supabase auth session (JWT in cookies)
 * - Accepts { guestSessionId: string } (must be a valid UUID)
 * - Calls the claim_guest_consultations RPC for atomic DB migration
 * - Triggers photo storage migration for each migrated consultation
 * - Returns { migrated: number, consultationIds: string[] }
 *
 * AC: #1, #2, #3, #5, #8, #9, #10
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

// ─── Input validation schema (Task 1.2) ──────────────────────────────────────

const claimGuestSchema = z.object({
  guestSessionId: z.string().uuid('Invalid guest session ID format'),
});

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  // ── Task 1.3: Authenticate the request ──────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // ── Parse and validate request body ─────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = claimGuestSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid request';
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { guestSessionId } = parsed.data;

  // ── Task 1.7: Use RPC for atomic DB migration (Task 1.4 -- 1.6 via RPC) ─
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    'claim_guest_consultations',
    {
      p_guest_session_id: guestSessionId,
      p_user_id: user.id,
    }
  );

  if (rpcError) {
    console.error('[claim-guest] RPC error:', rpcError);
    return NextResponse.json(
      { error: 'Migration failed. Please try again.' },
      { status: 500 }
    );
  }

  const migrated: number = rpcResult?.migrated_count ?? 0;
  const consultationIds: string[] = rpcResult?.consultation_ids ?? [];

  // ── Task 1.5: No-op case -- success, not an error (AC: #8) ───────────────
  if (migrated === 0) {
    return NextResponse.json({
      migrated: 0,
      consultationIds: [],
      message: 'No guest consultations found',
    });
  }

  // ── Task 2: Photo Storage Migration (AC: #5) ─────────────────────────────
  // Run photo migration asynchronously (best-effort).
  // The DB migration is the critical path. If storage migration fails for a
  // specific file, we log a warning but do NOT fail the entire claim operation.
  // (See story Dev Notes: Anti-Pattern Prevention)
  if (consultationIds.length > 0) {
    migratePhotosAsync(guestSessionId, user.id, consultationIds).catch((err) => {
      console.warn('[claim-guest] Photo migration encountered errors:', err);
    });
  }

  // ── Task 1.8: Return success response ────────────────────────────────────
  return NextResponse.json({ migrated, consultationIds });
}

// ─── Photo Storage Migration (Task 2.1 -- 2.6) ───────────────────────────────

/**
 * Migrates guest-scoped photos to user-scoped paths in Supabase Storage.
 * Best-effort: failures are logged but do not throw.
 *
 * Uses the service role client to bypass storage RLS for file operations.
 *
 * Guest path format: consultation-photos/guest-<guestSessionId>/<consultationId>.jpg
 * User path format:  consultation-photos/<userId>/<consultationId>.jpg
 *
 * Also migrates preview_url in the recommendations table if present.
 */
async function migratePhotosAsync(
  guestSessionId: string,
  userId: string,
  consultationIds: string[]
): Promise<void> {
  const serviceClient = createServiceRoleClient();

  for (const consultationId of consultationIds) {
    // ── Task 2.1: Read current photo_url for this consultation ─────────────
    const { data: consultation, error: fetchError } = await serviceClient
      .from('consultations')
      .select('photo_url')
      .eq('id', consultationId)
      .single();

    if (fetchError || !consultation?.photo_url) {
      // No photo to migrate -- skip
      continue;
    }

    const currentPhotoUrl: string = consultation.photo_url;

    // Only migrate if the photo is under the guest-scoped path
    if (!currentPhotoUrl.includes(`guest-${guestSessionId}`)) {
      // Already migrated or different path format -- skip
      continue;
    }

    // ── Task 2.2: Copy photo to user-scoped path ───────────────────────────
    const guestPath = extractStoragePath(currentPhotoUrl, 'consultation-photos');
    const userPath = `${userId}/${consultationId}.jpg`;

    if (guestPath) {
      const { error: copyError } = await serviceClient.storage
        .from('consultation-photos')
        .copy(guestPath, userPath);

      if (copyError) {
        console.warn(
          `[claim-guest] Failed to copy photo for consultation ${consultationId}:`,
          copyError
        );
        // Do NOT fail the entire operation -- consultation record is already migrated
        continue;
      }

      // ── Task 2.3: Update consultations.photo_url with new storage path ───
      const { error: updateError } = await serviceClient
        .from('consultations')
        .update({ photo_url: userPath })
        .eq('id', consultationId);

      if (updateError) {
        console.warn(
          `[claim-guest] Failed to update photo_url for consultation ${consultationId}:`,
          updateError
        );
      }

      // ── Task 2.5: Delete original guest-scoped file ───────────────────────
      const { error: deleteError } = await serviceClient.storage
        .from('consultation-photos')
        .remove([guestPath]);

      if (deleteError) {
        console.warn(
          `[claim-guest] Failed to delete guest photo at ${guestPath}:`,
          deleteError
        );
        // Not critical -- old path will be cleaned up by retention policy
      }
    }

    // ── Task 2.4: Migrate preview_url in recommendations table ────────────
    const { data: recommendations, error: recError } = await serviceClient
      .from('recommendations')
      .select('id, preview_url')
      .eq('consultation_id', consultationId)
      .not('preview_url', 'is', null);

    if (recError || !recommendations) continue;

    for (const rec of recommendations) {
      if (!rec.preview_url || !rec.preview_url.includes(`guest-${guestSessionId}`)) {
        continue;
      }

      const guestPreviewPath = extractStoragePath(rec.preview_url, 'preview-images');
      const userPreviewPath = `${userId}/${consultationId}-preview.jpg`;

      if (!guestPreviewPath) continue;

      const { error: previewCopyError } = await serviceClient.storage
        .from('preview-images')
        .copy(guestPreviewPath, userPreviewPath);

      if (previewCopyError) {
        console.warn(
          `[claim-guest] Failed to copy preview for recommendation ${rec.id}:`,
          previewCopyError
        );
        continue;
      }

      const { error: previewUpdateError } = await serviceClient
        .from('recommendations')
        .update({ preview_url: userPreviewPath })
        .eq('id', rec.id);

      if (previewUpdateError) {
        console.warn(
          `[claim-guest] Failed to update preview_url for recommendation ${rec.id}:`,
          previewUpdateError
        );
      }

      // Delete original guest preview
      await serviceClient.storage
        .from('preview-images')
        .remove([guestPreviewPath])
        .catch((err) => {
          console.warn(`[claim-guest] Failed to delete guest preview at ${guestPreviewPath}:`, err);
        });
    }
  }
}

/**
 * Extracts the storage object path from a full URL or a relative path.
 * Returns null if the path cannot be determined.
 *
 * Supabase storage URLs can be either:
 * - Relative paths: "guest-<id>/consultation-123.jpg"
 * - Full URLs: "https://<project>.supabase.co/storage/v1/object/public/<bucket>/guest-<id>/..."
 */
function extractStoragePath(photoUrl: string, bucket: string): string | null {
  if (!photoUrl) return null;

  // If it's a full URL, extract the path after the bucket name
  const bucketMarker = `/object/public/${bucket}/`;
  const markerIdx = photoUrl.indexOf(bucketMarker);
  if (markerIdx !== -1) {
    return photoUrl.slice(markerIdx + bucketMarker.length);
  }

  // If it already looks like a relative path (no protocol), return as-is
  if (!photoUrl.startsWith('http')) {
    return photoUrl;
  }

  return null;
}

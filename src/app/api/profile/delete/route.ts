import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/auth-server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * DELETE /api/profile/delete
 *
 * Permanently deletes the authenticated user's account and ALL associated data.
 * LGPD Article 18, V: Right to deletion of personal data.
 *
 * Deletion order (critical — matches story spec):
 *   1. Storage objects:
 *      a. consultation-photos: recursively delete under {userId}/ prefix
 *         (handles both flat files and sub-folder entries)
 *      b. preview-images: query recommendations table for exact preview_url paths,
 *         then delete those files. NOTE: previews are stored at
 *         previews/{consultationId}/{recommendationId}.jpg — NOT under {userId}/
 *         so they must be looked up from DB before the DB deletion RPC runs.
 *      c. share-cards: list and delete under {userId}/ prefix
 *   2. DB records: via RPC delete_user_data() (transactional — all-or-nothing)
 *   3. Auth user: via auth.admin.deleteUser()
 *
 * Note: Storage deletions are NOT transactional. Storage is deleted first so that
 * if DB deletion fails, no DB records reference deleted storage objects.
 *
 * Returns:
 *   200 - { success: true }
 *   401 - User not authenticated
 *   500 - Deletion failed (with error message)
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  // Step 1: Authenticate via user-scoped client
  const authClient = createAuthenticatedSupabaseClient(request);
  const { data: { user }, error: authError } = await authClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Não autenticado' },
      { status: 401 }
    );
  }

  const userId = user.id;

  // Step 2: Create service role client for admin operations (bypasses RLS)
  const adminClient = createServiceRoleClient();

  try {
    // ── Step 2a: Delete consultation-photos (stored under {userId}/ prefix) ──────
    // Path format after guest claim: {userId}/{consultationId}.jpg (flat file)
    // Pre-claim path (still under guest session): won't be under {userId}/, skipped.
    // Handles nested paths by recursing into sub-folders.
    await deleteStorageBucketObjects(adminClient, 'consultation-photos', userId);

    // ── Step 2b: Delete preview-images ────────────────────────────────────────────
    // IMPORTANT: preview_url paths are stored as previews/{consultationId}/{recommendationId}.jpg
    // They are NOT under {userId}/ — must look up exact paths from DB before DB deletion.
    await deletePreviewImages(adminClient, userId);

    // ── Step 2c: Delete share-cards (stored under {userId}/ prefix) ──────────────
    await deleteStorageBucketObjects(adminClient, 'share-cards', userId);

    // ── Step 2d: Cascading DB deletion via RPC (transactional — auto-rollback on failure)
    // The function: deletes favorites, grooming_tips, styles_to_avoid, recommendations,
    // consultations, profiles, and anonymizes analytics_events (SET user_id = NULL)
    const { error: rpcError } = await adminClient.rpc('delete_user_data', {
      target_user_id: userId,
    });

    if (rpcError) {
      console.error('[DELETE /api/profile/delete] RPC delete_user_data error:', rpcError);
      throw new Error(`Database deletion failed: ${rpcError.message}`);
    }

    // ── Step 2e: Delete auth user (must be last — invalidates all sessions immediately)
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('[DELETE /api/profile/delete] Auth user deletion error:', authDeleteError);
      throw new Error(`Auth user deletion failed: ${authDeleteError.message}`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[DELETE /api/profile/delete] Deletion failed:', error);
    return NextResponse.json(
      { error: 'Erro ao eliminar conta. Tente novamente ou contacte o suporte.' },
      { status: 500 }
    );
  }
}

/**
 * Deletes all objects in a Supabase Storage bucket under the given folder prefix.
 * Handles both flat files and sub-folder entries by recursing into sub-folders.
 *
 * @param adminClient - Service role Supabase client (bypasses RLS)
 * @param bucket - Storage bucket name
 * @param prefix - Folder prefix to list (e.g. userId)
 */
async function deleteStorageBucketObjects(
  adminClient: ReturnType<typeof createServiceRoleClient>,
  bucket: string,
  prefix: string
): Promise<void> {
  const { data: objects, error: listError } = await adminClient.storage
    .from(bucket)
    .list(prefix);

  if (listError) {
    console.error(`[DELETE /api/profile/delete] Storage list error for bucket ${bucket}:`, listError);
    throw new Error(`Storage list failed for bucket ${bucket}: ${listError.message}`);
  }

  if (!objects || objects.length === 0) {
    return;
  }

  // Separate files (id !== null) from sub-folder entries (id === null)
  const filePaths: string[] = [];
  const subFolderNames: string[] = [];

  for (const obj of objects) {
    if (obj.id !== null) {
      filePaths.push(`${prefix}/${obj.name}`);
    } else {
      subFolderNames.push(obj.name);
    }
  }

  // Batch-remove all files found at this level
  if (filePaths.length > 0) {
    const { error: removeError } = await adminClient.storage
      .from(bucket)
      .remove(filePaths);

    if (removeError) {
      console.error(`[DELETE /api/profile/delete] Storage remove error for bucket ${bucket}:`, removeError);
      throw new Error(`Storage deletion failed for bucket ${bucket}: ${removeError.message}`);
    }
  }

  // Recurse into sub-folders
  for (const folderName of subFolderNames) {
    await deleteStorageBucketObjects(adminClient, bucket, `${prefix}/${folderName}`);
  }
}

/**
 * Deletes all preview images for a user from the preview-images bucket.
 *
 * Preview images use a different storage layout: previews/{consultationId}/{recommendationId}.jpg
 * They are NOT stored under {userId}/ — so we must look up exact file paths from the
 * recommendations table BEFORE the DB deletion RPC runs.
 *
 * @param adminClient - Service role Supabase client (bypasses RLS)
 * @param userId - The authenticated user's ID
 */
async function deletePreviewImages(
  adminClient: ReturnType<typeof createServiceRoleClient>,
  userId: string
): Promise<void> {
  // Step 1: Find all consultation IDs belonging to this user
  const { data: consultations, error: consultError } = await adminClient
    .from('consultations')
    .select('id')
    .eq('user_id', userId);

  if (consultError) {
    console.error('[DELETE /api/profile/delete] Failed to fetch consultation IDs for preview deletion:', consultError);
    throw new Error(`Failed to fetch consultations for preview deletion: ${consultError.message}`);
  }

  if (!consultations || consultations.length === 0) {
    return; // No consultations — no previews to delete
  }

  const consultationIds = consultations.map((c: { id: string }) => c.id);

  // Step 2: Fetch all preview_url paths for those consultations
  const { data: recs, error: recsError } = await adminClient
    .from('recommendations')
    .select('preview_url')
    .in('consultation_id', consultationIds)
    .not('preview_url', 'is', null);

  if (recsError) {
    console.error('[DELETE /api/profile/delete] Failed to fetch preview URLs:', recsError);
    throw new Error(`Failed to fetch preview URLs: ${recsError.message}`);
  }

  const previewPaths = (recs ?? [])
    .map((r: { preview_url: string | null }) => r.preview_url)
    .filter((url): url is string => url !== null && url.length > 0);

  if (previewPaths.length === 0) {
    return; // No previews generated — nothing to delete
  }

  // Step 3: Delete the actual preview files from storage
  const { error: removeError } = await adminClient.storage
    .from('preview-images')
    .remove(previewPaths);

  if (removeError) {
    console.error('[DELETE /api/profile/delete] Storage remove error for preview-images:', removeError);
    throw new Error(`Preview image deletion failed: ${removeError.message}`);
  }
}

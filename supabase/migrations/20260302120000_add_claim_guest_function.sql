-- Migration: add_claim_guest_function
-- Story 8.5: Guest-to-Auth Migration
-- Date: 2026-03-02
--
-- Creates a PostgreSQL RPC function that atomically migrates guest consultations
-- to an authenticated user's account in a single transaction.
--
-- The function:
--   1. Verifies p_user_id matches the calling user's auth.uid() (security check)
--   2. Updates consultations: user_id = p_user_id, guest_session_id = NULL
--      WHERE guest_session_id = p_guest_session_id AND user_id IS NULL (unclaimed only)
--   3. Returns migrated count and IDs as JSONB
--
-- Idempotency: Only updates rows WHERE user_id IS NULL -- already-claimed records
-- are not touched, making multiple calls safe (returns 0 on repeat calls).
--
-- Security: GRANT EXECUTE to authenticated role only.

-- ----------------------------------------------------------------
-- 1. Create atomic claim function
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_guest_consultations(
  p_guest_session_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_ids UUID[];
  v_count INT;
BEGIN
  -- Security check: the calling authenticated user must be p_user_id.
  -- auth.uid() is available inside SECURITY DEFINER functions when called via JWT context.
  -- This prevents one authenticated user from claiming another user's guest session.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'User ID mismatch: cannot claim on behalf of another user'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Atomically update all unclaimed guest consultation rows using CTE.
  -- Only rows WHERE user_id IS NULL AND guest_session_id = p_guest_session_id
  -- are updated. Already-claimed rows (user_id IS NOT NULL) are untouched.
  WITH updated AS (
    UPDATE public.consultations
    SET
      user_id          = p_user_id,
      guest_session_id = NULL
    WHERE
      guest_session_id = p_guest_session_id
      AND user_id IS NULL
    RETURNING id
  )
  SELECT array_agg(id)
  INTO v_updated_ids
  FROM updated;

  -- Handle NULL case (no rows updated)
  IF v_updated_ids IS NULL THEN
    v_updated_ids := ARRAY[]::UUID[];
  END IF;

  v_count := COALESCE(array_length(v_updated_ids, 1), 0);

  RETURN jsonb_build_object(
    'migrated_count', v_count,
    'consultation_ids', to_jsonb(v_updated_ids)
  );
END;
$$;

-- ----------------------------------------------------------------
-- 2. Revoke public access and grant to authenticated role only
-- ----------------------------------------------------------------
REVOKE ALL ON FUNCTION public.claim_guest_consultations(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_guest_consultations(UUID, UUID) TO authenticated;

-- ----------------------------------------------------------------
-- Notes
-- ----------------------------------------------------------------
-- This function uses SECURITY DEFINER so it runs with the permissions
-- of the function owner (typically postgres/service role), but the
-- auth.uid() check ensures it can only be called on behalf of the
-- currently authenticated user.
--
-- The function does NOT delete guest_session_id records from the DB.
-- It sets guest_session_id = NULL (the rows are retained, just re-owned).
-- This matches the anti-pattern prevention in the story spec.
--
-- Associated tables (recommendations, styles_to_avoid, grooming_tips, favorites)
-- are automatically accessible to the authenticated user through existing RLS
-- policies on consultations -- no changes needed to those tables.

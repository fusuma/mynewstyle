-- Migration: Add delete_user_data RPC function for LGPD right to deletion
-- Story 11.3: Right to Deletion
-- Date: 2026-03-03

-- Task 2.2-2.5: Implement delete_user_data(target_user_id UUID) PL/pgSQL function
-- Deletes all user data in a single transaction (auto-rollback on failure).
-- LGPD Article 18, V: Right to deletion of personal data processed with consent.

CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete in dependency order to avoid FK constraint violations.
  -- All operations run in a single transaction (PL/pgSQL default).
  -- If any DELETE raises an exception, the entire transaction auto-rolls back.

  -- Step a: favorites (FK: user_id → profiles, recommendation_id → recommendations)
  DELETE FROM public.favorites
  WHERE user_id = target_user_id;

  -- Step b: grooming_tips (FK: consultation_id → consultations)
  DELETE FROM public.grooming_tips
  WHERE consultation_id IN (
    SELECT id FROM public.consultations WHERE user_id = target_user_id
  );

  -- Step c: styles_to_avoid (FK: consultation_id → consultations)
  DELETE FROM public.styles_to_avoid
  WHERE consultation_id IN (
    SELECT id FROM public.consultations WHERE user_id = target_user_id
  );

  -- Step d: recommendations (FK: consultation_id → consultations)
  DELETE FROM public.recommendations
  WHERE consultation_id IN (
    SELECT id FROM public.consultations WHERE user_id = target_user_id
  );

  -- Step e: consultations (FK: user_id → profiles)
  DELETE FROM public.consultations
  WHERE user_id = target_user_id;

  -- Step f: profiles (PK: id = auth.users.id)
  DELETE FROM public.profiles
  WHERE id = target_user_id;

  -- Step g: analytics_events — anonymize, NOT delete (LGPD allows retaining anonymized data)
  -- Preserves aggregate funnel/behavior data while removing PII linkage.
  UPDATE public.analytics_events
  SET user_id = NULL
  WHERE user_id = target_user_id;

END;
$$;

-- Grant execute to the service_role (used by the API route via createServiceRoleClient)
GRANT EXECUTE ON FUNCTION public.delete_user_data(UUID) TO service_role;

-- Revoke execute from anon and authenticated to prevent direct client calls
REVOKE EXECUTE ON FUNCTION public.delete_user_data(UUID) FROM anon, authenticated;

-- Comment for documentation purposes
COMMENT ON FUNCTION public.delete_user_data(UUID) IS
  'LGPD Art. 18, V: Permanently deletes all personal data for a given user in a single '
  'transaction. Anonymizes analytics_events (sets user_id to NULL) rather than deleting '
  'to preserve aggregate behavioral data. Called server-side via service_role client only. '
  'Execution: favorites → grooming_tips → styles_to_avoid → recommendations → consultations '
  '→ profiles → analytics anonymization.';

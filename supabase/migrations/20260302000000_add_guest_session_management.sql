-- Migration: add_guest_session_management
-- Story 8.4: Guest Session Management
-- Date: 2026-03-02
--
-- Adds guest_session_id column to consultations table and sets up
-- RLS policies so guest users can access their own consultation data
-- without an authenticated session.
--
-- RLS approach: The server calls SET LOCAL app.guest_session_id = '<uuid>'
-- before querying, and the policy reads it via current_setting().
-- This is safe because SET LOCAL is scoped to the current transaction.
--
-- Data retention: Guest consultation records are retained for 30 days.
-- A scheduled cron job or Edge Function (future) should clean up rows
-- where guest_session_id IS NOT NULL AND created_at < NOW() - INTERVAL '30 days'.
-- This cleanup is intentionally deferred from this story.

-- ----------------------------------------------------------------
-- 1. Add guest_session_id column to consultations
-- ----------------------------------------------------------------
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS guest_session_id UUID NULL;

-- ----------------------------------------------------------------
-- 2. Index for query performance (RLS policy and guest lookup)
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_consultations_guest_session_id
  ON public.consultations (guest_session_id)
  WHERE guest_session_id IS NOT NULL;

-- ----------------------------------------------------------------
-- 3. RLS policy: guests can SELECT their own consultations
-- ----------------------------------------------------------------
-- Drop existing policy if re-running migration
DROP POLICY IF EXISTS guest_read_own_consultations ON public.consultations;

CREATE POLICY guest_read_own_consultations
  ON public.consultations
  FOR SELECT
  USING (
    guest_session_id IS NOT NULL
    AND guest_session_id = current_setting('app.guest_session_id', true)::uuid
  );

-- ----------------------------------------------------------------
-- 4. RLS policy: guests can SELECT recommendations for their consultations
-- ----------------------------------------------------------------
-- Only if the recommendations table exists (Epic 4 migration may have created it)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'recommendations'
  ) THEN
    EXECUTE $sql$
      DROP POLICY IF EXISTS guest_read_own_recommendations ON public.recommendations;

      CREATE POLICY guest_read_own_recommendations
        ON public.recommendations
        FOR SELECT
        USING (
          consultation_id IN (
            SELECT id FROM public.consultations
            WHERE guest_session_id IS NOT NULL
              AND guest_session_id = current_setting('app.guest_session_id', true)::uuid
          )
        );
    $sql$;
  END IF;
END $$;

-- ----------------------------------------------------------------
-- Notes
-- ----------------------------------------------------------------
-- Data Retention (30 days for guest data):
--   DELETE FROM public.consultations
--   WHERE guest_session_id IS NOT NULL
--     AND created_at < NOW() - INTERVAL '30 days';
--
-- This cleanup should be run by a scheduled Edge Function or pg_cron job.
-- Implementation deferred to a future operations story.

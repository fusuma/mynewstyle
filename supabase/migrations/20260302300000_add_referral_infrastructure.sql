-- Migration: Add referral infrastructure
-- Story 9.5: Referral Link
-- Date: 2026-03-02

-- ============================================================
-- 1. Create referral_codes table
-- ============================================================
CREATE TABLE IF NOT EXISTS referral_codes (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code  VARCHAR(8)    NOT NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT referral_codes_user_id_unique UNIQUE (user_id),
  CONSTRAINT referral_codes_code_unique    UNIQUE (referral_code)
);

-- Index on referral_code for fast lookups (analytics + link resolution)
CREATE INDEX IF NOT EXISTS idx_referral_codes_code
  ON referral_codes (referral_code);

-- ============================================================
-- 2. Enable Row Level Security on referral_codes
-- ============================================================
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- Revoke all default permissions
REVOKE ALL ON referral_codes FROM anon;
REVOKE ALL ON referral_codes FROM authenticated;

-- Grant SELECT to authenticated users (INSERT handled by service role in API route)
GRANT SELECT ON referral_codes TO authenticated;

-- RLS Policy: authenticated users can only SELECT their own row
CREATE POLICY "Users can view their own referral code"
  ON referral_codes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 3. Add referral_code column to consultations table
-- ============================================================
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(8) NULL;

-- Index on consultations.referral_code for analytics queries
CREATE INDEX IF NOT EXISTS idx_consultations_referral_code
  ON public.consultations (referral_code)
  WHERE referral_code IS NOT NULL;

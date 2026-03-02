-- src/lib/supabase/schema/consultation-hash-columns.sql
-- Add deterministic cache columns to consultations table (Story 4.8)
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS photo_hash TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS questionnaire_hash TEXT;

-- Composite index for cache lookup: same photo + questionnaire + gender = cache hit
CREATE INDEX IF NOT EXISTS idx_consultations_cache_lookup
  ON consultations (photo_hash, questionnaire_hash, gender)
  WHERE status = 'complete';

-- Migration: Add rating columns to consultations table
-- Story 10.5: Post-Consultation Rating
-- Date: 2026-03-02

-- 1.2 Add `rating` column (integer, nullable, 1-5 constraint)
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS rating integer
    CHECK (rating >= 1 AND rating <= 5);

-- 1.3 Add `rating_details` column (jsonb, nullable)
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS rating_details jsonb;

-- 1.4 Add index on rating for analytics queries
CREATE INDEX IF NOT EXISTS idx_consultations_rating
  ON public.consultations (rating)
  WHERE rating IS NOT NULL;

-- Comment: rating_details JSON schema:
-- { faceShapeAccuracy?: number, recommendationQuality?: number, previewRealism?: number, ratedAt: string }

-- 1.5 No new RLS policies needed — existing consultations RLS policies
--     already scope reads/writes to the owning user.

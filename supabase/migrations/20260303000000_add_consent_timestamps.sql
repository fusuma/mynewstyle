-- Migration: Add consent timestamp columns for LGPD compliance
-- Story 11.2: Consent Flow
-- Date: 2026-03-03

-- 1.2 Add photo_consent_given_at column to consultations table
-- Records when the user gave explicit consent for biometric photo processing
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS photo_consent_given_at TIMESTAMPTZ
    DEFAULT NULL;

-- 1.4 Comment on photo consent column - LGPD compliance purpose
COMMENT ON COLUMN public.consultations.photo_consent_given_at
  IS 'LGPD: Timestamp when user gave explicit informed consent for biometric photo processing (visagismo analysis). Required under LGPD Art. 11 for sensitive biometric data processing.';

-- 1.3 Add lgpd_consent_given_at column to profiles table
-- Records when the user accepted the privacy policy and LGPD data processing terms
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lgpd_consent_given_at TIMESTAMPTZ
    DEFAULT NULL;

-- 1.4 Comment on LGPD consent column - LGPD compliance purpose
COMMENT ON COLUMN public.profiles.lgpd_consent_given_at
  IS 'LGPD: Timestamp when user gave informed consent to personal data processing per privacy policy. Copied from auth.users metadata on profile creation. Required for LGPD compliance record-keeping.';

-- Optional: Index for compliance audits
CREATE INDEX IF NOT EXISTS idx_consultations_photo_consent
  ON public.consultations (photo_consent_given_at)
  WHERE photo_consent_given_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_lgpd_consent
  ON public.profiles (lgpd_consent_given_at)
  WHERE lgpd_consent_given_at IS NOT NULL;

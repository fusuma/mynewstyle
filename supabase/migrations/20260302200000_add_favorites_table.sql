-- Migration: Add favorites table with RLS policies
-- Story 8.6: User Profile & History
-- Date: 2026-03-02

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_id  UUID          NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Prevent duplicate favorites per user per recommendation
ALTER TABLE favorites
  ADD CONSTRAINT favorites_user_recommendation_unique
  UNIQUE (user_id, recommendation_id);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON favorites (user_id);

-- Enable Row Level Security
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Revoke default permissions
REVOKE ALL ON favorites FROM anon;
REVOKE ALL ON favorites FROM authenticated;

-- Grant only needed operations to authenticated users
GRANT SELECT, INSERT, DELETE ON favorites TO authenticated;

-- RLS Policies: users can only see/manage their own favorites

CREATE POLICY "Users can view their own favorites"
  ON favorites
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can add their own favorites"
  ON favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their own favorites"
  ON favorites
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

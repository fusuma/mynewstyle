-- Stores alert firing history for deduplication. Accessed only by service role from /api/admin/alerts/check.
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL,
  metric_value NUMERIC NOT NULL,
  threshold NUMERIC NOT NULL,
  sample_size INTEGER NOT NULL DEFAULT 0,
  triggered_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast deduplication lookups by alert type and time window
CREATE INDEX IF NOT EXISTS alert_history_type_time_idx
  ON alert_history (alert_type, triggered_at);

-- Enable Row Level Security — no public access (service role only)
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

-- Revoke all access from anon and authenticated roles — no user-facing access needed
REVOKE ALL ON alert_history FROM anon;
REVOKE ALL ON alert_history FROM authenticated;

-- RPC function for p95 latency of face-analysis calls within a given time window.
-- Used by the alert metrics module since Supabase JS does not support PERCENTILE_CONT directly.
CREATE OR REPLACE FUNCTION get_face_analysis_p95_latency(window_interval interval)
RETURNS TABLE(p95_ms numeric, sample_size bigint) AS $$
  SELECT
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_ms,
    COUNT(*) AS sample_size
  FROM ai_calls
  WHERE task = 'face-analysis'
    AND success = true
    AND timestamp >= NOW() - window_interval;
$$ LANGUAGE sql SECURITY DEFINER;

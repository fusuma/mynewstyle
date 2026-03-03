-- Story 4.7: AI Cost Tracking
-- Creates the ai_calls table to persist AI call logs with cost tracking

CREATE TABLE IF NOT EXISTS ai_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  task TEXT NOT NULL CHECK (task IN ('face-analysis', 'consultation')),
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_cents FLOAT NOT NULL DEFAULT 0,
  latency_ms FLOAT NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  error TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_calls_consultation_id ON ai_calls(consultation_id);
CREATE INDEX IF NOT EXISTS idx_ai_calls_task ON ai_calls(task);
CREATE INDEX IF NOT EXISTS idx_ai_calls_timestamp ON ai_calls(timestamp);

-- RLS: ai_calls is accessed only via SECURITY DEFINER functions (service role).
-- Enable RLS and REVOKE public access to prevent direct PostgREST access
-- from anon or authenticated roles (SOSLeiria pattern).
ALTER TABLE ai_calls ENABLE ROW LEVEL SECURITY;

-- Revoke all public access (service role bypasses RLS)
REVOKE ALL ON ai_calls FROM anon, authenticated;

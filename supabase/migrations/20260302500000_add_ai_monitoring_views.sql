-- AI Pipeline Monitoring Views (Epic 10, Story 10.2)
-- Creates SQL views and monitoring_daily_summaries table for AI pipeline observability

-- ============================================================
-- INDEX: Ensure timestamp index on ai_calls for efficient date filtering
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ai_calls_timestamp ON ai_calls (timestamp);

-- ============================================================
-- TABLE: monitoring_daily_summaries
-- Persists a daily snapshot for historical trend analysis
-- ============================================================
CREATE TABLE IF NOT EXISTS public.monitoring_daily_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  summary_date DATE NOT NULL UNIQUE,
  total_consultations INTEGER NOT NULL DEFAULT 0,
  total_ai_calls INTEGER NOT NULL DEFAULT 0,
  total_ai_cost_cents NUMERIC(10,2) NOT NULL DEFAULT 0,
  avg_cost_cents_per_consultation NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Per-step latency (avg ms)
  avg_latency_face_analysis_ms NUMERIC(10,2),
  avg_latency_consultation_ms NUMERIC(10,2),
  avg_latency_preview_ms NUMERIC(10,2),
  -- Per-step success rates (0.0 to 1.0)
  success_rate_face_analysis NUMERIC(5,4),
  success_rate_consultation NUMERIC(5,4),
  success_rate_preview NUMERIC(5,4),
  -- Fallback rates (0.0 to 1.0)
  fallback_rate_face_analysis NUMERIC(5,4),
  fallback_rate_consultation NUMERIC(5,4),
  fallback_rate_preview NUMERIC(5,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- updated_at tracks when a summary row was last recomputed (useful for idempotent re-runs)
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on monitoring_daily_summaries (service-role-only insert, no public access)
ALTER TABLE public.monitoring_daily_summaries ENABLE ROW LEVEL SECURITY;

-- Only service role can access monitoring data
CREATE POLICY "service_role_only_monitoring_summaries"
  ON public.monitoring_daily_summaries
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================
-- VIEW: ai_pipeline_cost_summary
-- Avg cost per consultation, per step, per model; filterable by date
-- ============================================================
CREATE OR REPLACE VIEW public.ai_pipeline_cost_summary AS
SELECT
  task,
  model,
  provider,
  DATE(timestamp) AS call_date,
  COUNT(*) AS total_calls,
  AVG(cost_cents) AS avg_cost_cents,
  SUM(cost_cents) AS total_cost_cents,
  COUNT(*) FILTER (WHERE success = true) AS successful_calls
FROM public.ai_calls
GROUP BY task, model, provider, DATE(timestamp)
ORDER BY DATE(timestamp) DESC, task, model;

-- ============================================================
-- VIEW: ai_pipeline_latency_summary
-- Avg / p50 / p95 latency per step, per model; filterable by date
-- ============================================================
CREATE OR REPLACE VIEW public.ai_pipeline_latency_summary AS
SELECT
  task,
  model,
  provider,
  DATE(timestamp) AS call_date,
  COUNT(*) AS total_calls,
  AVG(latency_ms) AS avg_latency_ms,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY latency_ms) AS p50_latency_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_latency_ms
FROM public.ai_calls
GROUP BY task, model, provider, DATE(timestamp)
ORDER BY DATE(timestamp) DESC, task, model;

-- ============================================================
-- VIEW: ai_pipeline_success_rates
-- Success rate, error rate, failure count per step, per model; filterable by date
-- ============================================================
CREATE OR REPLACE VIEW public.ai_pipeline_success_rates AS
SELECT
  task,
  model,
  provider,
  DATE(timestamp) AS call_date,
  COUNT(*) AS total_calls,
  COUNT(*) FILTER (WHERE success = true) AS successful_calls,
  COUNT(*) FILTER (WHERE success = false) AS failed_calls,
  CASE
    WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(COUNT(*) FILTER (WHERE success = true)::NUMERIC / COUNT(*), 4)
  END AS success_rate,
  CASE
    WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(COUNT(*) FILTER (WHERE success = false)::NUMERIC / COUNT(*), 4)
  END AS error_rate
FROM public.ai_calls
GROUP BY task, model, provider, DATE(timestamp)
ORDER BY DATE(timestamp) DESC, task, model;

-- ============================================================
-- VIEW: ai_pipeline_fallback_rates
-- Percentage of calls using fallback provider per step, filterable by date
-- Fallback logic:
--   face-analysis: provider='openai' is fallback (primary='gemini')
--   consultation:  provider='openai' is fallback (primary='gemini')
--   preview:       provider='gemini' is fallback (primary='kie')
--   face-similarity: no fallback concept
-- ============================================================
CREATE OR REPLACE VIEW public.ai_pipeline_fallback_rates AS
SELECT
  task,
  DATE(timestamp) AS call_date,
  COUNT(*) AS total_calls,
  COUNT(*) FILTER (WHERE
    (task IN ('face-analysis', 'consultation') AND provider = 'openai') OR
    (task = 'preview' AND provider = 'gemini')
  ) AS fallback_calls,
  CASE
    WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(
      COUNT(*) FILTER (WHERE
        (task IN ('face-analysis', 'consultation') AND provider = 'openai') OR
        (task = 'preview' AND provider = 'gemini')
      )::NUMERIC / COUNT(*),
      4
    )
  END AS fallback_rate
FROM public.ai_calls
WHERE task IN ('face-analysis', 'consultation', 'preview')
GROUP BY task, DATE(timestamp)
ORDER BY DATE(timestamp) DESC, task;

-- ============================================================
-- VIEW: ai_pipeline_overview
-- Combined daily snapshot of cost/latency/success/fallback per step for dashboard
-- ============================================================
CREATE OR REPLACE VIEW public.ai_pipeline_overview AS
SELECT
  DATE(ac.timestamp) AS call_date,
  ac.task,
  COUNT(*) AS total_calls,
  AVG(ac.cost_cents) AS avg_cost_cents,
  SUM(ac.cost_cents) AS total_cost_cents,
  AVG(ac.latency_ms) AS avg_latency_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ac.latency_ms) AS p95_latency_ms,
  CASE
    WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(COUNT(*) FILTER (WHERE ac.success = true)::NUMERIC / COUNT(*), 4)
  END AS success_rate,
  CASE
    WHEN COUNT(*) = 0 THEN 0
    ELSE ROUND(
      COUNT(*) FILTER (WHERE
        (ac.task IN ('face-analysis', 'consultation') AND ac.provider = 'openai') OR
        (ac.task = 'preview' AND ac.provider = 'gemini')
      )::NUMERIC / COUNT(*),
      4
    )
  END AS fallback_rate
FROM public.ai_calls ac
GROUP BY DATE(ac.timestamp), ac.task
ORDER BY call_date DESC, ac.task;

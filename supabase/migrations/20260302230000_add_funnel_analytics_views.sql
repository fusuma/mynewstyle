-- Migration: Add Funnel Analytics SQL Functions
-- Story 10.4 — Funnel Analytics
-- Creates parameterized SQL functions for computing the conversion funnel
-- from the analytics_events table.

-- Performance indexes for funnel queries (AC #7, #8)
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_step ON analytics_events(session_id, event_type);

-- ============================================================
-- FUNCTION: funnel_counts
-- Returns the 10-step conversion funnel with unique session counts
-- and drop-off rates per step.
--
-- Parameters:
--   from_date      - Start of date range (inclusive)
--   to_date        - End of date range (inclusive)
--   gender_filter  - Optional: 'male' or 'female'. NULL = no filter.
--   device_filter  - Optional: 'mobile', 'desktop', or 'tablet'. NULL = no filter.
--
-- Returns: table of (step_name, step_order, unique_sessions, previous_step_sessions, dropoff_rate)
--
-- Design notes:
--   - Uses COUNT(DISTINCT session_id) per event_type to count unique sessions (AC #7)
--   - Gender filter: includes only sessions where the gender_selected event matches (AC #2, #5)
--   - Device filter: device_info->>'deviceType' from any event in the session (AC #2, #4)
--   - Missing steps coalesce to 0 (AC #7)
--   - Drop-off = 1 - (current / previous); division by zero yields NULL (AC #3 note in story)
-- ============================================================
CREATE OR REPLACE FUNCTION funnel_counts(
  from_date timestamptz,
  to_date   timestamptz,
  gender_filter text DEFAULT NULL,
  device_filter text DEFAULT NULL
)
RETURNS TABLE (
  step_name               text,
  step_order              int,
  unique_sessions         bigint,
  previous_step_sessions  bigint,
  dropoff_rate            numeric
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  -- Sessions matching gender filter (populated only when gender_filter is provided)
  gender_sessions uuid[];
  -- Sessions matching device filter (populated only when device_filter is provided)
  device_sessions uuid[];
BEGIN
  -- Collect sessions that match the gender filter.
  -- Primary source: sessions that have a gender_selected event with the matching gender
  --   (event_data->>'gender' field, AC #2 / Task 1.5).
  -- Fallback source: sessions linked to a consultation where consultations.gender matches
  --   (covers returning users or deep-linked users who may skip the gender_selected event,
  --    joined via analytics_events.session_id = consultations.guest_session_id, AC #2 / Task 1.5).
  IF gender_filter IS NOT NULL THEN
    SELECT ARRAY(
      SELECT DISTINCT ae_g.session_id
      FROM analytics_events ae_g
      WHERE ae_g.event_type = 'gender_selected'
        AND ae_g.event_data->>'gender' = gender_filter
        AND ae_g.created_at >= from_date
        AND ae_g.created_at <= to_date
      UNION
      -- Fallback: sessions whose linked consultation has the matching gender
      SELECT DISTINCT ae_c.session_id
      FROM analytics_events ae_c
      INNER JOIN consultations c ON c.guest_session_id = ae_c.session_id
      WHERE c.gender = gender_filter
        AND ae_c.created_at >= from_date
        AND ae_c.created_at <= to_date
    ) INTO gender_sessions;
  END IF;

  -- Collect sessions that match the device filter.
  -- Any event in the session may carry device_info; we use the first available.
  IF device_filter IS NOT NULL THEN
    SELECT ARRAY(
      SELECT DISTINCT session_id
      FROM analytics_events
      WHERE device_info->>'deviceType' = device_filter
        AND created_at >= from_date
        AND created_at <= to_date
    ) INTO device_sessions;
  END IF;

  -- Build the funnel step counts using a common table expression.
  -- Each step uses COUNT(DISTINCT session_id) for the matching event type.
  RETURN QUERY
  WITH step_counts AS (
    SELECT
      ev.step_name,
      ev.step_order,
      COUNT(DISTINCT ae.session_id) AS unique_sessions
    FROM (
      VALUES
        ('landing',                 1),
        ('gender_selected',         2),
        ('photo_captured',          3),
        ('questionnaire_completed', 4),
        ('face_analysis_completed', 5),
        ('paywall_shown',           6),
        ('payment_completed',       7),
        ('consultation_completed',  8),
        ('preview_requested',       9),
        ('share_generated',        10)
    ) AS ev(step_name, step_order)
    LEFT JOIN analytics_events ae
      ON (
        -- Landing step: match landing_visited OR page_view with page='landing'
        (ev.step_name = 'landing' AND (
           ae.event_type = 'landing_visited'
           OR (ae.event_type = 'page_view' AND ae.event_data->>'page' = 'landing')
        ))
        OR
        -- All other steps: exact event_type match
        (ev.step_name <> 'landing' AND ae.event_type = ev.step_name)
      )
      AND ae.created_at >= from_date
      AND ae.created_at <= to_date
      -- Apply gender filter: restrict to sessions with matching gender_selected event
      AND (gender_filter IS NULL OR ae.session_id = ANY(gender_sessions))
      -- Apply device filter: restrict to sessions with matching device_info
      AND (device_filter IS NULL OR ae.session_id = ANY(device_sessions))
    GROUP BY ev.step_name, ev.step_order
  ),
  ordered_steps AS (
    SELECT
      step_name,
      step_order,
      unique_sessions,
      LAG(unique_sessions) OVER (ORDER BY step_order) AS previous_step_sessions
    FROM step_counts
  )
  SELECT
    os.step_name,
    os.step_order,
    COALESCE(os.unique_sessions, 0) AS unique_sessions,
    os.previous_step_sessions,
    CASE
      WHEN os.previous_step_sessions IS NULL OR os.previous_step_sessions = 0 THEN NULL
      ELSE ROUND(1.0 - (COALESCE(os.unique_sessions, 0)::numeric / os.previous_step_sessions), 6)
    END AS dropoff_rate
  FROM ordered_steps os
  ORDER BY os.step_order;
END;
$$;

-- ============================================================
-- FUNCTION: funnel_weekly_summary
-- Returns a comparison of the current 7-day funnel vs the previous 7-day funnel,
-- including per-step delta percentages and overall conversion rates.
--
-- Parameters:
--   reference_date - The "as of" date for the summary (default: today).
--                    Current week = [reference_date - 7 days, reference_date).
--                    Previous week = [reference_date - 14 days, reference_date - 7 days).
--
-- Returns: JSON object with current_week, previous_week, and deltas.
-- ============================================================
CREATE OR REPLACE FUNCTION funnel_weekly_summary(
  reference_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_from  timestamptz := (reference_date - INTERVAL '7 days')::timestamptz;
  current_to    timestamptz := reference_date::timestamptz;
  previous_from timestamptz := (reference_date - INTERVAL '14 days')::timestamptz;
  previous_to   timestamptz := (reference_date - INTERVAL '7 days')::timestamptz;

  current_funnel  jsonb;
  previous_funnel jsonb;
  deltas_arr      jsonb;
  result          jsonb;
BEGIN
  -- Build current week funnel as JSON array
  SELECT jsonb_agg(
    jsonb_build_object(
      'step_name',              fc.step_name,
      'step_order',             fc.step_order,
      'unique_sessions',        fc.unique_sessions,
      'previous_step_sessions', fc.previous_step_sessions,
      'dropoff_rate',           fc.dropoff_rate
    )
    ORDER BY fc.step_order
  )
  INTO current_funnel
  FROM funnel_counts(current_from, current_to) AS fc;

  -- Build previous week funnel as JSON array
  SELECT jsonb_agg(
    jsonb_build_object(
      'step_name',              fp.step_name,
      'step_order',             fp.step_order,
      'unique_sessions',        fp.unique_sessions,
      'previous_step_sessions', fp.previous_step_sessions,
      'dropoff_rate',           fp.dropoff_rate
    )
    ORDER BY fp.step_order
  )
  INTO previous_funnel
  FROM funnel_counts(previous_from, previous_to) AS fp;

  -- Compute deltas by joining current and previous on step_name
  SELECT jsonb_agg(
    jsonb_build_object(
      'step_name',         c_row->>'step_name',
      'current_sessions',  (c_row->>'unique_sessions')::bigint,
      'previous_sessions', COALESCE((p_row->>'unique_sessions')::bigint, 0),
      'delta_percent',
        CASE
          WHEN COALESCE((p_row->>'unique_sessions')::numeric, 0) = 0 THEN NULL
          ELSE ROUND(
            (((c_row->>'unique_sessions')::numeric - (p_row->>'unique_sessions')::numeric)
             / (p_row->>'unique_sessions')::numeric) * 100.0,
            2
          )
        END
    )
    ORDER BY (c_row->>'step_order')::int
  )
  INTO deltas_arr
  FROM jsonb_array_elements(current_funnel) AS c_row
  LEFT JOIN LATERAL (
    SELECT p_elem
    FROM jsonb_array_elements(previous_funnel) AS p_elem
    WHERE p_elem->>'step_name' = c_row->>'step_name'
    LIMIT 1
  ) AS sub(p_row) ON true;

  -- Assemble final result
  result := jsonb_build_object(
    'current_week', jsonb_build_object(
      'from',   current_from,
      'to',     current_to,
      'funnel', COALESCE(current_funnel, '[]'::jsonb)
    ),
    'previous_week', jsonb_build_object(
      'from',   previous_from,
      'to',     previous_to,
      'funnel', COALESCE(previous_funnel, '[]'::jsonb)
    ),
    'deltas', COALESCE(deltas_arr, '[]'::jsonb)
  );

  RETURN result;
END;
$$;

-- Security: revoke execute on funnel functions from anon and authenticated roles.
-- These functions are admin-only analytics — they should only be called via the
-- Next.js admin API routes (which enforce ADMIN_SECRET auth), never directly
-- through the Supabase PostgREST endpoint by clients.
REVOKE EXECUTE ON FUNCTION funnel_counts(timestamptz, timestamptz, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION funnel_weekly_summary(date) FROM anon, authenticated;

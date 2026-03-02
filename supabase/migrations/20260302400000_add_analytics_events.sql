-- Analytics events table (Epic 10, Story 10.1)
-- Stores structured analytics events for every user action

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  device_info JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: analytics must work for guest users (anon)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow INSERT from both anon and authenticated (guests and logged-in users)
CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events
  FOR INSERT
  WITH CHECK (true);

-- SELECT is only for service_role (admin/reporting queries via Supabase dashboard)
-- No user-facing SELECT policy needed

-- Security: REVOKE defaults, then GRANT only INSERT
REVOKE ALL ON public.analytics_events FROM anon, authenticated;
GRANT INSERT ON public.analytics_events TO anon, authenticated;

-- Indexes for query performance
CREATE INDEX idx_analytics_events_session_id ON public.analytics_events (session_id);
CREATE INDEX idx_analytics_events_event_type ON public.analytics_events (event_type);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events (created_at);
CREATE INDEX idx_analytics_events_type_created ON public.analytics_events (event_type, created_at);

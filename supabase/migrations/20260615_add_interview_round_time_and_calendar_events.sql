-- Unit 25.1 — interview-round time + calendar_events
-- Applied manually in the Supabase SQL editor on 2026-06-15.
-- Recorded here for version control only. Idempotent: safe to re-run.

-- 1. interview_rounds: optional time-of-day (date stays a separate column)
ALTER TABLE interview_rounds
  ADD COLUMN IF NOT EXISTS "time" time;

-- interview_rounds already had a FOR ALL ownership policy
-- ("Users can manage their own interview rounds"). RLS was explicitly enabled:
ALTER TABLE interview_rounds ENABLE ROW LEVEL SECURITY;

-- 2. calendar_events
CREATE TABLE IF NOT EXISTS calendar_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  date        date NOT NULL,
  "time"      time,
  end_time    time,
  description text,
  color       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date
  ON calendar_events (user_id, date);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar_events_select_own" ON calendar_events;
CREATE POLICY "calendar_events_select_own" ON calendar_events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "calendar_events_insert_own" ON calendar_events;
CREATE POLICY "calendar_events_insert_own" ON calendar_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "calendar_events_update_own" ON calendar_events;
CREATE POLICY "calendar_events_update_own" ON calendar_events
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "calendar_events_delete_own" ON calendar_events;
CREATE POLICY "calendar_events_delete_own" ON calendar_events
  FOR DELETE USING (auth.uid() = user_id);

-- 3. user_preferences: applied-dates toggle
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS show_applied_dates boolean DEFAULT false;

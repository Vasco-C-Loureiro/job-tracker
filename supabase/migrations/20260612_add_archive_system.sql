-- ───── Section A: schema, indexes, RLS ─────
ALTER TABLE job_applications
  ADD COLUMN is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN archived_at timestamptz;

CREATE INDEX idx_job_applications_active
  ON job_applications (user_id, updated_at)
  WHERE is_archived = false;

ALTER TABLE user_preferences
  ADD COLUMN auto_archive_inactive_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN auto_archive_inactive_days integer NOT NULL DEFAULT 30,
  ADD COLUMN auto_archive_rejected_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN auto_archive_rejected_days integer NOT NULL DEFAULT 7;

CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_application_id uuid REFERENCES job_applications(id) ON DELETE CASCADE,
  event_type text NOT NULL,  -- 'auto_archived_inactive' | 'auto_archived_rejected' | 'unarchived' | 'manual_bulk_archive'
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own activity log"
  ON activity_log FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_activity_log_user_created
  ON activity_log (user_id, created_at DESC);

-- ───── Section B: auto-archive function ─────
CREATE OR REPLACE FUNCTION run_auto_archive()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Rule 1: archive already-rejected/ghosted jobs after rejected_days (status unchanged)
  WITH eligible AS (
    SELECT j.id, j.user_id, j.status
    FROM job_applications j
    JOIN user_preferences p ON p.user_id = j.user_id
    WHERE j.is_archived = false
      AND j.status IN ('rejected', 'ghosted')
      AND p.auto_archive_rejected_enabled = true
      AND j.updated_at < now() - make_interval(days => p.auto_archive_rejected_days)
  ),
  updated AS (
    UPDATE job_applications j
    SET is_archived = true, archived_at = now()
    FROM eligible e
    WHERE j.id = e.id
    RETURNING j.id, j.user_id, e.status AS prev_status
  )
  INSERT INTO activity_log (user_id, job_application_id, event_type, metadata)
  SELECT user_id, id, 'auto_archived_rejected',
         jsonb_build_object('status', prev_status)
  FROM updated;

  -- Rule 2: inactivity — flip stale active jobs (not rejected/ghosted) to ghosted + archive
  WITH eligible AS (
    SELECT j.id, j.user_id, j.status AS previous_status
    FROM job_applications j
    JOIN user_preferences p ON p.user_id = j.user_id
    WHERE j.is_archived = false
      AND j.status NOT IN ('rejected', 'ghosted')
      AND p.auto_archive_inactive_enabled = true
      AND j.updated_at < now() - make_interval(days => p.auto_archive_inactive_days)
  ),
  updated AS (
    UPDATE job_applications j
    SET status = 'ghosted', is_archived = true, archived_at = now()
    FROM eligible e
    WHERE j.id = e.id
    RETURNING j.id, j.user_id, e.previous_status
  )
  INSERT INTO activity_log (user_id, job_application_id, event_type, metadata)
  SELECT user_id, id, 'auto_archived_inactive',
         jsonb_build_object('previous_status', previous_status,
                            'new_status', 'ghosted',
                            'archived', true)
  FROM updated;
END;
$$;

-- ───── Section C: schedule with pg_cron (idempotent) ─────
SELECT cron.schedule(
  'auto-archive-daily',
  '0 3 * * *',
  $$ SELECT run_auto_archive(); $$
);

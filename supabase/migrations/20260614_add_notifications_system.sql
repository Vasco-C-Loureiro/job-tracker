-- Unit 22: notifications system
-- Run manually in Supabase SQL editor. Steps must be run in order.

-- Step 1: notifications table
CREATE TABLE notifications (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_log_id    uuid        REFERENCES activity_log(id) ON DELETE SET NULL,
  job_application_id uuid        REFERENCES job_applications(id) ON DELETE SET NULL,
  event_type         text        NOT NULL,
  title              text        NOT NULL,
  body               text,
  is_loud            boolean     NOT NULL DEFAULT false,
  is_read            boolean     NOT NULL DEFAULT true,
  read_at            timestamptz,
  link_type          text        NOT NULL,
  affected_jobs      jsonb,
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notifications"
  ON notifications FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_notifications_user_unread
  ON notifications (user_id, created_at DESC) WHERE is_read = false;

CREATE INDEX idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

-- Step 2: Fix activity_log FK to ON DELETE SET NULL
-- (Confirm constraint name first: SELECT conname FROM pg_constraint
--  WHERE conrelid = 'activity_log'::regclass AND contype = 'f')
ALTER TABLE activity_log
  DROP CONSTRAINT activity_log_job_application_id_fkey,
  ADD CONSTRAINT activity_log_job_application_id_fkey
    FOREIGN KEY (job_application_id) REFERENCES job_applications(id) ON DELETE SET NULL;

-- Step 3: Rewrite run_auto_archive() to also write notifications
CREATE OR REPLACE FUNCTION run_auto_archive()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Rule 1: already rejected/ghosted, stale beyond rejected_days (status unchanged)
  WITH eligible AS (
    SELECT j.id, j.user_id, j.status, j.company, j.title
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
    RETURNING j.id, j.user_id, j.company, j.title, j.status
  ),
  logged AS (
    INSERT INTO activity_log (user_id, job_application_id, event_type, metadata)
    SELECT user_id, id, 'auto_archived_rejected',
           jsonb_build_object('status', status)
    FROM updated
    RETURNING id AS activity_log_id, user_id, job_application_id
  )
  INSERT INTO notifications (
    user_id, activity_log_id, job_application_id,
    event_type, title, body, is_loud, is_read, link_type
  )
  SELECT
    l.user_id,
    l.activity_log_id,
    l.job_application_id,
    'auto_archived_rejected',
    u.company || ' - ' || u.title || ' was archived',
    'Archived after sitting in ' || u.status || ' status. You can still reactivate it.',
    true,
    false,
    'archived_page'
  FROM logged l
  JOIN updated u ON u.id = l.job_application_id;

  -- Rule 2: inactivity — any active job stale beyond inactive_days → ghosted + archived
  WITH eligible AS (
    SELECT j.id, j.user_id, j.status AS prev_status, j.company, j.title
    FROM job_applications j
    JOIN user_preferences p ON p.user_id = j.user_id
    WHERE j.is_archived = false
      AND p.auto_archive_inactive_enabled = true
      AND j.updated_at < now() - make_interval(days => p.auto_archive_inactive_days)
  ),
  updated AS (
    UPDATE job_applications j
    SET status = 'ghosted', is_archived = true, archived_at = now()
    FROM eligible e
    WHERE j.id = e.id
    RETURNING j.id, j.user_id, j.company, j.title, e.prev_status
  ),
  logged AS (
    INSERT INTO activity_log (user_id, job_application_id, event_type, metadata)
    SELECT user_id, id, 'auto_archived_inactive',
           jsonb_build_object('previous_status', prev_status, 'new_status', 'ghosted')
    FROM updated
    RETURNING id AS activity_log_id, user_id, job_application_id
  )
  INSERT INTO notifications (
    user_id, activity_log_id, job_application_id,
    event_type, title, body, is_loud, is_read, link_type
  )
  SELECT
    l.user_id,
    l.activity_log_id,
    l.job_application_id,
    'auto_archived_inactive',
    u.company || ' - ' || u.title || ' was archived',
    'Marked as ghosted and archived after a period of inactivity. Previous status: ' || u.prev_status || '.',
    true,
    false,
    'archived_page'
  FROM logged l
  JOIN updated u ON u.id = l.job_application_id;
END;
$$;

-- Step 4: Cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM notifications
  WHERE is_read = true
    AND read_at IS NOT NULL
    AND read_at < now() - interval '7 days';
END;
$$;

-- Step 5: Schedule cleanup cron (pg_cron already enabled from Unit 21)
SELECT cron.schedule(
  'cleanup-notifications-daily',
  '30 3 * * *',
  $$ SELECT cleanup_old_notifications(); $$
);

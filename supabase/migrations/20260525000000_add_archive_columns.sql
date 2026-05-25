ALTER TABLE job_applications
  ADD COLUMN is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN archived_at timestamptz;

-- Partial index: active-row queries never touch archived rows
CREATE INDEX job_applications_active_idx
  ON job_applications (user_id, saved_at DESC)
  WHERE is_archived = false;

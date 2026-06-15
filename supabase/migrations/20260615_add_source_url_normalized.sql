-- Unit 23: add pre-normalised URL column for indexed duplicate detection
-- Strips query params (?...) and fragments (#...), lowercases the result.
-- Matches the TypeScript normalizeUrl() function in packages/shared.

ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS source_url_normalized TEXT;

-- Backfill existing rows
UPDATE job_applications
SET source_url_normalized = LOWER(regexp_replace(source_url, '[?#].*$', ''))
WHERE source_url_normalized IS NULL;

-- Composite index: makes duplicate-check a O(log N) index seek per user
CREATE INDEX IF NOT EXISTS idx_job_applications_url_normalized
  ON job_applications (user_id, source_url_normalized);

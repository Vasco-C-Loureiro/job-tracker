ALTER TABLE job_applications RENAME COLUMN salary TO salary_raw;
ALTER TABLE job_applications
  ADD COLUMN salary_min numeric,
  ADD COLUMN salary_max numeric,
  ADD COLUMN salary_currency text,
  ADD COLUMN salary_requested text;

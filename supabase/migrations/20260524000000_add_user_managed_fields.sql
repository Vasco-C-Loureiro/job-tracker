ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS notes                  TEXT,
  ADD COLUMN IF NOT EXISTS applied_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS interest_level         TEXT CHECK (interest_level IN ('low', 'medium', 'high', 'very-high')),
  ADD COLUMN IF NOT EXISTS tags                   TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS resume_submitted       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cover_letter_submitted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS company_application_url TEXT;

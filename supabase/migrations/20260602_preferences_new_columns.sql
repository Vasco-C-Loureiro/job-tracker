ALTER TABLE user_preferences
  ADD COLUMN default_resume_submitted boolean NOT NULL DEFAULT true,
  ADD COLUMN default_cover_letter_submitted boolean NOT NULL DEFAULT false;

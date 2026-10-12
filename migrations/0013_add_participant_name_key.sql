-- Add a normalised key per participant so class-analytics groups students
-- case- and accent-insensitively ("Élodie" and "elodie" are the same student).
-- The key is computed in the worker on join (application-side normalisation,
-- shared with moderation). Existing rows fall back to display_name at query time.
ALTER TABLE live_participants ADD COLUMN name_key TEXT;

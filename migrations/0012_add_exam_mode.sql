-- Add exam_mode flag to quizzes.
-- When enabled, the learner flow hides corrections until the end, locks
-- navigation (no going back), and only shows a final score with no review.
ALTER TABLE quizzes ADD COLUMN exam_mode INTEGER NOT NULL DEFAULT 0;

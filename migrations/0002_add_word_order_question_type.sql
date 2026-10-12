PRAGMA foreign_keys = OFF;

CREATE TABLE questions_new (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'true_false', 'short_answer', 'word_order')),
  order_index INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  media_key TEXT,
  time_limit_seconds INTEGER NOT NULL DEFAULT 30,
  points INTEGER NOT NULL DEFAULT 1000,
  explanation TEXT NOT NULL DEFAULT '',
  accepted_answers_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (quiz_id, order_index)
);

INSERT INTO questions_new (
  id,
  quiz_id,
  type,
  order_index,
  prompt,
  media_key,
  time_limit_seconds,
  points,
  explanation,
  accepted_answers_json,
  created_at,
  updated_at
)
SELECT
  id,
  quiz_id,
  type,
  order_index,
  prompt,
  media_key,
  time_limit_seconds,
  points,
  explanation,
  accepted_answers_json,
  created_at,
  updated_at
FROM questions;

DROP TABLE questions;
ALTER TABLE questions_new RENAME TO questions;

PRAGMA foreign_keys = ON;

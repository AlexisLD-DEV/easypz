PRAGMA foreign_keys = OFF;

CREATE TABLE questions_new (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'true_false', 'short_answer', 'word_order', 'fill_blank')),
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

CREATE TABLE question_bank_items_new (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'true_false', 'short_answer', 'word_order', 'fill_blank')),
  prompt TEXT NOT NULL,
  media_key TEXT,
  explanation TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL DEFAULT '',
  primary_language TEXT NOT NULL DEFAULT 'en',
  tags_json TEXT NOT NULL DEFAULT '[]',
  time_limit_seconds INTEGER NOT NULL DEFAULT 30,
  points INTEGER NOT NULL DEFAULT 1000,
  accepted_answers_json TEXT NOT NULL DEFAULT '[]',
  choices_json TEXT NOT NULL DEFAULT '[]',
  fingerprint TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO question_bank_items_new (
  id,
  owner_id,
  type,
  prompt,
  media_key,
  explanation,
  level,
  primary_language,
  tags_json,
  time_limit_seconds,
  points,
  accepted_answers_json,
  choices_json,
  fingerprint,
  created_at,
  updated_at
)
SELECT
  id,
  owner_id,
  type,
  prompt,
  media_key,
  explanation,
  level,
  primary_language,
  tags_json,
  time_limit_seconds,
  points,
  accepted_answers_json,
  choices_json,
  fingerprint,
  created_at,
  updated_at
FROM question_bank_items;

DROP TABLE question_bank_items;
ALTER TABLE question_bank_items_new RENAME TO question_bank_items;

CREATE INDEX question_bank_owner_idx ON question_bank_items(owner_id, updated_at);
CREATE UNIQUE INDEX question_bank_owner_fingerprint_idx ON question_bank_items(owner_id, fingerprint);

PRAGMA foreign_keys = ON;

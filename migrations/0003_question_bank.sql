PRAGMA foreign_keys = ON;

CREATE TABLE question_bank_items (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'true_false', 'short_answer', 'word_order')),
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

CREATE INDEX question_bank_owner_idx ON question_bank_items(owner_id, updated_at);
CREATE UNIQUE INDEX question_bank_owner_fingerprint_idx ON question_bank_items(owner_id, fingerprint);

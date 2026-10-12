PRAGMA foreign_keys = ON;

CREATE TABLE allowed_emails (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT
);

INSERT INTO allowed_emails (email, role, created_by)
VALUES ('alexis@ledeunf.fr', 'admin', 'system');

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT
);

CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quizzes (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  primary_language TEXT NOT NULL DEFAULT 'en',
  level TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'public', 'secret_link')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  slug TEXT NOT NULL UNIQUE,
  secret_token TEXT UNIQUE,
  default_time_limit_seconds INTEGER NOT NULL DEFAULT 30,
  show_correction BOOLEAN NOT NULL DEFAULT 1,
  speed_scoring BOOLEAN NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT
);

CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'true_false', 'short_answer')),
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

CREATE TABLE question_choices (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  label TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT 0,
  UNIQUE (question_id, order_index)
);

CREATE TABLE practice_attempts (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE practice_answers (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL REFERENCES practice_attempts(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  choice_id TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  response_ms INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE live_sessions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('lobby', 'question', 'reveal', 'ended')),
  current_question_id TEXT,
  started_at TEXT,
  ended_at TEXT,
  summary_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE live_participants (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  join_token_hash TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  connected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (session_id, display_name)
);

CREATE TABLE live_answers (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  participant_id TEXT NOT NULL REFERENCES live_participants(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  choice_id TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  response_ms INTEGER NOT NULL DEFAULT 0,
  arrived_late BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (session_id, participant_id, question_id)
);

CREATE TABLE banned_terms (
  term TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

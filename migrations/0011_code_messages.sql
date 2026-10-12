CREATE TABLE code_messages (
  id TEXT PRIMARY KEY,
  recipient TEXT NOT NULL,
  sender TEXT,
  code TEXT,
  link TEXT,
  received_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX code_messages_recipient_received_idx
ON code_messages(recipient, received_at DESC);

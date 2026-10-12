CREATE TABLE request_rate_limits (
  scope TEXT NOT NULL,
  identifier_hash TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (scope, identifier_hash, window_start)
);

CREATE INDEX request_rate_limits_expires_idx
ON request_rate_limits(expires_at);

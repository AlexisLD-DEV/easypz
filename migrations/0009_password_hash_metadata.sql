ALTER TABLE users ADD COLUMN password_algorithm TEXT DEFAULT 'pbkdf2-sha256';
ALTER TABLE users ADD COLUMN password_iterations INTEGER DEFAULT 10000;

/**
 * Seeds a local D1 database with a throwaway teacher account so the Playwright
 * E2E suite can log in without depending on production data.
 *
 * Usage:
 *   npm run e2e:seed
 *
 * Uses the same PBKDF2 (10000 iterations, sha256) password format that the
 * auth stack accepts via its legacy-iteration path, so the seeded account can
 * authenticate against the local Worker.
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";

const EMAIL = process.env.E2E_TEACHER_EMAIL ?? "e2e@easypz.fr";
const PASSWORD = process.env.E2E_TEACHER_PASSWORD ?? "e2e-strong-password";

const userId = crypto.randomUUID();
const salt = crypto.randomBytes(18).toString("base64url");
const hash = crypto.pbkdf2Sync(PASSWORD, salt, 10000, 32, "sha256").toString("base64");

const sql = `
DELETE FROM request_rate_limits;
DELETE FROM auth_sessions WHERE user_id IN (SELECT id FROM users WHERE email = '${EMAIL}');
DELETE FROM users WHERE email = '${EMAIL}';
DELETE FROM allowed_emails WHERE email = '${EMAIL}';
INSERT INTO allowed_emails (email, role, created_by) VALUES ('${EMAIL}', 'teacher', 'e2e-seed');
INSERT INTO users (id, email, password_hash, password_salt, password_algorithm, password_iterations, role)
VALUES ('${userId}', '${EMAIL}', '${hash}', '${salt}', 'pbkdf2-sha256', 10000, 'teacher');
`;

const result = spawnSync("npx", ["wrangler", "d1", "execute", "quiz_english", "--local", "--command", sql], {
  stdio: "inherit"
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
console.log(`Seeded local teacher: ${EMAIL}`);

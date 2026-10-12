import type { Env } from "../env";
import { HttpError, json } from "../http/response";
import { clearSessionCookieHeader, sessionCookieHeader } from "./cookies";
import { requireUser } from "./guards";
import {
  LEGACY_PASSWORD_HASH_ITERATIONS,
  PASSWORD_HASH_ALGORITHM,
  PASSWORD_HASH_ITERATIONS,
  hashPassword,
  randomToken,
  sha256Base64,
  verifyPassword
} from "./password";
import { registrationPreflight } from "./registration";
import { assertAuthRateLimit } from "../security/rateLimit";

type AuthBody = { email: string; password: string };
type UserPasswordRow = {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  password_algorithm: string | null;
  password_iterations: number | null;
  role: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function readAuthBody(request: Request) {
  const body = await request.json<AuthBody>();
  if (!body.email || !body.password || body.password.length < 8) {
    throw new HttpError(400, "invalid_auth_body");
  }
  return body;
}

export async function register(request: Request, env: Env) {
  const body = await readAuthBody(request);
  const email = normalizeEmail(body.email);
  await assertAuthRateLimit(request, env, "register", email);
  const allowed = await env.DB.prepare("SELECT role FROM allowed_emails WHERE email = ?").bind(email).first<{ role: "admin" | "teacher" }>();
  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first<{ id: string }>();
  const preflight = registrationPreflight({ allowedRole: allowed?.role ?? null, existingUserId: existing?.id ?? null });
  if (!preflight.ok) throw new HttpError(preflight.status, preflight.code);

  const password = await hashPasswordForStorage(body.password);
  const id = crypto.randomUUID();
  await insertUserPassword(env, {
    id,
    email,
    passwordHash: password.hash,
    passwordSalt: password.salt,
    passwordAlgorithm: password.algorithm,
    passwordIterations: password.iterations,
    role: preflight.role
  });

  return createSessionResponse(request, env, id);
}

export async function login(request: Request, env: Env) {
  const body = await readAuthBody(request);
  const email = normalizeEmail(body.email);
  await assertAuthRateLimit(request, env, "login", email);
  const user = await readUserPassword(env, email);
  if (!user) throw new HttpError(401, "invalid_credentials");
  const matchedIterations = await matchingPasswordIterations(body.password, user);
  if (!matchedIterations) {
    throw new HttpError(401, "invalid_credentials");
  }
  if (user.password_algorithm !== PASSWORD_HASH_ALGORITHM || matchedIterations !== PASSWORD_HASH_ITERATIONS) {
    const upgraded = await hashPasswordForStorage(body.password);
    await updateUserPassword(env, {
      id: user.id,
      passwordHash: upgraded.hash,
      passwordSalt: upgraded.salt,
      passwordAlgorithm: upgraded.algorithm,
      passwordIterations: upgraded.iterations
    });
  }
  await env.DB.prepare("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?").bind(user.id).run();
  return createSessionResponse(request, env, user.id);
}

async function readUserPassword(env: Env, email: string) {
  try {
    return await env.DB.prepare(
      "SELECT id, email, password_hash, password_salt, password_algorithm, password_iterations, role FROM users WHERE email = ?"
    ).bind(email).first<UserPasswordRow>();
  } catch (error) {
    if (!isMissingPasswordMetadataColumn(error)) throw error;
    const user = await env.DB.prepare(
      "SELECT id, email, password_hash, password_salt, role FROM users WHERE email = ?"
    ).bind(email).first<Omit<UserPasswordRow, "password_algorithm" | "password_iterations">>();
    return user ? { ...user, password_algorithm: null, password_iterations: null } : null;
  }
}

async function insertUserPassword(env: Env, input: {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  passwordAlgorithm: string;
  passwordIterations: number;
  role: string;
}) {
  try {
    await env.DB.prepare(
      "INSERT INTO users (id, email, password_hash, password_salt, password_algorithm, password_iterations, role) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(input.id, input.email, input.passwordHash, input.passwordSalt, input.passwordAlgorithm, input.passwordIterations, input.role).run();
  } catch (error) {
    if (!isMissingPasswordMetadataColumn(error)) throw error;
    await env.DB.prepare(
      "INSERT INTO users (id, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)"
    ).bind(input.id, input.email, input.passwordHash, input.passwordSalt, input.role).run();
  }
}

async function updateUserPassword(env: Env, input: {
  id: string;
  passwordHash: string;
  passwordSalt: string;
  passwordAlgorithm: string;
  passwordIterations: number;
}) {
  try {
    await env.DB.prepare(
      "UPDATE users SET password_hash = ?, password_salt = ?, password_algorithm = ?, password_iterations = ? WHERE id = ?"
    ).bind(input.passwordHash, input.passwordSalt, input.passwordAlgorithm, input.passwordIterations, input.id).run();
  } catch (error) {
    if (!isMissingPasswordMetadataColumn(error)) throw error;
  }
}

async function hashPasswordForStorage(password: string) {
  try {
    return await hashPassword(password);
  } catch (error) {
    const fallbackIterations: number = LEGACY_PASSWORD_HASH_ITERATIONS[0];
    const defaultIterations: number = PASSWORD_HASH_ITERATIONS;
    if (fallbackIterations === defaultIterations) throw error;
    return hashPassword(password, undefined, fallbackIterations);
  }
}

function isMissingPasswordMetadataColumn(error: unknown) {
  return error instanceof Error &&
    /(?:no such column: .*password_(?:algorithm|iterations)|table users has no column named password_(?:algorithm|iterations))/i.test(error.message);
}

async function matchingPasswordIterations(password: string, user: UserPasswordRow) {
  const candidates = [
    user.password_iterations,
    PASSWORD_HASH_ITERATIONS,
    ...LEGACY_PASSWORD_HASH_ITERATIONS
  ].filter((value): value is number => typeof value === "number" && Number.isInteger(value) && value > 0);

  for (const iterations of [...new Set(candidates)]) {
    try {
      if (await verifyPassword(password, user.password_salt, user.password_hash, iterations)) return iterations;
    } catch {
      // Some Worker runtimes reject high PBKDF2 costs; keep legacy accounts usable.
    }
  }
  return null;
}

export async function me(request: Request, env: Env) {
  const user = await requireUser(request, env);
  return json({ user });
}

export async function logout(request: Request, env: Env) {
  const cookie = request.headers.get("Cookie") ?? "";
  const token = cookie.match(/(?:^|; )qe_session=([^;]+)/)?.[1];
  if (token) {
    await env.DB.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").bind(await sha256Base64(token)).run();
  }
  return json({ ok: true }, {
    headers: {
      "Set-Cookie": clearSessionCookieHeader(request)
    }
  });
}

async function createSessionResponse(request: Request, env: Env, userId: string) {
  const token = randomToken(32);
  const tokenHash = await sha256Base64(token);
  const sessionId = crypto.randomUUID();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
  await env.DB.prepare(
    "INSERT INTO auth_sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)"
  ).bind(sessionId, userId, tokenHash, expires).run();
  return json({ ok: true }, {
    headers: {
      "Set-Cookie": sessionCookieHeader(token, request)
    }
  });
}

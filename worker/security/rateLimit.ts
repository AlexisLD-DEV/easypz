import type { Env } from "../env";
import { HttpError } from "../http/response";

type RateLimitRule = {
  maxAttempts: number;
  scope: string;
  subject: string;
  windowSeconds: number;
};

export async function assertAuthRateLimit(request: Request, env: Env, action: "login" | "register", email: string) {
  await assertRateLimit(env, [
    {
      scope: `auth:${action}:ip`,
      subject: clientIdentifier(request),
      maxAttempts: action === "login" ? 60 : 30,
      windowSeconds: action === "login" ? 15 * 60 : 60 * 60
    },
    {
      scope: `auth:${action}:email`,
      subject: email,
      maxAttempts: action === "login" ? 8 : 5,
      windowSeconds: action === "login" ? 15 * 60 : 60 * 60
    }
  ]);
}

export async function assertLiveJoinRateLimit(request: Request, env: Env, code: string) {
  await assertRateLimit(env, [
    {
      scope: "live:join:ip",
      subject: clientIdentifier(request),
      maxAttempts: 120,
      windowSeconds: 10 * 60
    },
    {
      scope: "live:join:code",
      subject: code.trim().toUpperCase(),
      maxAttempts: 200,
      windowSeconds: 10 * 60
    }
  ]);
}

export async function assertRateLimit(env: Env, rules: RateLimitRule[], nowSeconds = Math.floor(Date.now() / 1000)) {
  try {
    await env.DB.prepare("DELETE FROM request_rate_limits WHERE expires_at <= ?").bind(nowSeconds).run();

    for (const rule of rules) {
      await consumeRateLimitRule(env, rule, nowSeconds);
    }
  } catch (error) {
    if (isMissingRateLimitTable(error)) return;
    throw error;
  }
}

async function consumeRateLimitRule(env: Env, rule: RateLimitRule, nowSeconds: number) {
  const windowStart = Math.floor(nowSeconds / rule.windowSeconds) * rule.windowSeconds;
  const expiresAt = windowStart + rule.windowSeconds;
  const identifierHash = await sha256Hex(`${rule.scope}:${rule.subject}`);
  const current = await env.DB.prepare(
    `SELECT attempt_count
     FROM request_rate_limits
     WHERE scope = ? AND identifier_hash = ? AND window_start = ?`
  ).bind(rule.scope, identifierHash, windowStart).first<{ attempt_count: number }>();

  if ((current?.attempt_count ?? 0) >= rule.maxAttempts) {
    throw new HttpError(429, "rate_limited");
  }

  await env.DB.prepare(
    `INSERT INTO request_rate_limits (scope, identifier_hash, window_start, attempt_count, expires_at)
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(scope, identifier_hash, window_start)
     DO UPDATE SET
       attempt_count = attempt_count + 1,
       expires_at = excluded.expires_at,
       updated_at = CURRENT_TIMESTAMP`
  ).bind(rule.scope, identifierHash, windowStart, expiresAt).run();
}

function clientIdentifier(request: Request) {
  return request.headers.get("CF-Connecting-IP") ??
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
    new URL(request.url).hostname;
}

async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isMissingRateLimitTable(error: unknown) {
  return error instanceof Error && /no such table: request_rate_limits/i.test(error.message);
}

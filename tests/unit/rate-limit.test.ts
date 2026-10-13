import { describe, expect, it } from "vitest";
import type { Env } from "../../worker/env";
import { assertAuthRateLimit, assertLiveJoinRateLimit, assertRateLimit } from "../../worker/security/rateLimit";

type RateLimitRow = {
  attempt_count: number;
  expires_at: number;
};

function createRateLimitEnv(options: { missingTable?: boolean } = {}) {
  const rows = new Map<string, RateLimitRow>();
  const seenHashes: string[] = [];
  const env = {
    DB: {
      prepare(sql: string) {
        return {
          bind: (...values: unknown[]) => ({
            async first<T>() {
              if (options.missingTable) throw new Error("no such table: request_rate_limits");
              if (!sql.includes("FROM request_rate_limits")) return null;
              const [scope, identifierHash, windowStart] = values as [string, string, number];
              seenHashes.push(identifierHash);
              return (rows.get(`${scope}:${identifierHash}:${windowStart}`) ?? null) as T | null;
            },
            async run() {
              if (options.missingTable) throw new Error("no such table: request_rate_limits");
              if (sql.startsWith("DELETE FROM request_rate_limits")) {
                const [nowSeconds] = values as [number];
                for (const [key, row] of rows.entries()) {
                  if (row.expires_at <= nowSeconds) rows.delete(key);
                }
              }
              if (sql.startsWith("INSERT INTO request_rate_limits")) {
                const [scope, identifierHash, windowStart, expiresAt] = values as [string, string, number, number];
                seenHashes.push(identifierHash);
                const key = `${scope}:${identifierHash}:${windowStart}`;
                const current = rows.get(key);
                rows.set(key, {
                  attempt_count: (current?.attempt_count ?? 0) + 1,
                  expires_at: expiresAt
                });
              }
              return { meta: { changes: 1 } };
            }
          })
        };
      }
    }
  } as unknown as Env;
  return { env, rows, seenHashes };
}

function request(path = "/api/auth/login") {
  return new Request(`https://quiz.example.org${path}`, {
    headers: { "CF-Connecting-IP": "203.0.113.10" }
  });
}

describe("rate limit guard", () => {
  it("rejects a request after the configured attempts are consumed", async () => {
    const { env } = createRateLimitEnv();
    const rules = [{
      scope: "test:ip",
      subject: "203.0.113.10",
      maxAttempts: 2,
      windowSeconds: 60
    }];

    await expect(assertRateLimit(env, rules, 120)).resolves.toBeUndefined();
    await expect(assertRateLimit(env, rules, 121)).resolves.toBeUndefined();
    await expect(assertRateLimit(env, rules, 122)).rejects.toMatchObject({
      status: 429,
      code: "rate_limited"
    });
  });

  it("expires old windows before counting the next request", async () => {
    const { env, rows } = createRateLimitEnv();
    const rules = [{
      scope: "test:email",
      subject: "teacher@example.com",
      maxAttempts: 1,
      windowSeconds: 60
    }];

    await assertRateLimit(env, rules, 10);
    expect(rows.size).toBe(1);
    await assertRateLimit(env, rules, 61);

    expect(rows.size).toBe(1);
    expect([...rows.values()][0]?.attempt_count).toBe(1);
  });

  it("hashes auth and live identifiers instead of storing raw request data", async () => {
    const { env, rows, seenHashes } = createRateLimitEnv();

    await assertAuthRateLimit(request(), env, "login", "teacher@example.com");
    await assertLiveJoinRateLimit(request("/api/live/abc123/join"), env, "abc123");

    expect(rows.size).toBe(4);
    expect(seenHashes.every((hash) => /^[a-f0-9]{64}$/.test(hash))).toBe(true);
    const storedKeys = [...rows.keys()].join(" ");
    expect(storedKeys).not.toContain("203.0.113.10");
    expect(storedKeys).not.toContain("teacher@example.com");
    expect(storedKeys).not.toContain("ABC123");
    expect(storedKeys).not.toContain("abc123");
  });

  it("does not break rollout while the migration is not applied yet", async () => {
    const { env } = createRateLimitEnv({ missingTable: true });

    await expect(assertAuthRateLimit(request(), env, "register", "teacher@example.com")).resolves.toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import type { Env } from "../../worker/env";
import { login, register } from "../../worker/auth/routes";
import { hashPassword } from "../../worker/auth/password";

type AuthDbState = {
  metadataColumns: boolean;
  user?: {
    id: string;
    email: string;
    password_hash: string;
    password_salt: string;
    role: string;
    password_algorithm?: string | null;
    password_iterations?: number | null;
  };
  insertedLegacyUser?: unknown[];
  insertedMetadataUser?: unknown[];
  metadataUpdateAttempted: boolean;
  lastLoginUpdated: boolean;
  sessionCreated: boolean;
};

function authEnv(state: AuthDbState): Env {
  return {
    DB: {
      prepare(sql: string) {
        return {
          bind: (...values: unknown[]) => ({
            async first() {
              if (sql.includes("FROM allowed_emails")) return { role: "teacher" };
              if (sql === "SELECT id FROM users WHERE email = ?") return null;
              if (sql.includes("password_algorithm") && sql.includes("FROM users")) {
                if (!state.metadataColumns) throw new Error("no such column: password_algorithm");
                return state.user ?? null;
              }
              if (sql.includes("password_hash") && sql.includes("FROM users")) {
                return state.user ?? null;
              }
              return null;
            },
            async run() {
              if (sql.includes("INSERT INTO users") && sql.includes("password_algorithm")) {
                if (!state.metadataColumns) throw new Error("table users has no column named password_algorithm");
                state.insertedMetadataUser = values;
              } else if (sql.includes("INSERT INTO users")) {
                state.insertedLegacyUser = values;
              } else if (sql.includes("UPDATE users SET password_hash")) {
                state.metadataUpdateAttempted = true;
                if (!state.metadataColumns) throw new Error("no such column: password_iterations");
              } else if (sql.includes("UPDATE users SET last_login_at")) {
                state.lastLoginUpdated = true;
              } else if (sql.includes("INSERT INTO auth_sessions")) {
                state.sessionCreated = true;
              }
              return { meta: { changes: 1 } };
            }
          })
        };
      }
    }
  } as unknown as Env;
}

function authRequest(path: string, body: { email: string; password: string }) {
  return new Request(`https://easypz.fr${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("auth routes migration compatibility", () => {
  it("registers with the legacy insert when password metadata columns are not migrated yet", async () => {
    const state: AuthDbState = {
      metadataColumns: false,
      metadataUpdateAttempted: false,
      lastLoginUpdated: false,
      sessionCreated: false
    };

    const response = await register(authRequest("/api/auth/register", {
      email: "Teacher@Example.com",
      password: "teacher-password"
    }), authEnv(state));

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(state.insertedMetadataUser).toBeUndefined();
    expect(state.insertedLegacyUser?.[1]).toBe("teacher@example.com");
    expect(state.insertedLegacyUser?.[4]).toBe("teacher");
    expect(state.sessionCreated).toBe(true);
  });

  it("logs in with legacy password rows when password metadata columns are not migrated yet", async () => {
    const password = await hashPassword("teacher-password", "legacy-salt", 10000);
    const state: AuthDbState = {
      metadataColumns: false,
      user: {
        id: "user-1",
        email: "teacher@example.com",
        password_hash: password.hash,
        password_salt: password.salt,
        role: "teacher"
      },
      metadataUpdateAttempted: false,
      lastLoginUpdated: false,
      sessionCreated: false
    };

    const response = await login(authRequest("/api/auth/login", {
      email: "teacher@example.com",
      password: "teacher-password"
    }), authEnv(state));

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(state.metadataUpdateAttempted).toBe(true);
    expect(state.lastLoginUpdated).toBe(true);
    expect(state.sessionCreated).toBe(true);
  });
});

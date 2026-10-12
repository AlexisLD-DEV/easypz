import { describe, expect, it } from "vitest";
import type { Env } from "../../worker/env";
import { authorizeLiveSocket } from "../../worker/live/routes";
import { sha256Base64 } from "../../worker/auth/password";

type MockDbState = {
  teacherSessionToken?: string;
  teacherId?: string;
  teacherSessionId?: string;
  participantId?: string;
  participantSessionId?: string;
  participantToken?: string;
};

function envFor(state: MockDbState): Env {
  return {
    DB: {
      prepare(sql: string) {
        return {
          bind: (...values: unknown[]) => ({
            async first() {
              if (sql.includes("FROM auth_sessions")) {
                const tokenHash = state.teacherSessionToken ? await sha256Base64(state.teacherSessionToken) : "";
                return values[0] === tokenHash
                  ? { id: state.teacherId ?? "teacher-1", email: "teacher@example.com", role: "teacher" }
                  : null;
              }
              if (sql.includes("WHERE id = ? AND teacher_id = ?")) {
                return values[0] === state.teacherSessionId && values[1] === (state.teacherId ?? "teacher-1")
                  ? { id: state.teacherSessionId }
                  : null;
              }
              if (sql.includes("live_participants.join_token_hash")) {
                const tokenHash = state.participantToken ? await sha256Base64(state.participantToken) : "";
                return values[0] === state.participantId &&
                  values[1] === state.participantSessionId &&
                  values[2] === tokenHash
                  ? { id: state.participantId }
                  : null;
              }
              return null;
            }
          })
        };
      }
    }
  } as unknown as Env;
}

describe("authorizeLiveSocket", () => {
  it("allows the owning teacher to open a teacher socket", async () => {
    await expect(authorizeLiveSocket(
      new Request("https://easypz.fr/api/live/sessions/session-1/socket?role=teacher", {
        headers: { Cookie: "qe_session=teacher-cookie" }
      }),
      envFor({ teacherSessionToken: "teacher-cookie", teacherId: "teacher-1", teacherSessionId: "session-1" }),
      "session-1"
    )).resolves.toBeUndefined();
  });

  it("rejects teacher sockets without an authenticated owner", async () => {
    await expect(authorizeLiveSocket(
      new Request("https://easypz.fr/api/live/sessions/session-1/socket?role=teacher"),
      envFor({ teacherSessionId: "session-1" }),
      "session-1"
    )).rejects.toMatchObject({ status: 401, code: "not_authenticated" });
  });

  it("allows student sockets only with a valid participant token", async () => {
    await expect(authorizeLiveSocket(
      new Request("https://easypz.fr/api/live/sessions/session-1/socket?role=student&participantId=p1&participantToken=join-token"),
      envFor({ participantId: "p1", participantSessionId: "session-1", participantToken: "join-token" }),
      "session-1"
    )).resolves.toBeUndefined();
  });

  it("rejects student sockets with a wrong participant token", async () => {
    await expect(authorizeLiveSocket(
      new Request("https://easypz.fr/api/live/sessions/session-1/socket?role=student&participantId=p1&participantToken=wrong"),
      envFor({ participantId: "p1", participantSessionId: "session-1", participantToken: "join-token" }),
      "session-1"
    )).rejects.toMatchObject({ status: 401, code: "not_authenticated" });
  });
});

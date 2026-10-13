import { describe, expect, it } from "vitest";
import type { Env } from "../../worker/env";
import { getTeacherAnalytics } from "../../worker/analytics/routes";

function analyticsEnv(): Env {
  return {
    DB: {
      prepare(sql: string) {
        return {
          bind: () => ({
            async first() {
              // requireUser reads the session → user.
              if (sql.includes("FROM auth_sessions")) {
                return { id: "u1", email: "teacher@easypz.fr", role: "teacher" };
              }
              return null;
            },
            async all() {
              if (sql.includes("CAST(COALESCE(AVG(p.score)")) {
                return { results: [
                  { name_key: "alice", sessions: 2, total_score: 1800, avg_score: 900, best_score: 1000, correct_answers: 8 },
                  { name_key: "bob", sessions: 1, total_score: 700, avg_score: 700, best_score: 700, correct_answers: 5 }
                ] };
              }
              if (sql.includes("s.quiz_id")) {
                return { results: [
                  { quiz_id: "q1", quiz_title: "Irregular verbs", sessions: 1, participants: 2 }
                ] };
              }
              return { results: [] };
            },
            async run() {
              return { meta: { changes: 1 } };
            }
          })
        };
      }
    }
  } as unknown as Env;
}

describe("getTeacherAnalytics", () => {
  it("groups students by normalised name across sessions and maps the response", async () => {
    const request = new Request("https://easypz.fr/api/teacher/analytics", {
      headers: { Cookie: "qe_session=some-token" }
    });
    const response = await getTeacherAnalytics(request, analyticsEnv());
    const body = (await response.json()) as {
      students: Array<{ name: string; sessions: number; avgScore: number; bestScore: number; correctAnswers: number }>;
      quizzes: Array<{ quizTitle: string; participants: number }>;
    };

    expect(body.students).toHaveLength(2);
    expect(body.students[0]).toMatchObject({ name: "alice", sessions: 2, avgScore: 900, correctAnswers: 8 });
    expect(body.students[1].bestScore).toBe(700);
    expect(body.quizzes[0]).toMatchObject({ quizTitle: "Irregular verbs", participants: 2 });
  });
});

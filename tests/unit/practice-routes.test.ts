import { describe, expect, it } from "vitest";
import type { Env } from "../../worker/env";
import { submitPracticeAnswer } from "../../worker/practice/routes";

type PracticeDbState = {
  existingAnswer: boolean;
  insertedAnswer: boolean;
  updatedAttempt: boolean;
  examMode?: number;
};

function practiceEnv(state: PracticeDbState): Env {
  return {
    DB: {
      prepare(sql: string) {
        return {
          bind: () => ({
            async first() {
              if (sql.includes("FROM questions")) {
                return {
                  id: "q1",
                  quiz_id: "quiz-1",
                  type: "multiple_choice",
                  accepted_answers_json: "[]",
                  explanation: "Go becomes went.",
                  time_limit_seconds: 30,
                  points: 100,
                  completed_at: null,
                  exam_mode: state.examMode ?? 0
                };
              }
              if (sql.includes("SELECT is_correct FROM question_choices")) return { is_correct: 1 };
              if (sql.includes("FROM practice_answers")) {
                return state.existingAnswer ? { id: "answer-1" } : null;
              }
              return null;
            },
            async all() {
              if (sql.includes("FROM question_choices")) {
                return { results: [{ id: "choice-1", label: "went", is_correct: 1 }] };
              }
              return { results: [] };
            },
            async run() {
              if (sql.includes("INSERT OR IGNORE INTO practice_answers")) state.insertedAnswer = true;
              if (sql.includes("UPDATE practice_attempts SET score")) state.updatedAttempt = true;
              return { meta: { changes: 1 } };
            }
          })
        };
      }
    }
  } as unknown as Env;
}

function answerRequest() {
  return new Request("https://easypz.fr/api/practice/attempt-1/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId: "q1", choiceId: "choice-1", responseMs: 1000 })
  });
}

describe("submitPracticeAnswer", () => {
  it("rejects duplicate answers before insert even without the unique migration index", async () => {
    const state = { existingAnswer: true, insertedAnswer: false, updatedAttempt: false };

    await expect(submitPracticeAnswer(answerRequest(), practiceEnv(state), "attempt-1"))
      .rejects.toMatchObject({ status: 409, code: "duplicate_answer" });

    expect(state.insertedAnswer).toBe(false);
    expect(state.updatedAttempt).toBe(false);
  });

  it("inserts and scores the first answer", async () => {
    const state = { existingAnswer: false, insertedAnswer: false, updatedAttempt: false };

    const response = await submitPracticeAnswer(answerRequest(), practiceEnv(state), "attempt-1");

    await expect(response.json()).resolves.toMatchObject({ isCorrect: true });
    expect(state.insertedAnswer).toBe(true);
    expect(state.updatedAttempt).toBe(true);
  });

  it("hides the correction when the quiz is in exam mode", async () => {
    const state = { existingAnswer: false, insertedAnswer: false, updatedAttempt: false, examMode: 1 };

    const response = await submitPracticeAnswer(answerRequest(), practiceEnv(state), "attempt-1");
    const body = (await response.json()) as { isCorrect: boolean; correction: unknown };

    expect(body.isCorrect).toBe(true);
    expect(body.correction).toBeNull();
  });
});

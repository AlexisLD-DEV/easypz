import { describe, expect, it } from "vitest";
import { buildLiveSessionSummary } from "../../worker/live/summary";
import type { LiveRoomState } from "../../worker/live/model";

function stateWithThirtyStudents(): LiveRoomState {
  const participants = Object.fromEntries(Array.from({ length: 30 }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    const id = `p${number}`;
    return [id, {
      id,
      participantId: id,
      displayName: `Student ${number}`,
      score: index < 27 ? 1000 - index * 10 : 0,
      correctAnswers: index < 27 ? 1 : 0
    }];
  }));

  const answers = Object.fromEntries(Array.from({ length: 30 }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    const participantId = `p${number}`;
    return [`${participantId}:q1`, {
      participantId,
      questionId: "q1",
      choiceId: index < 27 ? "correct" : "wrong",
      isCorrect: index < 27,
      points: index < 27 ? 1000 - index * 10 : 0,
      responseMs: 1000 + index * 100,
      arrivedLate: false
    }];
  }));

  return {
    sessionId: "session-30",
    code: "LIVE30",
    status: "ended",
    currentQuestionIndex: 0,
    questionStartedAt: 10_000,
    questions: [{
      id: "q1",
      type: "multiple_choice",
      prompt: "Choose the past of go.",
      timeLimitSeconds: 30,
      points: 1000,
      explanation: "Went is the simple past.",
      acceptedAnswers: [],
      choices: [
        { id: "correct", label: "went", isCorrect: true },
        { id: "wrong", label: "gone", isCorrect: false }
      ]
    }],
    participants,
    answers
  };
}

describe("buildLiveSessionSummary", () => {
  it("summarizes a 30 student live session for durable storage", () => {
    const summary = buildLiveSessionSummary(stateWithThirtyStudents());

    expect(summary).toMatchObject({
      participantCount: 30,
      questionCount: 1,
      answerCount: 30,
      correctAnswerCount: 27,
      averageScore: 783
    });
    expect(summary.leaderboard).toHaveLength(30);
    expect(summary.leaderboard[0]).toMatchObject({ participantId: "p01", score: 1000, correctAnswers: 1 });
    expect(summary.leaderboard.at(-1)).toMatchObject({ participantId: "p30", score: 0, correctAnswers: 0 });
  });
});

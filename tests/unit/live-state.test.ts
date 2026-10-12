import { describe, expect, it } from "vitest";
import type { LiveRoomState } from "../../worker/live/model";
import { toLiveStateMessage } from "../../worker/live/state";

function roomState(): LiveRoomState {
  return {
    sessionId: "session-1",
    code: "ABCD",
    status: "question",
    currentQuestionIndex: 0,
    questionStartedAt: 10_000,
    questions: [
      {
        id: "question-1",
        type: "multiple_choice",
        prompt: "Choose the past of go.",
        timeLimitSeconds: 30,
        points: 1000,
        explanation: "Went is the simple past.",
        acceptedAnswers: [],
        choices: [
          { id: "choice-a", label: "went", isCorrect: true },
          { id: "choice-b", label: "gone", isCorrect: false }
        ]
      }
    ],
    participants: {
      p1: { id: "p1", participantId: "p1", displayName: "Lina", score: 950, correctAnswers: 1 },
      p2: { id: "p2", participantId: "p2", displayName: "Adam", score: 0, correctAnswers: 0 }
    },
    answers: {
      "p1:question-1": {
        participantId: "p1",
        questionId: "question-1",
        choiceId: "choice-a",
        isCorrect: true,
        points: 950,
        responseMs: 1_500,
        arrivedLate: false
      }
    }
  };
}

describe("toLiveStateMessage", () => {
  it("keeps the question hidden while the session is still in lobby", () => {
    const current = roomState();
    current.status = "lobby";
    current.questionStartedAt = null;

    const message = toLiveStateMessage(current);

    expect(message.status).toBe("lobby");
    expect(message.currentQuestion).toBeNull();
    expect(message.answerCount).toBe(0);
  });

  it("projects room state into a public live state message", () => {
    const message = toLiveStateMessage(roomState());

    expect(message).toMatchObject({
      type: "state",
      status: "question",
      participantCount: 2,
      currentQuestionIndex: 0,
      questionCount: 1,
      questionStartedAt: 10_000,
      answerCount: 1
    });
    expect(message.code).toBe("ABCD");
    expect(message.currentQuestion?.choices.map((choice) => choice.symbol)).toEqual(["A", "B"]);
    expect(message.leaderboard.map((row) => row.displayName)).toEqual(["Lina", "Adam"]);
    expect(message.settings).toEqual({ showLeaderboard: true, showStudentFeedback: true });
  });

  it("projects teacher display settings into the public live state message", () => {
    const current = roomState();
    current.settings = { showLeaderboard: false, showStudentFeedback: false };

    const message = toLiveStateMessage(current);

    expect(message.settings).toEqual({ showLeaderboard: false, showStudentFeedback: false });
  });
});

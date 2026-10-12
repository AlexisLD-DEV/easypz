import { describe, expect, it } from "vitest";
import { applyAcceptedAnswer, evaluateLiveAnswer, rankLeaderboard } from "../../worker/live/evaluate";
import { buildSessionResults, sessionResultsToCsv } from "../../worker/live/results";
import { toLiveStateMessage } from "../../worker/live/state";
import { buildLiveSessionSummary } from "../../worker/live/summary";
import type { LiveQuestionSnapshot, LiveRoomState } from "../../worker/live/model";

const question: LiveQuestionSnapshot = {
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
};

function classroomState(): LiveRoomState {
  const participants = Object.fromEntries(Array.from({ length: 30 }, (_, index) => {
    const id = `p${String(index + 1).padStart(2, "0")}`;
    return [id, { id, participantId: id, displayName: `Student ${index + 1}`, score: 0, correctAnswers: 0 }];
  }));

  return {
    sessionId: "session-30",
    code: "LIVE30",
    status: "question",
    currentQuestionIndex: 0,
    questionStartedAt: 1_000,
    questions: [question],
    participants,
    answers: {}
  };
}

describe("30 student live simulation", () => {
  it("accepts 30 answers and keeps leaderboard order stable", () => {
    const state = classroomState();

    for (let index = 0; index < 30; index += 1) {
      const participantId = `p${String(index + 1).padStart(2, "0")}`;
      const result = evaluateLiveAnswer(state, {
        participantId,
        questionId: "q1",
        choiceId: "correct",
        receivedAt: 1_000 + index * 250
      });

      expect(result.accepted).toBe(true);
      if (result.accepted) applyAcceptedAnswer(state, result);
    }

    const leaderboard = rankLeaderboard(state.participants);

    expect(Object.keys(state.answers)).toHaveLength(30);
    expect(leaderboard).toHaveLength(30);
    expect(leaderboard[0]).toMatchObject({ participantId: "p01", score: 1000, correctAnswers: 1 });
    expect(leaderboard.at(-1)).toMatchObject({ participantId: "p30", correctAnswers: 1 });
    expect(leaderboard.map((row) => row.score)).toEqual([...leaderboard.map((row) => row.score)].sort((left, right) => right - left));

    const publicState = toLiveStateMessage(state);
    const summary = buildLiveSessionSummary(state);
    const results = buildSessionResults({
      session: {
        id: state.sessionId,
        quizId: "quiz-30",
        quizTitle: "30 student smoke",
        code: state.code ?? "LIVE30",
        status: "ended",
        createdAt: "2026-05-19 10:00:00",
        startedAt: "2026-05-19 10:01:00",
        endedAt: "2026-05-19 10:05:00"
      },
      questions: [{ id: "q1", orderIndex: 0, prompt: question.prompt, points: question.points }],
      participants: Object.values(state.participants).map((participant) => ({
        id: participant.id,
        displayName: participant.displayName,
        score: participant.score
      })),
      answers: Object.values(state.answers).map((answer) => ({
        participantId: answer.participantId,
        questionId: answer.questionId,
        choiceLabel: answer.choiceId === "correct" ? "went" : "gone",
        answerText: null,
        isCorrect: answer.isCorrect,
        points: answer.points,
        responseMs: answer.responseMs
      }))
    });
    const csv = sessionResultsToCsv(results);

    expect(publicState).toMatchObject({ participantCount: 30, answerCount: 30 });
    expect(summary).toMatchObject({ participantCount: 30, questionCount: 1, answerCount: 30, correctAnswerCount: 30 });
    expect(results.summary).toMatchObject({ participantCount: 30, questionCount: 1, answerCount: 30 });
    expect(csv.split("\n")).toHaveLength(31);
  });
});

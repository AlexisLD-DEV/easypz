import { describe, expect, it } from "vitest";
import { evaluateLiveAnswer, rankLeaderboard } from "../../worker/live/evaluate";
import type { LiveAnswerEvaluation, LiveQuestionSnapshot, LiveRoomState } from "../../worker/live/model";

const choiceQuestion: LiveQuestionSnapshot = {
  id: "q1",
  type: "multiple_choice",
  prompt: "Choose the past of go.",
  timeLimitSeconds: 30,
  points: 1000,
  explanation: "Went is the simple past.",
  acceptedAnswers: [],
  choices: [
    { id: "a", label: "went", isCorrect: true },
    { id: "b", label: "gone", isCorrect: false }
  ]
};

function state(question: LiveQuestionSnapshot = choiceQuestion): LiveRoomState {
  return {
    sessionId: "s1",
    status: "question",
    currentQuestionIndex: 0,
    questionStartedAt: 1_000,
    questions: [question],
    participants: {
      p1: { id: "p1", participantId: "p1", displayName: "Lina", score: 0, correctAnswers: 0 }
    },
    answers: {}
  };
}

function expectAccepted(result: LiveAnswerEvaluation) {
  expect(result.accepted).toBe(true);
  if (!result.accepted) throw new Error(`Expected accepted answer, got ${result.reason}`);
  return result;
}

function expectRejected(result: LiveAnswerEvaluation) {
  expect(result.accepted).toBe(false);
  if (result.accepted) throw new Error("Expected rejected answer.");
  return result;
}

describe("evaluateLiveAnswer", () => {
  it("scores a correct QCM answer with speed bonus", () => {
    const result = evaluateLiveAnswer(state(), {
      participantId: "p1",
      questionId: "q1",
      choiceId: "a",
      receivedAt: 2_000
    });

    const accepted = expectAccepted(result);
    expect(accepted.isCorrect).toBe(true);
    expect(accepted.points).toBeGreaterThan(900);
  });

  it("accepts normalized short-answer variants", () => {
    const shortQuestion: LiveQuestionSnapshot = {
      id: "q2",
      type: "short_answer",
      prompt: "Who sang La Vie en rose?",
      timeLimitSeconds: 30,
      points: 1000,
      explanation: "",
      acceptedAnswers: ["Edith Piaf"],
      choices: []
    };

    const result = evaluateLiveAnswer(state(shortQuestion), {
      participantId: "p1",
      questionId: "q2",
      answerText: "  edith   piaf ",
      receivedAt: 2_000
    });

    const accepted = expectAccepted(result);
    expect(accepted.isCorrect).toBe(true);
  });

  it("accepts normalized reformulation variants", () => {
    const reformulationQuestion: LiveQuestionSnapshot = {
      id: "q6",
      type: "reformulation",
      prompt: "Rewrite with the simple past: I go to school.",
      timeLimitSeconds: 45,
      points: 1000,
      explanation: "",
      acceptedAnswers: ["I went to school.", "I went to school"],
      choices: []
    };

    const result = evaluateLiveAnswer(state(reformulationQuestion), {
      participantId: "p1",
      questionId: "q6",
      answerText: " i   went to school ",
      receivedAt: 2_000
    });

    const accepted = expectAccepted(result);
    expect(accepted.isCorrect).toBe(true);
  });

  it("accepts normalized word-order answers", () => {
    const wordOrderQuestion: LiveQuestionSnapshot = {
      id: "q3",
      type: "word_order",
      prompt: "Put the sentence in the correct order.",
      timeLimitSeconds: 45,
      points: 1000,
      explanation: "",
      acceptedAnswers: [],
      choices: [
        { id: "w1", label: "I", isCorrect: true },
        { id: "w2", label: "went", isCorrect: true },
        { id: "w3", label: "to", isCorrect: true },
        { id: "w4", label: "school", isCorrect: true },
        { id: "w5", label: "yesterday", isCorrect: true }
      ]
    };

    const result = evaluateLiveAnswer(state(wordOrderQuestion), {
      participantId: "p1",
      questionId: "q3",
      answerText: "i went to school yesterday.",
      receivedAt: 2_000
    });

    const accepted = expectAccepted(result);
    expect(accepted.isCorrect).toBe(true);
  });

  it("accepts normalized fill-blank answers with variants", () => {
    const fillBlankQuestion: LiveQuestionSnapshot = {
      id: "q4",
      type: "fill_blank",
      prompt: "Yesterday I ___ to school because I ___ late.",
      timeLimitSeconds: 45,
      points: 1000,
      explanation: "",
      acceptedAnswers: ["went|walked", "was"],
      choices: []
    };

    const result = evaluateLiveAnswer(state(fillBlankQuestion), {
      participantId: "p1",
      questionId: "q4",
      answerText: JSON.stringify(["WENT", " was "]),
      receivedAt: 2_000
    });

    const accepted = expectAccepted(result);
    expect(accepted.isCorrect).toBe(true);
  });

  it("accepts complete matching answers", () => {
    const matchingQuestion: LiveQuestionSnapshot = {
      id: "q5",
      type: "matching",
      prompt: "Match the words.",
      timeLimitSeconds: 45,
      points: 1000,
      explanation: "",
      acceptedAnswers: [],
      choices: [
        { id: "l1", label: "dog", isCorrect: true },
        { id: "r1", label: "chien", isCorrect: false },
        { id: "l2", label: "cat", isCorrect: true },
        { id: "r2", label: "chat", isCorrect: false }
      ]
    };

    const result = evaluateLiveAnswer(state(matchingQuestion), {
      participantId: "p1",
      questionId: "q5",
      answerText: JSON.stringify([
        { leftId: "l2", rightId: "r2" },
        { leftId: "l1", rightId: "r1" }
      ]),
      receivedAt: 2_000
    });

    const accepted = expectAccepted(result);
    expect(accepted.isCorrect).toBe(true);
  });

  it("rejects duplicate answers for the same participant and question", () => {
    const current = state();
    current.answers["p1:q1"] = {
      participantId: "p1",
      questionId: "q1",
      isCorrect: true,
      points: 960,
      responseMs: 1_000,
      arrivedLate: false
    };

    const result = evaluateLiveAnswer(current, {
      participantId: "p1",
      questionId: "q1",
      choiceId: "a",
      receivedAt: 2_000
    });

    const rejected = expectRejected(result);
    expect(rejected.reason).toBe("duplicate");
  });

  it("rejects late answers", () => {
    const result = evaluateLiveAnswer(state(), {
      participantId: "p1",
      questionId: "q1",
      choiceId: "a",
      receivedAt: 32_000
    });

    const rejected = expectRejected(result);
    expect(rejected.reason).toBe("late");
  });

  it("rejects answers sent before the countdown has finished", () => {
    const current = state();
    current.questionStartedAt = 11_000;

    const result = evaluateLiveAnswer(current, {
      participantId: "p1",
      questionId: "q1",
      choiceId: "a",
      receivedAt: 10_000
    });

    const rejected = expectRejected(result);
    expect(rejected.reason).toBe("too_early");
  });
});
describe("rankLeaderboard", () => {
  it("orders by score descending then display name", () => {
    const rows = rankLeaderboard({
      a: { participantId: "a", displayName: "Zoe", score: 100, correctAnswers: 1 },
      b: { participantId: "b", displayName: "Adam", score: 100, correctAnswers: 1 },
      c: { participantId: "c", displayName: "Lina", score: 250, correctAnswers: 1 }
    });

    expect(rows.map((row) => row.displayName)).toEqual(["Lina", "Adam", "Zoe"]);
  });
});

import { describe, expect, it } from "vitest";
import { studentFeedbackView, toStudentFeedback } from "../../src/features/live/studentFeedback";

describe("toStudentFeedback", () => {
  it("normalizes accepted live messages without preserving the wire message type", () => {
    const feedback = toStudentFeedback({ type: "answer:accepted", questionId: "q1", points: 979, isCorrect: true });

    expect(feedback).toEqual({ type: "accepted", questionId: "q1", points: 979, isCorrect: true });
  });

  it("hides correctness and points when detailed feedback is disabled", () => {
    const correctFeedback = { type: "accepted", questionId: "q1", points: 979, isCorrect: true } as const;
    const wrongFeedback = { type: "accepted", questionId: "q1", points: 0, isCorrect: false } as const;

    expect(studentFeedbackView(correctFeedback, true)).toEqual({ tone: "good", message: "correct", points: 979 });
    expect(studentFeedbackView(correctFeedback, false)).toEqual({ tone: "neutral", message: "answer_sent" });
    expect(studentFeedbackView(wrongFeedback, false)).toEqual({ tone: "neutral", message: "answer_sent" });
  });

  it("gives encouraging feedback for an incorrect answer when feedback is enabled", () => {
    const wrongFeedback = { type: "accepted", questionId: "q1", points: 0, isCorrect: false } as const;

    expect(studentFeedbackView(wrongFeedback, true)).toEqual({ tone: "warn", message: "try_next" });
  });
});

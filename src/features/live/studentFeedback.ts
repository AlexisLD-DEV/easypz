import type { ServerLiveMessage } from "../../../worker/live/protocol";

export type StudentFeedback =
  | { type: "accepted"; questionId: string; points: number; isCorrect: boolean }
  | { type: "rejected"; reason: "late" | "duplicate" | "invalid" | "too_early" };

export type StudentFeedbackView =
  | { tone: "good"; message: "correct"; points: number }
  | { tone: "warn"; message: "try_next" }
  | { tone: "neutral"; message: "answer_sent" | "already_answered" | "too_late" | "wait_start" | "invalid_answer" };

export function toStudentFeedback(message: Extract<ServerLiveMessage, { type: "answer:accepted" | "answer:rejected" }>): StudentFeedback {
  if (message.type === "answer:accepted") {
    return {
      type: "accepted",
      questionId: message.questionId,
      points: message.points,
      isCorrect: message.isCorrect
    };
  }
  return { type: "rejected", reason: message.reason };
}

export function studentFeedbackView(feedback: StudentFeedback, showDetailedFeedback: boolean): StudentFeedbackView {
  if (feedback.type === "accepted") {
    if (showDetailedFeedback && feedback.isCorrect) {
      return { tone: "good", message: "correct", points: feedback.points };
    }
    if (showDetailedFeedback && !feedback.isCorrect) {
      return { tone: "warn", message: "try_next" };
    }
    return { tone: "neutral", message: "answer_sent" };
  }

  if (feedback.reason === "duplicate") return { tone: "neutral", message: "already_answered" };
  if (feedback.reason === "late") return { tone: "neutral", message: "too_late" };
  if (feedback.reason === "too_early") return { tone: "neutral", message: "wait_start" };
  return { tone: "neutral", message: "invalid_answer" };
}

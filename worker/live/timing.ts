import type { LiveStatus } from "./protocol";

export const FIRST_QUESTION_COUNTDOWN_MS = 5_000;

export function questionStartTime({
  previousStatus,
  questionIndex,
  now,
  firstQuestionCountdownMs = FIRST_QUESTION_COUNTDOWN_MS
}: {
  previousStatus: LiveStatus;
  questionIndex: number;
  now: number;
  firstQuestionCountdownMs?: number;
}) {
  return previousStatus === "lobby" && questionIndex === 0
    ? now + firstQuestionCountdownMs
    : now;
}

export function countdownSecondsUntilStart(questionStartedAt: number | null, now: number) {
  if (questionStartedAt === null) return 0;
  return Math.max(0, Math.ceil((questionStartedAt - now) / 1000));
}

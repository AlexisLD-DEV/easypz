import { describe, expect, it } from "vitest";
import { FIRST_QUESTION_COUNTDOWN_MS, countdownSecondsUntilStart, questionStartTime } from "../../worker/live/timing";

describe("live timing", () => {
  it("delays the first question by five seconds when leaving the lobby", () => {
    expect(FIRST_QUESTION_COUNTDOWN_MS).toBe(5_000);
    expect(questionStartTime({ previousStatus: "lobby", questionIndex: 0, now: 20_000 })).toBe(25_000);
  });

  it("starts later questions immediately", () => {
    expect(questionStartTime({ previousStatus: "reveal", questionIndex: 1, now: 20_000 })).toBe(20_000);
  });

  it("can override the first-question countdown for specific flows", () => {
    expect(questionStartTime({ previousStatus: "lobby", questionIndex: 0, now: 20_000, firstQuestionCountdownMs: 8_000 })).toBe(28_000);
  });

  it("reports countdown seconds until the question is open", () => {
    expect(countdownSecondsUntilStart(30_000, 20_001)).toBe(10);
    expect(countdownSecondsUntilStart(30_000, 30_000)).toBe(0);
  });
});

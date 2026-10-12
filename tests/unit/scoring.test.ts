import { describe, expect, it } from "vitest";
import { isAcceptedShortAnswer, normalizeShortAnswer, scoreAnswer } from "../../worker/live/scoring";

describe("scoring", () => {
  it("normalizes case, accents, and extra spaces", () => {
    expect(normalizeShortAnswer("  Édith   Piaf ")).toBe("edith piaf");
  });

  it("accepts configured short-answer variants", () => {
    expect(isAcceptedShortAnswer("Shakespeare", ["William Shakespeare", "shakespeare"])).toBe(true);
  });

  it("accepts composed irregular verb answers", () => {
    expect(isAcceptedShortAnswer("was/were/been", ["was", "were", "been"])).toBe(true);
    expect(isAcceptedShortAnswer("went / gone", ["went", "gone"])).toBe(true);
    expect(isAcceptedShortAnswer("was / were / been", ["was been", "was / been", "were been", "were / been"])).toBe(true);
  });

  it("awards more points for faster correct answers", () => {
    expect(scoreAnswer(true, 1000, 30, 1000)).toBeGreaterThan(scoreAnswer(true, 25000, 30, 1000));
  });
});

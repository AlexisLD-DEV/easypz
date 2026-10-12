import { describe, expect, it } from "vitest";
import { buildMatchingAnswerText, buildMatchingCorrectionLabels, isCorrectMatchingAnswer, matchingPairsFromChoices } from "../../worker/live/matching";

const choices = [
  { id: "l1", label: "dog" },
  { id: "r1", label: "chien" },
  { id: "l2", label: "cat" },
  { id: "r2", label: "chat" }
];

describe("matching answers", () => {
  it("builds ordered pairs from consecutive choices", () => {
    expect(matchingPairsFromChoices(choices)).toEqual([
      { left: choices[0], right: choices[1] },
      { left: choices[2], right: choices[3] }
    ]);
  });

  it("accepts a complete correct matching answer regardless of answer order", () => {
    const answerText = buildMatchingAnswerText([
      { leftId: "l2", rightId: "r2" },
      { leftId: "l1", rightId: "r1" }
    ]);

    expect(isCorrectMatchingAnswer(answerText, choices)).toBe(true);
  });

  it("rejects missing, duplicate, or wrong matches", () => {
    expect(isCorrectMatchingAnswer(buildMatchingAnswerText([{ leftId: "l1", rightId: "r1" }]), choices)).toBe(false);
    expect(isCorrectMatchingAnswer(buildMatchingAnswerText([
      { leftId: "l1", rightId: "r1" },
      { leftId: "l1", rightId: "r1" }
    ]), choices)).toBe(false);
    expect(isCorrectMatchingAnswer(buildMatchingAnswerText([
      { leftId: "l1", rightId: "r2" },
      { leftId: "l2", rightId: "r1" }
    ]), choices)).toBe(false);
  });

  it("builds readable correction labels", () => {
    expect(buildMatchingCorrectionLabels(choices)).toEqual(["dog -> chien", "cat -> chat"]);
  });
});

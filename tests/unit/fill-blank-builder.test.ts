import { describe, expect, it } from "vitest";
import { buildFillBlankFromMarkedText } from "../../src/features/editor/fillBlankBuilder";

describe("fill blank marked text builder", () => {
  it("turns marked answers into blanks and correction groups", () => {
    expect(buildFillBlankFromMarkedText("Yesterday I [[went|walked]] home.\nThen I [[was]] tired.")).toEqual({
      prompt: "Yesterday I ___ home.\nThen I ___ tired.",
      acceptedAnswers: ["went | walked", "was"],
      blankCount: 2
    });
  });

  it("trims variants and ignores empty alternatives", () => {
    expect(buildFillBlankFromMarkedText("I [[  went | | had gone  ]] there.")).toEqual({
      prompt: "I ___ there.",
      acceptedAnswers: ["went | had gone"],
      blankCount: 1
    });
  });

  it("leaves empty marked sections untouched", () => {
    expect(buildFillBlankFromMarkedText("I [[  ]] home.")).toEqual({
      prompt: "I [[  ]] home.",
      acceptedAnswers: [],
      blankCount: 0
    });
  });
});

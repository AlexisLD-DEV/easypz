import { describe, expect, it } from "vitest";
import { blankCountFromPrompt, fillBlankCorrectionLabels, isCorrectFillBlankAnswer, parseFillBlankAnswerText } from "../../worker/live/fillBlank";

describe("fill blank answers", () => {
  it("counts triple-underscore blanks in a prompt", () => {
    expect(blankCountFromPrompt("Yesterday I ___ to school because I ___ late.")).toBe(2);
    expect(blankCountFromPrompt("No blank here.")).toBe(0);
  });

  it("accepts normalized answers for each blank with variants", () => {
    const result = isCorrectFillBlankAnswer(
      JSON.stringify(["  WENT ", "a school"]),
      ["went|walked", "the school|a school"]
    );

    expect(result).toBe(true);
  });

  it("rejects answers when one blank is missing or wrong", () => {
    expect(isCorrectFillBlankAnswer(JSON.stringify(["went"]), ["went", "home"])).toBe(false);
    expect(isCorrectFillBlankAnswer(JSON.stringify(["went", "park"]), ["went", "home"])).toBe(false);
  });

  it("parses legacy single-text answers as one blank", () => {
    expect(parseFillBlankAnswerText("went")).toEqual(["went"]);
  });

  it("builds readable correction labels from variant groups", () => {
    expect(fillBlankCorrectionLabels(["went|walked", "home"])).toEqual(["went / walked", "home"]);
  });
});

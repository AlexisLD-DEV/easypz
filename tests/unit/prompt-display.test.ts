import { describe, expect, it } from "vitest";
import { splitQuestionPromptForDisplay } from "../../src/features/questions/promptDisplay";

describe("splitQuestionPromptForDisplay", () => {
  it("preserves lyric line breaks and turns blanks into ordered tokens", () => {
    expect(splitQuestionPromptForDisplay("Listen:\nI ___ a dream\nYou ___ here")).toEqual([
      { type: "text", text: "Listen:" },
      { type: "lineBreak" },
      { type: "text", text: "I " },
      { type: "blank", index: 1 },
      { type: "text", text: " a dream" },
      { type: "lineBreak" },
      { type: "text", text: "You " },
      { type: "blank", index: 2 },
      { type: "text", text: " here" }
    ]);
  });

  it("handles Windows line endings and consecutive blanks", () => {
    expect(splitQuestionPromptForDisplay("___\r\n___")).toEqual([
      { type: "blank", index: 1 },
      { type: "lineBreak" },
      { type: "blank", index: 2 }
    ]);
  });

  it("keeps normal prompts as a single text token", () => {
    expect(splitQuestionPromptForDisplay("Choose the past form of go.")).toEqual([
      { type: "text", text: "Choose the past form of go." }
    ]);
  });
});

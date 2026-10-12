import { describe, expect, it } from "vitest";
import { questionBankFilterSchema, questionBankInputSchema } from "../../worker/questionBank/validation";

describe("question bank validation", () => {
  it("accepts a minimal multiple-choice bank item", () => {
    const result = questionBankInputSchema.safeParse({
      type: "multiple_choice",
      prompt: "Choose the past form of go.",
      choices: [
        { label: "went", isCorrect: true },
        { label: "gone", isCorrect: false }
      ]
    });

    expect(result.success).toBe(true);
  });

  it("rejects short-answer bank items without accepted answers", () => {
    const result = questionBankInputSchema.safeParse({
      type: "short_answer",
      prompt: "Write the past form.",
      acceptedAnswers: []
    });

    expect(result.success).toBe(false);
  });

  it("accepts reformulation bank items with accepted answers", () => {
    const result = questionBankInputSchema.safeParse({
      type: "reformulation",
      prompt: "Rewrite with the simple past.",
      acceptedAnswers: ["I went home.", "I went home"]
    });

    expect(result.success).toBe(true);
  });

  it("accepts fill-blank bank items with matching correction groups", () => {
    const result = questionBankInputSchema.safeParse({
      type: "fill_blank",
      prompt: "Yesterday I ___ home.",
      acceptedAnswers: ["went|walked"]
    });

    expect(result.success).toBe(true);
  });

  it("accepts matching bank items with complete pairs", () => {
    const result = questionBankInputSchema.safeParse({
      type: "matching",
      prompt: "Match the words.",
      choices: [
        { label: "dog", isCorrect: true },
        { label: "chien", isCorrect: false },
        { label: "cat", isCorrect: true },
        { label: "chat", isCorrect: false }
      ]
    });

    expect(result.success).toBe(true);
  });

  it("accepts optional metadata and filters", () => {
    expect(questionBankInputSchema.parse({
      type: "word_order",
      prompt: "Put the sentence in order.",
      level: "A2",
      primaryLanguage: "en",
      tags: ["grammar", "past"],
      schoolLevel: "seconde",
      languageTrack: "LVA",
      cefrLevel: "B1+",
      programAxis: "seconde_axis_3",
      languageActivity: "expression_ecrite",
      linguisticFocus: "simple past",
      choices: [
        { label: "I", isCorrect: true },
        { label: "went", isCorrect: true }
      ]
    })).toMatchObject({
      tags: ["grammar", "past"],
      schoolLevel: "seconde",
      languageTrack: "LVA",
      cefrLevel: "B1+",
      programAxis: "seconde_axis_3",
      languageActivity: "expression_ecrite",
      linguisticFocus: "simple past"
    });

    expect(questionBankFilterSchema.parse({
      q: "past",
      type: "word_order",
      level: "A2",
      language: "en",
      tag: "grammar",
      schoolLevel: "seconde",
      languageTrack: "LVA",
      cefrLevel: "B1+",
      programAxis: "seconde_axis_3",
      languageActivity: "expression_ecrite",
      linguisticFocus: "simple past"
    })).toEqual({
      q: "past",
      type: "word_order",
      level: "A2",
      language: "en",
      tag: "grammar",
      schoolLevel: "seconde",
      languageTrack: "LVA",
      cefrLevel: "B1+",
      programAxis: "seconde_axis_3",
      languageActivity: "expression_ecrite",
      linguisticFocus: "simple past"
    });
  });
});

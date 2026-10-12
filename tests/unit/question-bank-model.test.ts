import { describe, expect, it } from "vitest";
import {
  bankAnswerPreview,
  questionBankFingerprint,
  similarQuestionCandidates,
  type QuestionBankComparable
} from "../../worker/questionBank/model";

const baseQuestion: QuestionBankComparable = {
  id: "bank-1",
  type: "multiple_choice",
  prompt: "Choose the past form of go!",
  acceptedAnswers: [],
  choices: [
    { label: "went", isCorrect: true },
    { label: "gone", isCorrect: false },
    { label: "go", isCorrect: false }
  ]
};

describe("question bank model", () => {
  it("builds stable fingerprints from normalized question content", () => {
    expect(questionBankFingerprint(baseQuestion)).toBe(questionBankFingerprint({
      ...baseQuestion,
      id: "other",
      prompt: " choose   the past form of GO ",
      choices: [
        { label: "Went", isCorrect: true },
        { label: "gone", isCorrect: false },
        { label: "go", isCorrect: false }
      ]
    }));
  });

  it("sorts free-text corrections before fingerprinting", () => {
    const first = questionBankFingerprint({
      id: "a",
      type: "reformulation",
      prompt: "Write the French word.",
      acceptedAnswers: ["la maison", "maison"],
      choices: []
    });
    const second = questionBankFingerprint({
      id: "b",
      type: "reformulation",
      prompt: "write the french word",
      acceptedAnswers: ["Maison", "La maison"],
      choices: []
    });

    expect(first).toBe(second);
  });

  it("returns similar candidates without treating exact duplicates as only similar", () => {
    const candidates = similarQuestionCandidates({
      ...baseQuestion,
      id: "current",
      prompt: "Choose the past form of go"
    }, [
      { ...baseQuestion, id: "exact" },
      { ...baseQuestion, id: "similar", prompt: "Pick the past form of go" },
      { ...baseQuestion, id: "different", prompt: "Choose the past form of eat", choices: [{ label: "ate", isCorrect: true }] }
    ]);

    expect(candidates.map((candidate) => candidate.id)).toEqual(["similar"]);
  });

  it("builds a compact answer preview", () => {
    expect(bankAnswerPreview(baseQuestion)).toBe("went, gone, go");
    expect(bankAnswerPreview({
      id: "reformulation",
      type: "reformulation",
      prompt: "Rewrite",
      acceptedAnswers: ["I went home.", "I went home"],
      choices: []
    })).toBe("I went home., I went home");
    expect(bankAnswerPreview({
      id: "blank",
      type: "fill_blank",
      prompt: "Yesterday I ___ home.",
      acceptedAnswers: ["went|walked"],
      choices: []
    })).toBe("went|walked");
  });
});

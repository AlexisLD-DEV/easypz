import { describe, expect, it } from "vitest";
import {
  buildPracticeAnswerPayload,
  choicesForQuestion,
  moveTokenToAnswer,
  moveTokenToBank,
  practiceCorrectionDisplay,
  practicePromptParts,
  summarizePracticeAnswers,
  wordOrderAnswerText
} from "../../src/features/practice/practicePlayerModel";

describe("practice player model", () => {
  it("groups choices for the active question with stable symbols and colors", () => {
    expect(choicesForQuestion("q1", [
      { id: "c1", question_id: "q1", order_index: 0, label: "went" },
      { id: "c2", question_id: "q2", order_index: 0, label: "False" },
      { id: "c3", question_id: "q1", order_index: 1, label: "gone" }
    ])).toEqual([
      { id: "c1", label: "went", symbol: "▲", color: "red" },
      { id: "c3", label: "gone", symbol: "◆", color: "blue" }
    ]);
  });

  it("builds answer payloads with response time", () => {
    expect(buildPracticeAnswerPayload({
      questionId: "q1",
      choiceId: "c1",
      answerText: "",
      startedAt: 1_000,
      now: 2_250
    })).toEqual({
      questionId: "q1",
      choiceId: "c1",
      responseMs: 1_250
    });

    expect(buildPracticeAnswerPayload({
      questionId: "q2",
      answerText: " saw ",
      startedAt: 1_000,
      now: 1_900
    })).toEqual({
      questionId: "q2",
      answerText: "saw",
      responseMs: 900
    });
  });

  it("summarizes answered questions and points", () => {
    expect(summarizePracticeAnswers([
      { questionId: "q1", isCorrect: true, points: 950 },
      { questionId: "q2", isCorrect: false, points: 0 },
      { questionId: "q3", isCorrect: true, points: 800 }
    ], 3)).toEqual({
      answeredCount: 3,
      correctCount: 2,
      score: 1750,
      questionCount: 3
    });
  });

  it("moves word-order tokens between bank and answer", () => {
    const bank = [
      { id: "w1", label: "went" },
      { id: "w2", label: "I" }
    ];

    const firstMove = moveTokenToAnswer({ bank, answer: [] }, "w2");
    expect(firstMove).toEqual({
      bank: [{ id: "w1", label: "went" }],
      answer: [{ id: "w2", label: "I" }]
    });

    const secondMove = moveTokenToBank(firstMove, "w2");
    expect(secondMove).toEqual({
      bank,
      answer: []
    });
  });

  it("builds word-order answer text from selected tokens", () => {
    expect(wordOrderAnswerText([
      { id: "w2", label: "I" },
      { id: "w1", label: "went" },
      { id: "w3", label: "home" }
    ])).toBe("I went home");
  });

  it("splits a two-line short-answer prompt into focus term and instruction", () => {
    expect(practicePromptParts("go\nGive the past simple and past participle.")).toEqual({
      focus: "go",
      instruction: "Give the past simple and past participle.",
      fullPrompt: "go\nGive the past simple and past participle."
    });
  });

  it("keeps ordinary prompts as the main instruction", () => {
    expect(practicePromptParts("Yesterday I ___ home.")).toEqual({
      focus: "",
      instruction: "Yesterday I ___ home.",
      fullPrompt: "Yesterday I ___ home."
    });
  });

  it("extracts the main irregular verb correction from an explanation", () => {
    expect(practiceCorrectionDisplay({
      explanation: "go -> went / gone (aller)",
      acceptedAnswers: ["went gone", "went / gone", "went/gone", "went, gone"]
    })).toEqual({
      mainCorrection: "went / gone",
      note: "go - aller",
      acceptedAnswers: ["went gone", "went / gone", "went/gone", "went, gone"]
    });
  });

  it("falls back to accepted answers when no correction arrow is present", () => {
    expect(practiceCorrectionDisplay({
      explanation: "",
      acceptedAnswers: ["saw", "seen"]
    })).toEqual({
      mainCorrection: "saw / seen",
      note: "",
      acceptedAnswers: ["saw", "seen"]
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  countdownProgressPercent,
  questionTimeProgress,
  studentChoiceLabel,
  studentChoiceTileClassName,
  studentLivePromptParts,
  studentQuestionPrompt,
  type StudentDisplayQuestion
} from "../../src/features/live/studentLiveDisplay";

const multipleChoiceQuestion: StudentDisplayQuestion = {
  type: "multiple_choice",
  prompt: "What is the past form of go?"
};

describe("student live display", () => {
  it("turns multiple-choice phones into answer pads", () => {
    expect(studentQuestionPrompt(multipleChoiceQuestion)).toBe("Regarde le tableau");
    expect(studentChoiceLabel("multiple_choice", "went")).toBe("");
    expect(studentChoiceTileClassName("multiple_choice")).toBe("answer-tile answer-red student-answer-pad-tile");
  });

  it("shows multiple-choice question and answer labels when the quiz runs on the student phone", () => {
    expect(studentQuestionPrompt(multipleChoiceQuestion, multipleChoiceQuestion.prompt)).toBe("What is the past form of go?");
    expect(studentChoiceLabel("multiple_choice", "went", { showMultipleChoiceLabel: true })).toBe("went");
    expect(studentChoiceTileClassName("multiple_choice", "blue", { showMultipleChoiceLabel: true })).toBe("answer-tile answer-blue student-answer-pad-tile student-answer-pad-tile-labeled");
  });

  it("keeps text visible for true/false, short-answer, reformulation, word-order, fill-blank, and matching questions", () => {
    expect(studentQuestionPrompt({ type: "true_false", prompt: "The verb is regular." })).toBe("The verb is regular.");
    expect(studentChoiceLabel("true_false", "True")).toBe("True");
    expect(studentQuestionPrompt({ type: "short_answer", prompt: "Write the past form." })).toBe("Write the past form.");
    expect(studentQuestionPrompt({ type: "reformulation", prompt: "Rewrite with the simple past." })).toBe("Rewrite with the simple past.");
    expect(studentQuestionPrompt({ type: "word_order", prompt: "Put the words in order." })).toBe("Put the words in order.");
    expect(studentQuestionPrompt({ type: "fill_blank", prompt: "Yesterday I ___ home." })).toBe("Yesterday I ___ home.");
    expect(studentQuestionPrompt({ type: "matching", prompt: "Match the words." })).toBe("Match the words.");
  });

  it("splits short-answer live prompts into a focus term and instruction", () => {
    expect(studentLivePromptParts({
      type: "short_answer",
      prompt: "go\nGive the past simple and past participle."
    })).toEqual({
      focus: "go",
      instruction: "Give the past simple and past participle.",
      fullPrompt: "go\nGive the past simple and past participle."
    });
  });

  it("keeps multiple-choice live phones focused on the board", () => {
    expect(studentLivePromptParts(multipleChoiceQuestion, "Look at the board")).toEqual({
      focus: "",
      instruction: "Look at the board",
      fullPrompt: "Look at the board"
    });
  });

  it("calculates visible countdown progress from the active countdown length", () => {
    expect(countdownProgressPercent(5, 5)).toBe(100);
    expect(countdownProgressPercent(3, 5)).toBe(60);
    expect(countdownProgressPercent(0, 5)).toBe(0);
    expect(countdownProgressPercent(7, 5)).toBe(100);
  });

  it("calculates question time left and progress after the countdown", () => {
    expect(questionTimeProgress({
      questionStartedAt: 1_000,
      now: 11_250,
      timeLimitSeconds: 30
    })).toEqual({
      remainingSeconds: 20,
      progressPercent: 66
    });

    expect(questionTimeProgress({
      questionStartedAt: 1_000,
      now: 40_000,
      timeLimitSeconds: 30
    })).toEqual({
      remainingSeconds: 0,
      progressPercent: 0
    });
  });
});

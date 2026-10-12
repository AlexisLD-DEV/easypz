import { describe, expect, it } from "vitest";
import { buildPracticeCorrection } from "../../worker/practice/correction";

describe("buildPracticeCorrection", () => {
  it("returns correct choices for choice questions", () => {
    expect(buildPracticeCorrection({
      type: "multiple_choice",
      explanation: "Go becomes went.",
      accepted_answers_json: "[]"
    }, [
      { id: "wrong", label: "gone", is_correct: 0 },
      { id: "correct", label: "went", is_correct: 1 }
    ])).toEqual({
      explanation: "Go becomes went.",
      correctChoices: [{ id: "correct", label: "went" }],
      acceptedAnswers: []
    });
  });

  it("returns accepted answers for short-answer questions", () => {
    expect(buildPracticeCorrection({
      type: "short_answer",
      explanation: "See becomes saw.",
      accepted_answers_json: "[\"saw\",\"Saw\"]"
    }, [])).toEqual({
      explanation: "See becomes saw.",
      correctChoices: [],
      acceptedAnswers: ["saw", "Saw"]
    });
  });

  it("returns accepted answers for reformulation questions", () => {
    expect(buildPracticeCorrection({
      type: "reformulation",
      explanation: "Keep the same meaning in the simple past.",
      accepted_answers_json: "[\"I went to school.\",\"I went to school\"]"
    }, [])).toEqual({
      explanation: "Keep the same meaning in the simple past.",
      correctChoices: [],
      acceptedAnswers: ["I went to school.", "I went to school"]
    });
  });

  it("returns the ordered sentence for word-order questions", () => {
    expect(buildPracticeCorrection({
      type: "word_order",
      explanation: "Use simple past word order.",
      accepted_answers_json: "[]"
    }, [
      { id: "w1", label: "I", is_correct: 1 },
      { id: "w2", label: "went", is_correct: 1 },
      { id: "w3", label: "home", is_correct: 1 }
    ])).toEqual({
      explanation: "Use simple past word order.",
      correctChoices: [],
      acceptedAnswers: ["I went home"]
    });
  });

  it("returns correction labels for fill-blank questions", () => {
    expect(buildPracticeCorrection({
      type: "fill_blank",
      explanation: "Use the simple past.",
      accepted_answers_json: "[\"went|walked\",\"was\"]"
    }, [])).toEqual({
      explanation: "Use the simple past.",
      correctChoices: [],
      acceptedAnswers: ["went / walked", "was"]
    });
  });

  it("returns paired corrections for matching questions", () => {
    expect(buildPracticeCorrection({
      type: "matching",
      explanation: "Vocabulary pairs.",
      accepted_answers_json: "[]"
    }, [
      { id: "l1", label: "dog", is_correct: 1 },
      { id: "r1", label: "chien", is_correct: 0 },
      { id: "l2", label: "cat", is_correct: 1 },
      { id: "r2", label: "chat", is_correct: 0 }
    ])).toEqual({
      explanation: "Vocabulary pairs.",
      correctChoices: [],
      acceptedAnswers: ["dog -> chien", "cat -> chat"]
    });
  });

  it("ignores malformed accepted-answer data", () => {
    expect(buildPracticeCorrection({
      type: "short_answer",
      explanation: "",
      accepted_answers_json: "[saw,Saw]"
    }, []).acceptedAnswers).toEqual([]);
  });
});

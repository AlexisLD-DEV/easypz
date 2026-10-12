import { describe, expect, it } from "vitest";
import { quizInputSchema } from "../../worker/quizzes/validation";

describe("quizInputSchema", () => {
  it("accepts a valid multiple-choice quiz with four choices", () => {
    const result = quizInputSchema.safeParse({
      title: "Irregular verbs",
      questions: [{
        type: "multiple_choice",
        prompt: "Choose the past of go.",
        timeLimitSeconds: 30,
        points: 1000,
        choices: [
          { label: "went", isCorrect: true },
          { label: "gone", isCorrect: false },
          { label: "go", isCorrect: false },
          { label: "goes", isCorrect: false }
        ]
      }]
    });

    expect(result.success).toBe(true);
  });

  it("rejects a multiple-choice question with five choices", () => {
    const result = quizInputSchema.safeParse({
      title: "Too many choices",
      questions: [{
        type: "multiple_choice",
        prompt: "Pick one.",
        timeLimitSeconds: 30,
        points: 1000,
        choices: [
          { label: "A", isCorrect: true },
          { label: "B", isCorrect: false },
          { label: "C", isCorrect: false },
          { label: "D", isCorrect: false },
          { label: "E", isCorrect: false }
        ]
      }]
    });

    expect(result.success).toBe(false);
  });

  it("requires accepted answers for short-answer questions", () => {
    const result = quizInputSchema.safeParse({
      title: "Short answer",
      questions: [{
        type: "short_answer",
        prompt: "Who wrote Macbeth?",
        timeLimitSeconds: 30,
        points: 1000,
        acceptedAnswers: []
      }]
    });

    expect(result.success).toBe(false);
  });

  it("accepts reformulation questions with multiple accepted corrections", () => {
    const result = quizInputSchema.safeParse({
      title: "Reformulation",
      questions: [{
        type: "reformulation",
        prompt: "Rewrite with the simple past: I go to school.",
        timeLimitSeconds: 45,
        points: 1000,
        acceptedAnswers: ["I went to school.", "I went to school"]
      }]
    });

    expect(result.success).toBe(true);
  });

  it("requires accepted answers for reformulation questions", () => {
    const result = quizInputSchema.safeParse({
      title: "Reformulation",
      questions: [{
        type: "reformulation",
        prompt: "Rewrite with the simple past: I go to school.",
        timeLimitSeconds: 45,
        points: 1000,
        acceptedAnswers: []
      }]
    });

    expect(result.success).toBe(false);
  });

  it("accepts a word-order question with ordered tokens", () => {
    const result = quizInputSchema.safeParse({
      title: "Sentence order",
      questions: [{
        type: "word_order",
        prompt: "Put the sentence in the correct order.",
        timeLimitSeconds: 45,
        points: 1000,
        choices: [
          { label: "I", isCorrect: true },
          { label: "went", isCorrect: true },
          { label: "to", isCorrect: true },
          { label: "school", isCorrect: true },
          { label: "yesterday", isCorrect: true }
        ]
      }]
    });

    expect(result.success).toBe(true);
  });

  it("rejects word-order questions with fewer than two tokens", () => {
    const result = quizInputSchema.safeParse({
      title: "Sentence order",
      questions: [{
        type: "word_order",
        prompt: "Put the sentence in the correct order.",
        timeLimitSeconds: 45,
        points: 1000,
        choices: [{ label: "Hello", isCorrect: true }]
      }]
    });

    expect(result.success).toBe(false);
  });

  it("accepts a fill-blank question with one correction group per blank", () => {
    const result = quizInputSchema.safeParse({
      title: "Text gaps",
      questions: [{
        type: "fill_blank",
        prompt: "Yesterday I ___ to school because I ___ late.",
        timeLimitSeconds: 45,
        points: 1000,
        acceptedAnswers: ["went|walked", "was"]
      }]
    });

    expect(result.success).toBe(true);
  });

  it("rejects fill-blank questions when corrections do not match blank count", () => {
    const result = quizInputSchema.safeParse({
      title: "Text gaps",
      questions: [{
        type: "fill_blank",
        prompt: "Yesterday I ___ to school because I ___ late.",
        timeLimitSeconds: 45,
        points: 1000,
        acceptedAnswers: ["went"]
      }]
    });

    expect(result.success).toBe(false);
  });

  it("accepts a matching question with two or more pairs", () => {
    const result = quizInputSchema.safeParse({
      title: "Vocabulary matching",
      questions: [{
        type: "matching",
        prompt: "Match the words.",
        timeLimitSeconds: 45,
        points: 1000,
        choices: [
          { label: "dog", isCorrect: true },
          { label: "chien", isCorrect: false },
          { label: "cat", isCorrect: true },
          { label: "chat", isCorrect: false }
        ]
      }]
    });

    expect(result.success).toBe(true);
  });

  it("rejects matching questions with incomplete pairs", () => {
    const result = quizInputSchema.safeParse({
      title: "Vocabulary matching",
      questions: [{
        type: "matching",
        prompt: "Match the words.",
        timeLimitSeconds: 45,
        points: 1000,
        choices: [
          { label: "dog", isCorrect: true },
          { label: "chien", isCorrect: false },
          { label: "cat", isCorrect: true }
        ]
      }]
    });

    expect(result.success).toBe(false);
  });
});

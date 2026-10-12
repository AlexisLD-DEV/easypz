import { describe, expect, it } from "vitest";
import { createInitialQuizDraft, draftFromTeacherQuizResponse } from "../../src/features/editor/quizEditorModel";
import { bankItemToQuestionDraft, questionDraftToBankInput } from "../../src/features/questionBank/questionBankModel";

describe("question bank editor model", () => {
  it("defaults new quiz questions to addToBank", () => {
    expect(createInitialQuizDraft().questions[0].addToBank).toBe(true);
  });

  it("defaults loaded existing quiz questions to not addToBank", () => {
    const draft = draftFromTeacherQuizResponse({
      quiz: { title: "Existing" },
      questions: [{
        id: "q1",
        type: "multiple_choice",
        prompt: "Choose one.",
        time_limit_seconds: 30,
        points: 1000
      }],
      choices: [
        { question_id: "q1", label: "A", is_correct: 1 },
        { question_id: "q1", label: "B", is_correct: 0 }
      ]
    });

    expect(draft.questions[0].addToBank).toBe(false);
  });

  it("copies a bank item into an independent question draft", () => {
    const draft = bankItemToQuestionDraft({
      id: "bank-1",
      type: "short_answer",
      prompt: "Write the past form of go.",
      mediaKey: null,
      explanation: "Go becomes went.",
      level: "A2",
      primaryLanguage: "en",
      tags: ["verbs"],
      schoolLevel: "seconde",
      languageTrack: "LVA",
      cefrLevel: "B1+",
      programAxis: "seconde_axis_3",
      languageActivity: "expression_ecrite",
      linguisticFocus: "simple past",
      timeLimitSeconds: 30,
      points: 1000,
      acceptedAnswers: ["went"],
      choices: []
    });

    expect(draft.id).toBeUndefined();
    expect(draft.addToBank).toBe(false);
    expect(draft.acceptedAnswers).toEqual(["went"]);
  });

  it("converts a question draft to a bank input with quiz metadata fallback", () => {
    const input = questionDraftToBankInput({
      type: "multiple_choice",
      prompt: "Choose the past form.",
      mediaKey: null,
      explanation: "",
      timeLimitSeconds: 30,
      points: 1000,
      acceptedAnswers: [],
      choices: [
        { label: "went", isCorrect: true },
        { label: "gone", isCorrect: false }
      ],
      addToBank: true
    }, {
      level: "A2",
      primaryLanguage: "en",
      schoolLevel: "premiere",
      languageTrack: "LVB",
      cefrLevel: "B1",
      programAxis: "premiere_axis_1",
      languageActivity: "comprehension_ecrite",
      linguisticFocus: "migration vocabulary"
    });

    expect(input.level).toBe("A2");
    expect(input.primaryLanguage).toBe("en");
    expect(input.schoolLevel).toBe("premiere");
    expect(input.languageTrack).toBe("LVB");
    expect(input.cefrLevel).toBe("B1");
    expect(input.programAxis).toBe("premiere_axis_1");
    expect(input.languageActivity).toBe("comprehension_ecrite");
    expect(input.linguisticFocus).toBe("migration vocabulary");
    expect(input.choices).toHaveLength(2);
  });
});

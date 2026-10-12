import { describe, expect, it } from "vitest";
import {
  advancedQuestionTypes,
  buildQuizPayload,
  createInitialQuizDraft,
  draftFromTeacherQuizResponse,
  normaliseQuestion,
  questionAnswerHelpKey,
  questionTypeHelpKey,
  simpleQuestionTypes,
  validateQuizDraft
} from "../../src/features/editor/quizEditorModel";

describe("quiz editor model", () => {
  it("groups editor question types for simple and advanced creation", () => {
    expect(simpleQuestionTypes).toEqual(["multiple_choice", "true_false", "short_answer"]);
    expect(advancedQuestionTypes).toEqual(["fill_blank", "reformulation", "word_order", "matching"]);
  });

  it("maps each question type to teacher-facing guidance copy", () => {
    expect(questionTypeHelpKey("multiple_choice")).toBe("editor.typeHelpMultipleChoice");
    expect(questionTypeHelpKey("true_false")).toBe("editor.typeHelpTrueFalse");
    expect(questionTypeHelpKey("short_answer")).toBe("editor.typeHelpShortAnswer");
    expect(questionTypeHelpKey("fill_blank")).toBe("editor.typeHelpFillBlank");
    expect(questionTypeHelpKey("reformulation")).toBe("editor.typeHelpReformulation");
    expect(questionTypeHelpKey("word_order")).toBe("editor.typeHelpWordOrder");
    expect(questionTypeHelpKey("matching")).toBe("editor.typeHelpMatching");
  });

  it("maps each question type to answer guidance copy", () => {
    expect(questionAnswerHelpKey("multiple_choice")).toBe("editor.answerHelpChoice");
    expect(questionAnswerHelpKey("true_false")).toBe("editor.answerHelpChoice");
    expect(questionAnswerHelpKey("short_answer")).toBe("editor.answerHelpWritten");
    expect(questionAnswerHelpKey("reformulation")).toBe("editor.answerHelpWritten");
    expect(questionAnswerHelpKey("fill_blank")).toBe("editor.answerHelpFillBlank");
    expect(questionAnswerHelpKey("word_order")).toBe("editor.answerHelpWordOrder");
    expect(questionAnswerHelpKey("matching")).toBe("editor.answerHelpMatching");
  });

  it("pre-fills a simple multiple-choice question in quick-start mode", () => {
    const draft = createInitialQuizDraft({ quick: true });
    expect(draft.questions).toHaveLength(1);
    expect(draft.questions[0].type).toBe("multiple_choice");
    expect(draft.questions[0].choices.map((choice) => choice.label)).toContain("Bonne réponse");
  });

  it("builds a complete quiz payload with multiple question types", () => {
    const draft = createInitialQuizDraft();
    draft.title = "Irregular verbs";
    draft.description = "Quick classroom warm-up";
    draft.primaryLanguage = "en";
    draft.level = "A2";
    draft.questions = [
      {
        type: "multiple_choice",
        prompt: "Choose the past form of go.",
        explanation: "Go becomes went in the simple past.",
        timeLimitSeconds: 45,
        points: 1200,
        acceptedAnswers: [],
        choices: [
          { label: "went", isCorrect: true },
          { label: "gone", isCorrect: false },
          { label: "goes", isCorrect: false },
          { label: "", isCorrect: false }
        ]
      },
      {
        type: "true_false",
        prompt: "The past form of buy is bought.",
        explanation: "Buy becomes bought.",
        timeLimitSeconds: 20,
        points: 800,
        acceptedAnswers: [],
        choices: [
          { label: "True", isCorrect: true },
          { label: "False", isCorrect: false }
        ]
      },
      {
        type: "short_answer",
        prompt: "Write the past form of see.",
        explanation: "See becomes saw.",
        timeLimitSeconds: 30,
        points: 1000,
        acceptedAnswers: ["saw", "Saw"],
        choices: []
      }
    ];

    expect(buildQuizPayload(draft)).toEqual({
      title: "Irregular verbs",
      description: "Quick classroom warm-up",
      primaryLanguage: "en",
      level: "A2",
      tags: [],
      visibility: "private",
      status: "draft",
      defaultTimeLimitSeconds: 45,
      showCorrection: true,
      speedScoring: true,
      examMode: false,
      questions: [
        {
          type: "multiple_choice",
          prompt: "Choose the past form of go.",
          timeLimitSeconds: 45,
          points: 1200,
          explanation: "Go becomes went in the simple past.",
          acceptedAnswers: [],
          choices: [
            { label: "went", isCorrect: true },
            { label: "gone", isCorrect: false },
            { label: "goes", isCorrect: false }
          ]
        },
        {
          type: "true_false",
          prompt: "The past form of buy is bought.",
          timeLimitSeconds: 20,
          points: 800,
          explanation: "Buy becomes bought.",
          acceptedAnswers: [],
          choices: [
            { label: "True", isCorrect: true },
            { label: "False", isCorrect: false }
          ]
        },
        {
          type: "short_answer",
          prompt: "Write the past form of see.",
          timeLimitSeconds: 30,
          points: 1000,
          explanation: "See becomes saw.",
          acceptedAnswers: ["saw", "Saw"],
          choices: []
        }
      ]
    });
  });

  it("preserves question media keys in editor drafts and save payloads", () => {
    const draft = draftFromTeacherQuizResponse({
      quiz: {
        title: "Picture vocabulary",
        default_time_limit_seconds: 30
      },
      questions: [
        {
          id: "question-1",
          type: "multiple_choice",
          prompt: "What is in the picture?",
          media_key: "teachers/user-1/tree.webp",
          time_limit_seconds: 30,
          points: 1000,
          explanation: "",
          accepted_answers_json: "[]"
        }
      ],
      choices: [
        { question_id: "question-1", label: "A tree", is_correct: 1 },
        { question_id: "question-1", label: "A car", is_correct: 0 }
      ]
    });

    expect(draft.questions[0].mediaKey).toBe("teachers/user-1/tree.webp");
    expect(buildQuizPayload(draft).questions[0].mediaKey).toBe("teachers/user-1/tree.webp");
  });

  it("validates each question according to its type", () => {
    const draft = createInitialQuizDraft();

    expect(validateQuizDraft(draft)).toBe("Ajoute un titre au quiz.");

    draft.title = "Basics";
    draft.questions[0].prompt = "Pick the correct answer.";
    draft.questions[0].choices[0].label = "Only one";
    expect(validateQuizDraft(draft)).toBe("Question 1 : ajoute au moins deux reponses.");

    draft.questions[0].choices[1].label = "Second";
    draft.questions[0].timeLimitSeconds = 4;
    expect(validateQuizDraft(draft)).toBe("Question 1 : choisis un temps entre 5 et 180 secondes.");

    draft.questions[0].timeLimitSeconds = 30;
    draft.questions[0].points = 50;
    expect(validateQuizDraft(draft)).toBe("Question 1 : choisis un score entre 100 et 5000 points.");

    draft.questions[0].points = 1000;
    draft.questions.push({
      type: "short_answer",
      prompt: "Write the past of go.",
      explanation: "",
      timeLimitSeconds: 30,
      points: 1000,
      acceptedAnswers: [],
      choices: []
    });
    expect(validateQuizDraft(draft)).toBe("Question 2 : ajoute au moins une correction acceptee.");
  });

  it("hydrates all existing teacher quiz questions", () => {
    const draft = draftFromTeacherQuizResponse({
      quiz: {
        id: "quiz-1",
        title: "Daily routines",
        description: "Present simple practice",
        primary_language: "fr",
        level: "A1",
        visibility: "public",
        status: "published",
        default_time_limit_seconds: 40
      },
      questions: [
        {
          id: "question-1",
          type: "multiple_choice",
          prompt: "I ___ breakfast at 7.",
          time_limit_seconds: 25,
          points: 800,
          explanation: "Use have with I.",
          accepted_answers_json: "[]"
        },
        {
          id: "question-2",
          type: "true_false",
          prompt: "She play football is correct.",
          time_limit_seconds: 20,
          points: 700,
          explanation: "Use plays.",
          accepted_answers_json: "[]"
        },
        {
          id: "question-3",
          type: "short_answer",
          prompt: "Complete: He ___ tennis.",
          time_limit_seconds: 35,
          points: 900,
          explanation: "Third person singular.",
          accepted_answers_json: "[\"plays\"]"
        }
      ],
      choices: [
        { question_id: "question-1", label: "have", is_correct: 1 },
        { question_id: "question-1", label: "has", is_correct: 0 },
        { question_id: "question-2", label: "True", is_correct: 0 },
        { question_id: "question-2", label: "False", is_correct: 1 }
      ]
    });

    expect(draft.title).toBe("Daily routines");
    expect(draft.primaryLanguage).toBe("fr");
    expect(draft.questions).toHaveLength(3);
    expect(draft.questions[0].choices).toEqual([
      { label: "have", isCorrect: true },
      { label: "has", isCorrect: false },
      { label: "", isCorrect: false },
      { label: "", isCorrect: false }
    ]);
    expect(draft.questions[1].choices).toEqual([
      { label: "True", isCorrect: false },
      { label: "False", isCorrect: true }
    ]);
    expect(draft.questions[2].acceptedAnswers).toEqual(["plays"]);
  });

  it("keeps in-progress short-answer lines while editing", () => {
    expect(normaliseQuestion({
      type: "short_answer",
      prompt: "Write the past form of see.",
      explanation: "",
      timeLimitSeconds: 30,
      points: 1000,
      acceptedAnswers: ["saw", ""],
      choices: [{ label: "unused", isCorrect: true }]
    }).acceptedAnswers).toEqual(["saw", ""]);
  });

  it("builds and hydrates reformulation questions with accepted corrections", () => {
    const draft = draftFromTeacherQuizResponse({
      quiz: {
        title: "Reformulation",
        default_time_limit_seconds: 45
      },
      questions: [
        {
          id: "question-1",
          type: "reformulation",
          prompt: "Rewrite with the simple past: I go home.",
          time_limit_seconds: 45,
          points: 1000,
          explanation: "Use went.",
          accepted_answers_json: "[\"I went home.\",\"I went home\"]"
        }
      ],
      choices: []
    });

    expect(draft.questions[0]).toMatchObject({
      type: "reformulation",
      acceptedAnswers: ["I went home.", "I went home"],
      choices: []
    });
    expect(validateQuizDraft(draft)).toBeNull();
    expect(buildQuizPayload(draft).questions[0]).toMatchObject({
      type: "reformulation",
      acceptedAnswers: ["I went home.", "I went home"],
      choices: []
    });
  });

  it("builds and hydrates word-order questions with ordered tokens", () => {
    const draft = draftFromTeacherQuizResponse({
      quiz: {
        title: "Sentence order",
        default_time_limit_seconds: 45
      },
      questions: [
        {
          id: "question-1",
          type: "word_order",
          prompt: "Put the sentence in order.",
          time_limit_seconds: 45,
          points: 1000,
          explanation: "Subject before verb.",
          accepted_answers_json: "[]"
        }
      ],
      choices: [
        { question_id: "question-1", label: "I", is_correct: 1 },
        { question_id: "question-1", label: "went", is_correct: 1 },
        { question_id: "question-1", label: "home", is_correct: 1 }
      ]
    });

    expect(draft.questions[0]).toMatchObject({
      type: "word_order",
      choices: [
        { label: "I", isCorrect: true },
        { label: "went", isCorrect: true },
        { label: "home", isCorrect: true }
      ]
    });
    expect(validateQuizDraft(draft)).toBeNull();
    expect(buildQuizPayload(draft).questions[0]).toMatchObject({
      type: "word_order",
      acceptedAnswers: [],
      choices: [
        { label: "I", isCorrect: true },
        { label: "went", isCorrect: true },
        { label: "home", isCorrect: true }
      ]
    });
  });

  it("builds and hydrates fill-blank questions with correction groups", () => {
    const draft = draftFromTeacherQuizResponse({
      quiz: {
        title: "Gap fill",
        default_time_limit_seconds: 45
      },
      questions: [
        {
          id: "question-1",
          type: "fill_blank",
          prompt: "Yesterday I ___ to school because I ___ late.",
          time_limit_seconds: 45,
          points: 1000,
          explanation: "Use simple past.",
          accepted_answers_json: "[\"went|walked\",\"was\"]"
        }
      ],
      choices: []
    });

    expect(draft.questions[0]).toMatchObject({
      type: "fill_blank",
      acceptedAnswers: ["went|walked", "was"],
      choices: []
    });
    expect(validateQuizDraft(draft)).toBeNull();
    expect(buildQuizPayload(draft).questions[0]).toMatchObject({
      type: "fill_blank",
      acceptedAnswers: ["went|walked", "was"],
      choices: []
    });
  });

  it("validates fill-blank questions against the number of prompt blanks", () => {
    const draft = createInitialQuizDraft();
    draft.title = "Gap fill";
    draft.questions = [{
      type: "fill_blank",
      prompt: "Yesterday I ___ to school because I ___ late.",
      explanation: "",
      timeLimitSeconds: 30,
      points: 1000,
      acceptedAnswers: ["went"],
      choices: []
    }];

    expect(validateQuizDraft(draft)).toBe("Question 1 : ajoute une correction par trou.");
  });

  it("builds and hydrates matching questions with ordered pairs", () => {
    const draft = draftFromTeacherQuizResponse({
      quiz: {
        title: "Vocabulary matching",
        default_time_limit_seconds: 45
      },
      questions: [
        {
          id: "question-1",
          type: "matching",
          prompt: "Match the words.",
          time_limit_seconds: 45,
          points: 1000,
          explanation: "Vocabulary pairs.",
          accepted_answers_json: "[]"
        }
      ],
      choices: [
        { question_id: "question-1", label: "dog", is_correct: 1 },
        { question_id: "question-1", label: "chien", is_correct: 0 },
        { question_id: "question-1", label: "cat", is_correct: 1 },
        { question_id: "question-1", label: "chat", is_correct: 0 }
      ]
    });

    expect(draft.questions[0]).toMatchObject({
      type: "matching",
      choices: [
        { label: "dog", isCorrect: true },
        { label: "chien", isCorrect: false },
        { label: "cat", isCorrect: true },
        { label: "chat", isCorrect: false }
      ]
    });
    expect(validateQuizDraft(draft)).toBeNull();
    expect(buildQuizPayload(draft).questions[0]).toMatchObject({
      type: "matching",
      acceptedAnswers: [],
      choices: [
        { label: "dog", isCorrect: true },
        { label: "chien", isCorrect: false },
        { label: "cat", isCorrect: true },
        { label: "chat", isCorrect: false }
      ]
    });
  });

  it("validates matching questions against complete pairs", () => {
    const draft = createInitialQuizDraft();
    draft.title = "Vocabulary matching";
    draft.questions = [{
      type: "matching",
      prompt: "Match the words.",
      explanation: "",
      timeLimitSeconds: 30,
      points: 1000,
      acceptedAnswers: [],
      choices: [
        { label: "dog", isCorrect: true },
        { label: "chien", isCorrect: false },
        { label: "cat", isCorrect: true },
        { label: "", isCorrect: false }
      ]
    }];

    expect(validateQuizDraft(draft)).toBe("Question 1 : complete au moins deux associations.");
  });
});

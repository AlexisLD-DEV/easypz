import { blankCountFromPrompt } from "../../../worker/live/fillBlank";

export type QuestionType = "multiple_choice" | "true_false" | "short_answer" | "reformulation" | "word_order" | "fill_blank" | "matching";

export const simpleQuestionTypes = ["multiple_choice", "true_false", "short_answer"] as const satisfies readonly QuestionType[];
export const advancedQuestionTypes = ["fill_blank", "reformulation", "word_order", "matching"] as const satisfies readonly QuestionType[];

const questionTypeHelpKeys = {
  multiple_choice: "editor.typeHelpMultipleChoice",
  true_false: "editor.typeHelpTrueFalse",
  short_answer: "editor.typeHelpShortAnswer",
  reformulation: "editor.typeHelpReformulation",
  word_order: "editor.typeHelpWordOrder",
  fill_blank: "editor.typeHelpFillBlank",
  matching: "editor.typeHelpMatching"
} as const satisfies Record<QuestionType, string>;

export function questionTypeHelpKey(type: QuestionType) {
  return questionTypeHelpKeys[type];
}

const questionAnswerHelpKeys = {
  multiple_choice: "editor.answerHelpChoice",
  true_false: "editor.answerHelpChoice",
  short_answer: "editor.answerHelpWritten",
  reformulation: "editor.answerHelpWritten",
  word_order: "editor.answerHelpWordOrder",
  fill_blank: "editor.answerHelpFillBlank",
  matching: "editor.answerHelpMatching"
} as const satisfies Record<QuestionType, string>;

export function questionAnswerHelpKey(type: QuestionType) {
  return questionAnswerHelpKeys[type];
}

export type ChoiceDraft = {
  id?: string;
  label: string;
  isCorrect: boolean;
};

export type QuestionDraft = {
  id?: string;
  type: QuestionType;
  prompt: string;
  mediaKey?: string | null;
  explanation: string;
  timeLimitSeconds: number;
  points: number;
  acceptedAnswers: string[];
  choices: ChoiceDraft[];
  addToBank?: boolean;
};

export type QuizEditorDraft = {
  title: string;
  description: string;
  primaryLanguage: "en" | "fr";
  level: string;
  visibility: "private" | "public" | "secret_link";
  status: "draft" | "published";
  examMode: boolean;
  questions: QuestionDraft[];
};

export type QuizPayloadQuestion = {
  id?: string;
  type: QuestionType;
  prompt: string;
  mediaKey?: string | null;
  timeLimitSeconds: number;
  points: number;
  explanation: string;
  acceptedAnswers: string[];
  choices: ChoiceDraft[];
};

export type QuizPayload = {
  title: string;
  description: string;
  primaryLanguage: "en" | "fr";
  level: string;
  tags: string[];
  visibility: "private" | "public" | "secret_link";
  status: "draft" | "published";
  defaultTimeLimitSeconds: number;
  showCorrection: boolean;
  speedScoring: boolean;
  examMode: boolean;
  questions: QuizPayloadQuestion[];
};

export type TeacherQuizResponse = {
  quiz: {
    id?: string;
    title: string;
    description?: string;
    primary_language?: "en" | "fr";
    level?: string;
    visibility?: "private" | "public" | "secret_link";
    status?: "draft" | "published";
    default_time_limit_seconds?: number;
    exam_mode?: number;
  };
  questions: Array<{
    id: string;
    type: string;
    prompt: string;
    media_key?: string | null;
    time_limit_seconds?: number;
    points?: number;
    explanation?: string;
    accepted_answers_json?: string;
  }>;
  choices: Array<{
    id?: string;
    question_id: string;
    label: string;
    is_correct: number | boolean;
  }>;
};

const defaultMultipleChoiceChoices: ChoiceDraft[] = [
  { label: "", isCorrect: true },
  { label: "", isCorrect: false },
  { label: "", isCorrect: false },
  { label: "", isCorrect: false }
];

const defaultTrueFalseChoices: ChoiceDraft[] = [
  { label: "True", isCorrect: true },
  { label: "False", isCorrect: false }
];

const defaultWordOrderChoices: ChoiceDraft[] = [
  { label: "", isCorrect: true },
  { label: "", isCorrect: true }
];

const defaultMatchingChoices: ChoiceDraft[] = [
  { label: "", isCorrect: true },
  { label: "", isCorrect: false },
  { label: "", isCorrect: true },
  { label: "", isCorrect: false }
];

export function createQuestionDraft(type: QuestionType = "multiple_choice"): QuestionDraft {
  return {
    type,
    prompt: "",
    mediaKey: null,
    explanation: "",
    timeLimitSeconds: 30,
    points: 1000,
    acceptedAnswers: [],
    addToBank: true,
    choices: type === "true_false"
      ? cloneChoices(defaultTrueFalseChoices)
      : type === "word_order"
        ? cloneChoices(defaultWordOrderChoices)
      : type === "matching"
        ? cloneChoices(defaultMatchingChoices)
      : isFreeTextQuestionType(type) || type === "fill_blank"
        ? []
        : cloneChoices(defaultMultipleChoiceChoices)
  };
}

export function createInitialQuizDraft(options: { quick?: boolean } = {}): QuizEditorDraft {
  if (options.quick) {
    return {
      title: "",
      description: "",
      primaryLanguage: "en",
      level: "",
      visibility: "private",
      status: "draft",
      examMode: false,
      questions: [{
        type: "multiple_choice",
        prompt: "Quelle est la bonne réponse ?",
        timeLimitSeconds: 30,
        points: 1000,
        explanation: "",
        acceptedAnswers: [],
        choices: [
          { label: "Bonne réponse", isCorrect: true },
          { label: "Mauvaise réponse", isCorrect: false },
          { label: "Autre option", isCorrect: false },
          { label: "Dernière option", isCorrect: false }
        ],
        addToBank: false,
        mediaKey: null
      }]
    };
  }
  return {
    title: "",
    description: "",
    primaryLanguage: "en",
    level: "",
    visibility: "private",
    status: "draft",
    examMode: false,
    questions: [createQuestionDraft()]
  };
}

export function validateQuizDraft(draft: QuizEditorDraft): string | null {
  if (!draft.title.trim()) return "Ajoute un titre au quiz.";
  if (draft.questions.length === 0) return "Ajoute au moins une question.";

  for (const [index, question] of draft.questions.entries()) {
    const label = `Question ${index + 1}`;
    if (!question.prompt.trim()) return `${label} : ajoute l'enonce.`;

    if (question.type === "multiple_choice") {
      const usableChoices = question.choices.filter((choice) => choice.label.trim().length > 0);
      const correctChoice = question.choices.find((choice) => choice.isCorrect);
      if (usableChoices.length < 2) return `${label} : ajoute au moins deux reponses.`;
      if (!correctChoice || !correctChoice.label.trim()) return `${label} : selectionne une bonne reponse remplie.`;
    }

    if (question.type === "true_false" && !question.choices.some((choice) => choice.isCorrect)) {
      return `${label} : selectionne vrai ou faux comme bonne reponse.`;
    }

    if (isFreeTextQuestionType(question.type) && acceptedAnswers(question).length === 0) {
      return `${label} : ajoute au moins une correction acceptee.`;
    }

    if (question.type === "fill_blank") {
      const blankCount = blankCountFromPrompt(question.prompt);
      if (blankCount === 0) return `${label} : ajoute au moins un trou avec ___.`;
      if (fillBlankAnswerGroups(question).length !== blankCount) return `${label} : ajoute une correction par trou.`;
    }

    if (question.type === "word_order" && wordOrderTokens(question).length < 2) {
      return `${label} : ajoute au moins deux mots a remettre dans l'ordre.`;
    }

    if (question.type === "matching" && completeMatchingPairs(question).length < 2) {
      return `${label} : complete au moins deux associations.`;
    }

    if (!Number.isInteger(question.timeLimitSeconds) || question.timeLimitSeconds < 5 || question.timeLimitSeconds > 180) {
      return `${label} : choisis un temps entre 5 et 180 secondes.`;
    }
    if (!Number.isInteger(question.points) || question.points < 100 || question.points > 5000) {
      return `${label} : choisis un score entre 100 et 5000 points.`;
    }
  }

  return null;
}

export function buildQuizPayload(draft: QuizEditorDraft): QuizPayload {
  const firstQuestion = draft.questions[0] ?? createQuestionDraft();
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    primaryLanguage: draft.primaryLanguage,
    level: draft.level.trim(),
    tags: [],
    visibility: draft.visibility,
    status: draft.status,
    defaultTimeLimitSeconds: firstQuestion.timeLimitSeconds,
    showCorrection: true,
    speedScoring: true,
    examMode: draft.examMode,
    questions: draft.questions.map((question) => buildQuestionPayload(question))
  };
}

export function draftFromTeacherQuizResponse(response: TeacherQuizResponse): QuizEditorDraft {
  const draft = createInitialQuizDraft();
  const questions = response.questions.map((question) => {
    const type = questionTypeFromApi(question.type);
    const choices = response.choices
      .filter((choice) => choice.question_id === question.id)
      .slice(0, type === "true_false" ? 2 : type === "word_order" ? 12 : type === "matching" ? 16 : type === "fill_blank" ? 0 : 4)
      .map((choice) => ({
        id: choice.id,
        label: choice.label,
        isCorrect: choice.is_correct === true || choice.is_correct === 1
      }));

    return normaliseQuestion({
      id: question.id,
      type,
      prompt: question.prompt,
      mediaKey: question.media_key ?? null,
      explanation: question.explanation ?? "",
      timeLimitSeconds: question.time_limit_seconds ?? response.quiz.default_time_limit_seconds ?? 30,
      points: question.points ?? 1000,
      acceptedAnswers: parseAcceptedAnswers(question.accepted_answers_json),
      choices,
      addToBank: false
    });
  });

  return {
    ...draft,
    title: response.quiz.title,
    description: response.quiz.description ?? "",
    primaryLanguage: response.quiz.primary_language ?? "en",
    level: response.quiz.level ?? "",
    visibility: response.quiz.visibility ?? "private",
    status: response.quiz.status ?? "draft",
    examMode: response.quiz.exam_mode === 1,
    questions: questions.length > 0 ? questions : draft.questions
  };
}

export function normaliseQuestion(question: QuestionDraft): QuestionDraft {
  if (isFreeTextQuestionType(question.type) || question.type === "fill_blank") {
    return { ...question, choices: [] };
  }

  if (question.type === "word_order") {
    const choices = cloneChoices(question.choices.slice(0, 12)).map((choice) => ({ ...choice, isCorrect: true }));
    return { ...question, acceptedAnswers: [], choices };
  }

  if (question.type === "matching") {
    return { ...question, acceptedAnswers: [], choices: normaliseMatchingChoices(question.choices) };
  }

  if (question.type === "true_false") {
    const choices = cloneChoices(question.choices.length >= 2 ? question.choices.slice(0, 2) : defaultTrueFalseChoices);
    if (!choices.some((choice) => choice.isCorrect)) choices[0].isCorrect = true;
    return { ...question, acceptedAnswers: [], choices };
  }

  const choices = cloneChoices(question.choices.slice(0, 4));
  while (choices.length < 4) choices.push({ label: "", isCorrect: false });
  if (!choices.some((choice) => choice.isCorrect)) choices[0].isCorrect = true;
  return { ...question, acceptedAnswers: [], choices };
}

function buildQuestionPayload(question: QuestionDraft): QuizPayloadQuestion {
  const base = {
    id: question.id,
    type: question.type,
    prompt: question.prompt.trim(),
    mediaKey: question.mediaKey?.trim() ? question.mediaKey.trim() : undefined,
    timeLimitSeconds: question.timeLimitSeconds,
    points: question.points,
    explanation: question.explanation.trim()
  };

  if (isFreeTextQuestionType(question.type)) {
    return {
      ...withoutUndefined(base),
      acceptedAnswers: acceptedAnswers(question),
      choices: []
    };
  }

  if (question.type === "fill_blank") {
    return {
      ...withoutUndefined(base),
      acceptedAnswers: fillBlankAnswerGroups(question),
      choices: []
    };
  }

  if (question.type === "true_false") {
    return {
      ...withoutUndefined(base),
      acceptedAnswers: [],
      choices: normaliseQuestion(question).choices.map((choice) => ({
        ...(choice.id ? { id: choice.id } : {}),
        label: choice.label.trim(),
        isCorrect: choice.isCorrect
      }))
    };
  }

  if (question.type === "word_order") {
    return {
      ...withoutUndefined(base),
      acceptedAnswers: [],
      choices: wordOrderTokens(question).map((choice) => ({
        ...(choice.id ? { id: choice.id } : {}),
        label: choice.label.trim(),
        isCorrect: true
      }))
    };
  }

  if (question.type === "matching") {
    return {
      ...withoutUndefined(base),
      acceptedAnswers: [],
      choices: completeMatchingPairs(question).flatMap((pair) => [
        {
          ...(pair.left.id ? { id: pair.left.id } : {}),
          label: pair.left.label.trim(),
          isCorrect: true
        },
        {
          ...(pair.right.id ? { id: pair.right.id } : {}),
          label: pair.right.label.trim(),
          isCorrect: false
        }
      ])
    };
  }

  return {
    ...withoutUndefined(base),
    acceptedAnswers: [],
    choices: question.choices
      .filter((choice) => choice.label.trim().length > 0)
      .map((choice) => ({
        ...(choice.id ? { id: choice.id } : {}),
        label: choice.label.trim(),
        isCorrect: choice.isCorrect
      }))
  };
}

function questionTypeFromApi(type: string): QuestionType {
  if (type === "true_false" || type === "short_answer" || type === "reformulation" || type === "word_order" || type === "fill_blank" || type === "matching") return type;
  return "multiple_choice";
}

export function isFreeTextQuestionType(type: QuestionType) {
  return type === "short_answer" || type === "reformulation";
}

function parseAcceptedAnswers(value?: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function acceptedAnswers(question: QuestionDraft) {
  return question.acceptedAnswers.map((answer) => answer.trim()).filter(Boolean);
}

function fillBlankAnswerGroups(question: QuestionDraft) {
  return question.acceptedAnswers.map((answer) => answer.trim()).filter(Boolean);
}

function wordOrderTokens(question: QuestionDraft) {
  return question.choices.filter((choice) => choice.label.trim().length > 0);
}

export function matchingPairs(question: QuestionDraft) {
  const choices = normaliseMatchingChoices(question.choices);
  const pairs: Array<{ left: ChoiceDraft; right: ChoiceDraft }> = [];
  for (let index = 0; index + 1 < choices.length; index += 2) {
    pairs.push({ left: choices[index], right: choices[index + 1] });
  }
  return pairs;
}

function completeMatchingPairs(question: QuestionDraft) {
  return matchingPairs(question).filter((pair) => pair.left.label.trim() && pair.right.label.trim());
}

function normaliseMatchingChoices(choices: ChoiceDraft[]) {
  const next = cloneChoices(choices.slice(0, 16));
  while (next.length < 4) {
    next.push({ label: "", isCorrect: next.length % 2 === 0 });
  }
  if (next.length % 2 !== 0) next.push({ label: "", isCorrect: false });
  return next.map((choice, index) => ({ ...choice, isCorrect: index % 2 === 0 }));
}

function cloneChoices(choices: ChoiceDraft[]) {
  return choices.map((choice) => ({ ...choice }));
}

function withoutUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter((entry) => entry[1] !== undefined)) as T;
}

import { createQuestionDraft, isFreeTextQuestionType, normaliseQuestion, type QuestionDraft, type QuestionType } from "../editor/quizEditorModel";
import { emptyProgramMetadata, type ProgramMetadata } from "./programMetadata";

export type QuestionBankChoice = {
  label: string;
  isCorrect: boolean;
};

export type QuestionBankItem = {
  id: string;
  type: QuestionType;
  prompt: string;
  mediaKey?: string | null;
  explanation: string;
  level: string;
  primaryLanguage: "fr" | "en";
  tags: string[];
  schoolLevel: ProgramMetadata["schoolLevel"];
  languageTrack: ProgramMetadata["languageTrack"];
  cefrLevel: ProgramMetadata["cefrLevel"];
  programAxis: ProgramMetadata["programAxis"];
  languageActivity: ProgramMetadata["languageActivity"];
  linguisticFocus: string;
  timeLimitSeconds: number;
  points: number;
  acceptedAnswers: string[];
  choices: QuestionBankChoice[];
};

export type QuestionBankInput = Omit<QuestionBankItem, "id">;

export function bankItemToQuestionDraft(item: QuestionBankItem): QuestionDraft {
  return normaliseQuestion({
    ...createQuestionDraft(item.type),
    id: undefined,
    prompt: item.prompt,
    mediaKey: item.mediaKey ?? null,
    explanation: item.explanation,
    timeLimitSeconds: item.timeLimitSeconds,
    points: item.points,
    acceptedAnswers: [...item.acceptedAnswers],
    choices: item.choices.map((choice) => ({ ...choice })),
    addToBank: false
  });
}

export function questionDraftToBankInput(
  question: QuestionDraft,
  metadata: { level: string; primaryLanguage: "fr" | "en"; tags?: string[] } & Partial<ProgramMetadata>
): QuestionBankInput {
  const programMetadata = { ...emptyProgramMetadata(), ...metadata };
  return {
    type: question.type,
    prompt: question.prompt.trim(),
    mediaKey: question.mediaKey ?? null,
    explanation: question.explanation.trim(),
    level: metadata.level.trim(),
    primaryLanguage: metadata.primaryLanguage,
    tags: metadata.tags ?? [],
    schoolLevel: programMetadata.schoolLevel,
    languageTrack: programMetadata.languageTrack,
    cefrLevel: programMetadata.cefrLevel,
    programAxis: programMetadata.programAxis.trim(),
    languageActivity: programMetadata.languageActivity,
    linguisticFocus: programMetadata.linguisticFocus.trim(),
    timeLimitSeconds: question.timeLimitSeconds,
    points: question.points,
    acceptedAnswers: question.acceptedAnswers.map((answer) => answer.trim()).filter(Boolean),
    choices: isFreeTextQuestionType(question.type) || question.type === "fill_blank"
      ? []
      : question.choices
      .filter((choice) => choice.label.trim().length > 0)
      .map((choice) => ({ label: choice.label.trim(), isCorrect: choice.isCorrect }))
  };
}

export function tagsFromText(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function tagsToText(tags: string[]) {
  return tags.join(", ");
}

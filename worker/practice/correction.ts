import { fillBlankCorrectionLabels } from "../live/fillBlank";
import { buildMatchingCorrectionLabels } from "../live/matching";
import { buildWordOrderAnswer } from "../live/wordOrder";

type PracticeQuestionForCorrection = {
  type: "multiple_choice" | "true_false" | "short_answer" | "reformulation" | "word_order" | "fill_blank" | "matching";
  explanation: string;
  accepted_answers_json: string;
};

type PracticeChoiceForCorrection = {
  id: string;
  label: string;
  is_correct: number;
};

export type PracticeCorrection = {
  explanation: string;
  correctChoices: Array<{ id: string; label: string }>;
  acceptedAnswers: string[];
};

export function buildPracticeCorrection(
  question: PracticeQuestionForCorrection,
  choices: PracticeChoiceForCorrection[]
): PracticeCorrection {
  if (question.type === "short_answer" || question.type === "reformulation") {
    return {
      explanation: question.explanation,
      correctChoices: [],
      acceptedAnswers: parseAcceptedAnswers(question.accepted_answers_json)
    };
  }

  if (question.type === "word_order") {
    return {
      explanation: question.explanation,
      correctChoices: [],
      acceptedAnswers: [buildWordOrderAnswer(choices)]
    };
  }

  if (question.type === "fill_blank") {
    return {
      explanation: question.explanation,
      correctChoices: [],
      acceptedAnswers: fillBlankCorrectionLabels(parseAcceptedAnswers(question.accepted_answers_json))
    };
  }

  if (question.type === "matching") {
    return {
      explanation: question.explanation,
      correctChoices: [],
      acceptedAnswers: buildMatchingCorrectionLabels(choices)
    };
  }

  return {
    explanation: question.explanation,
    correctChoices: choices
      .filter((choice) => choice.is_correct === 1)
      .map((choice) => ({ id: choice.id, label: choice.label })),
    acceptedAnswers: []
  };
}

export function parseAcceptedAnswers(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

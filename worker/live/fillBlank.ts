import { isAcceptedShortAnswer } from "./scoring";

const blankPattern = /_{3,}/g;

export function blankCountFromPrompt(prompt: string) {
  return prompt.match(blankPattern)?.length ?? 0;
}

export function splitFillBlankVariants(group: string) {
  return group
    .split("|")
    .map((answer) => answer.trim())
    .filter(Boolean);
}

export function parseFillBlankAnswerText(answerText: string) {
  try {
    const parsed = JSON.parse(answerText) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    // Fall back to one blank for older single-text submissions.
  }
  return [answerText];
}

export function buildFillBlankAnswerText(answers: string[]) {
  return JSON.stringify(answers.map((answer) => answer.trim()));
}

export function isCorrectFillBlankAnswer(answerText: string, acceptedAnswerGroups: string[]) {
  const submittedAnswers = parseFillBlankAnswerText(answerText);
  if (submittedAnswers.length !== acceptedAnswerGroups.length) return false;

  return acceptedAnswerGroups.every((group, index) => {
    const variants = splitFillBlankVariants(group);
    return variants.length > 0 && isAcceptedShortAnswer(submittedAnswers[index] ?? "", variants);
  });
}

export function fillBlankCorrectionLabels(acceptedAnswerGroups: string[]) {
  return acceptedAnswerGroups
    .map((group) => splitFillBlankVariants(group).join(" / "))
    .filter(Boolean);
}

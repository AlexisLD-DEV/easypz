export type QuestionBankChoice = {
  label: string;
  isCorrect: boolean;
};

export type QuestionBankComparable = {
  id?: string;
  type: "multiple_choice" | "true_false" | "short_answer" | "reformulation" | "word_order" | "fill_blank" | "matching";
  prompt: string;
  acceptedAnswers: string[];
  choices: QuestionBankChoice[];
};

export type SimilarQuestionCandidate = {
  id: string;
  score: number;
};

export function normalizeBankText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function questionBankFingerprint(question: QuestionBankComparable) {
  const choices = question.choices.map((choice) => (
    `${normalizeBankText(choice.label)}:${choice.isCorrect ? "1" : "0"}`
  ));
  const acceptedAnswers = isFreeTextQuestion(question.type)
    ? question.acceptedAnswers.map(normalizeBankText).sort()
    : question.acceptedAnswers.map(normalizeBankText);

  return [
    question.type,
    normalizeBankText(question.prompt),
    choices.join("|"),
    acceptedAnswers.join("|")
  ].join("::");
}

export function bankAnswerPreview(question: QuestionBankComparable) {
  const answers = isFreeTextQuestion(question.type) || question.type === "fill_blank"
    ? question.acceptedAnswers
    : question.choices.map((choice) => choice.label);
  return answers.filter(Boolean).slice(0, 4).join(", ");
}

export function similarQuestionCandidates(
  current: QuestionBankComparable,
  candidates: Array<QuestionBankComparable & { id: string }>
): SimilarQuestionCandidate[] {
  const currentFingerprint = questionBankFingerprint(current);

  return candidates
    .filter((candidate) => candidate.type === current.type)
    .map((candidate) => ({
      id: candidate.id,
      score: similarityScore(current, candidate),
      fingerprint: questionBankFingerprint(candidate)
    }))
    .filter((candidate) => candidate.fingerprint !== currentFingerprint && candidate.score >= 0.72)
    .sort((left, right) => right.score - left.score)
    .map(({ id, score }) => ({ id, score }));
}

function similarityScore(left: QuestionBankComparable, right: QuestionBankComparable) {
  const promptScore = tokenOverlap(normalizeBankText(left.prompt), normalizeBankText(right.prompt));
  const answerScore = tokenOverlap(answerText(left), answerText(right));
  if (answerScore >= 0.72) return answerScore;
  if (promptScore >= 0.86) return promptScore;
  return 0;
}

function answerText(question: QuestionBankComparable) {
  const values = isFreeTextQuestion(question.type) || question.type === "fill_blank"
    ? question.acceptedAnswers
    : question.choices.map((choice) => choice.label);
  return normalizeBankText(values.join(" "));
}

function isFreeTextQuestion(type: QuestionBankComparable["type"]) {
  return type === "short_answer" || type === "reformulation";
}

function tokenOverlap(left: string, right: string) {
  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return intersection / Math.max(leftTokens.size, rightTokens.size);
}

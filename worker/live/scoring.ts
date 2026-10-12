export function normalizeShortAnswer(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ");
}

export function isAcceptedShortAnswer(answer: string, acceptedAnswers: string[]) {
  const normalized = normalizeShortAnswer(answer);
  const acceptedCandidates = [
    ...acceptedAnswers,
    acceptedAnswers.join(" / ")
  ];
  if (acceptedCandidates.some((accepted) => normalizeShortAnswer(accepted) === normalized)) return true;

  const answerTokens = shortAnswerTokens(normalized);
  const acceptedTokenSets = acceptedAnswers.map((accepted) => shortAnswerTokens(normalizeShortAnswer(accepted)));
  const knownTokens = new Set(acceptedTokenSets.flat());
  if (answerTokens.length === 0 || answerTokens.some((token) => !knownTokens.has(token))) return false;
  return acceptedTokenSets.some((tokens) => tokens.length > 1 && tokens.every((token) => answerTokens.includes(token)));
}

function shortAnswerTokens(value: string) {
  return value.split(/[\s/,]+/).map((token) => token.trim()).filter(Boolean);
}

export function scoreAnswer(isCorrect: boolean, responseMs: number, timeLimitSeconds: number, maxPoints: number) {
  if (!isCorrect) return 0;
  const limitMs = timeLimitSeconds * 1000;
  const speedRatio = Math.max(0, Math.min(1, 1 - responseMs / limitMs));
  return Math.round(maxPoints * (0.6 + speedRatio * 0.4));
}

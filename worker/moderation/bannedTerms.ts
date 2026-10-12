const combiningMarksPattern = /[\u0300-\u036f]/g;
const whitespacePattern = /\s+/g;

export function normalizeModerationText(value: string) {
  return value
    .normalize("NFKD")
    .replace(combiningMarksPattern, "")
    .toLowerCase()
    .replace(whitespacePattern, " ")
    .trim();
}

export function normalizeBannedTerm(value: string) {
  const normalized = normalizeModerationText(value);
  if (!normalized) throw new Error("empty_banned_term");
  return normalized;
}

export function findBlockedTerm(value: string, bannedTerms: string[]) {
  const normalizedValue = normalizeModerationText(value);
  for (const term of bannedTerms) {
    const normalizedTerm = normalizeBannedTerm(term);
    if (normalizedValue.includes(normalizedTerm)) return normalizedTerm;
  }
  return null;
}

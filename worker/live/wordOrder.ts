type WordOrderToken = {
  label: string;
};

export function buildWordOrderAnswer(tokens: WordOrderToken[]) {
  return tokens.map((token) => token.label.trim()).filter(Boolean).join(" ");
}

export function normalizeWordOrderAnswer(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,!?;:"()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isCorrectWordOrderAnswer(answer: string, tokens: WordOrderToken[]) {
  return normalizeWordOrderAnswer(answer) === normalizeWordOrderAnswer(buildWordOrderAnswer(tokens));
}

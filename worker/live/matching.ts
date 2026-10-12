export type MatchingChoice = {
  id: string;
  label: string;
};

export type MatchingPair = {
  left: MatchingChoice;
  right: MatchingChoice;
};

export type MatchingAnswerPair = {
  leftId: string;
  rightId: string;
};

export function matchingPairsFromChoices(choices: MatchingChoice[]): MatchingPair[] {
  const pairs: MatchingPair[] = [];
  for (let index = 0; index + 1 < choices.length; index += 2) {
    pairs.push({ left: choices[index], right: choices[index + 1] });
  }
  return pairs;
}

export function buildMatchingAnswerText(answer: MatchingAnswerPair[]) {
  return JSON.stringify(answer);
}

export function parseMatchingAnswerText(answerText: string): MatchingAnswerPair[] {
  try {
    const parsed = JSON.parse(answerText) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is MatchingAnswerPair => (
      typeof item === "object" &&
      item !== null &&
      typeof (item as MatchingAnswerPair).leftId === "string" &&
      typeof (item as MatchingAnswerPair).rightId === "string"
    ));
  } catch {
    return [];
  }
}

export function isCorrectMatchingAnswer(answerText: string, choices: MatchingChoice[]) {
  const expectedPairs = matchingPairsFromChoices(choices);
  const submittedPairs = parseMatchingAnswerText(answerText);
  if (submittedPairs.length !== expectedPairs.length) return false;

  const expectedRightByLeft = new Map(expectedPairs.map((pair) => [pair.left.id, pair.right.id]));
  const seenLeft = new Set<string>();
  const seenRight = new Set<string>();

  for (const pair of submittedPairs) {
    if (seenLeft.has(pair.leftId) || seenRight.has(pair.rightId)) return false;
    seenLeft.add(pair.leftId);
    seenRight.add(pair.rightId);
    if (expectedRightByLeft.get(pair.leftId) !== pair.rightId) return false;
  }

  return seenLeft.size === expectedPairs.length && seenRight.size === expectedPairs.length;
}

export function buildMatchingCorrectionLabels(choices: MatchingChoice[]) {
  return matchingPairsFromChoices(choices).map((pair) => `${pair.left.label} -> ${pair.right.label}`);
}

export type PublicChoice = {
  id: string;
  question_id: string;
  order_index: number;
  label: string;
};

export type PracticeChoiceView = {
  id: string;
  label: string;
  symbol: string;
  color: "red" | "blue" | "green" | "yellow";
};

export type PracticeAnswerRecord = {
  questionId: string;
  isCorrect: boolean;
  points: number;
};

export type WordOrderToken = {
  id: string;
  label: string;
};

export type WordOrderState = {
  bank: WordOrderToken[];
  answer: WordOrderToken[];
};

const choiceSymbols = ["▲", "◆", "●", "■"] as const;
const choiceColors = ["red", "blue", "green", "yellow"] as const;

export function choicesForQuestion(questionId: string, choices: PublicChoice[]): PracticeChoiceView[] {
  return choices
    .filter((choice) => choice.question_id === questionId)
    .sort((left, right) => left.order_index - right.order_index)
    .map((choice, index) => ({
      id: choice.id,
      label: choice.label,
      symbol: choiceSymbols[index] ?? choiceSymbols[0],
      color: choiceColors[index] ?? choiceColors[0]
    }));
}

export function buildPracticeAnswerPayload(input: {
  questionId: string;
  choiceId?: string;
  answerText?: string;
  startedAt: number;
  now: number;
}) {
  return {
    questionId: input.questionId,
    ...(input.choiceId ? { choiceId: input.choiceId } : {}),
    ...(input.answerText?.trim() ? { answerText: input.answerText.trim() } : {}),
    responseMs: Math.max(0, input.now - input.startedAt)
  };
}

export function summarizePracticeAnswers(answers: PracticeAnswerRecord[], questionCount: number) {
  return {
    answeredCount: answers.length,
    correctCount: answers.filter((answer) => answer.isCorrect).length,
    score: answers.reduce((total, answer) => total + answer.points, 0),
    questionCount
  };
}

export function moveTokenToAnswer(state: WordOrderState, tokenId: string): WordOrderState {
  const token = state.bank.find((item) => item.id === tokenId);
  if (!token) return state;
  return {
    bank: state.bank.filter((item) => item.id !== tokenId),
    answer: [...state.answer, token]
  };
}

export function moveTokenToBank(state: WordOrderState, tokenId: string): WordOrderState {
  const token = state.answer.find((item) => item.id === tokenId);
  if (!token) return state;
  return {
    bank: [...state.bank, token],
    answer: state.answer.filter((item) => item.id !== tokenId)
  };
}

export function wordOrderAnswerText(tokens: WordOrderToken[]) {
  return tokens.map((token) => token.label.trim()).filter(Boolean).join(" ");
}

export function practicePromptParts(prompt: string) {
  const lines = prompt.split(/\r\n|\n|\r/).map((line) => line.trim()).filter(Boolean);
  if (lines.length >= 2 && lines[0].length <= 36) {
    return {
      focus: lines[0],
      instruction: lines.slice(1).join(" "),
      fullPrompt: prompt
    };
  }
  return {
    focus: "",
    instruction: prompt.trim(),
    fullPrompt: prompt
  };
}

export function practiceCorrectionDisplay(input: { explanation: string; acceptedAnswers: string[] }) {
  const explanation = input.explanation.trim();
  const arrowMatch = explanation.match(/^(.+?)\s*(?:->|→)\s*(.+?)(?:\s*\((.+)\))?$/);
  if (arrowMatch) {
    const source = arrowMatch[1].trim();
    const answer = arrowMatch[2].trim();
    const note = arrowMatch[3]?.trim();
    return {
      mainCorrection: answer,
      note: note ? `${source} - ${note}` : source,
      acceptedAnswers: input.acceptedAnswers
    };
  }

  return {
    mainCorrection: input.acceptedAnswers.join(" / "),
    note: explanation,
    acceptedAnswers: input.acceptedAnswers
  };
}

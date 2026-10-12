export type StudentDisplayQuestion = {
  type: "multiple_choice" | "true_false" | "short_answer" | "reformulation" | "word_order" | "fill_blank" | "matching";
  prompt: string;
};

export function studentQuestionPrompt(question: StudentDisplayQuestion, lookAtBoard = "Regarde le tableau") {
  return question.type === "multiple_choice" ? lookAtBoard : question.prompt;
}

export function studentLivePromptParts(question: StudentDisplayQuestion, lookAtBoard = "Regarde le tableau") {
  const prompt = studentQuestionPrompt(question, lookAtBoard);
  const lines = prompt.split(/\r\n|\n|\r/).map((line) => line.trim()).filter(Boolean);
  if ((question.type === "short_answer" || question.type === "reformulation") && lines.length >= 2 && lines[0].length <= 36) {
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

type StudentChoiceDisplayOptions = {
  showMultipleChoiceLabel?: boolean;
};

export function studentChoiceLabel(questionType: StudentDisplayQuestion["type"], label: string, options: StudentChoiceDisplayOptions = {}) {
  return questionType === "multiple_choice" && !options.showMultipleChoiceLabel ? "" : label;
}

export function studentChoiceTileClassName(questionType: StudentDisplayQuestion["type"], color = "red", options: StudentChoiceDisplayOptions = {}) {
  const base = `answer-tile answer-${color}`;
  if (questionType !== "multiple_choice") return base;
  return options.showMultipleChoiceLabel ? `${base} student-answer-pad-tile student-answer-pad-tile-labeled` : `${base} student-answer-pad-tile`;
}

export function countdownProgressPercent(remainingSeconds: number, totalSeconds: number) {
  if (totalSeconds <= 0) return 0;
  const progress = (remainingSeconds / totalSeconds) * 100;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

export function questionTimeProgress({
  questionStartedAt,
  now,
  timeLimitSeconds
}: {
  questionStartedAt: number | null;
  now: number;
  timeLimitSeconds: number;
}) {
  if (questionStartedAt === null || timeLimitSeconds <= 0) {
    return {
      remainingSeconds: 0,
      progressPercent: 0
    };
  }

  const durationMs = timeLimitSeconds * 1000;
  const elapsedMs = Math.max(0, now - questionStartedAt);
  const remainingMs = Math.max(0, durationMs - elapsedMs);

  return {
    remainingSeconds: Math.ceil(remainingMs / 1000),
    progressPercent: Math.max(0, Math.min(100, Math.round((remainingMs / durationMs) * 100)))
  };
}

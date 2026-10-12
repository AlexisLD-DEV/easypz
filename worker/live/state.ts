import { rankLeaderboard } from "./evaluate";
import type { LiveQuestionSnapshot, LiveRoomState } from "./model";
import type { LiveStateMessage, PublicLiveChoice, PublicLiveQuestion } from "./protocol";
import { normalizeLiveSettings } from "./settings";

const choiceMeta: Array<Pick<PublicLiveChoice, "symbol" | "color">> = [
  { symbol: "A", color: "red" },
  { symbol: "B", color: "blue" },
  { symbol: "C", color: "green" },
  { symbol: "D", color: "yellow" }
];

export function toLiveStateMessage(state: LiveRoomState): LiveStateMessage {
  const currentQuestion = state.status === "question" || state.status === "reveal"
    ? state.questions[state.currentQuestionIndex] ?? null
    : null;
  return {
    type: "state",
    status: state.status,
    participantCount: Object.keys(state.participants).length,
    currentQuestionIndex: state.currentQuestionIndex,
    questionCount: state.questions.length,
    currentQuestion: currentQuestion ? toPublicLiveQuestion(currentQuestion) : null,
    questionStartedAt: state.questionStartedAt,
    answerCount: currentQuestion
      ? Object.values(state.answers).filter((answer) => answer.questionId === currentQuestion.id).length
      : 0,
    leaderboard: rankLeaderboard(state.participants),
    settings: normalizeLiveSettings(state.settings),
    code: state.code
  };
}

export function toPublicLiveQuestion(question: LiveQuestionSnapshot): PublicLiveQuestion {
  return {
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    mediaKey: question.mediaKey,
    timeLimitSeconds: question.timeLimitSeconds,
    points: question.points,
    choices: question.choices.map((choice, index) => ({ id: choice.id, label: choice.label, ...choiceMeta[index % choiceMeta.length] }))
  };
}

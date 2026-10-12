import { isAcceptedShortAnswer, scoreAnswer } from "./scoring";
import type { LeaderboardRow } from "./protocol";
import type { LiveAnswerEvaluation, LiveAnswerInput, LiveQuestionSnapshot, LiveRoomState } from "./model";
import { isCorrectFillBlankAnswer } from "./fillBlank";
import { isCorrectMatchingAnswer } from "./matching";
import { isCorrectWordOrderAnswer } from "./wordOrder";

export function evaluateLiveAnswer(state: LiveRoomState, input: LiveAnswerInput): LiveAnswerEvaluation {
  const question = state.questions[state.currentQuestionIndex];
  if (!question || question.id !== input.questionId || state.status !== "question" || state.questionStartedAt === null) {
    return { accepted: false, reason: "invalid" };
  }
  if (input.receivedAt < state.questionStartedAt) {
    return { accepted: false, reason: "too_early" };
  }

  const answerKey = makeAnswerKey(input.participantId, input.questionId);
  if (state.answers[answerKey]) {
    return { accepted: false, reason: "duplicate" };
  }

  const responseMs = Math.max(0, input.receivedAt - state.questionStartedAt);
  if (responseMs > question.timeLimitSeconds * 1000) {
    return { accepted: false, reason: "late" };
  }

  const isCorrect = answerIsCorrect(question, input);
  const points = scoreAnswer(isCorrect, responseMs, question.timeLimitSeconds, question.points);

  return {
    accepted: true,
    participantId: input.participantId,
    questionId: input.questionId,
    choiceId: input.choiceId,
    answerText: input.answerText,
    isCorrect,
    points,
    responseMs,
    arrivedLate: false
  };
}

export function applyAcceptedAnswer(state: LiveRoomState, answer: Extract<LiveAnswerEvaluation, { accepted: true }>) {
  const participant = state.participants[answer.participantId];
  if (!participant) return state;
  state.answers[makeAnswerKey(answer.participantId, answer.questionId)] = {
    participantId: answer.participantId,
    questionId: answer.questionId,
    choiceId: answer.choiceId,
    answerText: answer.answerText,
    isCorrect: answer.isCorrect,
    points: answer.points,
    responseMs: answer.responseMs,
    arrivedLate: answer.arrivedLate
  };
  participant.score += answer.points;
  if (answer.isCorrect) participant.correctAnswers += 1;
  return state;
}

export function rankLeaderboard(participants: Record<string, LeaderboardRow>) {
  return Object.values(participants).sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.displayName.localeCompare(right.displayName, "fr");
  });
}

export function makeAnswerKey(participantId: string, questionId: string) {
  return `${participantId}:${questionId}`;
}

function answerIsCorrect(question: LiveQuestionSnapshot, input: LiveAnswerInput) {
  if (question.type === "short_answer" || question.type === "reformulation") {
    return isAcceptedShortAnswer(input.answerText ?? "", question.acceptedAnswers);
  }
  if (question.type === "fill_blank") {
    return isCorrectFillBlankAnswer(input.answerText ?? "", question.acceptedAnswers);
  }
  if (question.type === "matching") {
    return isCorrectMatchingAnswer(input.answerText ?? "", question.choices);
  }
  if (question.type === "word_order") {
    return isCorrectWordOrderAnswer(input.answerText ?? "", question.choices);
  }
  return question.choices.some((choice) => choice.id === input.choiceId && choice.isCorrect);
}

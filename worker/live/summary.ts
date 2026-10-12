import { rankLeaderboard } from "./evaluate";
import type { LiveRoomState } from "./model";

export type LiveSessionSummary = ReturnType<typeof buildLiveSessionSummary>;

export function buildLiveSessionSummary(state: LiveRoomState) {
  const participants = Object.values(state.participants);
  const answers = Object.values(state.answers);
  const leaderboard = rankLeaderboard(state.participants);

  return {
    participantCount: participants.length,
    questionCount: state.questions.length,
    answerCount: answers.length,
    correctAnswerCount: answers.filter((answer) => answer.isCorrect).length,
    averageScore: participants.length
      ? Math.round(participants.reduce((total, participant) => total + participant.score, 0) / participants.length)
      : 0,
    leaderboard
  };
}

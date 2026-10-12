import type { LeaderboardRow, LiveDisplaySettings, LiveStatus } from "./protocol";

export type LiveChoiceSnapshot = {
  id: string;
  label: string;
  isCorrect: boolean;
};

export type LiveQuestionSnapshot = {
  id: string;
  type: "multiple_choice" | "true_false" | "short_answer" | "reformulation" | "word_order" | "fill_blank" | "matching";
  prompt: string;
  mediaKey?: string | null;
  timeLimitSeconds: number;
  points: number;
  explanation: string;
  acceptedAnswers: string[];
  choices: LiveChoiceSnapshot[];
};

export type LiveParticipantState = LeaderboardRow & {
  id: string;
};

export type LiveStoredAnswer = {
  participantId: string;
  questionId: string;
  choiceId?: string;
  answerText?: string;
  isCorrect: boolean;
  points: number;
  responseMs: number;
  arrivedLate: boolean;
};

export type LiveRoomState = {
  sessionId: string;
  code?: string;
  status: LiveStatus;
  currentQuestionIndex: number;
  questionStartedAt: number | null;
  settings?: LiveDisplaySettings;
  questions: LiveQuestionSnapshot[];
  participants: Record<string, LiveParticipantState>;
  answers: Record<string, LiveStoredAnswer>;
};

export type LiveAnswerInput = {
  participantId: string;
  questionId: string;
  choiceId?: string;
  answerText?: string;
  receivedAt: number;
};

export type LiveAnswerEvaluation =
  | ({ accepted: true } & LiveStoredAnswer)
  | { accepted: false; reason: "late" | "duplicate" | "invalid" | "too_early" };

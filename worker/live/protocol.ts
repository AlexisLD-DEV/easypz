export type LiveRole = "teacher" | "student" | "board";
export type LiveStatus = "lobby" | "question" | "reveal" | "ended";

export type ClientLiveMessage =
  | { type: "teacher:start" }
  | { type: "teacher:start_question"; questionId?: string; startedAt?: number; timeLimitSeconds?: number }
  | { type: "teacher:update_settings"; settings: Partial<LiveDisplaySettings> }
  | { type: "teacher:reveal" }
  | { type: "teacher:next" }
  | { type: "teacher:end" }
  | { type: "student:answer"; questionId: string; choiceId?: string; answerText?: string; sentAt?: number };

export type ServerLiveMessage =
  | LiveStateMessage
  | { type: "question"; question: PublicLiveQuestion; startedAt: number; timeLimitSeconds: number }
  | { type: "answer:accepted"; questionId: string; points: number; isCorrect: boolean }
  | { type: "answer:rejected"; reason: "late" | "duplicate" | "invalid" | "too_early" }
  | { type: "reveal"; leaderboard: LeaderboardRow[] }
  | { type: "ended"; leaderboard: LeaderboardRow[] };

export type LeaderboardRow = {
  participantId: string;
  displayName: string;
  score: number;
  correctAnswers: number;
};

export type LiveDisplaySettings = {
  showLeaderboard: boolean;
  showStudentFeedback: boolean;
};

export type PublicLiveChoice = {
  id: string;
  label: string;
  symbol: string;
  color: "red" | "blue" | "green" | "yellow";
};

export type PublicLiveQuestion = {
  id: string;
  type: "multiple_choice" | "true_false" | "short_answer" | "reformulation" | "word_order" | "fill_blank" | "matching";
  prompt: string;
  mediaKey?: string | null;
  timeLimitSeconds: number;
  points: number;
  choices: PublicLiveChoice[];
};

export type LiveStateMessage = {
  type: "state";
  status: LiveStatus;
  participantCount: number;
  currentQuestionIndex: number;
  questionCount: number;
  currentQuestion: PublicLiveQuestion | null;
  questionStartedAt: number | null;
  answerCount: number;
  leaderboard: LeaderboardRow[];
  settings: LiveDisplaySettings;
  code?: string;
};

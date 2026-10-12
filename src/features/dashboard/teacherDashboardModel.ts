export type DashboardLiveSession = {
  id: string;
  quizTitle: string;
  code: string;
  status: string;
  participantCount: number;
  answerCount: number;
};

export function recentLiveSessions<T extends DashboardLiveSession>(sessions: T[], limit = 3) {
  return sessions.slice(0, Math.max(0, limit));
}

export function formatDashboardDate(value: string, locale: "fr" | "en") {
  const date = parseDashboardDate(value);
  if (!date) return value;

  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function parseDashboardDate(value: string) {
  const normalized = value.includes(" ") && !value.includes("T") ? value.replace(" ", "T") : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type DashboardQuizAccessInput = {
  status: "draft" | "published";
  visibility: "private" | "public" | "secret_link";
};

export type DashboardQuizAccessLabels = {
  draftClassReady: string;
  privateClassReady: string;
  publicPracticeReady: string;
  secretPracticeReady: string;
};

export function dashboardQuizAccessHint(quiz: DashboardQuizAccessInput, labels: DashboardQuizAccessLabels) {
  if (quiz.status === "draft") return labels.draftClassReady;
  if (quiz.visibility === "public") return labels.publicPracticeReady;
  if (quiz.visibility === "secret_link") return labels.secretPracticeReady;
  return labels.privateClassReady;
}

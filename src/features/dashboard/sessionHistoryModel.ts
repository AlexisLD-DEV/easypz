export type SessionHistoryItem = {
  id: string;
  quizTitle: string;
  code: string;
};

export function removeSessionFromHistory<T extends SessionHistoryItem>(sessions: T[], sessionId: string) {
  return sessions.filter((session) => session.id !== sessionId);
}

export function deleteSessionDialogContent(
  session: Pick<SessionHistoryItem, "quizTitle" | "code">,
  labels = {
    title: "Supprimer cet historique ?",
    body: "La session \"{title}\" (code {code}) et ses resultats seront supprimes. Le quiz reste disponible."
  }
) {
  return {
    title: labels.title,
    body: labels.body.replace("{title}", session.quizTitle).replace("{code}", session.code)
  };
}

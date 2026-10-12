const studentJoinMessages: Record<string, string> = {
  banned_name: "Ce prenom ne peut pas etre utilise.",
  name_required: "Entre ton prenom pour rejoindre le quiz.",
  rate_limited: "Trop de tentatives. Reessaie dans quelques minutes.",
  session_not_found: "Ce code de quiz est introuvable."
};

export function studentJoinErrorMessage(error: string, messages = studentJoinMessages, fallback = "Impossible de rejoindre le quiz pour le moment.") {
  return messages[error] ?? fallback;
}

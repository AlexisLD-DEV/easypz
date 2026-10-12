import type { SessionResults } from "./results";

type SessionSummaryEmailOptions = {
  to: string;
  resultsUrl: string;
};

export type SessionSummaryEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type EmailFetcher = (input: string, init?: RequestInit) => Promise<Response>;

type SendSessionSummaryEmailConfig = {
  apiKey?: string;
  from?: string;
  fetcher?: EmailFetcher;
};

export class SessionEmailError extends Error {
  constructor(public code: "email_not_configured" | "email_send_failed", public status = 503) {
    super(code);
  }
}

export function buildSessionSummaryEmail(results: SessionResults, options: SessionSummaryEmailOptions): SessionSummaryEmail {
  const subject = `Recap EasyPZ - ${results.session.quizTitle} (${results.session.code})`;
  const reviewQuestions = results.analysis.questionStats.filter((question) => question.needsReview);
  const leaderboard = results.participants.slice(0, 10);
  const escapedResultsUrl = escapeHtml(options.resultsUrl);

  const reviewItems = reviewQuestions.length > 0
    ? reviewQuestions.map((question) => `
      <li>
        <strong>Q${question.questionNumber} - ${escapeHtml(question.prompt)}</strong><br>
        Reussite: ${question.accuracyPercent}% - Erreurs: ${formatMistakes(question.frequentMistakes)}
      </li>
    `).join("")
    : "<li>Aucune question prioritaire a revoir.</li>";

  const leaderboardRows = leaderboard.length > 0
    ? leaderboard.map((participant, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(participant.displayName)}</td>
        <td>${participant.score} pts</td>
        <td>${participant.correctAnswers}/${results.summary.questionCount}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="4">Aucun eleve dans cette session.</td></tr>`;

  const html = `<!doctype html>
<html lang="fr">
  <body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
    <main style="max-width:720px;margin:0 auto;padding:24px;">
      <section style="background:#ffffff;border:1px solid #dbeafe;border-radius:8px;padding:22px;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#1d4ed8;">EasyPZ</p>
        <h1 style="margin:0 0 6px;font-size:26px;line-height:1.2;">${escapeHtml(results.session.quizTitle)}</h1>
        <p style="margin:0 0 20px;color:#475569;font-weight:700;">Session ${escapeHtml(results.session.code)} - ${escapeHtml(results.session.endedAt ?? results.session.createdAt)}</p>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:22px;">
          ${metric("Eleves", `${results.summary.participantCount} eleves`)}
          ${metric("Questions", String(results.summary.questionCount))}
          ${metric("Reponses", String(results.summary.answerCount))}
          ${metric("Score moyen", String(results.summary.averageScore))}
          ${metric("Reussite globale", `${results.analysis.accuracyPercent}%`)}
          ${metric("Participation", `${results.analysis.completionPercent}%`)}
        </div>
        <h2 style="margin:0 0 10px;font-size:18px;">Questions a revoir</h2>
        <ul style="margin:0 0 22px;padding-left:20px;line-height:1.55;">${reviewItems}</ul>
        <h2 style="margin:0 0 10px;font-size:18px;">Classement</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
          <thead>
            <tr>
              <th align="left" style="border-bottom:1px solid #dbeafe;padding:8px;">#</th>
              <th align="left" style="border-bottom:1px solid #dbeafe;padding:8px;">Eleve</th>
              <th align="left" style="border-bottom:1px solid #dbeafe;padding:8px;">Score</th>
              <th align="left" style="border-bottom:1px solid #dbeafe;padding:8px;">Bonnes reponses</th>
            </tr>
          </thead>
          <tbody>${leaderboardRows}</tbody>
        </table>
        <a href="${escapedResultsUrl}" style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;font-weight:800;border-radius:8px;padding:12px 16px;">Ouvrir les resultats complets</a>
      </section>
    </main>
  </body>
</html>`;

  const text = [
    `Recap EasyPZ - ${results.session.quizTitle}`,
    `Session: ${results.session.code}`,
    `Participants: ${results.summary.participantCount}`,
    `Questions: ${results.summary.questionCount}`,
    `Reponses: ${results.summary.answerCount}`,
    `Reussite globale: ${results.analysis.accuracyPercent}%`,
    `Participation: ${results.analysis.completionPercent}%`,
    `Questions a revoir: ${results.analysis.questionsToReviewCount}`,
    "",
    "Questions a revoir:",
    ...(reviewQuestions.length > 0
      ? reviewQuestions.map((question) => `Q${question.questionNumber} - ${question.prompt} (${question.accuracyPercent}%, ${formatMistakes(question.frequentMistakes)})`)
      : ["Aucune question prioritaire a revoir."]),
    "",
    "Classement:",
    ...(leaderboard.length > 0
      ? leaderboard.map((participant, index) => `${index + 1}. ${participant.displayName} - ${participant.score} pts - ${participant.correctAnswers}/${results.summary.questionCount}`)
      : ["Aucun eleve dans cette session."]),
    "",
    `Resultats complets: ${options.resultsUrl}`
  ].join("\n");

  return {
    to: options.to,
    subject,
    html,
    text
  };
}

export async function sendSessionSummaryEmail(config: SendSessionSummaryEmailConfig, email: SessionSummaryEmail) {
  const apiKey = config.apiKey?.trim();
  const from = config.from?.trim();
  if (!apiKey || !from) throw new SessionEmailError("email_not_configured");

  const fetcher = config.fetcher ?? fetch;
  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text
    })
  });
  const body = await response.json().catch(() => ({})) as { id?: string };
  if (!response.ok || !body.id) {
    throw new SessionEmailError("email_send_failed", response.status || 502);
  }
  return { id: body.id };
}

function metric(label: string, value: string) {
  return `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;">
      <span style="display:block;color:#64748b;font-size:12px;font-weight:800;text-transform:uppercase;">${label}</span>
      <strong style="display:block;margin-top:6px;font-size:20px;">${escapeHtml(value)}</strong>
    </div>
  `;
}

function formatMistakes(mistakes: Array<{ answer: string; count: number }>) {
  if (mistakes.length === 0) return "aucune erreur frequente";
  return mistakes.map((mistake) => `${mistake.answer} x${mistake.count}`).join(", ");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

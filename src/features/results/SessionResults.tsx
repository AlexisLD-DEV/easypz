import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { api } from "../../api/client";
import { userFacingErrorMessage } from "../../errorMessages";
import { useI18n } from "../../i18n/useI18n";
import { emailSummaryButtonLabel, emailSummaryStatusMessage } from "./sessionEmailModel";
import { primaryResultInsights, type PrimaryResultInsight } from "./sessionResultsViewModel";

type SessionResultsData = {
  session: {
    id: string;
    quizTitle: string;
    code: string;
    status: string;
    createdAt: string;
    startedAt: string | null;
    endedAt: string | null;
  };
  summary: {
    participantCount: number;
    questionCount: number;
    answerCount: number;
    averageScore: number;
  };
  analysis: {
    totalPossibleAnswers: number;
    completionPercent: number;
    accuracyPercent: number;
    questionsToReviewCount: number;
    questionStats: Array<{
      questionId: string;
      questionNumber: number;
      prompt: string;
      answerCount: number;
      correctCount: number;
      incorrectCount: number;
      unansweredCount: number;
      accuracyPercent: number;
      needsReview: boolean;
      frequentMistakes: Array<{ answer: string; count: number }>;
    }>;
  };
  participants: Array<{
    id: string;
    displayName: string;
    score: number;
    correctAnswers: number;
    answeredCount: number;
    answers: Array<{
      questionId: string;
      questionNumber: number;
      prompt: string;
      answer: string;
      isCorrect: boolean;
      points: number;
      responseMs: number | null;
    }>;
  }>;
};

type EmailSummaryResponse = {
  ok: boolean;
  to: string;
  providerId: string;
};

export function SessionResults({ sessionId }: { sessionId: string }) {
  const { locale, t } = useI18n();
  const [results, setResults] = useState<SessionResultsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailConfirmOpen, setEmailConfirmOpen] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    api<{ results: SessionResultsData }>(`/api/teacher/live-sessions/${encodeURIComponent(sessionId)}/results`)
      .then((data) => setResults(data.results))
      .catch((reason) => setError(userFacingErrorMessage(locale, reason)));
  }, [sessionId, locale]);

  if (error) return <p className="status-message error-message" role="alert">{error}</p>;
  if (!results) return <p className="status-message">{t("results.loading")}</p>;

  async function sendEmailSummary() {
    setEmailSending(true);
    setEmailError(null);
    setEmailSentTo(null);
    try {
      const response = await api<EmailSummaryResponse>(`/api/teacher/live-sessions/${encodeURIComponent(sessionId)}/email-summary`, {
        method: "POST",
        body: "{}"
      });
      setEmailSentTo(response.to);
      setEmailConfirmOpen(false);
    } catch (reason) {
      setEmailError(reason instanceof Error ? reason.message : "email_send_failed");
      setEmailConfirmOpen(false);
    } finally {
      setEmailSending(false);
    }
  }

  const emailStatus = emailSummaryStatusMessage({
    sentTo: emailSentTo,
    error: emailError
  }, {
    sent: t("results.emailSent"),
    notConfigured: t("results.emailNotConfigured"),
    failed: t("results.emailFailed")
  });
  const primaryInsights = primaryResultInsights({
    participantCount: results.summary.participantCount,
    averageScore: results.summary.averageScore,
    accuracyPercent: results.analysis.accuracyPercent,
    questionsToReviewCount: results.analysis.questionsToReviewCount
  });

  return (
    <section className="results-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t("results.session")} {results.session.code}</p>
          <h1>{results.session.quizTitle}</h1>
        </div>
        <div className="card-actions">
          <a className="button-link secondary-action" href="/dashboard">{t("results.dashboard")}</a>
          <a className="button-link" href={`/api/teacher/live-sessions/${encodeURIComponent(sessionId)}/export.csv`}>{t("results.exportCsv")}</a>
          <button className="secondary-action" type="button" onClick={() => window.print()}>
            {t("results.exportPdf")}
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={() => setEmailConfirmOpen(true)}
            disabled={emailSending}
          >
            <Mail size={16} />
            {emailSummaryButtonLabel({ sending: emailSending }, {
              send: t("results.emailSummary"),
              sending: t("results.emailSending")
            })}
          </button>
        </div>
      </header>

      {emailStatus ? (
        <p className={emailError ? "status-message error-message" : "status-message"} role={emailError ? "alert" : "status"}>
          {emailStatus}
        </p>
      ) : null}

      <div className="results-focus-grid">
        {primaryInsights.map((insight) => (
          <article key={insight.key}>
            <span>{resultInsightLabel(insight, t)}</span>
            <strong>{insight.value}</strong>
          </article>
        ))}
      </div>

      <section className="results-main-section">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">{t("results.afterClass")}</p>
            <h2>{t("results.studentResults")}</h2>
          </div>
          <span className="status-chip neutral-chip">{results.summary.answerCount} {t("results.answers")}</span>
        </div>
      </section>

      {results.participants.length === 0 ? (
        <section className="empty-state">
          <h2>{t("results.noStudentsTitle")}</h2>
          <p>{t("results.noStudentsBody")}</p>
        </section>
      ) : (
        <div className="participant-results">
          {results.participants.map((participant) => (
            <article className="participant-result-card" key={participant.id}>
              <div className="quiz-card-header">
                <div>
                  <p className="eyebrow">{t("results.student")}</p>
                  <h2>{participant.displayName}</h2>
                </div>
                <strong className="score-badge">{participant.score} pts</strong>
              </div>
              <dl className="quiz-meta">
                <div>
                  <dt>{t("results.correctAnswers")}</dt>
                  <dd>{participant.correctAnswers}</dd>
                </div>
                <div>
                  <dt>{t("results.answered")}</dt>
                  <dd>{participant.answeredCount} / {results.summary.questionCount}</dd>
                </div>
              </dl>
              <div className="table-wrapper">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>{t("results.question")}</th>
                      <th>{t("results.answer")}</th>
                      <th>{t("results.state")}</th>
                      <th>{t("results.points")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participant.answers.map((answer) => (
                      <tr key={answer.questionId}>
                        <td>
                          <strong>Q{answer.questionNumber}</strong>
                          <span>{answer.prompt}</span>
                        </td>
                        <td>{answer.answer || "-"}</td>
                        <td>{answer.answer ? answer.isCorrect ? t("results.correct") : t("results.incorrect") : t("results.notAnswered")}</td>
                        <td>{answer.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      )}

      <details className="results-details-panel">
        <summary>{t("results.detailedAnalysis")}</summary>
        <section className="class-analysis">
          <div className="analysis-summary-grid">
            <article>
              <span>{t("results.questions")}</span>
              <strong>{results.summary.questionCount}</strong>
            </article>
            <article>
              <span>{t("results.participation")}</span>
              <strong>{results.analysis.completionPercent}%</strong>
            </article>
            <article>
              <span>{t("results.answers")}</span>
              <strong>{results.summary.answerCount}</strong>
            </article>
          </div>
          <div className="question-analysis-grid">
            {results.analysis.questionStats.map((question) => (
              <article className={question.needsReview ? "question-analysis-card review-needed" : "question-analysis-card"} key={question.questionId}>
                <div className="quiz-card-header">
                  <div>
                    <p className="eyebrow">{t("results.question")} {question.questionNumber}</p>
                    <h3>{question.prompt}</h3>
                  </div>
                  <span className={question.needsReview ? "result-pill result-bad" : "result-pill result-good"}>
                    {question.needsReview ? t("results.questionsToReview") : "OK"}
                  </span>
                </div>
                <dl className="analysis-metrics">
                  <div>
                    <dt>{t("results.success")}</dt>
                    <dd>{question.accuracyPercent}%</dd>
                  </div>
                  <div>
                    <dt>{t("results.correct")}</dt>
                    <dd>{question.correctCount}</dd>
                  </div>
                  <div>
                    <dt>{t("results.incorrect")}</dt>
                    <dd>{question.incorrectCount}</dd>
                  </div>
                  <div>
                    <dt>{t("results.unanswered")}</dt>
                    <dd>{question.unansweredCount}</dd>
                  </div>
                </dl>
                <div className="frequent-mistakes">
                  <strong>{t("results.frequentMistakes")}</strong>
                  {question.frequentMistakes.length > 0 ? (
                    <ul>
                      {question.frequentMistakes.map((mistake) => (
                        <li key={mistake.answer}>
                          <span>{mistake.answer}</span>
                          <strong>{mistake.count}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{t("results.noFrequentMistakes")}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </details>

      {emailConfirmOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="email-summary-title">
            <div>
              <p className="eyebrow">{t("dashboard.confirmation")}</p>
              <h2 id="email-summary-title">{t("results.emailConfirmTitle")}</h2>
            </div>
            <p>{t("results.emailConfirmBody")}</p>
            <div className="dialog-actions">
              <button className="secondary-action" type="button" onClick={() => setEmailConfirmOpen(false)} disabled={emailSending}>
                {t("dashboard.cancel")}
              </button>
              <button type="button" onClick={() => void sendEmailSummary()} disabled={emailSending}>
                <Mail size={16} />
                {emailSummaryButtonLabel({ sending: emailSending }, {
                  send: t("results.emailSummary"),
                  sending: t("results.emailSending")
                })}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function resultInsightLabel(insight: PrimaryResultInsight, t: ReturnType<typeof useI18n>["t"]) {
  const labels: Record<PrimaryResultInsight["key"], Parameters<typeof t>[0]> = {
    students: "results.students",
    averageScore: "results.averageScore",
    successRate: "results.successRate",
    questionsToReview: "results.questionsToReview"
  };
  return t(labels[insight.key]);
}

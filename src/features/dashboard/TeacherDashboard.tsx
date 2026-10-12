import { useEffect, useState } from "react";
import { Copy, ExternalLink, Pencil, Play, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import { userFacingErrorMessage } from "../../errorMessages";
import { useI18n } from "../../i18n/useI18n";
import { practiceUrl } from "../practice/practiceAccess";
import { ClassAnalytics } from "../analytics/ClassAnalytics";
import { publicationState, type QuizPublicationLabels, type QuizPublicationState } from "./quizPublicationModel";
import { deleteSessionDialogContent, removeSessionFromHistory } from "./sessionHistoryModel";
import { dashboardQuizAccessHint, formatDashboardDate, recentLiveSessions } from "./teacherDashboardModel";

type TeacherQuiz = {
  id: string;
  title: string;
  description: string;
  visibility: "private" | "public" | "secret_link";
  status: "draft" | "published";
  slug: string;
  secret_token: string | null;
  updated_at: string;
  published_at: string | null;
};

type LiveSessionResponse = {
  teacherUrl: string;
};

type PublicationIntent = QuizPublicationState["actionIntent"];

type PublicationResponse = {
  quiz: Pick<TeacherQuiz, "id" | "visibility" | "status" | "secret_token" | "updated_at" | "published_at">;
};

type DuplicateQuizResponse = {
  quiz: TeacherQuiz;
};

type TeacherLiveSession = {
  id: string;
  quizTitle: string;
  code: string;
  status: "lobby" | "question" | "reveal" | "ended";
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  participantCount: number;
  answerCount: number;
};

export function TeacherDashboard() {
  const { locale, t } = useI18n();
  const [quizzes, setQuizzes] = useState<TeacherQuiz[]>([]);
  const [sessions, setSessions] = useState<TeacherLiveSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [startingQuizId, setStartingQuizId] = useState<string | null>(null);
  const [publishingQuizId, setPublishingQuizId] = useState<string | null>(null);
  const [duplicatingQuizId, setDuplicatingQuizId] = useState<string | null>(null);
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);
  const [quizPendingDelete, setQuizPendingDelete] = useState<TeacherQuiz | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [sessionPendingDelete, setSessionPendingDelete] = useState<TeacherLiveSession | null>(null);

  async function loadQuizzes() {
    const data = await api<{ quizzes: TeacherQuiz[] }>("/api/teacher/quizzes");
    setQuizzes(data.quizzes);
  }

  async function loadSessions() {
    const data = await api<{ sessions: TeacherLiveSession[] }>("/api/teacher/live-sessions");
    setSessions(data.sessions);
  }

  useEffect(() => {
    loadQuizzes().catch((reason) => setError(userFacingErrorMessage(locale, reason)));
    loadSessions().catch((reason) => setError(userFacingErrorMessage(locale, reason)));
  }, [locale]);

  async function startLiveSession(quizId: string) {
    setError(null);
    setMessage(null);
    setStartingQuizId(quizId);
    try {
      const session = await api<LiveSessionResponse>(`/api/teacher/quizzes/${encodeURIComponent(quizId)}/live-sessions`, {
        method: "POST",
        body: "{}"
      });
      window.location.href = session.teacherUrl;
    } catch (reason) {
      setError(userFacingErrorMessage(locale, reason));
    } finally {
      setStartingQuizId(null);
    }
  }

  async function updatePublication(quiz: TeacherQuiz, intent: PublicationIntent) {
    setError(null);
    setMessage(null);
    setPublishingQuizId(quiz.id);
    try {
      const data = await api<PublicationResponse>(`/api/teacher/quizzes/${encodeURIComponent(quiz.id)}/publication`, {
        method: "POST",
        body: JSON.stringify({ intent })
      });
      setQuizzes((current) => current.map((item) => (
        item.id === quiz.id ? { ...item, ...data.quiz } : item
      )));
    } catch (reason) {
      setError(userFacingErrorMessage(locale, reason));
    } finally {
      setPublishingQuizId(null);
    }
  }

  async function duplicateTeacherQuiz(quiz: TeacherQuiz) {
    setError(null);
    setMessage(null);
    setDuplicatingQuizId(quiz.id);
    try {
      const data = await api<DuplicateQuizResponse>(`/api/teacher/quizzes/${encodeURIComponent(quiz.id)}/duplicate`, {
        method: "POST",
        body: "{}"
      });
      setQuizzes((current) => [data.quiz, ...current]);
      setMessage(t("dashboard.copyCreated").replace("{title}", data.quiz.title));
    } catch (reason) {
      setError(userFacingErrorMessage(locale, reason));
    } finally {
      setDuplicatingQuizId(null);
    }
  }

  async function deleteTeacherQuiz() {
    if (!quizPendingDelete) return;

    setError(null);
    setMessage(null);
    setDeletingQuizId(quizPendingDelete.id);
    try {
      await api(`/api/teacher/quizzes/${encodeURIComponent(quizPendingDelete.id)}`, { method: "DELETE" });
      setQuizzes((current) => current.filter((quiz) => quiz.id !== quizPendingDelete.id));
      await loadSessions();
      setQuizPendingDelete(null);
    } catch (reason) {
      setError(userFacingErrorMessage(locale, reason));
    } finally {
      setDeletingQuizId(null);
    }
  }

  async function deleteLiveSession() {
    if (!sessionPendingDelete) return;

    setError(null);
    setMessage(null);
    setDeletingSessionId(sessionPendingDelete.id);
    try {
      await api(`/api/teacher/live-sessions/${encodeURIComponent(sessionPendingDelete.id)}`, { method: "DELETE" });
      setSessions((current) => removeSessionFromHistory(current, sessionPendingDelete.id));
      setSessionPendingDelete(null);
    } catch (reason) {
      setError(userFacingErrorMessage(locale, reason));
    } finally {
      setDeletingSessionId(null);
    }
  }

  const deleteDialog = sessionPendingDelete ? deleteSessionDialogContent(sessionPendingDelete, {
    title: t("dashboard.deleteHistoryTitle"),
    body: t("dashboard.deleteHistoryBody")
  }) : null;
  const publicationLabels: QuizPublicationLabels = {
    visibleGallery: t("publication.visibleGallery"),
    visibleGalleryDetail: t("publication.visibleGalleryDetail"),
    removeFromGallery: t("publication.removeFromGallery"),
    switchToSecret: t("publication.switchToSecret"),
    secretActive: t("publication.secretActive"),
    secretActiveDetail: t("publication.secretActiveDetail"),
    disable: t("publication.disable"),
    publishGallery: t("publication.publishGallery"),
    notVisible: t("publication.notVisible"),
    publishSecret: t("publication.publishSecret"),
    draftDetail: t("publication.draftDetail"),
    privateDetail: t("publication.privateDetail"),
    secretOnlyDetail: t("publication.secretOnlyDetail"),
    mustBePublicDetail: t("publication.mustBePublicDetail")
  };
  const statusLabels: Record<TeacherQuiz["status"], string> = {
    draft: t("dashboard.statusDraft"),
    published: t("dashboard.statusPublished")
  };
  const visibilityLabels: Record<TeacherQuiz["visibility"], string> = {
    private: t("dashboard.visibilityPrivate"),
    public: t("dashboard.visibilityPublic"),
    secret_link: t("dashboard.visibilitySecret")
  };
  const liveStatusLabels: Record<TeacherLiveSession["status"], string> = {
    lobby: t("dashboard.liveLobby"),
    question: t("dashboard.liveQuestion"),
    reveal: t("dashboard.liveReveal"),
    ended: t("dashboard.liveEnded")
  };
  const recentSessions = recentLiveSessions(sessions, 3);
  const accessHintLabels = {
    draftClassReady: t("dashboard.draftClassReady"),
    privateClassReady: t("dashboard.privateClassReady"),
    publicPracticeReady: t("dashboard.publicPracticeReady"),
    secretPracticeReady: t("dashboard.secretPracticeReady")
  };

  return (
    <section className="dashboard-page">
      <header className="page-header teacher-home-header">
        <div>
          <p className="eyebrow">{t("dashboard.eyebrow")}</p>
          <h1>{t("dashboard.launchTitle")}</h1>
          <p className="page-subtitle">{t("dashboard.launchSubtitle")}</p>
        </div>
        <div className="teacher-header-actions">
          <a className="button-link" href="/editor?quick=1">{t("dashboard.quickCreate")}</a>
          <a className="button-link secondary-action" href="/editor">{t("dashboard.createQuiz")}</a>
        </div>
      </header>

      {error ? <p className="status-message error-message" role="alert">{error}</p> : null}
      {message ? <p className="status-message" role="status">{message}</p> : null}

      <div className="teacher-cockpit-grid">
        <section className="launch-panel" id="launch">
          <header className="section-title-row">
            <div>
              <p className="eyebrow">{t("dashboard.teacherCockpit")}</p>
              <h2>{t("dashboard.readyQuizzes")}</h2>
            </div>
            <a className="button-link secondary-action" href="/editor">{t("dashboard.createQuiz")}</a>
          </header>

          {quizzes.length === 0 ? (
            <section className="empty-state compact-empty" aria-label={t("dashboard.onboardingLabel")}>
              <h2>{t("dashboard.noQuizTitle")}</h2>
              <p>{t("dashboard.noQuizBody")}</p>
              <ol className="first-quiz-steps">
                <li><strong>{t("dashboard.onboardingStep1Title")}</strong> <span>{t("dashboard.onboardingStep1Body")}</span></li>
                <li><strong>{t("dashboard.onboardingStep2Title")}</strong> <span>{t("dashboard.onboardingStep2Body")}</span></li>
                <li><strong>{t("dashboard.onboardingStep3Title")}</strong> <span>{t("dashboard.onboardingStep3Body")}</span></li>
              </ol>
              <a className="button-link" href="/editor">{t("dashboard.createFirstQuiz")}</a>
            </section>
          ) : (
            <div className="quiz-launch-list">
              {quizzes.map((quiz) => {
                const publication = publicationState(quiz, publicationLabels);
                return (
                  <article className="quiz-launch-card" key={quiz.id}>
                    <div className="quiz-card-header">
                      <div>
                        <p className="eyebrow">{t("dashboard.quiz")}</p>
                        <h2>{quiz.title}</h2>
                      </div>
                      <div className="status-row">
                        <span className={publication.isVisibleInGallery ? "status-chip success-chip" : "status-chip"}>{statusLabels[quiz.status]}</span>
                        <span className="status-chip neutral-chip">{visibilityLabels[quiz.visibility]}</span>
                      </div>
                    </div>
                    {quiz.description ? <p className="quiz-description">{quiz.description}</p> : null}
                    <p className="quiz-access-hint">{dashboardQuizAccessHint(quiz, accessHintLabels)}</p>
                    <dl className="quiz-meta compact-meta">
                      <div>
                        <dt>{t("dashboard.updatedAt")}</dt>
                        <dd>{formatDashboardDate(quiz.updated_at, locale)}</dd>
                      </div>
                      <div>
                        <dt>{t("dashboard.visibility")}</dt>
                        <dd>{visibilityLabels[quiz.visibility]}</dd>
                      </div>
                    </dl>
                    <div className="quiz-launch-actions">
                      <button type="button" className="primary-action" onClick={() => void startLiveSession(quiz.id)} disabled={startingQuizId === quiz.id}>
                        <Play size={18} />
                        {startingQuizId === quiz.id ? t("dashboard.opening") : t("dashboard.startQuiz")}
                      </button>
                      <a className="icon-button" href={`/editor?id=${encodeURIComponent(quiz.id)}`} title={t("dashboard.edit")} aria-label={t("dashboard.edit")}>
                        <Pencil size={18} />
                      </a>
                      <button
                        className="icon-button danger-action"
                        type="button"
                        onClick={() => setQuizPendingDelete(quiz)}
                        title={t("dashboard.delete")}
                        aria-label={t("dashboard.delete")}
                        disabled={deletingQuizId === quiz.id}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <details className="dashboard-details">
                      <summary>{t("dashboard.publicationDetails")}</summary>
                      <div className={publication.isVisibleInGallery ? "publication-panel publication-panel-visible" : "publication-panel"}>
                        <div>
                          <p className="eyebrow">{t("dashboard.publicGallery")}</p>
                          <h3>{publication.label}</h3>
                          <p>{publication.detail}</p>
                        </div>
                        <div className="publication-actions">
                          {publication.isVisibleInGallery ? (
                            <a className="button-link secondary-action" href={practiceUrl({ kind: "public", slug: quiz.slug })}>
                              <ExternalLink size={16} />
                              {t("dashboard.view")}
                            </a>
                          ) : null}
                          {publication.isSecretLinkPublished && quiz.secret_token ? (
                            <a className="button-link secondary-action" href={practiceUrl({ kind: "secret", token: quiz.secret_token })}>
                              <ExternalLink size={16} />
                              {t("dashboard.secretLink")}
                            </a>
                          ) : null}
                          <button
                            className={publication.isVisibleInGallery ? "secondary-action" : ""}
                            type="button"
                            onClick={() => void updatePublication(quiz, publication.actionIntent)}
                            disabled={publishingQuizId === quiz.id}
                          >
                            {publishingQuizId === quiz.id ? t("dashboard.updating") : publication.actionLabel}
                          </button>
                          {publication.secondaryActionIntent ? (
                            <button
                              className="secondary-action"
                              type="button"
                              onClick={() => void updatePublication(quiz, publication.secondaryActionIntent!)}
                              disabled={publishingQuizId === quiz.id}
                            >
                              {publication.secondaryActionLabel}
                            </button>
                          ) : null}
                          <button
                            className="secondary-action"
                            type="button"
                            onClick={() => void duplicateTeacherQuiz(quiz)}
                            disabled={duplicatingQuizId === quiz.id}
                          >
                            <Copy size={16} />
                            {duplicatingQuizId === quiz.id ? t("dashboard.duplicating") : t("dashboard.duplicate")}
                          </button>
                        </div>
                      </div>
                    </details>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="recent-results-panel">
          <header className="section-title-row">
            <div>
              <p className="eyebrow">{t("dashboard.afterClass")}</p>
              <h2>{t("dashboard.recentResults")}</h2>
            </div>
            <a className="button-link secondary-action" href="#results">{t("dashboard.allResults")}</a>
          </header>
          {recentSessions.length === 0 ? (
            <section className="empty-state compact-empty">
              <h2>{t("dashboard.noSessionTitle")}</h2>
              <p>{t("dashboard.noSessionBody")}</p>
            </section>
          ) : (
            <div className="recent-results-list">
              {recentSessions.map((session) => (
                <article className="recent-result-card" key={`recent-${session.id}`}>
                  <div>
                    <p className="eyebrow">{t("dashboard.code")} {session.code}</p>
                    <h3>{session.quizTitle}</h3>
                  </div>
                  <span className="status-chip">{liveStatusLabels[session.status] ?? session.status}</span>
                  <p className="session-date">{formatDashboardDate(session.createdAt, locale)}</p>
                  <dl className="quiz-meta">
                    <div>
                      <dt>{t("dashboard.students")}</dt>
                      <dd>{session.participantCount}</dd>
                    </div>
                    <div>
                      <dt>{t("dashboard.answers")}</dt>
                      <dd>{session.answerCount}</dd>
                    </div>
                  </dl>
                  <a className="button-link secondary-action" href={`/sessions/${encodeURIComponent(session.id)}/results`}>{t("dashboard.results")}</a>
                </article>
              ))}
            </div>
          )}
        </aside>
      </div>

      <section className="dashboard-section" id="results">
        <header className="section-title-row">
          <div>
            <p className="eyebrow">{t("dashboard.afterClass")}</p>
            <h2>{t("dashboard.history")}</h2>
          </div>
        </header>

        {sessions.length === 0 ? (
          <section className="empty-state compact-empty">
            <h2>{t("dashboard.noSessionTitle")}</h2>
            <p>{t("dashboard.noSessionBody")}</p>
          </section>
        ) : (
          <div className="session-history-list">
            {sessions.map((session) => (
              <article className="session-history-card" key={session.id}>
                <div>
                  <p className="eyebrow">{t("dashboard.code")} {session.code}</p>
                  <h3>{session.quizTitle}</h3>
                </div>
                <span className="status-chip">{liveStatusLabels[session.status] ?? session.status}</span>
                <p className="session-date">{formatDashboardDate(session.createdAt, locale)}</p>
                <dl className="quiz-meta">
                  <div>
                    <dt>{t("dashboard.students")}</dt>
                    <dd>{session.participantCount}</dd>
                  </div>
                  <div>
                    <dt>{t("dashboard.answers")}</dt>
                    <dd>{session.answerCount}</dd>
                  </div>
                </dl>
                <div className="card-actions session-card-actions">
                  <a className="button-link secondary-action" href={`/sessions/${encodeURIComponent(session.id)}/results`}>{t("dashboard.results")}</a>
                  <a className="button-link secondary-action" href={`/api/teacher/live-sessions/${encodeURIComponent(session.id)}/export.csv`}>{t("dashboard.csv")}</a>
                  <button
                    className="danger-action"
                    type="button"
                    onClick={() => setSessionPendingDelete(session)}
                    disabled={deletingSessionId === session.id}
                  >
                    {deletingSessionId === session.id ? t("dashboard.deleting") : t("dashboard.delete")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-section" id="analytics">
        <ClassAnalytics />
      </section>

      {quizPendingDelete ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-quiz-title">
            <div>
              <p className="eyebrow">{t("dashboard.confirmation")}</p>
              <h2 id="delete-quiz-title">{t("dashboard.deleteQuizTitle")}</h2>
            </div>
            <p>{t("dashboard.deleteQuizBody").replace("{title}", quizPendingDelete.title)}</p>
            <div className="dialog-actions">
              <button className="secondary-action" type="button" onClick={() => setQuizPendingDelete(null)} disabled={deletingQuizId === quizPendingDelete.id}>
                {t("dashboard.cancel")}
              </button>
              <button className="danger-action" type="button" onClick={() => void deleteTeacherQuiz()} disabled={deletingQuizId === quizPendingDelete.id}>
                {deletingQuizId === quizPendingDelete.id ? t("dashboard.deleting") : t("dashboard.delete")}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {sessionPendingDelete && deleteDialog ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-session-title">
            <div>
              <p className="eyebrow">{t("dashboard.confirmation")}</p>
              <h2 id="delete-session-title">{deleteDialog.title}</h2>
            </div>
            <p>{deleteDialog.body}</p>
            <div className="dialog-actions">
              <button className="secondary-action" type="button" onClick={() => setSessionPendingDelete(null)} disabled={deletingSessionId === sessionPendingDelete.id}>
                {t("dashboard.cancel")}
              </button>
              <button className="danger-action" type="button" onClick={() => void deleteLiveSession()} disabled={deletingSessionId === sessionPendingDelete.id}>
                {deletingSessionId === sessionPendingDelete.id ? t("dashboard.deleting") : t("dashboard.delete")}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

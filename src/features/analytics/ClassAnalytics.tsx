import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { userFacingErrorMessage } from "../../errorMessages";
import { useI18n } from "../../i18n/useI18n";

type StudentRow = {
  name: string;
  sessions: number;
  totalScore: number;
  avgScore: number;
  bestScore: number;
  correctAnswers: number;
};

type QuizRow = {
  quizId: string;
  quizTitle: string;
  sessions: number;
  participants: number;
};

type AnalyticsResponse = { students: StudentRow[]; quizzes: QuizRow[] };

export function ClassAnalytics() {
  const { locale, t } = useI18n();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<AnalyticsResponse>("/api/teacher/analytics")
      .then((payload) => { if (!cancelled) setData(payload); })
      .catch((reason: Error) => { if (!cancelled) setError(userFacingErrorMessage(locale, reason)); });
    return () => { cancelled = true; };
  }, [locale]);

  if (error) return <p className="status-message error-message" role="alert">{error}</p>;
  if (!data) return <p className="status-message">{t("analytics.loading")}</p>;

  return (
    <section className="analytics-panel" aria-label={t("analytics.title")}>
      <header className="section-title-row">
        <div>
          <p className="eyebrow">{t("analytics.teacherView")}</p>
          <h2>{t("analytics.title")}</h2>
        </div>
      </header>

      {data.students.length === 0 ? (
        <section className="empty-state compact-empty">
          <h2>{t("analytics.noDataTitle")}</h2>
          <p>{t("analytics.noDataBody")}</p>
        </section>
      ) : (
        <>
          <div className="analytics-grid">
            <div>
              <h3>{t("analytics.students")}</h3>
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>{t("analytics.name")}</th>
                    <th>{t("analytics.sessions")}</th>
                    <th>{t("analytics.avgScore")}</th>
                    <th>{t("analytics.bestScore")}</th>
                    <th>{t("analytics.total")}</th>
                    <th>{t("analytics.correct")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((student) => (
                    <tr key={student.name}>
                      <td>{student.name}</td>
                      <td>{student.sessions}</td>
                      <td>{student.avgScore}</td>
                      <td>{student.bestScore}</td>
                      <td>{student.totalScore}</td>
                      <td>{student.correctAnswers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h3>{t("analytics.byQuiz")}</h3>
              {data.quizzes.length === 0 ? (
                <p>{t("analytics.noQuizzes")}</p>
              ) : (
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>{t("analytics.quiz")}</th>
                      <th>{t("analytics.sessionsShort")}</th>
                      <th>{t("analytics.participants")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.quizzes.map((quiz) => (
                      <tr key={quiz.quizId}>
                        <td>{quiz.quizTitle}</td>
                        <td>{quiz.sessions}</td>
                        <td>{quiz.participants}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

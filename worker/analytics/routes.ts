import { requireUser } from "../auth/guards";
import type { Env } from "../env";
import { json } from "../http/response";

type StudentRow = {
  name_key: string;
  sessions: number;
  total_score: number;
  avg_score: number;
  best_score: number;
  correct_answers: number;
};

type QuizRow = {
  quiz_id: string;
  quiz_title: string;
  sessions: number;
  participants: number;
};

/**
 * Class-level analytics for a teacher, aggregated across all their live
 * sessions. Students are identified by their normalised display name, since
 * live participants do not have account identities yet.
 */
export async function getTeacherAnalytics(request: Request, env: Env) {
  const user = await requireUser(request, env);

  const students = await env.DB.prepare(
    `SELECT
       COALESCE(name_key, LOWER(TRIM(display_name))) AS name_key,
       COUNT(DISTINCT s.id) AS sessions,
       COALESCE(SUM(p.score), 0) AS total_score,
       CAST(COALESCE(AVG(p.score), 0) AS REAL) AS avg_score,
       COALESCE(MAX(p.score), 0) AS best_score,
       COALESCE(
         (SELECT COUNT(*) FROM live_answers a WHERE a.participant_id IN (
           SELECT p2.id FROM live_participants p2
           JOIN live_sessions s2 ON s2.id = p2.session_id
           WHERE s2.teacher_id = ? AND COALESCE(p2.name_key, LOWER(TRIM(p2.display_name))) = COALESCE(p.name_key, LOWER(TRIM(p.display_name)))
         ) AND a.is_correct = 1),
         0) AS correct_answers
     FROM live_participants p
     JOIN live_sessions s ON s.id = p.session_id
     WHERE s.teacher_id = ?
     GROUP BY name_key
     ORDER BY total_score DESC, avg_score DESC, name_key ASC
     LIMIT 200`
  ).bind(user.id, user.id).all<StudentRow>();

  const quizzes = await env.DB.prepare(
    `SELECT
       s.quiz_id,
       COALESCE(q.title, 'Supprimé') AS quiz_title,
       COUNT(DISTINCT s.id) AS sessions,
       COUNT(DISTINCT p.id) AS participants
     FROM live_sessions s
     JOIN live_participants p ON p.session_id = s.id
     LEFT JOIN quizzes q ON q.id = s.quiz_id
     WHERE s.teacher_id = ?
     GROUP BY s.quiz_id
     ORDER BY sessions DESC`
  ).bind(user.id).all<QuizRow>();

  return json({
    students: students.results.map((row) => ({
      name: row.name_key,
      sessions: row.sessions,
      totalScore: row.total_score,
      avgScore: Math.round(row.avg_score),
      bestScore: row.best_score,
      correctAnswers: row.correct_answers
    })),
    quizzes: quizzes.results.map((row) => ({
      quizId: row.quiz_id,
      quizTitle: row.quiz_title,
      sessions: row.sessions,
      participants: row.participants
    }))
  });
}

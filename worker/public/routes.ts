import type { Env } from "../env";
import { HttpError, json } from "../http/response";

export async function listPublicQuizzes(_request: Request, env: Env) {
  const rows = await env.DB.prepare(
    `SELECT quizzes.id, quizzes.title, quizzes.description, quizzes.primary_language, quizzes.level, quizzes.tags_json, quizzes.slug, users.email AS author_email, COUNT(questions.id) AS question_count, GROUP_CONCAT(DISTINCT questions.type) AS question_types,
       (SELECT COUNT(question_choices.id) FROM question_choices JOIN questions AS choice_questions ON choice_questions.id = question_choices.question_id WHERE choice_questions.quiz_id = quizzes.id) AS choice_count,
       (SELECT media_key FROM questions AS cover_questions WHERE cover_questions.quiz_id = quizzes.id AND cover_questions.media_key IS NOT NULL ORDER BY cover_questions.order_index ASC LIMIT 1) AS cover_media_key
     FROM quizzes
     JOIN users ON users.id = quizzes.owner_id
     LEFT JOIN questions ON questions.quiz_id = quizzes.id
     WHERE quizzes.visibility = 'public' AND quizzes.status = 'published'
     GROUP BY quizzes.id
     ORDER BY quizzes.published_at DESC`
  ).all();
  return json({ quizzes: rows.results });
}

export async function getPublicQuiz(_request: Request, env: Env, slug: string) {
  return getPublishedQuizByAccess(env, { column: "slug", value: slug, visibility: "public" });
}

export async function getSecretQuiz(_request: Request, env: Env, token: string) {
  return getPublishedQuizByAccess(env, { column: "secret_token", value: token, visibility: "secret_link" });
}

async function getPublishedQuizByAccess(
  env: Env,
  access: { column: "slug" | "secret_token"; value: string; visibility: "public" | "secret_link" }
) {
  const quiz = await env.DB.prepare(
    `SELECT id, title, description, primary_language, level, tags_json, slug, default_time_limit_seconds, show_correction, speed_scoring, exam_mode
     FROM quizzes
     WHERE ${access.column} = ? AND visibility = ? AND status = 'published'`
  ).bind(access.value, access.visibility).first<{ id: string }>();
  if (!quiz) throw new HttpError(404, "quiz_not_found");
  const questions = await env.DB.prepare(
    "SELECT id, type, order_index, prompt, media_key, time_limit_seconds, points, explanation FROM questions WHERE quiz_id = ? ORDER BY order_index ASC"
  ).bind(quiz.id).all<{ id: string }>();
  const choices = await env.DB.prepare(
    `SELECT question_choices.id, question_choices.question_id, question_choices.order_index, question_choices.label
     FROM question_choices
     JOIN questions ON questions.id = question_choices.question_id
     WHERE questions.quiz_id = ?
     ORDER BY questions.order_index ASC, question_choices.order_index ASC`
  ).bind(quiz.id).all();
  return json({ quiz, questions: questions.results, choices: choices.results });
}

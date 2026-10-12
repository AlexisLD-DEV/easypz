import type { Env } from "../env";
import { HttpError, json } from "../http/response";
import { isCorrectFillBlankAnswer } from "../live/fillBlank";
import { isCorrectMatchingAnswer } from "../live/matching";
import { isAcceptedShortAnswer, scoreAnswer } from "../live/scoring";
import { isCorrectWordOrderAnswer } from "../live/wordOrder";
import { buildPracticeCorrection, parseAcceptedAnswers } from "./correction";

type QuestionRow = {
  id: string;
  quiz_id: string;
  type: "multiple_choice" | "true_false" | "short_answer" | "reformulation" | "word_order" | "fill_blank" | "matching";
  accepted_answers_json: string;
  explanation: string;
  time_limit_seconds: number;
  points: number;
  completed_at: string | null;
  exam_mode: number;
};

type ChoiceRow = {
  id: string;
  label: string;
  is_correct: number;
};

export async function startPracticeAttempt(_request: Request, env: Env, slug: string) {
  return startPracticeAttemptByAccess(env, { column: "slug", value: slug, visibility: "public" });
}

export async function startSecretPracticeAttempt(_request: Request, env: Env, token: string) {
  return startPracticeAttemptByAccess(env, { column: "secret_token", value: token, visibility: "secret_link" });
}

async function startPracticeAttemptByAccess(
  env: Env,
  access: { column: "slug" | "secret_token"; value: string; visibility: "public" | "secret_link" }
) {
  const quiz = await env.DB.prepare(
    `SELECT id FROM quizzes WHERE ${access.column} = ? AND visibility = ? AND status = 'published'`
  ).bind(access.value, access.visibility).first<{ id: string }>();
  if (!quiz) throw new HttpError(404, "quiz_not_found");
  const attemptId = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO practice_attempts (id, quiz_id) VALUES (?, ?)").bind(attemptId, quiz.id).run();
  return json({ attemptId });
}

export async function submitPracticeAnswer(request: Request, env: Env, attemptId: string) {
  const body = await request.json<{ questionId: string; choiceId?: string; answerText?: string; responseMs?: number }>();
  const question = await env.DB.prepare(
    `SELECT questions.*
            , practice_attempts.completed_at
            , quizzes.exam_mode
     FROM questions
     JOIN practice_attempts ON practice_attempts.quiz_id = questions.quiz_id
     JOIN quizzes ON quizzes.id = questions.quiz_id
     WHERE practice_attempts.id = ? AND questions.id = ?`
  ).bind(attemptId, body.questionId).first<QuestionRow>();
  if (!question) throw new HttpError(404, "question_not_found");
  if (question.completed_at) throw new HttpError(409, "practice_attempt_finished");

  const choices = await env.DB.prepare("SELECT id, label, is_correct FROM question_choices WHERE question_id = ? ORDER BY order_index ASC")
    .bind(question.id)
    .all<ChoiceRow>();

  let isCorrect = false;
  if (question.type === "short_answer" || question.type === "reformulation") {
    const accepted = parseAcceptedAnswers(question.accepted_answers_json);
    isCorrect = isAcceptedShortAnswer(body.answerText ?? "", accepted);
  } else if (question.type === "fill_blank") {
    const accepted = parseAcceptedAnswers(question.accepted_answers_json);
    isCorrect = isCorrectFillBlankAnswer(body.answerText ?? "", accepted);
  } else if (question.type === "matching") {
    isCorrect = isCorrectMatchingAnswer(body.answerText ?? "", choices.results);
  } else if (question.type === "word_order") {
    isCorrect = isCorrectWordOrderAnswer(body.answerText ?? "", choices.results);
  } else if (body.choiceId) {
    const choice = await env.DB.prepare("SELECT is_correct FROM question_choices WHERE id = ? AND question_id = ?").bind(body.choiceId, question.id).first<{ is_correct: number }>();
    isCorrect = choice?.is_correct === 1;
  }

  const points = scoreAnswer(isCorrect, body.responseMs ?? question.time_limit_seconds * 1000, question.time_limit_seconds, question.points);
  const existingAnswer = await env.DB.prepare(
    "SELECT id FROM practice_answers WHERE attempt_id = ? AND question_id = ?"
  ).bind(attemptId, question.id).first<{ id: string }>();
  if (existingAnswer) throw new HttpError(409, "duplicate_answer");

  const insert = await env.DB.prepare(
    `INSERT OR IGNORE INTO practice_answers (id, attempt_id, question_id, answer_text, choice_id, is_correct, points, response_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), attemptId, question.id, body.answerText ?? null, body.choiceId ?? null, isCorrect ? 1 : 0, points, body.responseMs ?? 0).run();
  if (insert.meta.changes === 0) throw new HttpError(409, "duplicate_answer");
  await env.DB.prepare(
    "UPDATE practice_attempts SET score = score + ?, total_points = total_points + ? WHERE id = ?"
  ).bind(points, question.points, attemptId).run();
  return json({
    isCorrect,
    points,
    correction: question.exam_mode === 1 ? null : buildPracticeCorrection(question, choices.results)
  });
}

export async function finishPracticeAttempt(_request: Request, env: Env, attemptId: string) {
  await env.DB.prepare("UPDATE practice_attempts SET completed_at = CURRENT_TIMESTAMP WHERE id = ?").bind(attemptId).run();
  const attempt = await env.DB.prepare("SELECT id, score, total_points, completed_at FROM practice_attempts WHERE id = ?").bind(attemptId).first();
  if (!attempt) throw new HttpError(404, "attempt_not_found");
  return json({ attempt });
}

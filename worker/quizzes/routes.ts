import type { Env } from "../env";
import { requireUser } from "../auth/guards";
import { randomToken } from "../auth/password";
import { HttpError, json } from "../http/response";
import { publicationIntentSchema, quizInputSchema, type QuizInput } from "./validation";
import { publicationPatchForIntent } from "./publication";
import { buildDuplicateQuizMetadata, slugify } from "./duplicate";

type QuestionInput = QuizInput["questions"][number];

type QuizRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  primary_language: string;
  level: string;
  tags_json: string;
  visibility: string;
  status: string;
  slug: string;
  secret_token: string | null;
  default_time_limit_seconds: number;
  show_correction: number;
  speed_scoring: number;
  published_at: string | null;
};

type QuestionRow = {
  id: string;
  type: string;
  order_index: number;
  prompt: string;
  media_key: string | null;
  time_limit_seconds: number;
  points: number;
  explanation: string;
  accepted_answers_json: string;
};

type ChoiceRow = {
  question_id: string;
  order_index: number;
  label: string;
  is_correct: number;
};

function publicFields(input: QuizInput) {
  return {
    title: input.title,
    description: input.description,
    primaryLanguage: input.primaryLanguage,
    level: input.level,
    tagsJson: JSON.stringify(input.tags),
    visibility: input.visibility,
    status: input.status,
    defaultTimeLimitSeconds: input.defaultTimeLimitSeconds,
    showCorrection: input.showCorrection ? 1 : 0,
    speedScoring: input.speedScoring ? 1 : 0,
    examMode: input.examMode ? 1 : 0,
    publishedAt: input.status === "published" ? new Date().toISOString() : null
  };
}

export async function listTeacherQuizzes(request: Request, env: Env) {
  const user = await requireUser(request, env);
  const result = await env.DB.prepare(
    `SELECT id, title, description, primary_language, level, tags_json, visibility, status, slug, secret_token, updated_at, published_at
     FROM quizzes
     WHERE owner_id = ?
     ORDER BY updated_at DESC`
  ).bind(user.id).all();
  return json({ quizzes: result.results });
}

export async function getTeacherQuiz(request: Request, env: Env, quizId: string) {
  const user = await requireUser(request, env);
  return json(await readOwnedQuiz(env, user.id, quizId));
}

export async function createQuiz(request: Request, env: Env) {
  const user = await requireUser(request, env);
  const input = quizInputSchema.parse(await request.json());
  const quizId = crypto.randomUUID();
  const slug = `${slugify(input.title)}-${randomToken(5)}`;
  const secret = input.visibility === "secret_link" ? randomToken(24) : null;
  const fields = publicFields(input);
  await env.DB.prepare(
    `INSERT INTO quizzes (id, owner_id, title, description, primary_language, level, tags_json, visibility, status, slug, secret_token, default_time_limit_seconds, show_correction, speed_scoring, exam_mode, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    quizId,
    user.id,
    fields.title,
    fields.description,
    fields.primaryLanguage,
    fields.level,
    fields.tagsJson,
    fields.visibility,
    fields.status,
    slug,
    secret,
    fields.defaultTimeLimitSeconds,
    fields.showCorrection,
    fields.speedScoring,
    fields.examMode,
    fields.publishedAt
  ).run();
  await replaceQuestions(env, quizId, input.questions);
  return json({ id: quizId, slug, secretToken: secret });
}

export async function updateQuiz(request: Request, env: Env, quizId: string) {
  const user = await requireUser(request, env);
  const existing = await env.DB.prepare("SELECT id, secret_token FROM quizzes WHERE id = ? AND owner_id = ?").bind(quizId, user.id).first<{ id: string; secret_token: string | null }>();
  if (!existing) throw new HttpError(404, "quiz_not_found");
  const input = quizInputSchema.parse(await request.json());
  const fields = publicFields(input);
  const secret = input.visibility === "secret_link" ? existing.secret_token ?? randomToken(24) : null;
  await env.DB.prepare(
    `UPDATE quizzes
     SET title = ?, description = ?, primary_language = ?, level = ?, tags_json = ?, visibility = ?, status = ?, secret_token = ?,
         default_time_limit_seconds = ?, show_correction = ?, speed_scoring = ?, exam_mode = ?, published_at = COALESCE(published_at, ?), updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND owner_id = ?`
  ).bind(
    fields.title,
    fields.description,
    fields.primaryLanguage,
    fields.level,
    fields.tagsJson,
    fields.visibility,
    fields.status,
    secret,
    fields.defaultTimeLimitSeconds,
    fields.showCorrection,
    fields.speedScoring,
    fields.examMode,
    fields.publishedAt,
    quizId,
    user.id
  ).run();
  await replaceQuestions(env, quizId, input.questions);
  return json({ id: quizId, secretToken: secret });
}

export async function updateQuizPublication(request: Request, env: Env, quizId: string) {
  const user = await requireUser(request, env);
  const input = publicationIntentSchema.parse(await request.json());
  const existing = await env.DB.prepare("SELECT id, published_at, secret_token FROM quizzes WHERE id = ? AND owner_id = ?")
    .bind(quizId, user.id)
    .first<{ id: string; published_at: string | null; secret_token: string | null }>();
  if (!existing) throw new HttpError(404, "quiz_not_found");

  const patch = publicationPatchForIntent(existing, input.intent, new Date().toISOString(), () => randomToken(24));
  await env.DB.prepare(
    `UPDATE quizzes
     SET visibility = ?, status = ?, secret_token = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND owner_id = ?`
  ).bind(
    patch.visibility,
    patch.status,
    patch.secretToken,
    patch.publishedAt,
    quizId,
    user.id
  ).run();

  const updated = await env.DB.prepare("SELECT id, visibility, status, secret_token, updated_at, published_at FROM quizzes WHERE id = ? AND owner_id = ?")
    .bind(quizId, user.id)
    .first<{ id: string; visibility: string; status: string; secret_token: string | null; updated_at: string; published_at: string | null }>();
  if (!updated) throw new HttpError(404, "quiz_not_found");

  return json({ quiz: updated });
}

export async function duplicateQuiz(request: Request, env: Env, quizId: string) {
  const user = await requireUser(request, env);
  const source = await env.DB.prepare("SELECT * FROM quizzes WHERE id = ? AND owner_id = ?")
    .bind(quizId, user.id)
    .first<QuizRow>();
  if (!source) throw new HttpError(404, "quiz_not_found");

  const duplicateId = crypto.randomUUID();
  const duplicate = buildDuplicateQuizMetadata({
    title: source.title,
    description: source.description,
    primaryLanguage: source.primary_language,
    level: source.level,
    tagsJson: source.tags_json,
    defaultTimeLimitSeconds: source.default_time_limit_seconds,
    showCorrection: source.show_correction,
    speedScoring: source.speed_scoring
  }, randomToken(5));

  await env.DB.prepare(
    `INSERT INTO quizzes (id, owner_id, title, description, primary_language, level, tags_json, visibility, status, slug, secret_token, default_time_limit_seconds, show_correction, speed_scoring, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    duplicateId,
    user.id,
    duplicate.title,
    duplicate.description,
    duplicate.primaryLanguage,
    duplicate.level,
    duplicate.tagsJson,
    duplicate.visibility,
    duplicate.status,
    duplicate.slug,
    duplicate.secretToken,
    duplicate.defaultTimeLimitSeconds,
    duplicate.showCorrection,
    duplicate.speedScoring,
    duplicate.publishedAt
  ).run();

  const questions = await env.DB.prepare("SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index ASC")
    .bind(source.id)
    .all<QuestionRow>();
  const questionIdMap = new Map<string, string>();
  for (const question of questions.results) {
    const newQuestionId = crypto.randomUUID();
    questionIdMap.set(question.id, newQuestionId);
    await env.DB.prepare(
      `INSERT INTO questions (id, quiz_id, type, order_index, prompt, media_key, time_limit_seconds, points, explanation, accepted_answers_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newQuestionId,
      duplicateId,
      question.type,
      question.order_index,
      question.prompt,
      question.media_key,
      question.time_limit_seconds,
      question.points,
      question.explanation,
      question.accepted_answers_json
    ).run();
  }

  const choices = await env.DB.prepare(
    `SELECT question_choices.question_id, question_choices.order_index, question_choices.label, question_choices.is_correct
     FROM question_choices
     JOIN questions ON questions.id = question_choices.question_id
     WHERE questions.quiz_id = ?
     ORDER BY questions.order_index ASC, question_choices.order_index ASC`
  ).bind(source.id).all<ChoiceRow>();
  for (const choice of choices.results) {
    const newQuestionId = questionIdMap.get(choice.question_id);
    if (!newQuestionId) continue;
    await env.DB.prepare(
      "INSERT INTO question_choices (id, question_id, order_index, label, is_correct) VALUES (?, ?, ?, ?, ?)"
    ).bind(crypto.randomUUID(), newQuestionId, choice.order_index, choice.label, choice.is_correct).run();
  }

  const quiz = await env.DB.prepare(
    `SELECT id, title, description, primary_language, level, tags_json, visibility, status, slug, secret_token, updated_at, published_at
     FROM quizzes
     WHERE id = ? AND owner_id = ?`
  ).bind(duplicateId, user.id).first();
  return json({ quiz });
}

export async function deleteQuiz(request: Request, env: Env, quizId: string) {
  const user = await requireUser(request, env);
  const result = await env.DB.prepare("DELETE FROM quizzes WHERE id = ? AND owner_id = ?").bind(quizId, user.id).run();
  if (result.meta.changes === 0) throw new HttpError(404, "quiz_not_found");
  return json({ ok: true });
}

export async function replaceQuestions(env: Env, quizId: string, questions: QuestionInput[]) {
  await env.DB.prepare("DELETE FROM questions WHERE quiz_id = ?").bind(quizId).run();
  for (const [index, question] of questions.entries()) {
    const questionId = question.id ?? crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO questions (id, quiz_id, type, order_index, prompt, media_key, time_limit_seconds, points, explanation, accepted_answers_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      questionId,
      quizId,
      question.type,
      index,
      question.prompt,
      question.mediaKey ?? null,
      question.timeLimitSeconds,
      question.points,
      question.explanation,
      JSON.stringify(question.acceptedAnswers)
    ).run();
    for (const [choiceIndex, choice] of question.choices.entries()) {
      await env.DB.prepare(
        "INSERT INTO question_choices (id, question_id, order_index, label, is_correct) VALUES (?, ?, ?, ?, ?)"
      ).bind(choice.id ?? crypto.randomUUID(), questionId, choiceIndex, choice.label, choice.isCorrect ? 1 : 0).run();
    }
  }
}

async function readOwnedQuiz(env: Env, ownerId: string, quizId: string) {
  const quiz = await env.DB.prepare("SELECT * FROM quizzes WHERE id = ? AND owner_id = ?").bind(quizId, ownerId).first<{ id: string }>();
  if (!quiz) throw new HttpError(404, "quiz_not_found");
  const questions = await env.DB.prepare("SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index ASC").bind(quizId).all<{ id: string }>();
  const choices = await env.DB.prepare(
    `SELECT question_choices.*
     FROM question_choices
     JOIN questions ON questions.id = question_choices.question_id
     WHERE questions.quiz_id = ?
     ORDER BY questions.order_index ASC, question_choices.order_index ASC`
  ).bind(quizId).all();
  return { quiz, questions: questions.results, choices: choices.results };
}

import type { Env } from "../env";
import { requireUser } from "../auth/guards";
import { randomToken, sha256Base64 } from "../auth/password";
import { HttpError, json } from "../http/response";
import { findBlockedTerm, normalizeModerationText } from "../moderation/bannedTerms";
import { assertLiveJoinRateLimit } from "../security/rateLimit";
import { generateLiveCode } from "./code";
import { buildSessionResults, sessionResultsToCsv, type SessionResultsInput } from "./results";
import { SessionEmailError, buildSessionSummaryEmail, sendSessionSummaryEmail } from "./sessionEmail";

type LiveSessionHistoryRow = {
  id: string;
  quiz_id: string;
  quiz_title: string;
  code: string;
  status: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  participant_count: number;
  answer_count: number;
};

type LiveSessionResultRow = {
  id: string;
  quiz_id: string;
  quiz_title: string;
  code: string;
  status: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
};

type ResultQuestionRow = {
  id: string;
  order_index: number;
  prompt: string;
  points: number;
};

type ResultParticipantRow = {
  id: string;
  display_name: string;
  score: number;
};

type ResultAnswerRow = {
  participant_id: string;
  question_id: string;
  choice_label: string | null;
  answer_text: string | null;
  is_correct: number;
  points: number;
  response_ms: number;
};

export async function createLiveSession(request: Request, env: Env, quizId: string) {
  const user = await requireUser(request, env);
  const quiz = await env.DB.prepare("SELECT id FROM quizzes WHERE id = ? AND owner_id = ?").bind(quizId, user.id).first<{ id: string }>();
  if (!quiz) throw new HttpError(404, "quiz_not_found");
  const id = crypto.randomUUID();
  const code = await generateUniqueLiveCode(env);
  await env.DB.prepare(
    "INSERT INTO live_sessions (id, quiz_id, teacher_id, code, status) VALUES (?, ?, ?, ?, 'lobby')"
  ).bind(id, quizId, user.id, code).run();
  const origin = new URL(request.url).origin;
  return json({
    id,
    code,
    joinUrl: `${origin}/join/${code}`,
    teacherUrl: `${origin}/live/teacher/${id}`,
    boardUrl: `${origin}/live/board/${id}`
  });
}

export async function listTeacherLiveSessions(request: Request, env: Env) {
  const user = await requireUser(request, env);
  const result = await env.DB.prepare(
    `SELECT live_sessions.id,
            live_sessions.quiz_id,
            quizzes.title AS quiz_title,
            live_sessions.code,
            live_sessions.status,
            live_sessions.created_at,
            live_sessions.started_at,
            live_sessions.ended_at,
            COUNT(DISTINCT live_participants.id) AS participant_count,
            COUNT(DISTINCT live_answers.id) AS answer_count
     FROM live_sessions
     JOIN quizzes ON quizzes.id = live_sessions.quiz_id
     LEFT JOIN live_participants ON live_participants.session_id = live_sessions.id
     LEFT JOIN live_answers ON live_answers.session_id = live_sessions.id
     WHERE live_sessions.teacher_id = ?
     GROUP BY live_sessions.id
     ORDER BY live_sessions.created_at DESC
     LIMIT 30`
  ).bind(user.id).all<LiveSessionHistoryRow>();
  return json({ sessions: result.results.map((row) => ({
    id: row.id,
    quizId: row.quiz_id,
    quizTitle: row.quiz_title,
    code: row.code,
    status: row.status,
    createdAt: row.created_at,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    participantCount: row.participant_count,
    answerCount: row.answer_count
  })) });
}

export async function getTeacherLiveSessionResults(request: Request, env: Env, sessionId: string) {
  const user = await requireUser(request, env);
  return json({ results: await readTeacherSessionResults(env, user.id, sessionId) });
}

export async function exportTeacherLiveSessionResults(request: Request, env: Env, sessionId: string) {
  const user = await requireUser(request, env);
  const results = await readTeacherSessionResults(env, user.id, sessionId);
  const csv = sessionResultsToCsv(results);
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="session-${results.session.code}-results.csv"`
    }
  });
}

export async function emailTeacherLiveSessionSummary(request: Request, env: Env, sessionId: string) {
  const user = await requireUser(request, env);
  const results = await readTeacherSessionResults(env, user.id, sessionId);
  const origin = (env.APP_ORIGIN || new URL(request.url).origin).replace(/\/$/, "");
  const email = buildSessionSummaryEmail(results, {
    to: user.email,
    resultsUrl: `${origin}/sessions/${encodeURIComponent(sessionId)}/results`
  });

  try {
    const sent = await sendSessionSummaryEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM
    }, email);
    return json({ ok: true, to: user.email, providerId: sent.id });
  } catch (error) {
    if (error instanceof SessionEmailError) {
      throw new HttpError(error.status, error.code);
    }
    throw error;
  }
}

export async function deleteTeacherLiveSession(request: Request, env: Env, sessionId: string) {
  const user = await requireUser(request, env);
  const session = await env.DB.prepare("SELECT id FROM live_sessions WHERE id = ? AND teacher_id = ?")
    .bind(sessionId, user.id)
    .first<{ id: string }>();
  if (!session) throw new HttpError(404, "session_not_found");

  await env.DB.prepare("DELETE FROM live_answers WHERE session_id = ?").bind(sessionId).run();
  await env.DB.prepare("DELETE FROM live_participants WHERE session_id = ?").bind(sessionId).run();
  await env.DB.prepare("DELETE FROM live_sessions WHERE id = ? AND teacher_id = ?").bind(sessionId, user.id).run();
  return json({ ok: true });
}

async function generateUniqueLiveCode(env: Env) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generateLiveCode();
    const existing = await env.DB.prepare("SELECT id FROM live_sessions WHERE code = ? AND status != 'ended'").bind(code).first<{ id: string }>();
    if (!existing) return code;
  }
  throw new HttpError(500, "live_code_unavailable");
}

export async function joinLiveSession(request: Request, env: Env, code: string) {
  const body = await request.json<{ displayName: string }>();
  const displayName = body.displayName.trim().slice(0, 30);
  if (!displayName) throw new HttpError(400, "name_required");
  await assertLiveJoinRateLimit(request, env, code);
  const session = await env.DB.prepare("SELECT id FROM live_sessions WHERE code = ? AND status != 'ended'").bind(code).first<{ id: string }>();
  if (!session) throw new HttpError(404, "session_not_found");
  const bannedTerms = await env.DB.prepare("SELECT term FROM banned_terms").all<{ term: string }>();
  const blockedTerm = findBlockedTerm(displayName, bannedTerms.results.map((row) => row.term));
  if (blockedTerm) throw new HttpError(400, "banned_name");
  const participantId = crypto.randomUUID();
  const participantToken = randomToken(24);
  await env.DB.prepare(
    "INSERT INTO live_participants (id, session_id, display_name, name_key, join_token_hash) VALUES (?, ?, ?, ?, ?)"
  ).bind(participantId, session.id, displayName, normalizeModerationText(displayName), await sha256Base64(participantToken)).run();
  return json({ sessionId: session.id, participantId, participantToken });
}

export async function liveSocket(request: Request, env: Env, sessionId: string) {
  if (request.headers.get("Upgrade") !== "websocket") throw new HttpError(400, "websocket_required");
  await authorizeLiveSocket(request, env, sessionId);
  const stub = env.LIVE_SESSION_ROOM.getByName(sessionId);
  return stub.fetch(request);
}

export async function authorizeLiveSocket(request: Request, env: Env, sessionId: string) {
  const url = new URL(request.url);
  const role = url.searchParams.get("role");
  if (role === "teacher" || role === "board") {
    const user = await requireUser(request, env);
    const session = await env.DB.prepare("SELECT id FROM live_sessions WHERE id = ? AND teacher_id = ?")
      .bind(sessionId, user.id)
      .first<{ id: string }>();
    if (!session) throw new HttpError(404, "session_not_found");
    return;
  }

  const participantId = url.searchParams.get("participantId");
  const participantToken = url.searchParams.get("participantToken");
  if (!participantId || !participantToken) throw new HttpError(401, "not_authenticated");
  const participant = await env.DB.prepare(
    `SELECT live_participants.id
     FROM live_participants
     JOIN live_sessions ON live_sessions.id = live_participants.session_id
     WHERE live_participants.id = ?
       AND live_participants.session_id = ?
       AND live_participants.join_token_hash = ?
       AND live_sessions.status != 'ended'`
  ).bind(participantId, sessionId, await sha256Base64(participantToken)).first<{ id: string }>();
  if (!participant) throw new HttpError(401, "not_authenticated");
}

export async function getLiveBootstrap(request: Request, env: Env, sessionId: string) {
  const user = await requireUser(request, env);
  const session = await env.DB.prepare(
    `SELECT live_sessions.*, quizzes.title, quizzes.exam_mode
     FROM live_sessions
     JOIN quizzes ON quizzes.id = live_sessions.quiz_id
     WHERE live_sessions.id = ? AND live_sessions.teacher_id = ?`
  ).bind(sessionId, user.id).first<{ id: string; quiz_id: string; code: string; title: string; status: string; exam_mode: number }>();
  if (!session) throw new HttpError(404, "session_not_found");
  const questions = await env.DB.prepare(
    "SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index ASC"
  ).bind(session.quiz_id).all();
  const choices = await env.DB.prepare(
    `SELECT question_choices.*
     FROM question_choices
     JOIN questions ON questions.id = question_choices.question_id
     WHERE questions.quiz_id = ?
     ORDER BY questions.order_index ASC, question_choices.order_index ASC`
  ).bind(session.quiz_id).all();
  return json({ session, questions: questions.results, choices: choices.results });
}

export async function readTeacherSessionResults(env: Env, teacherId: string, sessionId: string) {
  const session = await env.DB.prepare(
    `SELECT live_sessions.id,
            live_sessions.quiz_id,
            quizzes.title AS quiz_title,
            live_sessions.code,
            live_sessions.status,
            live_sessions.created_at,
            live_sessions.started_at,
            live_sessions.ended_at
     FROM live_sessions
     JOIN quizzes ON quizzes.id = live_sessions.quiz_id
     WHERE live_sessions.id = ? AND live_sessions.teacher_id = ?`
  ).bind(sessionId, teacherId).first<LiveSessionResultRow>();
  if (!session) throw new HttpError(404, "session_not_found");

  const questions = await env.DB.prepare(
    "SELECT id, order_index, prompt, points FROM questions WHERE quiz_id = ? ORDER BY order_index ASC"
  ).bind(session.quiz_id).all<ResultQuestionRow>();
  const participants = await env.DB.prepare(
    "SELECT id, display_name, score FROM live_participants WHERE session_id = ? ORDER BY score DESC, display_name ASC"
  ).bind(session.id).all<ResultParticipantRow>();
  const answers = await env.DB.prepare(
    `SELECT live_answers.participant_id,
            live_answers.question_id,
            question_choices.label AS choice_label,
            live_answers.answer_text,
            live_answers.is_correct,
            live_answers.points,
            live_answers.response_ms
     FROM live_answers
     LEFT JOIN question_choices ON question_choices.id = live_answers.choice_id
     WHERE live_answers.session_id = ?`
  ).bind(session.id).all<ResultAnswerRow>();

  const input: SessionResultsInput = {
    session: {
      id: session.id,
      quizId: session.quiz_id,
      quizTitle: session.quiz_title,
      code: session.code,
      status: session.status,
      createdAt: session.created_at,
      startedAt: session.started_at,
      endedAt: session.ended_at
    },
    questions: questions.results.map((question) => ({
      id: question.id,
      orderIndex: question.order_index,
      prompt: question.prompt,
      points: question.points
    })),
    participants: participants.results.map((participant) => ({
      id: participant.id,
      displayName: participant.display_name,
      score: participant.score
    })),
    answers: answers.results.map((answer) => ({
      participantId: answer.participant_id,
      questionId: answer.question_id,
      choiceLabel: answer.choice_label,
      answerText: answer.answer_text,
      isCorrect: answer.is_correct === 1,
      points: answer.points,
      responseMs: answer.response_ms
    }))
  };

  return buildSessionResults(input);
}

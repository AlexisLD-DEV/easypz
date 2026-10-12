import { DurableObject } from "cloudflare:workers";
import type { Env } from "../env";
import { canStartQuestion } from "./commands";
import { applyAcceptedAnswer, evaluateLiveAnswer, makeAnswerKey, rankLeaderboard } from "./evaluate";
import type { LiveQuestionSnapshot, LiveRoomState, LiveStoredAnswer } from "./model";
import type { ClientLiveMessage, ServerLiveMessage } from "./protocol";
import { createSerialTaskQueue } from "./serialTaskQueue";
import { normalizeLiveSettings } from "./settings";
import { toLiveStateMessage, toPublicLiveQuestion } from "./state";
import { buildLiveSessionSummary } from "./summary";
import { questionStartTime } from "./timing";

type Attachment = { role: "teacher" | "student" | "board"; sessionId: string; participantId?: string };
type SessionRow = { id: string; quiz_id: string; code: string; status: LiveRoomState["status"] };
type QuestionRow = {
  id: string;
  type: LiveQuestionSnapshot["type"];
  prompt: string;
  media_key: string | null;
  time_limit_seconds: number;
  points: number;
  explanation: string;
  accepted_answers_json: string;
};
type ChoiceRow = { id: string; question_id: string; order_index: number; label: string; is_correct: number };
type ParticipantRow = { id: string; display_name: string; score: number };
type CorrectAnswerRow = { participant_id: string; correct_count: number };
type AnswerRow = {
  participant_id: string;
  question_id: string;
  choice_id: string | null;
  answer_text: string | null;
  is_correct: number;
  points: number;
  response_ms: number;
  arrived_late: number;
};

export class LiveSessionRoom extends DurableObject<Env> {
  private readonly mutations = createSerialTaskQueue();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const url = new URL(request.url);
    const roleParam = url.searchParams.get("role");
    const attachment: Attachment = {
      role: roleParam === "teacher" || roleParam === "board" ? roleParam : "student",
      sessionId: sessionIdFromRequest(request),
      participantId: url.searchParams.get("participantId") ?? undefined
    };

    server.serializeAttachment(attachment);
    this.ctx.acceptWebSocket(server);

    await this.mutations.run(async () => {
      const state = await this.ensureState(attachment.sessionId);
      if (attachment.participantId) {
        await this.ensureParticipant(state, attachment.participantId);
      }
      await this.broadcastState(state);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    return this.mutations.run(() => this.handleWebSocketMessage(ws, message));
  }

  private async handleWebSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const parsed = JSON.parse(String(message)) as ClientLiveMessage;
    const attachment = ws.deserializeAttachment() as Attachment | null;
    const state = await this.ensureState(attachment?.sessionId ?? "");

    if (parsed.type === "teacher:start" || parsed.type === "teacher:start_question") {
      if (!isTeacherSocket(attachment)) return;
      await this.startQuestion(state, {
        requestedQuestionId: parsed.type === "teacher:start_question" ? parsed.questionId : undefined,
        firstQuestionCountdownMs: parsed.type === "teacher:start" ? 5_000 : undefined
      });
      return;
    }
    if (parsed.type === "teacher:update_settings") {
      if (!isTeacherSocket(attachment)) return;
      state.settings = normalizeLiveSettings({ ...state.settings, ...parsed.settings });
      await this.saveState(state);
      await this.broadcastState(state);
      return;
    }
    if (parsed.type === "teacher:next") {
      if (!isTeacherSocket(attachment)) return;
      await this.nextQuestion(state);
      return;
    }
    if (parsed.type === "teacher:reveal") {
      if (!isTeacherSocket(attachment)) return;
      state.status = "reveal";
      await this.saveState(state);
      this.broadcast({ type: "reveal", leaderboard: rankLeaderboard(state.participants) });
      await this.broadcastState(state);
      return;
    }
    if (parsed.type === "teacher:end") {
      if (!isTeacherSocket(attachment)) return;
      await this.endSession(state);
      return;
    }
    if (parsed.type === "student:answer") {
      await this.handleStudentAnswer(ws, state, parsed);
      return;
    }
  }

  async webSocketClose() {
    await this.broadcastState();
  }

  private async startQuestion(state: LiveRoomState, options: { requestedQuestionId?: string; firstQuestionCountdownMs?: number } = {}) {
    const previousStatus = state.status;
    if (!canStartQuestion(state.status)) {
      await this.broadcastState(state);
      return;
    }

    if (options.requestedQuestionId) {
      const index = state.questions.findIndex((question) => question.id === options.requestedQuestionId);
      if (index >= 0) state.currentQuestionIndex = index;
    }

    const question = state.questions[state.currentQuestionIndex];
    if (!question) {
      await this.endSession(state);
      return;
    }

    state.status = "question";
    state.questionStartedAt = questionStartTime({
      previousStatus,
      questionIndex: state.currentQuestionIndex,
      now: Date.now(),
      firstQuestionCountdownMs: options.firstQuestionCountdownMs
    });
    await this.saveState(state);
    this.broadcast({
      type: "question",
      question: toPublicLiveQuestion(question),
      startedAt: state.questionStartedAt,
      timeLimitSeconds: question.timeLimitSeconds
    });
    await this.broadcastState(state);
  }

  private async nextQuestion(state: LiveRoomState) {
    if (state.currentQuestionIndex + 1 >= state.questions.length) {
      await this.endSession(state);
      return;
    }
    state.currentQuestionIndex += 1;
    await this.startQuestion(state);
  }

  private async handleStudentAnswer(ws: WebSocket, state: LiveRoomState, parsed: Extract<ClientLiveMessage, { type: "student:answer" }>) {
    const attachment = ws.deserializeAttachment() as Attachment | null;
    const participantId = attachment?.participantId;
    if (attachment?.role !== "student" || !participantId) {
      ws.send(JSON.stringify({ type: "answer:rejected", reason: "invalid" }));
      return;
    }

    if (!(await this.ensureParticipant(state, participantId))) {
      ws.send(JSON.stringify({ type: "answer:rejected", reason: "invalid" }));
      return;
    }
    const result = evaluateLiveAnswer(state, { ...parsed, participantId, receivedAt: Date.now() });
    if (!result.accepted) {
      ws.send(JSON.stringify({ type: "answer:rejected", reason: result.reason }));
      return;
    }

    const inserted = await this.persistAnswer(state.sessionId, result);
    if (!inserted) {
      ws.send(JSON.stringify({ type: "answer:rejected", reason: "duplicate" }));
      return;
    }
    applyAcceptedAnswer(state, result);
    await this.saveState(state);
    ws.send(JSON.stringify({ type: "answer:accepted", questionId: result.questionId, points: result.points, isCorrect: result.isCorrect }));
    await this.broadcastState(state);
  }

  private async endSession(state: LiveRoomState) {
    state.status = "ended";
    await this.saveState(state);
    const summary = buildLiveSessionSummary(state);
    await this.env.DB.prepare(
      "UPDATE live_sessions SET status = 'ended', ended_at = CURRENT_TIMESTAMP, summary_json = ? WHERE id = ?"
    ).bind(JSON.stringify(summary), state.sessionId).run();
    this.broadcast({ type: "ended", leaderboard: summary.leaderboard });
    await this.broadcastState(state);
  }

  private async ensureState(sessionId: string): Promise<LiveRoomState> {
    const existing = await this.ctx.storage.get<LiveRoomState>("roomState");
    if (existing) {
      existing.settings = normalizeLiveSettings(existing.settings);
      return existing;
    }

    const session = await this.env.DB.prepare("SELECT id, quiz_id, code, status FROM live_sessions WHERE id = ?").bind(sessionId).first<SessionRow>();
    if (!session) {
      return { sessionId, status: "ended", currentQuestionIndex: 0, questionStartedAt: null, questions: [], participants: {}, answers: {} };
    }

    const answers = await loadAnswers(this.env, session.id);
    const participants = await loadParticipants(this.env, session.id);
    for (const answer of Object.values(answers)) {
      const participant = participants[answer.participantId];
      if (participant && answer.isCorrect) participant.correctAnswers += 1;
    }

    const state: LiveRoomState = {
      sessionId: session.id,
      code: session.code,
      status: session.status,
      currentQuestionIndex: 0,
      questionStartedAt: null,
      settings: normalizeLiveSettings(),
      questions: await loadQuestions(this.env, session.quiz_id),
      participants,
      answers
    };
    await this.saveState(state);
    return state;
  }

  private async ensureParticipant(state: LiveRoomState, participantId: string) {
    if (state.participants[participantId]) return true;
    const row = await this.env.DB.prepare(
      "SELECT id, display_name, score FROM live_participants WHERE id = ? AND session_id = ?"
    ).bind(participantId, state.sessionId).first<ParticipantRow>();
    if (!row) return false;

    const correct = await this.env.DB.prepare(
      "SELECT COUNT(*) AS correct_count FROM live_answers WHERE participant_id = ? AND session_id = ? AND is_correct = 1"
    ).bind(row.id, state.sessionId).first<{ correct_count: number }>();
    state.participants[row.id] = {
      id: row.id,
      participantId: row.id,
      displayName: row.display_name,
      score: row.score,
      correctAnswers: correct?.correct_count ?? 0
    };
    await this.saveState(state);
    return true;
  }

  private async saveState(state: LiveRoomState) {
    await this.ctx.storage.put("roomState", state);
    await this.env.DB.prepare(
      `UPDATE live_sessions
       SET status = ?,
           current_question_id = ?,
           started_at = CASE WHEN started_at IS NULL AND ? != 'lobby' THEN CURRENT_TIMESTAMP ELSE started_at END
       WHERE id = ?`
    )
      .bind(state.status, state.questions[state.currentQuestionIndex]?.id ?? null, state.status, state.sessionId)
      .run();
  }

  private async persistAnswer(sessionId: string, answer: LiveStoredAnswer) {
    const result = await this.env.DB.prepare(
      `INSERT OR IGNORE INTO live_answers (id, session_id, participant_id, question_id, answer_text, choice_id, is_correct, points, response_ms, arrived_late)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      sessionId,
      answer.participantId,
      answer.questionId,
      answer.answerText ?? null,
      answer.choiceId ?? null,
      answer.isCorrect ? 1 : 0,
      answer.points,
      answer.responseMs,
      answer.arrivedLate ? 1 : 0
    ).run();
    if (result.meta.changes === 0) return false;
    await this.env.DB.prepare("UPDATE live_participants SET score = score + ? WHERE id = ? AND session_id = ?")
      .bind(answer.points, answer.participantId, sessionId)
      .run();
    return true;
  }

  private async broadcastState(state?: LiveRoomState) {
    const current = state ?? await this.ctx.storage.get<LiveRoomState>("roomState");
    if (!current) return;
    this.broadcast(toLiveStateMessage(current));
  }

  private broadcast(message: ServerLiveMessage) {
    for (const socket of this.ctx.getWebSockets()) {
      socket.send(JSON.stringify(message));
    }
  }
}

async function loadQuestions(env: Env, quizId: string): Promise<LiveQuestionSnapshot[]> {
  const questionRows = await env.DB.prepare("SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index ASC").bind(quizId).all<QuestionRow>();
  const choiceRows = await env.DB.prepare(
    `SELECT question_choices.*
     FROM question_choices
     JOIN questions ON questions.id = question_choices.question_id
     WHERE questions.quiz_id = ?
     ORDER BY questions.order_index ASC, question_choices.order_index ASC`
  ).bind(quizId).all<ChoiceRow>();
  const choicesByQuestion = new Map<string, ChoiceRow[]>();
  for (const choice of choiceRows.results) {
    choicesByQuestion.set(choice.question_id, [...(choicesByQuestion.get(choice.question_id) ?? []), choice]);
  }
  return questionRows.results.map((question) => ({
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    mediaKey: question.media_key,
    timeLimitSeconds: question.time_limit_seconds,
    points: question.points,
    explanation: question.explanation,
    acceptedAnswers: JSON.parse(question.accepted_answers_json) as string[],
    choices: (choicesByQuestion.get(question.id) ?? []).map((choice) => ({ id: choice.id, label: choice.label, isCorrect: choice.is_correct === 1 }))
  }));
}

async function loadParticipants(env: Env, sessionId: string): Promise<LiveRoomState["participants"]> {
  const rows = await env.DB.prepare("SELECT id, display_name, score FROM live_participants WHERE session_id = ?").bind(sessionId).all<ParticipantRow>();
  const correctRows = await env.DB.prepare(
    "SELECT participant_id, COUNT(*) AS correct_count FROM live_answers WHERE session_id = ? AND is_correct = 1 GROUP BY participant_id"
  ).bind(sessionId).all<CorrectAnswerRow>();
  const correctByParticipant = new Map(correctRows.results.map((row) => [row.participant_id, row.correct_count]));
  return Object.fromEntries(rows.results.map((row) => [row.id, {
    id: row.id,
    participantId: row.id,
    displayName: row.display_name,
    score: row.score,
    correctAnswers: correctByParticipant.get(row.id) ?? 0
  }]));
}

async function loadAnswers(env: Env, sessionId: string): Promise<LiveRoomState["answers"]> {
  const rows = await env.DB.prepare(
    "SELECT participant_id, question_id, choice_id, answer_text, is_correct, points, response_ms, arrived_late FROM live_answers WHERE session_id = ?"
  ).bind(sessionId).all<AnswerRow>();
  return Object.fromEntries(rows.results.map((row) => {
    const answer: LiveStoredAnswer = {
      participantId: row.participant_id,
      questionId: row.question_id,
      choiceId: row.choice_id ?? undefined,
      answerText: row.answer_text ?? undefined,
      isCorrect: row.is_correct === 1,
      points: row.points,
      responseMs: row.response_ms,
      arrivedLate: row.arrived_late === 1
    };
    return [makeAnswerKey(answer.participantId, answer.questionId), answer];
  }));
}

function sessionIdFromRequest(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("sessionId") ?? url.pathname.split("/").at(-2) ?? "";
}

function isTeacherSocket(attachment: Attachment | null) {
  return attachment?.role === "teacher";
}

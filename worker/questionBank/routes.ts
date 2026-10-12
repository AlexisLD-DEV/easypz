import type { Env } from "../env";
import { requireUser } from "../auth/guards";
import { HttpError, json } from "../http/response";
import {
  questionBankFingerprint,
  similarQuestionCandidates,
  type QuestionBankChoice,
  type QuestionBankComparable
} from "./model";
import {
  questionBankFilterSchema,
  questionBankInputSchema,
  questionBankSimilarInputSchema,
  type QuestionBankFilters,
  type QuestionBankInput
} from "./validation";

type QuestionBankRow = {
  id: string;
  owner_id: string;
  type: QuestionBankInput["type"];
  prompt: string;
  media_key: string | null;
  explanation: string;
  level: string;
  primary_language: "fr" | "en";
  tags_json: string;
  school_level: string;
  language_track: string;
  cefr_level: string;
  program_axis: string;
  language_activity: string;
  linguistic_focus: string;
  time_limit_seconds: number;
  points: number;
  accepted_answers_json: string;
  choices_json: string;
  fingerprint: string;
  created_at: string;
  updated_at: string;
};

export async function listQuestionBankItems(request: Request, env: Env) {
  const user = await requireUser(request, env);
  const filters = questionBankFilterSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const rows = await queryBankRows(env, user.id, filters);
  return json({ items: rows.map(rowToResponse) });
}

export async function createQuestionBankItem(request: Request, env: Env) {
  const user = await requireUser(request, env);
  const input = questionBankInputSchema.parse(await request.json());
  const fingerprint = questionBankFingerprint(inputToComparable(input));
  const existing = await env.DB.prepare("SELECT id FROM question_bank_items WHERE owner_id = ? AND fingerprint = ?")
    .bind(user.id, fingerprint)
    .first<{ id: string }>();

  if (existing) return json({ duplicate: true, existingId: existing.id });

  const id = crypto.randomUUID();
  await insertBankItem(env, user.id, id, input, fingerprint);
  return json({ duplicate: false, item: rowToResponse(await readOwnedBankRow(env, user.id, id)) }, { status: 201 });
}

export async function getQuestionBankItem(request: Request, env: Env, itemId: string) {
  const user = await requireUser(request, env);
  return json({ item: rowToResponse(await readOwnedBankRow(env, user.id, itemId)) });
}

export async function updateQuestionBankItem(request: Request, env: Env, itemId: string) {
  const user = await requireUser(request, env);
  await readOwnedBankRow(env, user.id, itemId);
  const input = questionBankInputSchema.parse(await request.json());
  const fingerprint = questionBankFingerprint(inputToComparable(input));
  const duplicate = await env.DB.prepare("SELECT id FROM question_bank_items WHERE owner_id = ? AND fingerprint = ? AND id <> ?")
    .bind(user.id, fingerprint, itemId)
    .first<{ id: string }>();

  if (duplicate) return json({ duplicate: true, existingId: duplicate.id });

  await env.DB.prepare(
    `UPDATE question_bank_items
     SET type = ?, prompt = ?, media_key = ?, explanation = ?, level = ?, primary_language = ?, tags_json = ?,
         school_level = ?, language_track = ?, cefr_level = ?, program_axis = ?, language_activity = ?, linguistic_focus = ?,
         time_limit_seconds = ?, points = ?, accepted_answers_json = ?, choices_json = ?, fingerprint = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND owner_id = ?`
  ).bind(
    input.type,
    input.prompt,
    input.mediaKey ?? null,
    input.explanation,
    input.level,
    input.primaryLanguage,
    JSON.stringify(input.tags),
    input.schoolLevel,
    input.languageTrack,
    input.cefrLevel,
    input.programAxis,
    input.languageActivity,
    input.linguisticFocus,
    input.timeLimitSeconds,
    input.points,
    JSON.stringify(input.acceptedAnswers),
    JSON.stringify(input.choices),
    fingerprint,
    itemId,
    user.id
  ).run();

  return json({ duplicate: false, item: rowToResponse(await readOwnedBankRow(env, user.id, itemId)) });
}

export async function deleteQuestionBankItem(request: Request, env: Env, itemId: string) {
  const user = await requireUser(request, env);
  const result = await env.DB.prepare("DELETE FROM question_bank_items WHERE id = ? AND owner_id = ?")
    .bind(itemId, user.id)
    .run();
  if (result.meta.changes === 0) throw new HttpError(404, "question_bank_item_not_found");
  return json({ ok: true });
}

export async function checkSimilarQuestionBankItems(request: Request, env: Env) {
  const user = await requireUser(request, env);
  const input = questionBankSimilarInputSchema.parse(await request.json());
  const comparable = inputToComparable(input);
  const fingerprint = questionBankFingerprint(comparable);
  const rows = await env.DB.prepare("SELECT * FROM question_bank_items WHERE owner_id = ? AND type = ? ORDER BY updated_at DESC LIMIT 100")
    .bind(user.id, input.type)
    .all<QuestionBankRow>();

  const exact = rows.results.find((row) => row.fingerprint === fingerprint && row.id !== input.excludeId);
  const similar = similarQuestionCandidates(comparable, rows.results
    .filter((row) => row.id !== input.excludeId)
    .map(rowToComparable));

  return json({
    exact: exact ? rowToResponse(exact) : null,
    similar: similar
      .slice(0, 3)
      .map((candidate) => rows.results.find((row) => row.id === candidate.id))
      .filter((row): row is QuestionBankRow => Boolean(row))
      .map(rowToResponse)
  });
}

async function queryBankRows(env: Env, ownerId: string, filters: QuestionBankFilters) {
  const rows = await env.DB.prepare("SELECT * FROM question_bank_items WHERE owner_id = ? ORDER BY updated_at DESC")
    .bind(ownerId)
    .all<QuestionBankRow>();

  return rows.results.filter((row) => {
    if (filters.type && row.type !== filters.type) return false;
    if (filters.level && row.level !== filters.level) return false;
    if (filters.language && row.primary_language !== filters.language) return false;
    if (filters.schoolLevel && row.school_level !== filters.schoolLevel) return false;
    if (filters.languageTrack && row.language_track !== filters.languageTrack) return false;
    if (filters.cefrLevel && row.cefr_level !== filters.cefrLevel) return false;
    if (filters.programAxis && row.program_axis !== filters.programAxis) return false;
    if (filters.languageActivity && row.language_activity !== filters.languageActivity) return false;
    if (filters.linguisticFocus && !(row.linguistic_focus ?? "").toLowerCase().includes(filters.linguisticFocus.toLowerCase())) return false;

    const tags = parseJson<string[]>(row.tags_json, []);
    if (filters.tag && !tags.includes(filters.tag)) return false;

    const search = filters.q?.toLowerCase();
    if (search) {
      const haystack = `${row.prompt} ${row.level} ${row.school_level ?? ""} ${row.language_track ?? ""} ${row.cefr_level ?? ""} ${row.program_axis ?? ""} ${row.language_activity ?? ""} ${row.linguistic_focus ?? ""} ${tags.join(" ")}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}

async function insertBankItem(env: Env, ownerId: string, id: string, input: QuestionBankInput, fingerprint: string) {
  await env.DB.prepare(
    `INSERT INTO question_bank_items
      (id, owner_id, type, prompt, media_key, explanation, level, primary_language, tags_json, school_level, language_track, cefr_level, program_axis, language_activity, linguistic_focus, time_limit_seconds, points, accepted_answers_json, choices_json, fingerprint)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    ownerId,
    input.type,
    input.prompt,
    input.mediaKey ?? null,
    input.explanation,
    input.level,
    input.primaryLanguage,
    JSON.stringify(input.tags),
    input.schoolLevel,
    input.languageTrack,
    input.cefrLevel,
    input.programAxis,
    input.languageActivity,
    input.linguisticFocus,
    input.timeLimitSeconds,
    input.points,
    JSON.stringify(input.acceptedAnswers),
    JSON.stringify(input.choices),
    fingerprint
  ).run();
}

async function readOwnedBankRow(env: Env, ownerId: string, itemId: string) {
  const row = await env.DB.prepare("SELECT * FROM question_bank_items WHERE id = ? AND owner_id = ?")
    .bind(itemId, ownerId)
    .first<QuestionBankRow>();
  if (!row) throw new HttpError(404, "question_bank_item_not_found");
  return row;
}

function rowToResponse(row: QuestionBankRow) {
  return {
    id: row.id,
    type: row.type,
    prompt: row.prompt,
    mediaKey: row.media_key,
    explanation: row.explanation,
    level: row.level,
    primaryLanguage: row.primary_language,
    tags: parseJson<string[]>(row.tags_json, []),
    schoolLevel: row.school_level ?? "",
    languageTrack: row.language_track ?? "",
    cefrLevel: row.cefr_level ?? "",
    programAxis: row.program_axis ?? "",
    languageActivity: row.language_activity ?? "",
    linguisticFocus: row.linguistic_focus ?? "",
    timeLimitSeconds: row.time_limit_seconds,
    points: row.points,
    acceptedAnswers: parseJson<string[]>(row.accepted_answers_json, []),
    choices: parseJson<QuestionBankChoice[]>(row.choices_json, []),
    fingerprint: row.fingerprint,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function rowToComparable(row: QuestionBankRow): QuestionBankComparable & { id: string } {
  return {
    id: row.id,
    type: row.type,
    prompt: row.prompt,
    acceptedAnswers: parseJson<string[]>(row.accepted_answers_json, []),
    choices: parseJson<QuestionBankChoice[]>(row.choices_json, [])
  };
}

function inputToComparable(input: QuestionBankInput): QuestionBankComparable {
  return {
    type: input.type,
    prompt: input.prompt,
    acceptedAnswers: input.acceptedAnswers,
    choices: input.choices
  };
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

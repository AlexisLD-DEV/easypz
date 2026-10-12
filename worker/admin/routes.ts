import type { Env } from "../env";
import { requireAdmin } from "../auth/guards";
import { HttpError, json } from "../http/response";
import { normalizeBannedTerm } from "../moderation/bannedTerms";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function listAllowedEmails(request: Request, env: Env) {
  await requireAdmin(request, env);
  const result = await env.DB.prepare("SELECT email, role, created_at FROM allowed_emails ORDER BY created_at DESC").all();
  return json({ emails: result.results });
}

export async function addAllowedEmail(request: Request, env: Env) {
  const admin = await requireAdmin(request, env);
  const body = await request.json<{ email: string; role?: "admin" | "teacher" }>();
  const email = normalizeEmail(body.email);
  const role = body.role ?? "teacher";
  if (!email.includes("@")) throw new HttpError(400, "invalid_email");
  if (role !== "admin" && role !== "teacher") throw new HttpError(400, "invalid_role");
  await env.DB.prepare(
    "INSERT OR REPLACE INTO allowed_emails (email, role, created_by) VALUES (?, ?, ?)"
  ).bind(email, role, admin.email).run();
  return json({ ok: true });
}

export async function deleteAllowedEmail(request: Request, env: Env, emailParam: string) {
  await requireAdmin(request, env);
  const email = normalizeEmail(emailParam);
  if (email === env.ADMIN_EMAIL.toLowerCase()) throw new HttpError(400, "cannot_remove_initial_admin");
  await env.DB.prepare("DELETE FROM allowed_emails WHERE email = ?").bind(email).run();
  return json({ ok: true });
}

export async function listBannedTerms(request: Request, env: Env) {
  await requireAdmin(request, env);
  const result = await env.DB.prepare("SELECT term, created_at FROM banned_terms ORDER BY created_at DESC").all();
  return json({ terms: result.results });
}

export async function addBannedTerm(request: Request, env: Env) {
  await requireAdmin(request, env);
  const body = await request.json<{ term: string }>();
  const term = safeNormalizeBannedTerm(body.term);
  if (term.length > 60) throw new HttpError(400, "banned_term_too_long");
  await env.DB.prepare("INSERT OR IGNORE INTO banned_terms (term) VALUES (?)").bind(term).run();
  return json({ ok: true, term });
}

export async function deleteBannedTerm(request: Request, env: Env, termParam: string) {
  await requireAdmin(request, env);
  const term = safeNormalizeBannedTerm(termParam);
  await env.DB.prepare("DELETE FROM banned_terms WHERE term = ?").bind(term).run();
  return json({ ok: true });
}

function safeNormalizeBannedTerm(value: string | undefined) {
  try {
    return normalizeBannedTerm(value ?? "");
  } catch {
    throw new HttpError(400, "empty_banned_term");
  }
}

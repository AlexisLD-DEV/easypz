import type { CurrentUser, Env } from "../env";
import { HttpError } from "../http/response";
import { sha256Base64 } from "./password";

export function readSessionCookie(request: Request) {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/(?:^|; )qe_session=([^;]+)/);
  return match?.[1] ?? null;
}

export async function requireUser(request: Request, env: Env): Promise<CurrentUser> {
  const token = readSessionCookie(request);
  if (!token) throw new HttpError(401, "not_authenticated");
  const tokenHash = await sha256Base64(token);
  const row = await env.DB.prepare(
    `SELECT users.id, users.email, users.role
     FROM auth_sessions
     JOIN users ON users.id = auth_sessions.user_id
     WHERE auth_sessions.token_hash = ? AND auth_sessions.expires_at > CURRENT_TIMESTAMP`
  ).bind(tokenHash).first<CurrentUser>();
  if (!row) throw new HttpError(401, "not_authenticated");
  return row;
}

export async function requireAdmin(request: Request, env: Env) {
  const user = await requireUser(request, env);
  if (user.role !== "admin") throw new HttpError(403, "admin_required");
  return user;
}

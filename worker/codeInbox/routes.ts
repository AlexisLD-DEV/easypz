import type { Env } from "../env";
import { HttpError, json } from "../http/response";
import {
  CODE_INBOX_FUTURE_WAIT_MS,
  CODE_INBOX_MAX_RAW_BYTES,
  CODE_INBOX_POLL_MS,
  CODE_INBOX_RECENT_WINDOW_MS,
  CODE_INBOX_RETENTION_MS,
  extractCodeInboxPayload,
  normalizeCodeInboxEmail
} from "./model";

type CodeInboxRow = {
  code: string | null;
  link: string | null;
  received_at: number;
};

export async function syncCodeInbox(request: Request, env: Env) {
  const url = new URL(request.url);
  const email = normalizeCodeInboxEmail(url.searchParams.get("email"));
  if (!email) throw new HttpError(400, "invalid_code_email");

  const startedAt = Date.now();
  const since = startedAt - CODE_INBOX_RECENT_WINDOW_MS;
  const deadline = startedAt + CODE_INBOX_FUTURE_WAIT_MS;
  await pruneCodeInbox(env, startedAt);

  while (true) {
    const message = await readLatestCodeInboxMessage(env, email, since);
    if (message) {
      return json({
        status: "found",
        message: {
          code: message.code,
          link: message.link,
          receivedAt: message.received_at
        }
      });
    }

    const now = Date.now();
    if (now >= deadline) {
      return json({ status: "empty", checkedSince: since, checkedUntil: now });
    }
    await sleep(Math.min(CODE_INBOX_POLL_MS, deadline - now));
  }
}

export async function receiveCodeInboxEmail(message: ForwardableEmailMessage, env: Env, receivedAt = Date.now()) {
  const recipient = normalizeCodeInboxEmail(message.to);
  if (!recipient) return;

  const raw = await readStreamText(message.raw, CODE_INBOX_MAX_RAW_BYTES);
  const payload = extractCodeInboxPayload({
    raw,
    subject: message.headers.get("subject")
  });
  if (!payload.code && !payload.link) return;

  await pruneCodeInbox(env, receivedAt);
  await env.DB.prepare(
    `INSERT INTO code_messages (id, recipient, sender, code, link, received_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    recipient,
    message.from,
    payload.code,
    payload.link,
    receivedAt
  ).run();
}

async function readLatestCodeInboxMessage(env: Env, recipient: string, since: number) {
  return env.DB.prepare(
    `SELECT code, link, received_at
     FROM code_messages
     WHERE recipient = ?
       AND received_at >= ?
       AND (code IS NOT NULL OR link IS NOT NULL)
     ORDER BY received_at DESC
     LIMIT 1`
  ).bind(recipient, since).first<CodeInboxRow>();
}

async function pruneCodeInbox(env: Env, now: number) {
  await env.DB.prepare("DELETE FROM code_messages WHERE received_at < ?")
    .bind(now - CODE_INBOX_RETENTION_MS)
    .run();
}

async function readStreamText(stream: ReadableStream<Uint8Array>, maxBytes: number) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = value.slice(0, Math.max(0, maxBytes - size));
    chunks.push(chunk);
    size += chunk.byteLength;
    if (size >= maxBytes) {
      await reader.cancel();
      break;
    }
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

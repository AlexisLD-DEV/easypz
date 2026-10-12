export const CODE_INBOX_DOMAIN = "ez1.fr";
export const CODE_INBOX_RECENT_WINDOW_MS = 60_000;
export const CODE_INBOX_FUTURE_WAIT_MS = 12_000;
export const CODE_INBOX_POLL_MS = 750;
export const CODE_INBOX_RETENTION_MS = 24 * 60 * 60 * 1000;
export const CODE_INBOX_MAX_RAW_BYTES = 160_000;

const codeInboxEmailPattern = /^codex[a-z0-9]{4,16}@ez1\.fr$/;
const emailAddressPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const urlPattern = /\bhttps?:\/\/[^\s<>"{}|\\^`[\]]+/i;

export type CodeInboxPayload = {
  code: string | null;
  link: string | null;
};

export function normalizeCodeInboxEmail(value: string | null | undefined) {
  const address = value?.match(emailAddressPattern)?.[0]?.toLowerCase() ?? "";
  return codeInboxEmailPattern.test(address) ? address : null;
}

export function extractCodeInboxPayload(input: { raw: string; subject?: string | null }): CodeInboxPayload {
  const text = emailSearchText(input.raw, input.subject);
  const link = extractFirstLink(text);
  const code = extractOneTimeCode(text);
  return { code, link };
}

export function emailSearchText(raw: string, subject?: string | null) {
  const fragments = [
    decodeMimeHeader(subject ?? ""),
    decodeMimeBody(raw),
    ...decodeMimeParts(raw)
  ];
  return normalizeSearchText(fragments.join("\n"));
}

function decodeMimeBody(raw: string) {
  const separator = raw.match(/\r?\n\r?\n/);
  const body = separator?.index === undefined ? raw : raw.slice(separator.index + separator[0].length);
  return decodeTransferBody(raw, body);
}

function decodeMimeParts(raw: string) {
  const normalized = raw.replace(/\r\n/g, "\n");
  const sections = normalized.split(/\n--[^\n]+/g);
  return sections.flatMap((section) => {
    const separator = section.search(/\n\n/);
    if (separator < 0) return [];
    const headers = section.slice(0, separator);
    const body = section.slice(separator + 2);
    if (!/content-type:\s*text\/(?:plain|html)/i.test(headers)) return [];
    return [decodeTransferBody(headers, body)];
  });
}

function decodeTransferBody(headers: string, body: string) {
  if (/content-transfer-encoding:\s*base64/i.test(headers)) {
    return decodeBase64Text(body);
  }
  if (/content-transfer-encoding:\s*quoted-printable/i.test(headers)) {
    return decodeQuotedPrintable(body);
  }
  return body;
}

function decodeMimeHeader(value: string) {
  return value.replace(/=\?([^?]+)\?([bq])\?([^?]+)\?=/gi, (_match, _charset: string, encoding: string, content: string) => {
    if (encoding.toLowerCase() === "b") return decodeBase64Text(content);
    return decodeQuotedPrintable(content.replace(/_/g, " "));
  });
}

function decodeQuotedPrintable(value: string) {
  return value
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9a-f]{2})/gi, (_match, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));
}

function decodeBase64Text(value: string) {
  const cleaned = value.replace(/[^A-Za-z0-9+/=]/g, "");
  if (!cleaned) return "";
  try {
    const binary = atob(cleaned);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

function normalizeSearchText(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<a\b[^>]*\bhref=(["'])(.*?)\1[^>]*>/gi, " $2 ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function extractFirstLink(text: string) {
  const match = text.match(urlPattern);
  if (!match) return null;
  return match[0].replace(/[),.;:'"]+$/g, "");
}

function extractOneTimeCode(text: string) {
  const withoutLinksOrEmails = text
    .replace(/\bhttps?:\/\/[^\s<>"{}|\\^`[\]]+/gi, " ")
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, " ");
  const labelPattern = /\b(?:code|otp|passcode|one[-\s]?time|verification|v[ée]rification|validation|confirmation|security|authentification|mot de passe|password)\b/gi;
  for (const label of withoutLinksOrEmails.matchAll(labelPattern)) {
    const afterLabel = withoutLinksOrEmails.slice((label.index ?? 0) + label[0].length, (label.index ?? 0) + label[0].length + 100);
    const numeric = afterLabel.match(/\b\d(?:[\d -]{2,14}\d)\b/);
    const numericCode = normalizeCodeCandidate(numeric?.[0] ?? "", true);
    if (numericCode) return numericCode;

    const alphanumeric = afterLabel.match(/\b[a-z0-9][a-z0-9-]{3,15}\b/i);
    const alphanumericCode = normalizeCodeCandidate(alphanumeric?.[0] ?? "", false);
    if (alphanumericCode) return alphanumericCode;
  }

  const numeric = withoutLinksOrEmails.match(/\b\d{4,8}\b/);
  if (numeric) return numeric[0];

  const alphanumeric = withoutLinksOrEmails.match(/\b(?=[A-Z0-9]*\d)[A-Z0-9]{5,12}\b/i);
  return normalizeCodeCandidate(alphanumeric?.[0] ?? "", false);
}

function normalizeCodeCandidate(value: string, allowLettersOnly: boolean) {
  const code = value.replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (code.length < 4 || code.length > 12) return null;
  if (!allowLettersOnly && !/\d/.test(code)) return null;
  return code;
}

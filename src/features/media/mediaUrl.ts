const imageExtensions = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const audioExtensions = new Set(["mp3", "m4a", "wav", "webm", "ogg"]);

export type QuestionMediaKind = "image" | "audio";

/** Legacy image-only helper; audio callers must use questionAudioUrl. */
export function questionMediaUrl(mediaKey?: string | null) {
  return questionImageUrl(mediaKey);
}

export function questionImageUrl(mediaKey?: string | null) {
  const key = mediaKey?.trim();
  return key && questionMediaKind(key) === "image" ? `/api/media/images/${encodeURIComponent(key)}` : null;
}

export function questionAudioUrl(mediaKey?: string | null) {
  const key = mediaKey?.trim();
  return key && questionMediaKind(key) === "audio" ? `/api/media/audio/${encodeURIComponent(key)}` : null;
}

/** Infers media kind from the storage-key extension; this does not validate file contents. */
export function questionMediaKind(mediaKey?: string | null): QuestionMediaKind | null {
  const key = mediaKey?.trim();
  if (!key) return null;
  const extension = key.split(".").pop()?.toLowerCase() ?? "";
  if (imageExtensions.has(extension)) return "image";
  if (audioExtensions.has(extension)) return "audio";
  return null;
}

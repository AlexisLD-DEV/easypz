import type { Env } from "../env";
import { requireUser } from "../auth/guards";
import { HttpError, json } from "../http/response";

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const allowedAudioTypes = new Map([
  ["audio/mpeg", "mp3"],
  ["audio/mp3", "mp3"],
  ["audio/mp4", "m4a"],
  ["audio/x-m4a", "m4a"],
  ["audio/wav", "wav"],
  ["audio/wave", "wav"],
  ["audio/x-wav", "wav"],
  ["audio/webm", "webm"],
  ["audio/ogg", "ogg"]
]);
const imageExtensions = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const audioExtensions = new Set(["mp3", "m4a", "wav", "webm", "ogg"]);

export async function uploadImage(request: Request, env: Env) {
  const user = await requireUser(request, env);
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "file_required");
  if (!allowedTypes.has(file.type)) throw new HttpError(400, "unsupported_image_type");
  if (file.size > 3_000_000) throw new HttpError(400, "image_too_large");
  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const key = `teachers/${user.id}/${crypto.randomUUID()}.${extension}`;
  await env.MEDIA_BUCKET.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  return json({ key });
}

export async function uploadAudio(request: Request, env: Env) {
  const user = await requireUser(request, env);
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "file_required");
  const extension = allowedAudioTypes.get(file.type);
  if (!extension) throw new HttpError(400, "unsupported_audio_type");
  if (file.size > 12_000_000) throw new HttpError(400, "audio_too_large");
  const key = `teachers/${user.id}/${crypto.randomUUID()}.${extension}`;
  await env.MEDIA_BUCKET.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  return json({ key });
}

export async function readImage(env: Env, encodedKey: string) {
  const key = decodeURIComponent(encodedKey);
  if (!isSafeMediaKey(key) || !hasExtension(key, imageExtensions)) throw new HttpError(404, "image_not_found");

  const object = await env.MEDIA_BUCKET.get(key);
  if (!object) throw new HttpError(404, "image_not_found");

  return mediaResponse(object);
}

export async function readAudio(env: Env, encodedKey: string) {
  const key = decodeURIComponent(encodedKey);
  if (!isSafeMediaKey(key) || !hasExtension(key, audioExtensions)) throw new HttpError(404, "audio_not_found");

  const object = await env.MEDIA_BUCKET.get(key);
  if (!object) throw new HttpError(404, "audio_not_found");

  return mediaResponse(object);
}

function isSafeMediaKey(key: string) {
  return key.startsWith("teachers/") && !key.includes("..");
}

function hasExtension(key: string, extensions: Set<string>) {
  const extension = key.split(".").pop()?.toLowerCase() ?? "";
  return extensions.has(extension);
}

function mediaResponse(object: R2ObjectBody) {
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

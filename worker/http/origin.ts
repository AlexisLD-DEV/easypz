import type { Env } from "../env";
import { HttpError } from "./response";

const stateChangingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const protectedMediaPaths = new Set(["/api/media/images", "/api/media/audio"]);

export function isProtectedStateChangingRequest(request: Request, url = new URL(request.url)) {
  if (!stateChangingMethods.has(request.method)) return false;
  if (url.pathname === "/api/auth/logout") return true;
  if (url.pathname.startsWith("/api/admin/")) return true;
  if (url.pathname.startsWith("/api/teacher/")) return true;
  return protectedMediaPaths.has(url.pathname);
}

export function isProtectedLiveSocketRequest(request: Request, url = new URL(request.url)) {
  if (!url.pathname.match(/^\/api\/live\/sessions\/[^/]+\/socket$/)) return false;
  const role = url.searchParams.get("role");
  return role === "teacher" || role === "board";
}

/**
 * Checks Origin, then Referer, against request/configured origins. Headerless non-browser
 * clients are allowed unless Fetch Metadata marks them cross-site.
 */
export function assertTrustedRequestOrigin(request: Request, env: Env) {
  const trustedOrigins = allowedOrigins(request, env);
  const origin = request.headers.get("Origin");
  if (origin) {
    assertOriginAllowed(origin, trustedOrigins);
    return;
  }

  const referer = request.headers.get("Referer");
  if (referer) {
    assertOriginAllowed(referer, trustedOrigins);
    return;
  }

  if (request.headers.get("Sec-Fetch-Site") === "cross-site") {
    throw new HttpError(403, "untrusted_origin");
  }

  // Non-browser smoke clients may omit Origin/Referer; browsers still expose
  // cross-site intent via Origin, Referer, or Fetch Metadata.
}

function allowedOrigins(request: Request, env: Env) {
  const origins = new Set<string>([new URL(request.url).origin]);
  for (const value of env.APP_ORIGIN?.split(/[\s,]+/) ?? []) {
    const normalized = normalizeOrigin(value);
    if (normalized) origins.add(normalized);
  }
  return origins;
}

function assertOriginAllowed(value: string, trustedOrigins: Set<string>) {
  const origin = normalizeOrigin(value);
  if (!origin || !trustedOrigins.has(origin)) {
    throw new HttpError(403, "untrusted_origin");
  }
}

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

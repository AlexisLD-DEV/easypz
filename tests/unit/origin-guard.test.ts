import { describe, expect, it } from "vitest";
import type { Env } from "../../worker/env";
import {
  assertTrustedRequestOrigin,
  isProtectedLiveSocketRequest,
  isProtectedStateChangingRequest
} from "../../worker/http/origin";

const env = {
  APP_ORIGIN: "https://easypz.fr"
} as Env;

function request(path: string, init: RequestInit = {}) {
  return new Request(`https://quiz.example.org${path}`, init);
}

describe("origin guard", () => {
  it("marks cookie-authenticated mutations as protected", () => {
    expect(isProtectedStateChangingRequest(request("/api/teacher/quizzes", { method: "POST" }))).toBe(true);
    expect(isProtectedStateChangingRequest(request("/api/admin/allowed-emails/a%40b.test", { method: "DELETE" }))).toBe(true);
    expect(isProtectedStateChangingRequest(request("/api/media/images", { method: "POST" }))).toBe(true);
    expect(isProtectedStateChangingRequest(request("/api/auth/logout", { method: "POST" }))).toBe(true);
  });

  it("leaves public non-cookie mutations outside the CSRF guard", () => {
    expect(isProtectedStateChangingRequest(request("/api/public/quizzes/demo/practice/start", { method: "POST" }))).toBe(false);
    expect(isProtectedStateChangingRequest(request("/api/practice/attempt-1/answers", { method: "POST" }))).toBe(false);
    expect(isProtectedStateChangingRequest(request("/api/live/ABC123/join", { method: "POST" }))).toBe(false);
  });

  it("protects teacher and board websocket upgrades", () => {
    expect(isProtectedLiveSocketRequest(request("/api/live/sessions/session-1/socket?role=teacher"))).toBe(true);
    expect(isProtectedLiveSocketRequest(request("/api/live/sessions/session-1/socket?role=board"))).toBe(true);
    expect(isProtectedLiveSocketRequest(request("/api/live/sessions/session-1/socket?role=student"))).toBe(false);
  });

  it("allows current request origin and configured app origin", () => {
    expect(() => assertTrustedRequestOrigin(request("/api/teacher/quizzes", {
      method: "POST",
      headers: { Origin: "https://quiz.example.org" }
    }), env)).not.toThrow();

    expect(() => assertTrustedRequestOrigin(request("/api/teacher/quizzes", {
      method: "POST",
      headers: { Origin: "https://easypz.fr" }
    }), env)).not.toThrow();
  });

  it("allows matching referer when Origin is absent", () => {
    expect(() => assertTrustedRequestOrigin(request("/api/teacher/quizzes", {
      method: "POST",
      headers: { Referer: "https://quiz.example.org/dashboard" }
    }), env)).not.toThrow();
  });

  it("rejects cross-site origins and fetch metadata", () => {
    expect(() => assertTrustedRequestOrigin(request("/api/teacher/quizzes", {
      method: "POST",
      headers: { Origin: "https://attacker.example" }
    }), env)).toThrowError(expect.objectContaining({ status: 403, code: "untrusted_origin" }));

    expect(() => assertTrustedRequestOrigin(request("/api/teacher/quizzes", {
      method: "POST",
      headers: { "Sec-Fetch-Site": "cross-site" }
    }), env)).toThrowError(expect.objectContaining({ status: 403, code: "untrusted_origin" }));
  });
});

import { describe, expect, it } from "vitest";
import { authRouteDecision, isProtectedTeacherPath, safeLoginRedirect } from "../../src/authRouting";

describe("authRouteDecision", () => {
  it("allows public routes without waiting for auth", () => {
    expect(authRouteDecision("/", null, false)).toEqual({ kind: "allow" });
    expect(authRouteDecision("/join/ABC123", null, false)).toEqual({ kind: "allow" });
  });

  it("waits before rendering protected teacher routes", () => {
    expect(authRouteDecision("/dashboard", null, false)).toEqual({ kind: "loading" });
  });

  it("redirects anonymous visitors to login from protected teacher routes", () => {
    expect(authRouteDecision("/dashboard", null, true)).toEqual({ kind: "redirect", to: "/login?next=%2Fdashboard" });
    expect(authRouteDecision("/live/teacher/session-1", null, true)).toEqual({
      kind: "redirect",
      to: "/login?next=%2Flive%2Fteacher%2Fsession-1"
    });
    expect(authRouteDecision("/sessions/session-1/results", null, true)).toEqual({
      kind: "redirect",
      to: "/login?next=%2Fsessions%2Fsession-1%2Fresults"
    });
  });

  it("keeps admin routes for admins only", () => {
    expect(authRouteDecision("/admin/allowed-emails", { role: "teacher" }, true)).toEqual({ kind: "redirect", to: "/dashboard" });
    expect(authRouteDecision("/admin/allowed-emails", { role: "admin" }, true)).toEqual({ kind: "allow" });
  });
});

describe("isProtectedTeacherPath", () => {
  it("marks teacher workspace routes as protected", () => {
    expect(isProtectedTeacherPath("/editor")).toBe(true);
    expect(isProtectedTeacherPath("/question-bank")).toBe(true);
    expect(isProtectedTeacherPath("/live/teacher/session")).toBe(true);
    expect(isProtectedTeacherPath("/live/board/session")).toBe(true);
    expect(isProtectedTeacherPath("/sessions/abc/results")).toBe(true);
  });

  it("leaves public and live student routes open", () => {
    expect(isProtectedTeacherPath("/")).toBe(false);
    expect(isProtectedTeacherPath("/join/ABC123")).toBe(false);
    expect(isProtectedTeacherPath("/live/student/session/participant")).toBe(false);
  });
});

describe("safeLoginRedirect", () => {
  it("returns the next path after login when it is local", () => {
    expect(safeLoginRedirect("?next=%2Fquestion-bank")).toBe("/question-bank");
  });

  it("falls back to the dashboard for missing or unsafe next values", () => {
    expect(safeLoginRedirect("")).toBe("/dashboard");
    expect(safeLoginRedirect("?next=https%3A%2F%2Fevil.example")).toBe("/dashboard");
    expect(safeLoginRedirect("?next=%2F%2Fevil.example")).toBe("/dashboard");
  });
});

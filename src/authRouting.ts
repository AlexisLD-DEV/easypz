export type AuthRouteUser = { role: string } | null;

const protectedPrefixes = [
  "/dashboard",
  "/results",
  "/settings",
  "/question-bank",
  "/editor",
  "/admin/allowed-emails",
  "/sessions/",
  "/live/teacher/",
  "/live/board/"
];

export type AuthRouteDecision =
  | { kind: "allow" }
  | { kind: "loading" }
  | { kind: "redirect"; to: string };

export function authRouteDecision(path: string, user: AuthRouteUser, authChecked: boolean): AuthRouteDecision {
  if (!isProtectedTeacherPath(path)) return { kind: "allow" };
  if (!authChecked) return { kind: "loading" };
  if (!user) return { kind: "redirect", to: `/login?next=${encodeURIComponent(path)}` };
  if (path.startsWith("/admin/") && user.role !== "admin") return { kind: "redirect", to: "/dashboard" };
  return { kind: "allow" };
}

export function isProtectedTeacherPath(path: string) {
  return protectedPrefixes.some((prefix) => path === prefix || path.startsWith(prefix));
}

export function safeLoginRedirect(search: string) {
  const next = new URLSearchParams(search).get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

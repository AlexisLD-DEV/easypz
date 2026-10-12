export type PracticeAccess =
  | { kind: "public"; slug: string }
  | { kind: "secret"; token: string };

export function practiceQuizPath(access: PracticeAccess) {
  if (access.kind === "secret") return `/api/public/secret-quizzes/${encodeURIComponent(access.token)}`;
  return `/api/public/quizzes/${encodeURIComponent(access.slug)}`;
}

export function practiceStartPath(access: PracticeAccess) {
  return `${practiceQuizPath(access)}/practice/start`;
}

export function practiceUrl(access: PracticeAccess) {
  if (access.kind === "secret") return `/practice/secret/${encodeURIComponent(access.token)}`;
  return `/practice/${encodeURIComponent(access.slug)}`;
}

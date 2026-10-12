import { describe, expect, it } from "vitest";
import { practiceQuizPath, practiceStartPath, practiceUrl } from "../../src/features/practice/practiceAccess";

describe("practice access paths", () => {
  it("builds public practice API paths from a slug", () => {
    const access = { kind: "public", slug: "irregular-verbs" } as const;

    expect(practiceQuizPath(access)).toBe("/api/public/quizzes/irregular-verbs");
    expect(practiceStartPath(access)).toBe("/api/public/quizzes/irregular-verbs/practice/start");
    expect(practiceUrl(access)).toBe("/practice/irregular-verbs");
  });

  it("builds secret practice API paths from a token", () => {
    const access = { kind: "secret", token: "abc123" } as const;

    expect(practiceQuizPath(access)).toBe("/api/public/secret-quizzes/abc123");
    expect(practiceStartPath(access)).toBe("/api/public/secret-quizzes/abc123/practice/start");
    expect(practiceUrl(access)).toBe("/practice/secret/abc123");
  });

  it("encodes unsafe slug and token characters", () => {
    expect(practiceUrl({ kind: "public", slug: "a b/c" })).toBe("/practice/a%20b%2Fc");
    expect(practiceUrl({ kind: "secret", token: "a b/c" })).toBe("/practice/secret/a%20b%2Fc");
  });
});

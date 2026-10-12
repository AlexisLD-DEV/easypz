import { describe, expect, it } from "vitest";
import { buildDuplicateQuizMetadata } from "../../worker/quizzes/duplicate";

describe("buildDuplicateQuizMetadata", () => {
  it("creates a private draft copy with a safe copied title and slug", () => {
    const duplicate = buildDuplicateQuizMetadata({
      title: "Verbes irréguliers test",
      description: "Revision rapide",
      primaryLanguage: "en",
      level: "A2",
      tagsJson: "[\"grammar\"]",
      defaultTimeLimitSeconds: 30,
      showCorrection: 1,
      speedScoring: 1
    }, "abc12");

    expect(duplicate).toEqual({
      title: "Copie de Verbes irréguliers test",
      description: "Revision rapide",
      primaryLanguage: "en",
      level: "A2",
      tagsJson: "[\"grammar\"]",
      visibility: "private",
      status: "draft",
      slug: "copie-de-verbes-irreguliers-test-abc12",
      secretToken: null,
      defaultTimeLimitSeconds: 30,
      showCorrection: 1,
      speedScoring: 1,
      publishedAt: null
    });
  });

  it("keeps copied titles inside the quiz title length limit", () => {
    const duplicate = buildDuplicateQuizMetadata({
      title: "A".repeat(140),
      description: "",
      primaryLanguage: "fr",
      level: "",
      tagsJson: "[]",
      defaultTimeLimitSeconds: 45,
      showCorrection: 0,
      speedScoring: 0
    }, "x1");

    expect(duplicate.title).toHaveLength(120);
    expect(duplicate.slug.endsWith("-x1")).toBe(true);
  });
});

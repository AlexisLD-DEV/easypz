import { describe, expect, it } from "vitest";
import { primaryResultInsights } from "../../src/features/results/sessionResultsViewModel";

describe("session results view model", () => {
  it("keeps the main post-session insights focused", () => {
    expect(primaryResultInsights({
      participantCount: 30,
      averageScore: 840,
      accuracyPercent: 72,
      questionsToReviewCount: 3
    })).toEqual([
      { key: "students", value: "30" },
      { key: "averageScore", value: "840" },
      { key: "successRate", value: "72%" },
      { key: "questionsToReview", value: "3" }
    ]);
  });
});

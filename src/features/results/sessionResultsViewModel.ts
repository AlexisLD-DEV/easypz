export type PrimaryResultInsightInput = {
  participantCount: number;
  averageScore: number;
  accuracyPercent: number;
  questionsToReviewCount: number;
};

export type PrimaryResultInsight = {
  key: "students" | "averageScore" | "successRate" | "questionsToReview";
  value: string;
};

export function primaryResultInsights(input: PrimaryResultInsightInput): PrimaryResultInsight[] {
  return [
    { key: "students", value: String(input.participantCount) },
    { key: "averageScore", value: String(input.averageScore) },
    { key: "successRate", value: `${input.accuracyPercent}%` },
    { key: "questionsToReview", value: String(input.questionsToReviewCount) }
  ];
}

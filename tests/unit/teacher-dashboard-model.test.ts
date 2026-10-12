import { describe, expect, it } from "vitest";
import { dashboardQuizAccessHint, formatDashboardDate, recentLiveSessions } from "../../src/features/dashboard/teacherDashboardModel";

const sessions = [
  { id: "s1", quizTitle: "Quiz 1", code: "AAAA1", status: "ended", participantCount: 30, answerCount: 120 },
  { id: "s2", quizTitle: "Quiz 2", code: "BBBB2", status: "question", participantCount: 24, answerCount: 82 },
  { id: "s3", quizTitle: "Quiz 3", code: "CCCC3", status: "lobby", participantCount: 12, answerCount: 0 },
  { id: "s4", quizTitle: "Quiz 4", code: "DDDD4", status: "ended", participantCount: 28, answerCount: 102 }
];

describe("teacher dashboard model", () => {
  it("keeps only the most recent live sessions for the dashboard panel", () => {
    expect(recentLiveSessions(sessions, 3).map((session) => session.id)).toEqual(["s1", "s2", "s3"]);
  });

  it("does not mutate the original session list", () => {
    const result = recentLiveSessions(sessions, 2);

    expect(result).toEqual([sessions[0], sessions[1]]);
    expect(sessions).toHaveLength(4);
  });

  it("treats negative limits as an empty recent list", () => {
    expect(recentLiveSessions(sessions, -1)).toEqual([]);
  });

  it("formats dashboard dates for the selected locale", () => {
    expect(formatDashboardDate("2026-05-19 10:00:00", "fr")).toContain("2026");
    expect(formatDashboardDate("2026-05-19 10:00:00", "fr")).toMatch(/10:00|10 h 00/);
  });

  it("keeps invalid dashboard dates unchanged", () => {
    expect(formatDashboardDate("not-a-date", "fr")).toBe("not-a-date");
  });

  it("explains classroom launch access separately from publication", () => {
    const labels = {
      draftClassReady: "draft class",
      privateClassReady: "private class",
      publicPracticeReady: "public practice",
      secretPracticeReady: "secret practice"
    };

    expect(dashboardQuizAccessHint({ status: "draft", visibility: "public" }, labels)).toBe("draft class");
    expect(dashboardQuizAccessHint({ status: "published", visibility: "private" }, labels)).toBe("private class");
    expect(dashboardQuizAccessHint({ status: "published", visibility: "public" }, labels)).toBe("public practice");
    expect(dashboardQuizAccessHint({ status: "published", visibility: "secret_link" }, labels)).toBe("secret practice");
  });
});

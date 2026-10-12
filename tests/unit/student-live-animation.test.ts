import { describe, expect, it } from "vitest";
import { studentAnswerMotionDelay, studentFeedbackPolish } from "../../src/features/live/studentLiveAnimation";

describe("student live animation", () => {
  it("staggers tactile answer tiles with a short mobile-friendly delay", () => {
    expect(studentAnswerMotionDelay(0)).toBe(0);
    expect(studentAnswerMotionDelay(1)).toBe(0.035);
    expect(studentAnswerMotionDelay(3)).toBe(0.105);
    expect(studentAnswerMotionDelay(-1)).toBe(0);
  });

  it("only shows the celebration animation for successful feedback", () => {
    expect(studentFeedbackPolish(null)).toEqual({
      className: "student-feedback-polished",
      showCelebration: false
    });
    expect(studentFeedbackPolish("good")).toEqual({
      className: "student-feedback-polished student-feedback-celebration",
      showCelebration: true
    });
    expect(studentFeedbackPolish("warn")).toEqual({
      className: "student-feedback-polished",
      showCelebration: false
    });
  });
});

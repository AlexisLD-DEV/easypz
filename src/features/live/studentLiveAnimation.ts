export type StudentFeedbackTone = "good" | "warn" | "neutral" | "bad";

export function studentAnswerMotionDelay(index: number) {
  return Number((Math.max(0, index) * 0.035).toFixed(3));
}

export function studentFeedbackPolish(tone: StudentFeedbackTone | null) {
  const showCelebration = tone === "good";
  return {
    className: showCelebration ? "student-feedback-polished student-feedback-celebration" : "student-feedback-polished",
    showCelebration
  };
}

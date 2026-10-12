import { describe, expect, it } from "vitest";
import { defaultLiveSettings, normalizeLiveSettings } from "../../worker/live/settings";

describe("live settings", () => {
  it("enables classroom displays by default", () => {
    expect(defaultLiveSettings()).toEqual({
      showLeaderboard: true,
      showStudentFeedback: true
    });
  });

  it("merges partial teacher settings with defaults", () => {
    expect(normalizeLiveSettings({ showLeaderboard: false })).toEqual({
      showLeaderboard: false,
      showStudentFeedback: true
    });
    expect(normalizeLiveSettings({ showStudentFeedback: false })).toEqual({
      showLeaderboard: true,
      showStudentFeedback: false
    });
  });
});

import type { LiveDisplaySettings } from "./protocol";

export function defaultLiveSettings(): LiveDisplaySettings {
  return {
    showLeaderboard: true,
    showStudentFeedback: true
  };
}

export function normalizeLiveSettings(settings?: Partial<LiveDisplaySettings> | null): LiveDisplaySettings {
  const defaults = defaultLiveSettings();
  return {
    showLeaderboard: typeof settings?.showLeaderboard === "boolean" ? settings.showLeaderboard : defaults.showLeaderboard,
    showStudentFeedback: typeof settings?.showStudentFeedback === "boolean" ? settings.showStudentFeedback : defaults.showStudentFeedback
  };
}

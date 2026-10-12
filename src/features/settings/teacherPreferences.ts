import type { ColorMode } from "../accessibility/colorMode";
import type { Locale } from "../../i18n/translations";
import type { LiveDisplaySettings } from "../../../worker/live/protocol";

export type TeacherPreferences = {
  defaultLocale: Locale;
  defaultColorMode: ColorMode;
  defaultShowLeaderboard: boolean;
  defaultShowStudentFeedback: boolean;
};

export type TeacherPreferencesStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export const teacherPreferencesStorageKey = "quiz_english_teacher_preferences";

export function defaultTeacherPreferences(): TeacherPreferences {
  return {
    defaultLocale: "en",
    defaultColorMode: "standard",
    defaultShowLeaderboard: true,
    defaultShowStudentFeedback: true
  };
}

export function readTeacherPreferences(storage: TeacherPreferencesStorage | null | undefined = browserStorage()): TeacherPreferences {
  const defaults = defaultTeacherPreferences();
  const raw = storage?.getItem(teacherPreferencesStorageKey);
  if (!raw) return defaults;

  try {
    const parsed = JSON.parse(raw) as Partial<TeacherPreferences>;
    return {
      defaultLocale: parsed.defaultLocale === "fr" || parsed.defaultLocale === "en" ? parsed.defaultLocale : defaults.defaultLocale,
      defaultColorMode: parsed.defaultColorMode === "colorblind" || parsed.defaultColorMode === "standard" ? parsed.defaultColorMode : defaults.defaultColorMode,
      defaultShowLeaderboard: typeof parsed.defaultShowLeaderboard === "boolean" ? parsed.defaultShowLeaderboard : defaults.defaultShowLeaderboard,
      defaultShowStudentFeedback: typeof parsed.defaultShowStudentFeedback === "boolean" ? parsed.defaultShowStudentFeedback : defaults.defaultShowStudentFeedback
    };
  } catch {
    return defaults;
  }
}

export function writeTeacherPreferences(storage: TeacherPreferencesStorage | null | undefined, preferences: TeacherPreferences) {
  storage?.setItem(teacherPreferencesStorageKey, JSON.stringify(preferences));
}

export function resetTeacherPreferences(storage: TeacherPreferencesStorage | null | undefined) {
  storage?.removeItem(teacherPreferencesStorageKey);
}

export function liveSettingsPatchFromPreferences(
  currentSettings: LiveDisplaySettings,
  preferences: TeacherPreferences
): Partial<LiveDisplaySettings> | null {
  const patch: Partial<LiveDisplaySettings> = {};
  if (currentSettings.showLeaderboard !== preferences.defaultShowLeaderboard) {
    patch.showLeaderboard = preferences.defaultShowLeaderboard;
  }
  if (currentSettings.showStudentFeedback !== preferences.defaultShowStudentFeedback) {
    patch.showStudentFeedback = preferences.defaultShowStudentFeedback;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

export const teacherPreferencesChangedEvent = "quiz_english_preferences_changed";

function browserStorage(): TeacherPreferencesStorage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

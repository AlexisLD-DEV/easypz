import { describe, expect, it } from "vitest";
import {
  defaultTeacherPreferences,
  liveSettingsPatchFromPreferences,
  readTeacherPreferences,
  resetTeacherPreferences,
  teacherPreferencesStorageKey,
  writeTeacherPreferences,
  type TeacherPreferencesStorage
} from "../../src/features/settings/teacherPreferences";

function memoryStorage(initial: Record<string, string> = {}): TeacherPreferencesStorage & { data: Record<string, string> } {
  return {
    data: { ...initial },
    getItem(key) {
      return this.data[key] ?? null;
    },
    setItem(key, value) {
      this.data[key] = value;
    },
    removeItem(key) {
      delete this.data[key];
    }
  };
}

describe("teacher preferences", () => {
  it("uses English, standard display, and visible live feedback by default", () => {
    expect(defaultTeacherPreferences()).toEqual({
      defaultLocale: "en",
      defaultColorMode: "standard",
      defaultShowLeaderboard: true,
      defaultShowStudentFeedback: true
    });
  });

  it("reads saved preferences and ignores invalid values", () => {
    const storage = memoryStorage({
      [teacherPreferencesStorageKey]: JSON.stringify({
        defaultLocale: "fr",
        defaultColorMode: "bad",
        defaultShowLeaderboard: false,
        defaultShowStudentFeedback: "yes"
      })
    });

    expect(readTeacherPreferences(storage)).toEqual({
      defaultLocale: "fr",
      defaultColorMode: "standard",
      defaultShowLeaderboard: false,
      defaultShowStudentFeedback: true
    });
  });

  it("writes and resets preferences", () => {
    const storage = memoryStorage();

    writeTeacherPreferences(storage, {
      defaultLocale: "fr",
      defaultColorMode: "colorblind",
      defaultShowLeaderboard: false,
      defaultShowStudentFeedback: false
    });
    expect(readTeacherPreferences(storage)).toEqual({
      defaultLocale: "fr",
      defaultColorMode: "colorblind",
      defaultShowLeaderboard: false,
      defaultShowStudentFeedback: false
    });

    resetTeacherPreferences(storage);
    expect(readTeacherPreferences(storage)).toEqual(defaultTeacherPreferences());
  });

  it("builds the live settings patch needed to apply saved defaults", () => {
    expect(liveSettingsPatchFromPreferences(
      { showLeaderboard: true, showStudentFeedback: true },
      { ...defaultTeacherPreferences(), defaultShowLeaderboard: false }
    )).toEqual({ showLeaderboard: false });

    expect(liveSettingsPatchFromPreferences(
      { showLeaderboard: true, showStudentFeedback: false },
      { ...defaultTeacherPreferences(), defaultShowStudentFeedback: false }
    )).toBeNull();
  });
});

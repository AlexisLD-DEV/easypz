import { useState } from "react";
import { useI18n } from "../../i18n/useI18n";
import { colorModeStorageKey } from "../accessibility/colorMode";
import {
  defaultTeacherPreferences,
  readTeacherPreferences,
  resetTeacherPreferences,
  teacherPreferencesChangedEvent,
  writeTeacherPreferences,
  type TeacherPreferences
} from "./teacherPreferences";

export function SettingsPage() {
  const { setLocale, t } = useI18n();
  const [preferences, setPreferences] = useState<TeacherPreferences>(() => readTeacherPreferences());
  const [status, setStatus] = useState("");

  function updatePreference<Key extends keyof TeacherPreferences>(key: Key, value: TeacherPreferences[Key]) {
    setPreferences((current) => ({ ...current, [key]: value }));
    setStatus("");
  }

  function savePreferences() {
    writeTeacherPreferences(window.localStorage, preferences);
    window.localStorage.setItem("locale", preferences.defaultLocale);
    window.localStorage.setItem(colorModeStorageKey, preferences.defaultColorMode);
    setLocale(preferences.defaultLocale);
    window.dispatchEvent(new Event(teacherPreferencesChangedEvent));
    setStatus(t("settings.saved"));
  }

  function restoreDefaults() {
    const defaults = defaultTeacherPreferences();
    resetTeacherPreferences(window.localStorage);
    window.localStorage.setItem("locale", defaults.defaultLocale);
    window.localStorage.setItem(colorModeStorageKey, defaults.defaultColorMode);
    setLocale(defaults.defaultLocale);
    setPreferences(defaults);
    window.dispatchEvent(new Event(teacherPreferencesChangedEvent));
    setStatus(t("settings.resetDone"));
  }

  return (
    <section className="settings-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t("appName")}</p>
          <h1>{t("settings.title")}</h1>
        </div>
        <a className="button-link" href="/dashboard">{t("settings.backDashboard")}</a>
      </header>

      <section className="settings-panel">
        <h2>{t("settings.displayTitle")}</h2>
        <p>{t("settings.displayBody")}</p>
        <div className="settings-grid">
          <label>
            <span>{t("settings.defaultLanguage")}</span>
            <select
              value={preferences.defaultLocale}
              onChange={(event) => updatePreference("defaultLocale", event.target.value as TeacherPreferences["defaultLocale"])}
            >
              <option value="en">{t("settings.english")}</option>
              <option value="fr">{t("settings.french")}</option>
            </select>
          </label>
          <label>
            <span>{t("settings.defaultDisplay")}</span>
            <select
              value={preferences.defaultColorMode}
              onChange={(event) => updatePreference("defaultColorMode", event.target.value as TeacherPreferences["defaultColorMode"])}
            >
              <option value="standard">{t("settings.standardMode")}</option>
              <option value="colorblind">{t("settings.colorblindMode")}</option>
            </select>
          </label>
        </div>
      </section>

      <section className="settings-panel">
        <h2>{t("settings.liveTitle")}</h2>
        <p>{t("settings.liveBody")}</p>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={preferences.defaultShowLeaderboard}
            onChange={(event) => updatePreference("defaultShowLeaderboard", event.target.checked)}
          />
          <span>
            <strong>{t("settings.defaultLeaderboard")}</strong>
            <small>{t("settings.defaultLeaderboardHelp")}</small>
          </span>
        </label>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={preferences.defaultShowStudentFeedback}
            onChange={(event) => updatePreference("defaultShowStudentFeedback", event.target.checked)}
          />
          <span>
            <strong>{t("settings.defaultStudentFeedback")}</strong>
            <small>{t("settings.defaultStudentFeedbackHelp")}</small>
          </span>
        </label>
      </section>

      <section className="settings-panel">
        <h2>{t("settings.emailTitle")}</h2>
        <p>{t("settings.emailBody")}</p>
      </section>

      <div className="settings-actions">
        <button type="button" onClick={savePreferences}>{t("settings.save")}</button>
        <button type="button" className="secondary-action" onClick={restoreDefaults}>{t("settings.reset")}</button>
        {status ? <span className="settings-status">{status}</span> : null}
      </div>
    </section>
  );
}

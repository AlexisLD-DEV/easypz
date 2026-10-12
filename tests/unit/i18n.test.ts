import { describe, expect, it } from "vitest";
import { getInitialLocale, getLocaleToggleLabel } from "../../src/i18n/useI18n";
import { translate, translations, type TranslationKey } from "../../src/i18n/translations";

describe("translations", () => {
  it("keeps French and English translation tables complete", () => {
    const frKeys = Object.keys(translations.fr).sort();
    const enKeys = Object.keys(translations.en).sort();

    expect(enKeys).toEqual(frKeys);
    for (const key of frKeys as TranslationKey[]) {
      expect(translate("fr", key).trim()).not.toBe("");
      expect(translate("en", key).trim()).not.toBe("");
      expect(translate("fr", key)).not.toBe(key);
      expect(translate("en", key)).not.toBe(key);
    }
  });

  it("uses English as the default site language when no choice is saved", () => {
    expect(getInitialLocale(null)).toBe("en");
  });

  it("keeps the saved manual language choice when present", () => {
    expect(getInitialLocale("fr")).toBe("fr");
    expect(getInitialLocale("en")).toBe("en");
  });

  it("shows the language that will be selected by clicking the toggle", () => {
    expect(getLocaleToggleLabel("en")).toBe("FR");
    expect(getLocaleToggleLabel("fr")).toBe("EN");
  });

  it("returns English copy for main navigation and gallery labels", () => {
    expect(translate("en", "appName")).toBe("EasyPZ");
    expect(translate("fr", "appName")).toBe("EasyPZ");
    expect(translate("en", "nav.gallery")).toBe("Quiz");
    expect(translate("en", "nav.login")).toBe("Log in");
    expect(translate("en", "gallery.title")).toBe("Quiz public");
    expect(translate("en", "dashboard.publicGallery")).toBe("Quiz public");
    expect(translate("fr", "dashboard.publicGallery")).toBe("Quiz public");
    expect(translate("en", "gallery.quizCountMany")).toBe("{count} public quizzes");
    expect(translate("fr", "gallery.quizCountMany")).toBe("{count} quiz publics");
    expect(translate("en", "app.loading")).toBe("Loading...");
    expect(translate("en", "practice.expectedFormat")).toBe("Expected format");
    expect(translate("en", "auth.password")).toBe("Password");
  });

  it("falls back to French copy when an unknown locale is not provided", () => {
    expect(translate("fr", "dashboard.title")).toBe("Mes quiz");
  });

  it("covers the remaining teacher, live, practice, admin, and results surfaces", () => {
    const keys: TranslationKey[] = [
      "editor.newQuiz",
      "editor.questionImage",
      "admin.allowedEmails",
      "admin.bannedTerms",
      "join.title",
      "live.teacherSession",
      "live.leaderboard",
      "live.lookAtBoard",
      "practice.training",
      "practice.nextQuestion",
      "results.averageScore",
      "results.frequentMistakes",
      "nav.bank",
      "bank.title",
      "bank.newQuestion",
      "bank.fromBank",
      "bank.addToBank",
      "bank.similarTitle"
    ];

    for (const key of keys) {
      expect(translate("fr", key)).not.toBe("");
      expect(translate("en", key)).not.toBe("");
    }
    expect(translate("en", "editor.newQuiz")).toBe("New classroom quiz");
    expect(translate("en", "live.lookAtBoard")).toBe("Look at the board");
    expect(translate("en", "nav.bank")).toBe("Bank");
    expect(translate("en", "bank.title")).toBe("Question bank");
  });

  it("uses classroom-focused wording on key teacher and student screens", () => {
    expect(translate("fr", "nav.dashboard")).toBe("Espace prof");
    expect(translate("en", "nav.dashboard")).toBe("Teacher space");
    expect(translate("fr", "dashboard.teacherCockpit")).toBe("Aujourd'hui en classe");
    expect(translate("en", "dashboard.teacherCockpit")).toBe("Today in class");
    expect(translate("fr", "live.studentLobbyHelp")).toBe("Attends le signal du professeur.");
    expect(translate("en", "results.detailedAnalysis")).toBe("Question-by-question analysis");
  });

  it("has guided editor copy for the simplified creation flow", () => {
    expect(translate("fr", "editor.flowHelp")).toContain("Crée une question");
    expect(translate("fr", "editor.stepAnswers")).toBe("Réponses");
    expect(translate("fr", "editor.quizInfo")).toBe("Base du quiz");
    expect(translate("fr", "editor.draftOrPublication")).toBe("Visibilité et entraînement");
    expect(translate("en", "editor.flowHelp")).toContain("Create a question");
    expect(translate("en", "editor.stepAnswers")).toBe("Answers");
  });

  it("separates quiz options from question options in the editor", () => {
    expect(translate("fr", "editor.questionOptions")).toBe("Options de la question");
    expect(translate("en", "editor.questionOptions")).toBe("Question options");
    expect(translate("fr", "editor.advancedOptions")).toBe("Options avancées");
  });
});

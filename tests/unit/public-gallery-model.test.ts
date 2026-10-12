import { describe, expect, it } from "vitest";
import {
  automaticMobileLaunchQuizzes,
  filterPublicQuizzes,
  galleryCountLabel,
  galleryFilterOptions,
  isTouchFriendlyQuiz,
  parseQuizTags,
  publicQuizCardView,
  quizCoverMeta
} from "../../src/features/public/publicGalleryModel";

const quizzes = [
  {
    id: "q1",
    title: "Irregular verbs",
    description: "Past tense practice",
    primary_language: "en",
    level: "A2",
    tags_json: "[\"grammar\",\"verbs\"]",
    slug: "irregular-verbs",
    question_count: 1,
    choice_count: 0,
    question_types: "short_answer"
  },
  {
    id: "q2",
    title: "Culture quiz",
    description: "London landmarks",
    primary_language: "en",
    level: "B1",
    tags_json: "[\"culture\"]",
    slug: "culture",
    question_count: 2,
    choice_count: 6,
    question_types: "multiple_choice,true_false",
    cover_media_key: "teachers/admin/culture-cover.jpg"
  },
  {
    id: "q3",
    title: "Vocabulaire classe",
    description: "Objets de la salle",
    primary_language: "fr",
    level: "",
    tags_json: "bad-json",
    slug: "vocabulaire",
    question_count: 0,
    choice_count: 0,
    question_types: null
  },
  {
    id: "q4",
    title: "Broken QCM",
    description: "No choices",
    primary_language: "en",
    level: "B1",
    tags_json: "[]",
    slug: "broken-qcm",
    question_count: 1,
    choice_count: 0,
    question_types: "multiple_choice"
  }
];

describe("public gallery model", () => {
  it("parses quiz tags safely", () => {
    expect(parseQuizTags("[\"grammar\",\"verbs\"]")).toEqual(["grammar", "verbs"]);
    expect(parseQuizTags("bad-json")).toEqual([]);
  });

  it("filters quizzes by search and level", () => {
    expect(filterPublicQuizzes(quizzes, { search: "verb", type: "all", level: "A2" })).toEqual([quizzes[0]]);
    expect(filterPublicQuizzes(quizzes, { search: "landmarks", type: "all", level: "all" })).toEqual([quizzes[1]]);
    expect(filterPublicQuizzes(quizzes, { search: "missing", type: "all", level: "all" })).toEqual([]);
    expect(filterPublicQuizzes(quizzes, { search: "", type: "true_false", level: "all" })).toEqual([quizzes[1]]);
  });

  it("builds stable filter options from visible quiz metadata", () => {
    expect(galleryFilterOptions(quizzes)).toEqual({
      types: ["multiple_choice", "short_answer", "true_false"],
      levels: ["A2", "B1"]
    });
  });

  it("keeps automatic mobile launches to tactile question types", () => {
    expect(isTouchFriendlyQuiz(quizzes[0])).toBe(false);
    expect(isTouchFriendlyQuiz(quizzes[1])).toBe(true);
    expect(isTouchFriendlyQuiz(quizzes[2])).toBe(false);
    expect(isTouchFriendlyQuiz(quizzes[3])).toBe(false);
  });

  it("does not fall back to written quizzes for automatic mobile launches", () => {
    expect(automaticMobileLaunchQuizzes([quizzes[0], quizzes[2], quizzes[3]])).toEqual([]);
    expect(automaticMobileLaunchQuizzes(quizzes)).toEqual([quizzes[1]]);
  });

  it("shows loading instead of a zero count before public quizzes are loaded", () => {
    const labels = {
      loading: "Loading public quizzes...",
      one: "{count} public quiz",
      many: "{count} public quizzes"
    };

    expect(galleryCountLabel(0, true, labels)).toBe("Loading public quizzes...");
    expect(galleryCountLabel(1, false, labels)).toBe("1 public quiz");
    expect(galleryCountLabel(2, false, labels)).toBe("2 public quizzes");
  });

  it("localizes the irregular verbs public card in French", () => {
    expect(publicQuizCardView(quizzes[0], "fr")).toEqual({
      title: "Verbes irreguliers - preterit & participe passe",
      description: "Ecris le preterit et le participe passe de chaque verbe irregulier.",
      tags: ["verbes irreguliers", "preterit", "participe passe"],
      accentText: "go -> went / gone",
      visualTone: "grammar",
      coverMediaKey: null
    });
  });

  it("keeps the irregular verbs public card in English by default", () => {
    expect(publicQuizCardView(quizzes[0], "en")).toMatchObject({
      title: "Irregular verbs",
      description: "Past tense practice",
      tags: ["grammar", "verbs"],
      accentText: "go -> went / gone",
      visualTone: "grammar",
      coverMediaKey: null
    });
  });

  it("exposes the cover media key for public cards", () => {
    expect(publicQuizCardView(quizzes[1], "en")).toMatchObject({
      coverMediaKey: "teachers/admin/culture-cover.jpg"
    });
  });

  it("picks a verbs-themed cover for verb quizzes", () => {
    expect(quizCoverMeta({ ...quizzes[0], level: "A2" }, { title: "Irregular verbs", tags: ["grammar", "verbs"] }))
      .toMatchObject({ image: "/quiz-covers/verbs.jpg" });
  });

  it("maps an A1-level quiz to the level cover and falls back for unknown", () => {
    expect(quizCoverMeta({ ...quizzes[1], level: "A1" }, { title: "Colours", tags: [] }))
      .toMatchObject({ image: "/quiz-covers/level.jpg" });
    expect(quizCoverMeta({ ...quizzes[1], level: "C2" }, { title: "Anything", tags: [] }))
      .toMatchObject({ image: "/quiz-covers/default.jpg" });
  });

  it("assigns distinct covers across different topics", () => {
    const verbs = quizCoverMeta({ ...quizzes[0], level: "A2" }, { title: "Irregular verbs", tags: ["verbs"] }).image;
    const sport = quizCoverMeta({ ...quizzes[2], level: "A2" }, { title: "Sports and society", tags: ["sport"] }).image;
    const city = quizCoverMeta({ ...quizzes[2], level: "A2" }, { title: "Cities and communities", tags: ["city"] }).image;
    expect(verbs).toBe("/quiz-covers/verbs.jpg");
    expect(sport).toBe("/quiz-covers/sport.jpg");
    expect(city).toBe("/quiz-covers/city.jpg");
    // Ensure these distinct topics do not all fall back to the same default.
    expect(new Set([verbs, sport, city]).size).toBe(3);
  });
});

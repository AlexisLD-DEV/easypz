import type { QuestionType } from "../editor/quizEditorModel";
import type { CefrLevel, LanguageActivity, LanguageTrack, ProgramAxis, SchoolLevel } from "./programMetadata";

type FilterValue<T extends string> = "all" | Exclude<T, "">;

export type QuestionBankPanelFilters = {
  q: string;
  type: "all" | QuestionType;
  level: string;
  language: "all" | "fr" | "en";
  tag: string;
  schoolLevel: FilterValue<SchoolLevel>;
  languageTrack: FilterValue<LanguageTrack>;
  cefrLevel: FilterValue<CefrLevel>;
  programAxis: FilterValue<ProgramAxis>;
  languageActivity: FilterValue<LanguageActivity>;
  linguisticFocus: string;
};

export function createQuestionBankPanelFilters(): QuestionBankPanelFilters {
  return {
    q: "",
    type: "all",
    level: "",
    language: "all",
    tag: "",
    schoolLevel: "all",
    languageTrack: "all",
    cefrLevel: "all",
    programAxis: "all",
    languageActivity: "all",
    linguisticFocus: ""
  };
}

export function questionBankPanelQuery(filters: QuestionBankPanelFilters) {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.level.trim()) params.set("level", filters.level.trim());
  if (filters.language !== "all") params.set("language", filters.language);
  if (filters.tag.trim()) params.set("tag", filters.tag.trim());
  if (filters.schoolLevel !== "all") params.set("schoolLevel", filters.schoolLevel);
  if (filters.languageTrack !== "all") params.set("languageTrack", filters.languageTrack);
  if (filters.cefrLevel !== "all") params.set("cefrLevel", filters.cefrLevel);
  if (filters.programAxis !== "all") params.set("programAxis", filters.programAxis);
  if (filters.languageActivity !== "all") params.set("languageActivity", filters.languageActivity);
  if (filters.linguisticFocus.trim()) params.set("linguisticFocus", filters.linguisticFocus.trim());
  return params.toString();
}

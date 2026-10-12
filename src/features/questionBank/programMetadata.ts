import type { TranslationKey } from "../../i18n/translations";

export const schoolLevelOptions = [
  { value: "seconde", labelKey: "program.schoolSeconde" },
  { value: "premiere", labelKey: "program.schoolPremiere" },
  { value: "terminale", labelKey: "program.schoolTerminale" }
] as const satisfies readonly { value: string; labelKey: TranslationKey }[];

export const languageTrackOptions = ["LVA", "LVB", "LVC"] as const;
export const cefrLevelOptions = ["A1+", "A2", "A2+", "B1", "B1+", "B2"] as const;

export const languageActivityOptions = [
  { value: "comprehension_orale", labelKey: "program.activityOralComprehension" },
  { value: "comprehension_ecrite", labelKey: "program.activityWrittenComprehension" },
  { value: "expression_orale", labelKey: "program.activityOralExpression" },
  { value: "expression_ecrite", labelKey: "program.activityWrittenExpression" },
  { value: "interaction", labelKey: "program.activityInteraction" },
  { value: "mediation", labelKey: "program.activityMediation" }
] as const satisfies readonly { value: string; labelKey: TranslationKey }[];

export const programAxisOptions = [
  { value: "seconde_axis_1", schoolLevel: "seconde", labelKey: "program.axisSeconde1" },
  { value: "seconde_axis_2", schoolLevel: "seconde", labelKey: "program.axisSeconde2" },
  { value: "seconde_axis_3", schoolLevel: "seconde", labelKey: "program.axisSeconde3" },
  { value: "seconde_axis_4", schoolLevel: "seconde", labelKey: "program.axisSeconde4" },
  { value: "seconde_axis_5", schoolLevel: "seconde", labelKey: "program.axisSeconde5" },
  { value: "seconde_axis_6", schoolLevel: "seconde", labelKey: "program.axisSeconde6" },
  { value: "premiere_axis_1", schoolLevel: "premiere", labelKey: "program.axisPremiere1" },
  { value: "premiere_axis_2", schoolLevel: "premiere", labelKey: "program.axisPremiere2" },
  { value: "premiere_axis_3", schoolLevel: "premiere", labelKey: "program.axisPremiere3" },
  { value: "premiere_axis_4", schoolLevel: "premiere", labelKey: "program.axisPremiere4" },
  { value: "premiere_axis_5", schoolLevel: "premiere", labelKey: "program.axisPremiere5" },
  { value: "premiere_axis_6", schoolLevel: "premiere", labelKey: "program.axisPremiere6" },
  { value: "terminale_axis_1", schoolLevel: "terminale", labelKey: "program.axisTerminale1" },
  { value: "terminale_axis_2", schoolLevel: "terminale", labelKey: "program.axisTerminale2" },
  { value: "terminale_axis_3", schoolLevel: "terminale", labelKey: "program.axisTerminale3" },
  { value: "terminale_axis_4", schoolLevel: "terminale", labelKey: "program.axisTerminale4" },
  { value: "terminale_axis_5", schoolLevel: "terminale", labelKey: "program.axisTerminale5" },
  { value: "terminale_axis_6", schoolLevel: "terminale", labelKey: "program.axisTerminale6" }
] as const satisfies readonly { value: string; schoolLevel: string; labelKey: TranslationKey }[];

export type SchoolLevel = "" | typeof schoolLevelOptions[number]["value"];
export type LanguageTrack = "" | typeof languageTrackOptions[number];
export type CefrLevel = "" | typeof cefrLevelOptions[number];
export type ProgramAxis = "" | typeof programAxisOptions[number]["value"];
export type LanguageActivity = "" | typeof languageActivityOptions[number]["value"];

export type ProgramMetadata = {
  schoolLevel: SchoolLevel;
  languageTrack: LanguageTrack;
  cefrLevel: CefrLevel;
  programAxis: ProgramAxis | string;
  languageActivity: LanguageActivity;
  linguisticFocus: string;
};

export function emptyProgramMetadata(): ProgramMetadata {
  return {
    schoolLevel: "",
    languageTrack: "",
    cefrLevel: "",
    programAxis: "",
    languageActivity: "",
    linguisticFocus: ""
  };
}

export function programMetadataLabels(metadata: ProgramMetadata, t: (key: TranslationKey) => string) {
  const labels: string[] = [];
  const schoolLevel = labelFromOptions(schoolLevelOptions, metadata.schoolLevel, t);
  const programAxis = labelFromOptions(programAxisOptions, metadata.programAxis, t);
  const activity = labelFromOptions(languageActivityOptions, metadata.languageActivity, t);

  if (schoolLevel) labels.push(schoolLevel);
  if (metadata.languageTrack) labels.push(metadata.languageTrack);
  if (metadata.cefrLevel) labels.push(metadata.cefrLevel);
  if (programAxis) labels.push(programAxis);
  if (activity) labels.push(activity);
  if (metadata.linguisticFocus.trim()) labels.push(metadata.linguisticFocus.trim());

  return labels;
}

function labelFromOptions(
  options: readonly { value: string; labelKey: TranslationKey }[],
  value: string,
  t: (key: TranslationKey) => string
) {
  if (!value) return "";
  const option = options.find((item) => item.value === value);
  return option ? t(option.labelKey) : value;
}

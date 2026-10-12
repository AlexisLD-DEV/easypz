export type DuplicateQuizSource = {
  title: string;
  description: string;
  primaryLanguage: string;
  level: string;
  tagsJson: string;
  defaultTimeLimitSeconds: number;
  showCorrection: number;
  speedScoring: number;
};

export function buildDuplicateQuizMetadata(source: DuplicateQuizSource, slugSuffix: string) {
  const title = truncateTitle(`Copie de ${source.title}`);
  return {
    title,
    description: source.description,
    primaryLanguage: source.primaryLanguage,
    level: source.level,
    tagsJson: source.tagsJson,
    visibility: "private",
    status: "draft",
    slug: `${slugify(title)}-${slugSuffix}`,
    secretToken: null,
    defaultTimeLimitSeconds: source.defaultTimeLimitSeconds,
    showCorrection: source.showCorrection,
    speedScoring: source.speedScoring,
    publishedAt: null
  } as const;
}

export function slugify(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "quiz";
}

function truncateTitle(title: string) {
  return title.slice(0, 120);
}

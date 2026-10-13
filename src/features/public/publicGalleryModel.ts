export type PublicQuizSummary = {
  id: string;
  title: string;
  description: string;
  primary_language: string;
  level: string;
  tags_json: string;
  slug: string;
  question_count?: number;
  choice_count?: number;
  question_types?: string | null;
  cover_media_key?: string | null;
};

export type GalleryFilters = {
  search: string;
  type: string;
  level: string;
};

export type PublicQuizCardView = {
  title: string;
  description: string;
  tags: string[];
  accentText: string;
  visualTone: "grammar" | "";
  coverMediaKey: string | null;
};

export type QuizCoverMeta = {
  image: string;
  label: string;
};

const coverFallbacks: QuizCoverMeta[] = [
  ["society", "Society"], ["city", "City"], ["media", "Media"], ["digital", "Digital"],
  ["history", "History"], ["reading", "Reading"], ["listening", "Listening"], ["sport", "Sport"],
  ["creativity", "Creativity"], ["work", "Work"], ["family", "Family"], ["daily", "Daily"],
  ["game", "Game"], ["level", "Level"], ["verbs", "Verbs"], ["default", "Quiz"]
].map(([name, label]) => ({ image: `/quiz-covers/${name}.jpg`, label }));

// Original illustrations created for EasyPZ, bundled in /public/quiz-covers.
// No external licence or attribution required.
export function quizCoverMeta(
  quiz: PublicQuizSummary,
  card: { title: string; tags: string[] },
  used?: Set<string>
): QuizCoverMeta {
  const thematic = thematicQuizCoverMeta(quiz, card);
  const chosen = used?.has(thematic.image)
    ? coverFallbacks.find((cover) => !used.has(cover.image)) ?? thematic
    : thematic;
  used?.add(chosen.image);
  return chosen;
}

function thematicQuizCoverMeta(quiz: PublicQuizSummary, card: { title: string; tags: string[] }): QuizCoverMeta {
  const subject = [card.title, card.tags.join(" "), quiz.level].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const level = quiz.level.trim().toLowerCase();

  const wordToImage: Array<[RegExp, string, string]> = [
    [/\b(?:verbs?|verbes?|preterit|participes?|tenses?|irregular|irreguliers?)\b/, "verbs", "Verbs"],
    [/\b(?:reading|books?|romans?|lecture|vocabulary|vocabulaire|words?|mots?|commonwealth)\b/, "reading", "Reading"],
    [/\b(?:listening|listen|audio|ecoute)\b/, "listening", "Listening"],
    [/\b(?:games?|jeux?|fun|play)\b/, "game", "Game"],
    [/\b(?:daily|routines?|morning|quotidien|quotidienne)\b/, "daily", "Daily"],
    [/\b(?:digital|technology|tech|internet|online|computers?|climate|environment|ecologie)\b/, "digital", "Digital"],
    [/\b(?:sports?|athletics?|football|tennis|olympics?)\b/, "sport", "Sport"],
    [/\b(?:media|reality|newspapers?|journal|journaux|tv|films?|cinema|presse|social media|reseaux sociaux)\b/, "media", "Media"],
    [/\b(?:family|families|famille|generations?|parents?|children|child|home)\b/, "family", "Family"],
    [/\b(?:city|cities|towns?|urbain|urban|neighbourhoods?|quarters?|community|communities|exchanges?|mobility|space)\b/, "city", "City"],
    [/\b(?:work|careers?|jobs?|professions?|employment|future)\b/, "work", "Work"],
    [/\b(?:history|histoire|heritage|past|memory|rememory|traditions?|memoire|territory)\b/, "history", "History"],
    [/\b(?:arts?|creativity|creative|creation|painting|music|design|power|protest|story|stories|imagination|fiction)\b/, "creativity", "Creativity"],
    [/\b(?:citizens?|citizenship|civic|rights?|democracy|democratie|equality|inclusion|diversity|politics|society|societe|identity|first impressions?|culture)\b/, "society", "Society"],
  ];

  for (const [pattern, image, label] of wordToImage) {
    if (pattern.test(subject)) return { image: `/quiz-covers/${image}.jpg`, label };
  }

  // Any recognized level (A1–B2) maps to the study cover.
  if (/\b(?:[ab][12]|beginner|debutant|débutant|elementary|study)\b/.test(level)) {
    return { image: "/quiz-covers/level.jpg", label: "Level" };
  }
  return { image: "/quiz-covers/default.jpg", label: "Quiz" };
}

export function parseQuizTags(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

export function parseQuizQuestionTypes(value?: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isTouchFriendlyQuiz(quiz: PublicQuizSummary) {
  const questionTypes = parseQuizQuestionTypes(quiz.question_types);
  const questionCount = quiz.question_count ?? 0;
  const choiceCount = quiz.choice_count ?? 0;
  return questionTypes.length > 0
    && questionCount > 0
    && choiceCount >= questionCount * 2
    && questionTypes.every((type) => type === "multiple_choice" || type === "true_false");
}

export function automaticMobileLaunchQuizzes(quizzes: PublicQuizSummary[]) {
  return quizzes.filter(isTouchFriendlyQuiz);
}

export function filterPublicQuizzes(quizzes: PublicQuizSummary[], filters: GalleryFilters) {
  const search = filters.search.trim().toLowerCase();
  return quizzes.filter((quiz) => {
    const tags = parseQuizTags(quiz.tags_json);
    const questionTypes = parseQuizQuestionTypes(quiz.question_types);
    const searchable = [quiz.title, quiz.description, quiz.level, quiz.primary_language, ...tags].join(" ").toLowerCase();
    const matchesSearch = !search || searchable.includes(search);
    const matchesType = filters.type === "all" || questionTypes.includes(filters.type);
    const matchesLevel = filters.level === "all" || quiz.level === filters.level;
    return matchesSearch && matchesType && matchesLevel;
  });
}

export function galleryFilterOptions(quizzes: PublicQuizSummary[]) {
  return {
    types: uniqueSorted(quizzes.flatMap((quiz) => parseQuizQuestionTypes(quiz.question_types))),
    levels: uniqueSorted(quizzes.map((quiz) => quiz.level).filter(Boolean))
  };
}

export function galleryCountLabel(count: number, isLoading: boolean, labels: { loading: string; one: string; many: string }) {
  if (isLoading) return labels.loading;
  return (count === 1 ? labels.one : labels.many).replace("{count}", String(count));
}

export function publicQuizCardView(quiz: PublicQuizSummary, locale: "fr" | "en"): PublicQuizCardView {
  const tags = parseQuizTags(quiz.tags_json);
  const isIrregularVerbsQuiz = quiz.slug.includes("irregular-verbs") || quiz.title.toLowerCase().includes("irregular verbs");

  if (isIrregularVerbsQuiz && locale === "fr") {
    return {
      title: "Verbes irreguliers - preterit & participe passe",
      description: "Ecris le preterit et le participe passe de chaque verbe irregulier.",
      tags: ["verbes irreguliers", "preterit", "participe passe"],
      accentText: "go -> went / gone",
      visualTone: "grammar",
      coverMediaKey: quiz.cover_media_key ?? null
    };
  }

  return {
    title: quiz.title,
    description: quiz.description,
    tags,
    accentText: isIrregularVerbsQuiz ? "go -> went / gone" : "",
    visualTone: isIrregularVerbsQuiz ? "grammar" : "",
    coverMediaKey: quiz.cover_media_key ?? null
  };
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

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

// Pick a cover image matched to the quiz level, topic or title. The images are
// royalty-free (Unsplash / Pexels licence) and bundled in /public/quiz-covers.
export function quizCoverMeta(quiz: PublicQuizSummary, card: { title: string; tags: string[] }): QuizCoverMeta {
  const subject = [card.title, card.tags.join(" "), quiz.level].join(" ").toLowerCase();
  const level = quiz.level.trim().toLowerCase();

  const wordToImage: Array<[RegExp, string, string]> = [
    [/verb|past|preterit|participe|tense|go[^o]|irregular/, "verbs", "Verbs"],
    [/reading|book|roman|story|histoire|lecture|vocab|word|mot|commonwealth/, "reading", "Reading"],
    [/listen|audio|écout|écoute/, "listening", "Listening"],
    [/game|jeu|fun|play/, "game", "Game"],
    [/daily|routine|dai|morning|jour/, "daily", "Daily"],
    [/digital|tech|internet|online|computer|climate|environment|ecolog/, "digital", "Digital"],
    [/sport|athlet|football|tennis|olymp/, "sport", "Sport"],
    [/media|fiction|realit|newspaper|journal|tv|film|cinema|presse/, "media", "Media"],
    [/famil|génér|generat|parent|child|home/, "family", "Family"],
    [/city|town|urbain|urban|neighbour|quarter|community|exchang|mobilit|space/, "city", "City"],
    [/work|career|job|profess|employ|future/, "work", "Work"],
    [/history|heritage|herit|past|memory|rememory|tradition|mémoire|territory/, "history", "History"],
    [/art|creat|paint|music|design|power|protest|story|imagin|fiction/, "creativity", "Creativity"],
    [/citizen|civic|right|démocra|democra|equal|inclus|diversit|politic|society|socia|identity|first imp|culture/, "society", "Society"],
  ];

  for (const [pattern, image, label] of wordToImage) {
    if (pattern.test(subject)) return { image: `/quiz-covers/${image}.jpg`, label };
  }

  // Any recognized level (A1–B2) maps to the study cover.
  if (/(^|[^a-z])a[12]|(^|[^a-z])b[12]|beginner|debut|début|elem/.test(level)) {
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

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, PlayCircle, Rocket, Search } from "lucide-react";
import { api } from "../../api/client";
import { userFacingErrorMessage } from "../../errorMessages";
import { useI18n } from "../../i18n/useI18n";
import type { TranslationKey } from "../../i18n/translations";
import { questionImageUrl } from "../media/mediaUrl";
import { practiceUrl } from "../practice/practiceAccess";
import {
  automaticMobileLaunchQuizzes,
  filterPublicQuizzes,
  galleryFilterOptions,
  publicQuizCardView,
  quizCoverMeta,
  type GalleryFilters,
  type PublicQuizSummary
} from "./publicGalleryModel";

const defaultFilters: GalleryFilters = {
  search: "",
  type: "all",
  level: "all"
};

export function PublicGallery() {
  const { locale, t } = useI18n();
  const [quizzes, setQuizzes] = useState<PublicQuizSummary[]>([]);
  const [filters, setFilters] = useState<GalleryFilters>(defaultFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedCoverKeys, setFailedCoverKeys] = useState<Set<string>>(() => new Set());
  const [failedLocalCovers, setFailedLocalCovers] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    api<{ quizzes: PublicQuizSummary[] }>("/api/public/quizzes")
      .then((data) => {
        if (!cancelled) setQuizzes(data.quizzes);
      })
      .catch((reason: Error) => {
        if (!cancelled) setError(userFacingErrorMessage(locale, reason));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const options = useMemo(() => galleryFilterOptions(quizzes), [quizzes]);
  const visibleQuizzes = useMemo(() => filterPublicQuizzes(quizzes, filters), [filters, quizzes]);
  const autoLaunchQuizzes = useMemo(() => automaticMobileLaunchQuizzes(quizzes), [quizzes]);
  const hasActiveFilters = filters.search.trim() || filters.type !== "all" || filters.level !== "all";

  function updateFilter<K extends keyof GalleryFilters>(key: K, value: GalleryFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function launchRandomQuiz() {
    if (autoLaunchQuizzes.length === 0) return;
    const quiz = autoLaunchQuizzes[Math.floor(Math.random() * autoLaunchQuizzes.length)];
    window.location.href = practiceUrl({ kind: "public", slug: quiz.slug });
  }

  function markCoverFailed(mediaKey: string) {
    setFailedCoverKeys((current) => current.has(mediaKey) ? current : new Set(current).add(mediaKey));
  }

  return (
    <section className="public-gallery">
      <section className="mobile-quiz-launcher" aria-label={t("gallery.quickStart")}>
        <button className="mobile-random-quiz-button" type="button" onClick={launchRandomQuiz} disabled={isLoading || autoLaunchQuizzes.length === 0}>
          <PlayCircle size={28} />
          <span>{t("nav.launchQuiz")}</span>
        </button>
        <a className="mobile-join-quiz-button" href="/join">
          <Rocket size={18} />
          <span>{t("nav.joinQuiz")}</span>
        </a>
      </section>

      <section className="gallery-controls" aria-label={t("gallery.filters")}>
        <label className="search-field">
          {t("gallery.search")}
          <span>
            <Search size={18} />
            <input
              value={filters.search}
              placeholder={t("gallery.searchPlaceholder")}
              onChange={(event) => updateFilter("search", event.target.value)}
            />
          </span>
        </label>
        <FilterDropdown
          label={t("gallery.type")}
          value={filters.type}
          options={[
            { value: "all", label: t("gallery.allTypes") },
            ...options.types.map((type) => ({ value: type, label: questionTypeLabel(type, t) }))
          ]}
          onChange={(value) => updateFilter("type", value)}
        />
        <FilterDropdown
          label={t("gallery.level")}
          value={filters.level}
          options={[
            { value: "all", label: t("gallery.allLevels") },
            ...options.levels.map((level) => ({ value: level, label: level }))
          ]}
          onChange={(value) => updateFilter("level", value)}
        />
      </section>

      {error ? <p className="status-message error-message" role="alert">{error}</p> : null}

      {!isLoading && quizzes.length === 0 ? (
        <div className="empty-state">
          <h2>{t("gallery.emptyTitle")}</h2>
          <p>{t("gallery.emptyBody")}</p>
          <div className="toolbar">
            <a className="button-link" href="/login">{t("nav.login")}</a>
            <a className="button-link secondary-action" href="/register">{t("nav.register")}</a>
          </div>
        </div>
      ) : null}

      {!isLoading && quizzes.length > 0 && visibleQuizzes.length === 0 ? (
        <div className="empty-state compact-empty">
          <h2>{t("gallery.noMatchTitle")}</h2>
          <p>{t("gallery.noMatchBody")}</p>
          {hasActiveFilters ? (
            <button className="secondary-action" type="button" onClick={() => setFilters(defaultFilters)}>{t("gallery.reset")}</button>
          ) : null}
        </div>
      ) : null}

      {visibleQuizzes.length > 0 ? (
        <div className="quiz-grid">
          {visibleQuizzes.map((quiz) => {
            const card = publicQuizCardView(quiz, locale);
            const levelLabel = visibleLevelLabel(quiz.level, card.visualTone);
            const coverImageUrl = card.coverMediaKey && !failedCoverKeys.has(card.coverMediaKey) ? questionImageUrl(card.coverMediaKey) : null;
            const coverMeta = quizCoverMeta(quiz, { title: card.title, tags: card.tags });
            return (
              <article
                className={card.visualTone === "grammar" ? "public-quiz-card public-quiz-card-grammar" : "public-quiz-card"}
                key={quiz.id}
              >
                <a className="public-quiz-card-cover-gap" href={practiceUrl({ kind: "public", slug: quiz.slug })} tabIndex={-1} aria-hidden="true">
                  {coverImageUrl ? (
                    <img className="quiz-cover-image" src={coverImageUrl} alt="" loading="lazy"
                      onError={() => { if (card.coverMediaKey) markCoverFailed(card.coverMediaKey); }} />
                  ) : failedLocalCovers.has(coverMeta.image) ? (
                    <span className="quiz-cover-fallback">
                      <span className="quiz-cover-label">{coverMeta.label}</span>
                    </span>
                  ) : (
                    <img className="quiz-cover-image" src={coverMeta.image} alt="" loading="lazy"
                      onError={() => {
                        setFailedLocalCovers((current) => current.has(coverMeta.image) ? current : new Set(current).add(coverMeta.image));
                      }} />
                  )}
                </a>

                <div className="public-quiz-card-body">
                  <p className="quiz-card-meta-line">
                    {levelLabel ? (
                      <>
                        <span>{levelLabel}</span>
                        <span className="meta-separator" aria-hidden="true"> • </span>
                      </>
                    ) : null}
                    <span>{questionCountLabel(quiz.question_count ?? 0, t)}</span>
                  </p>
                  <h2>{card.title}</h2>
                  {card.description ? (
                    <p className="quiz-description">
                      <strong>{t("gallery.instructionLabel")}</strong>
                      {card.description}
                    </p>
                  ) : null}
                  {card.accentText ? (
                    <p className="quiz-accent-note">
                      <strong>{t("gallery.exampleLabel")}</strong>
                      {card.accentText}
                    </p>
                  ) : null}
                  {card.tags.length > 0 ? (
                    <span className="quiz-card-tags-inline">{card.tags.slice(0, 3).join(" · ")}</span>
                  ) : null}
                </div>

                <div className="card-actions quiz-card-actions">
                  <a className="button-link" href={practiceUrl({ kind: "public", slug: quiz.slug })}>
                    <PlayCircle size={18} />
                    {t("gallery.practice")}
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function FilterDropdown({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.value === value) ?? options[0];
  return (
    <div className="filter-dropdown-field">
      <span>{label}</span>
      <details className="filter-dropdown">
        <summary>
          <span>{selected.label}</span>
          <ChevronDown size={18} aria-hidden="true" />
        </summary>
        <div className="filter-dropdown-menu">
          {options.map((option) => (
            <button
              className={option.value === value ? "filter-dropdown-option selected" : "filter-dropdown-option"}
              key={option.value}
              type="button"
              onClick={(event) => {
                onChange(option.value);
                event.currentTarget.closest("details")?.removeAttribute("open");
              }}
            >
              <span>{option.label}</span>
              <span className="filter-radio" aria-hidden="true" />
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}

function questionCountLabel(count: number, t: (key: "gallery.questionCountOne" | "gallery.questionCountMany") => string) {
  return (count === 1 ? t("gallery.questionCountOne") : t("gallery.questionCountMany")).replace("{count}", String(count));
}

function visibleLevelLabel(level: string, visualTone: string) {
  const normalized = level.trim().toLowerCase();
  if (!normalized || visualTone === "grammar") return "";
  if (["all", "all levels", "tous niveaux", "tout niveau"].includes(normalized)) return "";
  return level;
}

function questionTypeLabel(type: string, t: (key: TranslationKey) => string) {
  const labels: Record<string, TranslationKey> = {
    multiple_choice: "editor.typeMultipleChoice",
    true_false: "editor.typeTrueFalse",
    short_answer: "editor.typeShortAnswer",
    reformulation: "editor.typeReformulation",
    word_order: "editor.typeWordOrder",
    fill_blank: "editor.typeFillBlank",
    matching: "editor.typeMatching"
  };
  return labels[type] ? t(labels[type]) : type;
}

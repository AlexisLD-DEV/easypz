import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { api } from "../../api/client";
import { userFacingErrorMessage } from "../../errorMessages";
import { useI18n } from "../../i18n/useI18n";
import { isFreeTextQuestionType, type QuestionDraft, type QuestionType } from "../editor/quizEditorModel";
import {
  cefrLevelOptions,
  languageActivityOptions,
  languageTrackOptions,
  programAxisOptions,
  programMetadataLabels,
  schoolLevelOptions
} from "./programMetadata";
import { bankItemToQuestionDraft, type QuestionBankItem } from "./questionBankModel";
import { createQuestionBankPanelFilters, questionBankPanelQuery, type QuestionBankPanelFilters } from "./questionBankPanelModel";

export function QuestionBankPanel({
  onClose,
  onInsert
}: {
  onClose: () => void;
  onInsert: (question: QuestionDraft) => void;
}) {
  const { locale, t } = useI18n();
  const [items, setItems] = useState<QuestionBankItem[]>([]);
  const [filters, setFilters] = useState<QuestionBankPanelFilters>(() => createQuestionBankPanelFilters());
  const [error, setError] = useState<string | null>(null);

  async function loadItems(nextFilters = filters) {
    const query = questionBankPanelQuery(nextFilters);
    const data = await api<{ items: QuestionBankItem[] }>(`/api/teacher/question-bank${query ? `?${query}` : ""}`);
    setItems(data.items);
  }

  useEffect(() => {
    void loadItems().catch((reason) => setError(userFacingErrorMessage(locale, reason)));
  }, [locale]);

  async function submitFilters(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await loadItems();
    } catch (reason) {
      setError(userFacingErrorMessage(locale, reason));
    }
  }

  return (
    <aside className="bank-panel" aria-label={t("bank.fromBank")}>
      <div className="section-title-row">
        <h2>{t("bank.fromBank")}</h2>
        <button className="secondary-action compact-button" type="button" onClick={onClose} aria-label={t("dashboard.cancel")}>
          <X size={18} />
        </button>
      </div>
      {error ? <p className="status-message error-message" role="alert">{error}</p> : null}
      <form className="bank-panel-filters" onSubmit={submitFilters}>
        <label>
          {t("bank.search")}
          <input
            value={filters.q}
            placeholder={t("bank.searchPlaceholder")}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
          />
        </label>
        <details className="bank-advanced-filters editor-disclosure">
          <summary>{t("bank.advancedFilters")}</summary>
          <div className="form-grid compact-controls">
            <label>
              {t("bank.type")}
              <select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value as QuestionBankPanelFilters["type"] }))}>
                <option value="all">{t("bank.allTypes")}</option>
                <option value="multiple_choice">{t("editor.typeMultipleChoice")}</option>
                <option value="true_false">{t("editor.typeTrueFalse")}</option>
                <option value="short_answer">{t("editor.typeShortAnswer")}</option>
                <option value="reformulation">{t("editor.typeReformulation")}</option>
                <option value="word_order">{t("editor.typeWordOrder")}</option>
                <option value="fill_blank">{t("editor.typeFillBlank")}</option>
                <option value="matching">{t("editor.typeMatching")}</option>
              </select>
            </label>
            <label>
              {t("bank.language")}
              <select value={filters.language} onChange={(event) => setFilters((current) => ({ ...current, language: event.target.value as QuestionBankPanelFilters["language"] }))}>
                <option value="all">{t("gallery.allLanguages")}</option>
                <option value="en">{t("editor.english")}</option>
                <option value="fr">{t("editor.french")}</option>
              </select>
            </label>
            <label>
              {t("bank.level")}
              <input value={filters.level} onChange={(event) => setFilters((current) => ({ ...current, level: event.target.value }))} />
            </label>
            <label>
              {t("bank.tags")}
              <input value={filters.tag} onChange={(event) => setFilters((current) => ({ ...current, tag: event.target.value }))} />
            </label>
            <label>
              {t("program.schoolLevel")}
              <select value={filters.schoolLevel} onChange={(event) => setFilters((current) => ({ ...current, schoolLevel: event.target.value as QuestionBankPanelFilters["schoolLevel"] }))}>
                <option value="all">{t("program.allSchoolLevels")}</option>
                {schoolLevelOptions.map((option) => (
                  <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
                ))}
              </select>
            </label>
            <label>
              {t("program.languageTrack")}
              <select value={filters.languageTrack} onChange={(event) => setFilters((current) => ({ ...current, languageTrack: event.target.value as QuestionBankPanelFilters["languageTrack"] }))}>
                <option value="all">{t("program.allLanguageTracks")}</option>
                {languageTrackOptions.map((track) => <option key={track} value={track}>{track}</option>)}
              </select>
            </label>
            <label>
              {t("program.cefrLevel")}
              <select value={filters.cefrLevel} onChange={(event) => setFilters((current) => ({ ...current, cefrLevel: event.target.value as QuestionBankPanelFilters["cefrLevel"] }))}>
                <option value="all">{t("program.allCefrLevels")}</option>
                {cefrLevelOptions.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
            </label>
            <label>
              {t("program.languageActivity")}
              <select value={filters.languageActivity} onChange={(event) => setFilters((current) => ({ ...current, languageActivity: event.target.value as QuestionBankPanelFilters["languageActivity"] }))}>
                <option value="all">{t("program.allActivities")}</option>
                {languageActivityOptions.map((option) => (
                  <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
                ))}
              </select>
            </label>
            <label>
              {t("program.axis")}
              <select value={filters.programAxis} onChange={(event) => setFilters((current) => ({ ...current, programAxis: event.target.value as QuestionBankPanelFilters["programAxis"] }))}>
                <option value="all">{t("program.allAxes")}</option>
                {programAxisOptions.map((option) => (
                  <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
                ))}
              </select>
            </label>
            <label>
              {t("program.linguisticFocus")}
              <input
                value={filters.linguisticFocus}
                placeholder={t("program.linguisticFocusPlaceholder")}
                onChange={(event) => setFilters((current) => ({ ...current, linguisticFocus: event.target.value }))}
              />
            </label>
          </div>
        </details>
        <button type="submit" className="secondary-action">{t("bank.search")}</button>
      </form>
      <div className="bank-panel-list">
        {items.map((item) => {
          const programLabels = programMetadataLabels(item, t).slice(0, 4);
          return (
            <article className="bank-card" key={item.id}>
              <div className="quiz-card-header">
                <div>
                  <p className="eyebrow">{typeLabel(item.type, t)}</p>
                  <h3>{item.prompt}</h3>
                </div>
                {item.level ? <span className="status-chip">{item.level}</span> : null}
              </div>
              <p className="bank-preview">{answerPreview(item)}</p>
              {programLabels.length > 0 ? (
                <div className="tag-row program-chip-row">
                  {programLabels.map((label) => <span className="status-chip" key={label}>{label}</span>)}
                </div>
              ) : null}
              {item.tags.length > 0 ? (
                <div className="tag-row">
                  {item.tags.slice(0, 4).map((tag) => <span className="status-chip" key={tag}>{tag}</span>)}
                </div>
              ) : null}
              <button type="button" onClick={() => onInsert(bankItemToQuestionDraft(item))}>{t("bank.insert")}</button>
            </article>
          );
        })}
      </div>
    </aside>
  );
}

function answerPreview(item: QuestionBankItem) {
  const answers = isFreeTextQuestionType(item.type) || item.type === "fill_blank" ? item.acceptedAnswers : item.choices.map((choice) => choice.label);
  return answers.filter(Boolean).slice(0, 4).join(", ");
}

function typeLabel(type: QuestionType, t: ReturnType<typeof useI18n>["t"]) {
  const labels: Record<QuestionType, Parameters<typeof t>[0]> = {
    multiple_choice: "editor.typeMultipleChoice",
    true_false: "editor.typeTrueFalse",
    short_answer: "editor.typeShortAnswer",
    reformulation: "editor.typeReformulation",
    word_order: "editor.typeWordOrder",
    fill_blank: "editor.typeFillBlank",
    matching: "editor.typeMatching"
  };
  return t(labels[type]);
}

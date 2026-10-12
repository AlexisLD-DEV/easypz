import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { ImagePlus, Music, Plus, Trash2, X } from "lucide-react";
import { api } from "../../api/client";
import { userFacingErrorMessage } from "../../errorMessages";
import { useI18n } from "../../i18n/useI18n";
import type { TranslationKey } from "../../i18n/translations";
import {
  createQuestionDraft,
  isFreeTextQuestionType,
  matchingPairs,
  normaliseQuestion,
  questionAnswerHelpKey,
  type ChoiceDraft,
  type QuestionDraft,
  type QuestionType
} from "../editor/quizEditorModel";
import { questionAudioUrl, questionImageUrl as buildQuestionImageUrl } from "../media/mediaUrl";
import { uploadQuestionAudio, uploadQuestionImage } from "../media/questionMediaUpload";
import { SimilarQuestionDialog, type SimilarQuestionDecision } from "./SimilarQuestionDialog";
import {
  cefrLevelOptions,
  emptyProgramMetadata,
  languageActivityOptions,
  languageTrackOptions,
  programAxisOptions,
  programMetadataLabels,
  schoolLevelOptions,
  type ProgramMetadata
} from "./programMetadata";
import { questionDraftToBankInput, tagsFromText, tagsToText, type QuestionBankItem } from "./questionBankModel";
import { createQuestionBankPanelFilters, questionBankPanelQuery, type QuestionBankPanelFilters } from "./questionBankPanelModel";
import { bankTabs, defaultBankTab, type QuestionBankTab } from "./questionBankViewModel";

const choiceLetters = ["A", "B", "C", "D"];
const choiceClasses = ["answer-red", "answer-blue", "answer-green", "answer-yellow"];
const questionTypeLabelKeys: Record<QuestionType, TranslationKey> = {
  multiple_choice: "editor.typeMultipleChoice",
  true_false: "editor.typeTrueFalse",
  short_answer: "editor.typeShortAnswer",
  reformulation: "editor.typeReformulation",
  word_order: "editor.typeWordOrder",
  fill_blank: "editor.typeFillBlank",
  matching: "editor.typeMatching"
};

type BankMetadata = ProgramMetadata & {
  level: string;
  primaryLanguage: "fr" | "en";
  tags: string;
};

function createBankMetadata(): BankMetadata {
  return {
    level: "",
    primaryLanguage: "en",
    tags: "",
    ...emptyProgramMetadata()
  };
}

export function QuestionBankPage() {
  const { locale, t } = useI18n();
  const [items, setItems] = useState<QuestionBankItem[]>([]);
  const [draft, setDraft] = useState<QuestionDraft>(() => createQuestionDraft());
  const [metadata, setMetadata] = useState<BankMetadata>(() => createBankMetadata());
  const [filters, setFilters] = useState<QuestionBankPanelFilters>(() => createQuestionBankPanelFilters());
  const [activeTab, setActiveTab] = useState<QuestionBankTab>(defaultBankTab);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const [similarQuestion, setSimilarQuestion] = useState<{
    currentPrompt: string;
    similar: QuestionBankItem;
    resolve: (decision: SimilarQuestionDecision) => void;
  } | null>(null);
  const questionImageUrlValue = buildQuestionImageUrl(draft.mediaKey);
  const questionAudioUrlValue = questionAudioUrl(draft.mediaKey);
  const questionTypeLabel = (type: QuestionType) => t(questionTypeLabelKeys[type]);
  const selectableProgramAxisOptions = useMemo(() => (
    metadata.schoolLevel
      ? programAxisOptions.filter((option) => option.schoolLevel === metadata.schoolLevel)
      : programAxisOptions
  ), [metadata.schoolLevel]);

  async function loadItems(nextFilters = filters) {
    const query = questionBankPanelQuery(nextFilters);
    const data = await api<{ items: QuestionBankItem[] }>(`/api/teacher/question-bank${query ? `?${query}` : ""}`);
    setItems(data.items);
  }

  useEffect(() => {
    void loadItems().catch((reason) => setError(userFacingErrorMessage(locale, reason)));
  }, [locale]);

  const visibleItems = useMemo(() => items, [items]);

  function resetForm() {
    setEditingId(null);
    setDraft(createQuestionDraft());
    setMetadata(createBankMetadata());
    setMessage(null);
    setError(null);
    setMediaUploadError(null);
  }

  function updateQuestion(patch: Partial<QuestionDraft>) {
    setDraft((current) => normaliseQuestion({ ...current, ...patch }));
  }

  function updateMetadata(patch: Partial<BankMetadata>) {
    setMetadata((current) => ({ ...current, ...patch }));
  }

  function updateSchoolLevel(schoolLevel: BankMetadata["schoolLevel"]) {
    setMetadata((current) => ({
      ...current,
      schoolLevel,
      programAxis: current.programAxis && schoolLevel && !programAxisOptions.some((option) => option.schoolLevel === schoolLevel && option.value === current.programAxis)
        ? ""
        : current.programAxis
    }));
  }

  function changeQuestionType(type: QuestionType) {
    setDraft((current) => normaliseQuestion({
      ...createQuestionDraft(type),
      prompt: current.prompt,
      mediaKey: current.mediaKey ?? null,
      explanation: current.explanation,
      timeLimitSeconds: current.timeLimitSeconds,
      points: current.points,
      acceptedAnswers: isFreeTextQuestionType(type) || type === "fill_blank" ? current.acceptedAnswers : []
    }));
  }

  function updateChoice(index: number, patch: Partial<ChoiceDraft>) {
    const choices = draft.choices.map((choice, choiceIndex) => (
      choiceIndex === index ? { ...choice, ...patch } : choice
    ));
    updateQuestion({
      choices: patch.isCorrect
        ? choices.map((choice, choiceIndex) => ({ ...choice, isCorrect: choiceIndex === index }))
        : choices
    });
  }

  function updateAcceptedAnswers(value: string) {
    updateQuestion({ acceptedAnswers: value.split("\n") });
  }

  function updateWordOrderSentence(value: string) {
    updateQuestion({
      choices: value
        .split(/\s+/)
        .map((word) => word.trim())
        .filter(Boolean)
        .slice(0, 12)
        .map((label) => ({ label, isCorrect: true }))
    });
  }

  function updateWordOrderToken(index: number, label: string) {
    const choices = draft.choices.map((choice, choiceIndex) => (
      choiceIndex === index ? { ...choice, label, isCorrect: true } : choice
    ));
    updateQuestion({ choices });
  }

  function addWordOrderToken() {
    if (draft.choices.length >= 12) return;
    updateQuestion({ choices: [...draft.choices, { label: "", isCorrect: true }] });
  }

  function removeWordOrderToken(index: number) {
    if (draft.choices.length <= 2) return;
    updateQuestion({ choices: draft.choices.filter((_, choiceIndex) => choiceIndex !== index) });
  }

  function updateMatchingPair(pairIndex: number, side: "left" | "right", label: string) {
    const choiceIndex = pairIndex * 2 + (side === "right" ? 1 : 0);
    updateQuestion({
      choices: draft.choices.map((choice, index) => (
        index === choiceIndex ? { ...choice, label, isCorrect: index % 2 === 0 } : choice
      ))
    });
  }

  function addMatchingPair() {
    if (draft.choices.length >= 16) return;
    updateQuestion({
      choices: [
        ...draft.choices,
        { label: "", isCorrect: true },
        { label: "", isCorrect: false }
      ]
    });
  }

  function removeMatchingPair(pairIndex: number) {
    if (matchingPairs(draft).length <= 2) return;
    updateQuestion({
      choices: draft.choices.filter((_, index) => index < pairIndex * 2 || index > pairIndex * 2 + 1)
    });
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    setMediaUploadError(null);
    setIsUploadingMedia(true);
    try {
      const mediaKey = await uploadQuestionImage(file);
      updateQuestion({ mediaKey });
    } catch (reason) {
      setMediaUploadError(userFacingErrorMessage(locale, reason, "image_upload_failed"));
    } finally {
      setIsUploadingMedia(false);
    }
  }

  async function uploadAudio(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    setMediaUploadError(null);
    setIsUploadingMedia(true);
    try {
      const mediaKey = await uploadQuestionAudio(file);
      updateQuestion({ mediaKey });
    } catch (reason) {
      setMediaUploadError(userFacingErrorMessage(locale, reason, "audio_upload_failed"));
    } finally {
      setIsUploadingMedia(false);
    }
  }

  function editItem(item: QuestionBankItem) {
    setEditingId(item.id);
    setMetadata({
      level: item.level,
      primaryLanguage: item.primaryLanguage,
      tags: tagsToText(item.tags),
      schoolLevel: item.schoolLevel,
      languageTrack: item.languageTrack,
      cefrLevel: item.cefrLevel,
      programAxis: item.programAxis,
      languageActivity: item.languageActivity,
      linguisticFocus: item.linguisticFocus
    });
    setDraft(normaliseQuestion({
      ...createQuestionDraft(item.type),
      prompt: item.prompt,
      mediaKey: item.mediaKey ?? null,
      explanation: item.explanation,
      timeLimitSeconds: item.timeLimitSeconds,
      points: item.points,
      acceptedAnswers: item.acceptedAnswers,
      choices: item.choices,
      addToBank: false
    }));
    setMessage(null);
    setError(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSaving(true);
    try {
      const input = {
        ...questionDraftToBankInput(draft, {
          level: metadata.level,
          primaryLanguage: metadata.primaryLanguage,
          tags: tagsFromText(metadata.tags),
          schoolLevel: metadata.schoolLevel,
          languageTrack: metadata.languageTrack,
          cefrLevel: metadata.cefrLevel,
          programAxis: metadata.programAxis,
          languageActivity: metadata.languageActivity,
          linguisticFocus: metadata.linguisticFocus
        })
      };
      const check = await api<{ exact: QuestionBankItem | null; similar: QuestionBankItem[] }>("/api/teacher/question-bank/check-similar", {
        method: "POST",
        body: JSON.stringify({ ...input, excludeId: editingId ?? undefined })
      });
      if (check.exact) {
        setMessage(t("bank.existingQuestion"));
        return;
      }
      if (check.similar.length > 0) {
        const decision = await askSimilarQuestion(draft.prompt, check.similar[0]);
        if (decision === "skip") return;
        if (decision === "view_bank") {
          editItem(check.similar[0]);
          return;
        }
      }
      const path = editingId ? `/api/teacher/question-bank/${encodeURIComponent(editingId)}` : "/api/teacher/question-bank";
      const result = await api<{ duplicate?: boolean; existingId?: string; item?: QuestionBankItem }>(path, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(input)
      });
      if (result.duplicate) {
        setMessage(t("bank.existingQuestion"));
      } else {
        const successMessage = editingId ? t("bank.updated") : t("bank.saved");
        resetForm();
        setMessage(successMessage);
      }
      await loadItems();
    } catch (reason) {
      setError(userFacingErrorMessage(locale, reason));
    } finally {
      setIsSaving(false);
    }
  }

  function askSimilarQuestion(currentPrompt: string, similar: QuestionBankItem) {
    return new Promise<SimilarQuestionDecision>((resolve) => {
      setSimilarQuestion({ currentPrompt, similar, resolve });
    });
  }

  async function deleteItem(itemId: string) {
    setError(null);
    setMessage(null);
    try {
      await api(`/api/teacher/question-bank/${encodeURIComponent(itemId)}`, { method: "DELETE" });
      if (editingId === itemId) resetForm();
      await loadItems();
    } catch (reason) {
      setError(userFacingErrorMessage(locale, reason));
    }
  }

  async function submitFilters(event: FormEvent) {
    event.preventDefault();
    await loadItems();
  }

  return (
    <section className="bank-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t("appName")}</p>
          <h1>{t("bank.title")}</h1>
        </div>
        <button type="button" onClick={resetForm}>
          <Plus size={18} />
          {t("bank.newQuestion")}
        </button>
      </header>

      {error ? <p className="status-message error-message" role="alert">{error}</p> : null}
      {message ? <p className="status-message" role="status">{message}</p> : null}

      <div className="bank-tabs" role="tablist" aria-label={t("bank.tabs")}>
        {bankTabs.map((tab) => (
          <button
            className={activeTab === tab ? "bank-tab bank-tab-active" : "bank-tab"}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            key={tab}
          >
            {t(tab === "program_bank" ? "bank.programBank" : "bank.myBank")}
          </button>
        ))}
      </div>

      {activeTab === "program_bank" ? (
        <section className="empty-state program-bank-empty">
          <p className="eyebrow">{t("bank.programBank")}</p>
          <h2>{t("bank.programBankEmptyTitle")}</h2>
          <p>{t("bank.programBankEmptyBody")}</p>
        </section>
      ) : (
      <div className="bank-layout">
        <form className="bank-editor" onSubmit={save}>
          <div className="section-heading">
            <h2>{editingId ? t("bank.edit") : t("bank.newQuestion")}</h2>
            <span>{questionTypeLabel(draft.type)}</span>
          </div>

          <div className="form-grid compact-controls">
            <label>
              {t("editor.type")}
              <select value={draft.type} onChange={(event) => changeQuestionType(event.target.value as QuestionType)}>
                <option value="multiple_choice">{t("editor.typeMultipleChoice")}</option>
                <option value="true_false">{t("editor.typeTrueFalse")}</option>
                <option value="short_answer">{t("editor.typeShortAnswer")}</option>
                <option value="reformulation">{t("editor.typeReformulation")}</option>
                <option value="word_order">{t("editor.typeWordOrder")}</option>
                <option value="fill_blank">{t("editor.typeFillBlank")}</option>
                <option value="matching">{t("editor.typeMatching")}</option>
              </select>
            </label>
          </div>

          <label>
            {t("editor.prompt")}
            <textarea
              value={draft.prompt}
              rows={4}
              onChange={(event) => updateQuestion({ prompt: event.target.value })}
            />
          </label>

          <details className="editor-disclosure editor-advanced-options bank-advanced-options">
            <summary>{t("editor.advancedOptions")}</summary>
            <div className="form-grid compact-controls">
              <label>
                {t("editor.time")}
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={draft.timeLimitSeconds}
                  onChange={(event) => updateQuestion({ timeLimitSeconds: Number(event.target.value) })}
                />
              </label>
              <label>
                {t("editor.points")}
                <input
                  type="number"
                  min={100}
                  max={5000}
                  step={100}
                  value={draft.points}
                  onChange={(event) => updateQuestion({ points: Number(event.target.value) })}
                />
              </label>
            </div>

          <div className="form-grid">
            <label>
              {t("bank.level")}
              <input value={metadata.level} onChange={(event) => updateMetadata({ level: event.target.value })} />
            </label>
            <label>
              {t("bank.language")}
              <select value={metadata.primaryLanguage} onChange={(event) => updateMetadata({ primaryLanguage: event.target.value as "fr" | "en" })}>
                <option value="en">{t("editor.english")}</option>
                <option value="fr">{t("editor.french")}</option>
              </select>
            </label>
          </div>

          <label>
            {t("bank.tags")}
            <input
              value={metadata.tags}
              placeholder={t("bank.tagsPlaceholder")}
              onChange={(event) => updateMetadata({ tags: event.target.value })}
            />
          </label>

          <section className="form-section program-metadata-section">
            <div className="section-heading">
              <h2>{t("program.section")}</h2>
              <span>{t("program.optional")}</span>
            </div>
            <div className="form-grid compact-controls">
              <label>
                {t("program.schoolLevel")}
                <select value={metadata.schoolLevel} onChange={(event) => updateSchoolLevel(event.target.value as BankMetadata["schoolLevel"])}>
                  <option value="">{t("program.unset")}</option>
                  {schoolLevelOptions.map((option) => (
                    <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
                  ))}
                </select>
              </label>
              <label>
                {t("program.languageTrack")}
                <select value={metadata.languageTrack} onChange={(event) => updateMetadata({ languageTrack: event.target.value as BankMetadata["languageTrack"] })}>
                  <option value="">{t("program.unset")}</option>
                  {languageTrackOptions.map((track) => <option key={track} value={track}>{track}</option>)}
                </select>
              </label>
              <label>
                {t("program.cefrLevel")}
                <select value={metadata.cefrLevel} onChange={(event) => updateMetadata({ cefrLevel: event.target.value as BankMetadata["cefrLevel"] })}>
                  <option value="">{t("program.unset")}</option>
                  {cefrLevelOptions.map((level) => <option key={level} value={level}>{level}</option>)}
                </select>
              </label>
              <label>
                {t("program.languageActivity")}
                <select value={metadata.languageActivity} onChange={(event) => updateMetadata({ languageActivity: event.target.value as BankMetadata["languageActivity"] })}>
                  <option value="">{t("program.unset")}</option>
                  {languageActivityOptions.map((option) => (
                    <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
                  ))}
                </select>
              </label>
              <label>
                {t("program.axis")}
                <select value={metadata.programAxis} onChange={(event) => updateMetadata({ programAxis: event.target.value })}>
                  <option value="">{t("program.unset")}</option>
                  {metadata.programAxis && !selectableProgramAxisOptions.some((option) => option.value === metadata.programAxis) ? (
                    <option value={metadata.programAxis}>{metadata.programAxis}</option>
                  ) : null}
                  {selectableProgramAxisOptions.map((option) => (
                    <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
                  ))}
                </select>
              </label>
              <label>
                {t("program.linguisticFocus")}
                <input
                  value={metadata.linguisticFocus}
                  placeholder={t("program.linguisticFocusPlaceholder")}
                  onChange={(event) => updateMetadata({ linguisticFocus: event.target.value })}
                />
              </label>
            </div>
          </section>

          <QuestionImageField
            imageUrl={questionImageUrlValue}
            audioUrl={questionAudioUrlValue}
            isUploading={isUploadingMedia}
            error={mediaUploadError}
            onUploadImage={uploadImage}
            onUploadAudio={uploadAudio}
            onRemove={() => updateQuestion({ mediaKey: null })}
            t={t}
          />

          <label>
            {t("editor.explanation")}
            <textarea
              value={draft.explanation}
              rows={3}
              onChange={(event) => updateQuestion({ explanation: event.target.value })}
            />
          </label>
          </details>

          <QuestionAnswersField
            draft={draft}
            updateChoice={updateChoice}
            updateAcceptedAnswers={updateAcceptedAnswers}
            updateWordOrderSentence={updateWordOrderSentence}
            updateWordOrderToken={updateWordOrderToken}
            addWordOrderToken={addWordOrderToken}
            removeWordOrderToken={removeWordOrderToken}
            updateMatchingPair={updateMatchingPair}
            addMatchingPair={addMatchingPair}
            removeMatchingPair={removeMatchingPair}
            t={t}
          />

          <div className="editor-actions">
            <button type="submit" disabled={isSaving}>
              {isSaving ? t("editor.saving") : editingId ? t("bank.update") : t("bank.save")}
            </button>
          </div>
        </form>

        <section className="bank-list">
          <form className="bank-filters" onSubmit={submitFilters}>
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

          {visibleItems.length === 0 ? (
            <section className="empty-state compact-empty">
              <h2>{t("bank.emptyTitle")}</h2>
              <p>{t("bank.emptyBody")}</p>
            </section>
          ) : (
            <div className="bank-card-list">
              {visibleItems.map((item) => {
                const programLabels = programMetadataLabels(item, t);
                return (
                  <article className="bank-card" key={item.id}>
                    <div className="quiz-card-header">
                      <div>
                        <p className="eyebrow">{questionTypeLabel(item.type)}</p>
                        <h2>{item.prompt}</h2>
                      </div>
                      {item.level ? <span className="status-chip">{item.level}</span> : null}
                    </div>
                    {buildQuestionImageUrl(item.mediaKey) ? <img className="question-image bank-card-image" src={buildQuestionImageUrl(item.mediaKey)!} alt="" /> : null}
                    {questionAudioUrl(item.mediaKey) ? <audio className="question-audio-player bank-card-audio" controls src={questionAudioUrl(item.mediaKey)!} /> : null}
                    <p className="bank-preview">{answerPreview(item)}</p>
                    {programLabels.length > 0 ? (
                      <div className="tag-row program-chip-row">
                        {programLabels.map((label) => <span className="status-chip" key={label}>{label}</span>)}
                      </div>
                    ) : null}
                    {item.tags.length > 0 ? (
                      <div className="tag-row">
                        {item.tags.map((tag) => <span className="status-chip" key={tag}>{tag}</span>)}
                      </div>
                    ) : null}
                    <div className="card-actions">
                      <button className="secondary-action" type="button" onClick={() => editItem(item)}>{t("bank.edit")}</button>
                      <button className="danger-action" type="button" onClick={() => void deleteItem(item.id)}>
                        <Trash2 size={16} />
                        {t("bank.delete")}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
      )}
      {similarQuestion ? (
        <SimilarQuestionDialog
          currentPrompt={similarQuestion.currentPrompt}
          similar={similarQuestion.similar}
          onDecision={(decision) => {
            similarQuestion.resolve(decision);
            setSimilarQuestion(null);
          }}
        />
      ) : null}
    </section>
  );
}

function QuestionImageField({
  imageUrl,
  audioUrl,
  isUploading,
  error,
  onUploadImage,
  onUploadAudio,
  onRemove,
  t
}: {
  imageUrl: string | null;
  audioUrl: string | null;
  isUploading: boolean;
  error: string | null;
  onUploadImage: (event: ChangeEvent<HTMLInputElement>) => void;
  onUploadAudio: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  t: (key: TranslationKey) => string;
}) {
  return (
    <div className="question-media-panel">
      <div className="question-media-header">
        <div>
          <h3>{t("editor.questionMedia")}</h3>
          <span>{t("editor.mediaHelp")}</span>
        </div>
        <div className="media-upload-actions">
          <label className="secondary-action media-upload-button">
            <ImagePlus size={16} />
            {isUploading ? t("editor.uploading") : imageUrl ? t("editor.replace") : t("editor.addImage")}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => onUploadImage(event)}
              disabled={isUploading}
            />
          </label>
          <label className="secondary-action media-upload-button">
            <Music size={16} />
            {isUploading ? t("editor.uploading") : audioUrl ? t("editor.replace") : t("editor.addAudio")}
            <input
              type="file"
              accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/wav,audio/wave,audio/x-wav,audio/webm,audio/ogg"
              onChange={(event) => onUploadAudio(event)}
              disabled={isUploading}
            />
          </label>
        </div>
      </div>
      {imageUrl ? (
        <div className="question-media-preview">
          <img src={imageUrl} alt="" />
          <button className="danger-action compact-button" type="button" onClick={onRemove}>
            <X size={16} />
            {t("editor.remove")}
          </button>
        </div>
      ) : audioUrl ? (
        <div className="question-media-preview question-audio-preview">
          <audio controls src={audioUrl} />
          <button className="danger-action compact-button" type="button" onClick={onRemove}>
            <X size={16} />
            {t("editor.remove")}
          </button>
        </div>
      ) : null}
      {error ? <p className="status-message error-message" role="alert">{error}</p> : null}
    </div>
  );
}

function QuestionAnswersField({
  draft,
  updateChoice,
  updateAcceptedAnswers,
  updateWordOrderSentence,
  updateWordOrderToken,
  addWordOrderToken,
  removeWordOrderToken,
  updateMatchingPair,
  addMatchingPair,
  removeMatchingPair,
  t
}: {
  draft: QuestionDraft;
  updateChoice: (index: number, patch: Partial<ChoiceDraft>) => void;
  updateAcceptedAnswers: (value: string) => void;
  updateWordOrderSentence: (value: string) => void;
  updateWordOrderToken: (index: number, label: string) => void;
  addWordOrderToken: () => void;
  removeWordOrderToken: (index: number) => void;
  updateMatchingPair: (pairIndex: number, side: "left" | "right", label: string) => void;
  addMatchingPair: () => void;
  removeMatchingPair: (pairIndex: number) => void;
  t: (key: TranslationKey) => string;
}) {
  return (
    <section className="form-section bank-answer-section">
      <div className="section-heading">
        <h2>{t("editor.answers")}</h2>
        <span>{draft.type === "matching" ? t("editor.matchingPairs") : draft.type === "fill_blank" ? t("editor.fillBlankCorrections") : isFreeTextQuestionType(draft.type) ? t("editor.acceptedCorrections") : draft.type === "word_order" ? t("editor.correctOrder") : t("editor.oneCorrectAnswer")}</span>
      </div>
      <p className="answer-guidance">{t(questionAnswerHelpKey(draft.type) as TranslationKey)}</p>
      {isFreeTextQuestionType(draft.type) || draft.type === "fill_blank" ? (
        <label>
          {draft.type === "fill_blank" ? t("editor.oneBlankCorrectionPerLine") : t("editor.oneCorrectionPerLine")}
          <textarea
            className="accepted-answers-box"
            value={draft.acceptedAnswers.join("\n")}
            rows={6}
            onChange={(event) => updateAcceptedAnswers(event.target.value)}
          />
        </label>
      ) : draft.type === "matching" ? (
        <div className="matching-editor">
          <div className="word-token-editor-header">
            <strong>{t("editor.matchingPairs")}</strong>
            <button className="secondary-action compact-button" type="button" onClick={addMatchingPair} disabled={draft.choices.length >= 16}>
              <Plus size={16} />
              {t("editor.add")}
            </button>
          </div>
          <div className="matching-editor-grid">
            {matchingPairs(draft).map((pair, pairIndex) => (
              <div className="matching-editor-row" key={`bank-matching-pair-${pairIndex}`}>
                <span>{pairIndex + 1}</span>
                <label>
                  {t("editor.leftItem")}
                  <input
                    value={pair.left.label}
                    onChange={(event) => updateMatchingPair(pairIndex, "left", event.target.value)}
                  />
                </label>
                <label>
                  {t("editor.rightItem")}
                  <input
                    value={pair.right.label}
                    onChange={(event) => updateMatchingPair(pairIndex, "right", event.target.value)}
                  />
                </label>
                <button className="secondary-action compact-button" type="button" onClick={() => removeMatchingPair(pairIndex)} disabled={matchingPairs(draft).length <= 2}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : draft.type === "word_order" ? (
        <div className="word-order-editor">
          <label>
            {t("editor.correctSentence")}
            <textarea
              value={draft.choices.map((choice) => choice.label.trim()).filter(Boolean).join(" ")}
              rows={3}
              onChange={(event) => updateWordOrderSentence(event.target.value)}
            />
          </label>
          <div className="word-token-editor-header">
            <strong>{t("editor.words")}</strong>
            <button className="secondary-action compact-button" type="button" onClick={addWordOrderToken} disabled={draft.choices.length >= 12}>
              <Plus size={16} />
              {t("editor.add")}
            </button>
          </div>
          <div className="word-token-editor-grid">
            {draft.choices.map((choice, index) => (
              <div className="word-token-editor-row" key={`bank-word-order-token-${index}`}>
                <span>{index + 1}</span>
                <input
                  value={choice.label}
                  placeholder={`${t("editor.word")} ${index + 1}`}
                  onChange={(event) => updateWordOrderToken(index, event.target.value)}
                />
                <button className="secondary-action compact-button" type="button" onClick={() => removeWordOrderToken(index)} disabled={draft.choices.length <= 2}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={draft.type === "true_false" ? "choice-editor-grid two-choices" : "choice-editor-grid"}>
          {draft.choices.map((choice, index) => (
            <div key={`${draft.type}-${choiceLetters[index]}`} className={`choice-editor ${choiceClasses[index] ?? "answer-blue"}`}>
              <div className="choice-editor-header">
                <span className="choice-letter">{choiceLetters[index] ?? index + 1}</span>
                <label className="radio-row">
                  <input
                    type="radio"
                    name="bank-correct-choice"
                    checked={choice.isCorrect}
                    onChange={() => updateChoice(index, { isCorrect: true })}
                  />
                  {t("editor.goodAnswer")}
                </label>
              </div>
              <label>
                {t("editor.answer")} {choiceLetters[index] ?? index + 1}
                <input
                  value={choice.label}
                  onChange={(event) => updateChoice(index, { label: event.target.value })}
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function answerPreview(item: QuestionBankItem) {
  const answers = isFreeTextQuestionType(item.type) || item.type === "fill_blank" ? item.acceptedAnswers : item.choices.map((choice) => choice.label);
  return answers.filter(Boolean).slice(0, 4).join(", ");
}

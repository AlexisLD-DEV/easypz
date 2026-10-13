import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ImagePlus, Music, Plus, Trash2, X } from "lucide-react";
import { api } from "../../api/client";
import { userFacingErrorMessage } from "../../errorMessages";
import { useI18n } from "../../i18n/useI18n";
import type { TranslationKey } from "../../i18n/translations";
import { questionAudioUrl, questionImageUrl, questionMediaKind } from "../media/mediaUrl";
import { uploadQuestionAudio, uploadQuestionImage } from "../media/questionMediaUpload";
import { QuestionBankPanel } from "../questionBank/QuestionBankPanel";
import { SimilarQuestionDialog, type SimilarQuestionDecision } from "../questionBank/SimilarQuestionDialog";
import { questionDraftToBankInput, type QuestionBankItem } from "../questionBank/questionBankModel";
import { buildFillBlankFromMarkedText } from "./fillBlankBuilder";
import {
  buildQuizPayload,
  createInitialQuizDraft,
  createQuestionDraft,
  draftFromTeacherQuizResponse,
  advancedQuestionTypes,
  isFreeTextQuestionType,
  matchingPairs,
  normaliseQuestion,
  questionAnswerHelpKey,
  questionTypeHelpKey,
  simpleQuestionTypes,
  validateQuizDraft,
  type ChoiceDraft,
  type QuestionDraft,
  type QuestionType,
  type QuizEditorDraft,
  type TeacherQuizResponse
} from "./quizEditorModel";
import { QuestionPrompt } from "../questions/QuestionPrompt";

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

export function QuizEditor() {
  const { locale, t } = useI18n();
  const quizId = new URLSearchParams(window.location.search).get("id");
  const quickStart = new URLSearchParams(window.location.search).get("quick") === "1";
  const [draft, setDraft] = useState<QuizEditorDraft>(() => createInitialQuizDraft({ quick: quickStart }));
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(quizId));
  const [isSaving, setIsSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const savedQuizIdRef = useRef<string | null>(quizId);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSnapshotRef = useRef<string | null>(null);
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "dirty" | "saving" | "saved" | "error">("idle");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [wordOrderSentenceText, setWordOrderSentenceText] = useState("");
  const [fillBlankSourceText, setFillBlankSourceText] = useState("");
  const [isBankPanelOpen, setIsBankPanelOpen] = useState(false);
  const [similarQuestion, setSimilarQuestion] = useState<{
    currentPrompt: string;
    similar: QuestionBankItem;
    resolve: (decision: SimilarQuestionDecision) => void;
  } | null>(null);

  useEffect(() => {
    if (!quizId) return;

    let cancelled = false;
    setIsLoading(true);
    api<TeacherQuizResponse>(`/api/teacher/quizzes/${encodeURIComponent(quizId)}`)
      .then((data) => {
        if (!cancelled) {
          setDraft(draftFromTeacherQuizResponse(data));
          setActiveIndex(0);
        }
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
  }, [quizId, locale]);

  // Auto-save: capture the initial snapshot once, then debounce-save any edit.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && draft.questions.length > 0) {
      initializedRef.current = true;
      initialSnapshotRef.current = JSON.stringify(draft);
    }
  }, [draft]);

  useEffect(() => {
    if (initialSnapshotRef.current === null) return;
    if (JSON.stringify(draft) === initialSnapshotRef.current) return;

    setAutoSaveState("dirty");
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => { void autoSave(); }, 1500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [draft]);

  const activeQuestion = draft.questions[activeIndex] ?? draft.questions[0];
  const activeQuestionImageUrl = questionImageUrl(activeQuestion?.mediaKey);
  const activeQuestionAudioUrl = questionAudioUrl(activeQuestion?.mediaKey);
  const fillBlankBuilderPreview = activeQuestion?.type === "fill_blank" ? buildFillBlankFromMarkedText(fillBlankSourceText) : null;
  const questionTypeLabel = (type: QuestionType) => t(questionTypeLabelKeys[type]);

  useEffect(() => {
    setMediaUploadError(null);
  }, [activeIndex]);

  useEffect(() => {
    setWordOrderSentenceText(activeQuestion?.type === "word_order" ? wordOrderSentence(activeQuestion) : "");
  }, [activeIndex, activeQuestion?.id, activeQuestion?.type]);

  useEffect(() => {
    setFillBlankSourceText("");
  }, [activeIndex, activeQuestion?.id]);

  function updateDraft<K extends keyof Omit<QuizEditorDraft, "questions">>(key: K, value: QuizEditorDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateQuestion(patch: Partial<QuestionDraft>) {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, index) => (
        index === activeIndex ? normaliseQuestion({ ...question, ...patch }) : question
      ))
    }));
  }

  function changeQuestionType(type: QuestionType) {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, index) => {
        if (index !== activeIndex) return question;
        const next = createQuestionDraft(type);
        return normaliseQuestion({
          ...next,
          id: question.id,
          prompt: question.prompt,
          mediaKey: question.mediaKey ?? null,
          explanation: question.explanation,
          timeLimitSeconds: question.timeLimitSeconds,
          points: question.points,
          acceptedAnswers: isFreeTextQuestionType(type) || type === "fill_blank" ? question.acceptedAnswers : next.acceptedAnswers
        });
      })
    }));
  }

  function addQuestion(type: QuestionType) {
    setDraft((current) => ({
      ...current,
      questions: [...current.questions, createQuestionDraft(type)]
    }));
    setActiveIndex(draft.questions.length);
  }

  function removeActiveQuestion() {
    if (draft.questions.length <= 1) return;
    const nextIndex = Math.max(0, activeIndex - 1);
    setDraft((current) => ({
      ...current,
      questions: current.questions.filter((_, index) => index !== activeIndex)
    }));
    setActiveIndex(nextIndex);
  }

  function updateChoice(index: number, patch: Partial<ChoiceDraft>) {
    const choices = activeQuestion.choices.map((choice, choiceIndex) => {
      if (choiceIndex !== index) return choice;
      return { ...choice, ...patch };
    });

    updateQuestion({
      choices: patch.isCorrect
        ? choices.map((choice, choiceIndex) => ({ ...choice, isCorrect: choiceIndex === index }))
        : choices
    });
  }

  function updateAcceptedAnswers(value: string) {
    updateQuestion({ acceptedAnswers: value.split("\n") });
  }

  function applyFillBlankBuilder() {
    const next = buildFillBlankFromMarkedText(fillBlankSourceText);
    if (next.blankCount === 0) {
      setError(t("editor.fillBlankBuilderNoBlank"));
      return;
    }

    setError(null);
    updateQuestion({
      prompt: next.prompt,
      acceptedAnswers: next.acceptedAnswers
    });
  }

  function updateWordOrderSentence(value: string) {
    setWordOrderSentenceText(value);
    updateQuestion({
      choices: wordOrderChoicesFromSentence(value)
    });
  }

  function updateWordOrderToken(index: number, label: string) {
    const choices = activeQuestion.choices.map((choice, choiceIndex) => (
      choiceIndex === index ? { ...choice, label, isCorrect: true } : choice
    ));
    setWordOrderSentenceText(wordOrderSentence({ ...activeQuestion, choices }));
    updateQuestion({
      choices
    });
  }

  function addWordOrderToken() {
    if (activeQuestion.choices.length >= 12) return;
    const choices = [...activeQuestion.choices, { label: "", isCorrect: true }];
    setWordOrderSentenceText(wordOrderSentence({ ...activeQuestion, choices }));
    updateQuestion({ choices });
  }

  function removeWordOrderToken(index: number) {
    if (activeQuestion.choices.length <= 2) return;
    const choices = activeQuestion.choices.filter((_, choiceIndex) => choiceIndex !== index);
    setWordOrderSentenceText(wordOrderSentence({ ...activeQuestion, choices }));
    updateQuestion({ choices });
  }

  function updateMatchingPair(pairIndex: number, side: "left" | "right", label: string) {
    const choiceIndex = pairIndex * 2 + (side === "right" ? 1 : 0);
    const choices = activeQuestion.choices.map((choice, index) => (
      index === choiceIndex ? { ...choice, label, isCorrect: index % 2 === 0 } : choice
    ));
    updateQuestion({ choices });
  }

  function addMatchingPair() {
    if (activeQuestion.choices.length >= 16) return;
    updateQuestion({
      choices: [
        ...activeQuestion.choices,
        { label: "", isCorrect: true },
        { label: "", isCorrect: false }
      ]
    });
  }

  function removeMatchingPair(pairIndex: number) {
    if (matchingPairs(activeQuestion).length <= 2) return;
    updateQuestion({
      choices: activeQuestion.choices.filter((_, index) => index < pairIndex * 2 || index > pairIndex * 2 + 1)
    });
  }

  async function uploadActiveQuestionImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file || !activeQuestion) return;

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

  async function uploadActiveQuestionAudio(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file || !activeQuestion) return;

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

  async function save(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const validationError = validateQuizDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    try {
      await api(quizId ? `/api/teacher/quizzes/${encodeURIComponent(quizId)}` : "/api/teacher/quizzes", {
        method: quizId ? "PUT" : "POST",
        body: JSON.stringify(buildQuizPayload(draft))
      });
      const canRedirect = await saveCheckedQuestionsToBank();
      if (!canRedirect) return;
      window.location.href = "/dashboard";
    } catch (reason) {
      setError(userFacingErrorMessage(locale, reason));
    } finally {
      setIsSaving(false);
    }
  }

  async function autoSave() {
    const validationError = validateQuizDraft(draft);
    if (validationError || !draft.title.trim()) {
      setAutoSaveState("idle");
      return;
    }
    setAutoSaveState("saving");
    try {
      const targetId = savedQuizIdRef.current;
      const response = await api<{ id: string }>(
        targetId ? `/api/teacher/quizzes/${encodeURIComponent(targetId)}` : "/api/teacher/quizzes",
        { method: targetId ? "PUT" : "POST", body: JSON.stringify(buildQuizPayload(draft)) }
      );
      if (!targetId && response?.id) savedQuizIdRef.current = response.id;
      setAutoSaveState("saved");
    } catch {
      setAutoSaveState("error");
    }
  }

  async function saveCheckedQuestionsToBank() {
    for (const question of draft.questions.filter((item) => item.addToBank)) {
      const input = questionDraftToBankInput(question, {
        level: draft.level,
        primaryLanguage: draft.primaryLanguage
      });
      try {
        const check = await api<{ exact: QuestionBankItem | null; similar: QuestionBankItem[] }>("/api/teacher/question-bank/check-similar", {
          method: "POST",
          body: JSON.stringify(input)
        });
        if (check.exact) continue;
        if (check.similar.length > 0) {
          const decision = await askSimilarQuestion(question.prompt, check.similar[0]);
          if (decision === "view_bank") {
            window.location.href = "/question-bank";
            return false;
          }
          if (decision === "skip") continue;
        }
        await api("/api/teacher/question-bank", {
          method: "POST",
          body: JSON.stringify(input)
        });
      } catch {
        setError(t("bank.autoSaveWarning"));
        return false;
      }
    }

    return true;
  }

  function askSimilarQuestion(currentPrompt: string, similar: QuestionBankItem) {
    return new Promise<SimilarQuestionDecision>((resolve) => {
      setSimilarQuestion({ currentPrompt, similar, resolve });
    });
  }

  return (
    <section className="editor-page">
      <header className="page-header editor-page-header">
        <div>
          <p className="eyebrow">{quizId ? t("editor.editing") : t("editor.creation")}</p>
          <h1>{quizId ? t("editor.editQuiz") : t("editor.newQuiz")}</h1>
          <p className="page-subtitle">{t("editor.flowHelp")}</p>
        </div>
        <div className="card-actions">
          <button className="secondary-action" type="button" onClick={() => setIsBankPanelOpen(true)}>
            <Plus size={16} />
            {t("bank.fromBank")}
          </button>
          <button className="secondary-action" type="button" onClick={() => setPreviewOpen((value) => !value)} aria-expanded={previewOpen}>
            {t("editor.preview")}
          </button>
          <a className="button-link secondary-action" href="/dashboard">{t("editor.backDashboard")}</a>
        </div>
      </header>

      <ol className="editor-flow-steps" aria-label={t("editor.creation")}>
        <li>
          <span>1</span>
          {t("editor.stepQuiz")}
        </li>
        <li>
          <span>2</span>
          {t("editor.stepQuestion")}
        </li>
        <li>
          <span>3</span>
          {t("editor.stepAnswers")}
        </li>
      </ol>

      <section className="editor-layout">
        <aside className="question-list editor-sidebar" aria-label={t("editor.questionList")}>
          <div>
            <p className="eyebrow">{t("editor.questions")}</p>
            <h2>{draft.questions.length} {draft.questions.length > 1 ? t("editor.questionPlural") : t("editor.questionSingular")}</h2>
          </div>
          <div className="question-card-list">
            {draft.questions.map((question, index) => (
              <button
                key={`${question.id ?? "new"}-${index}`}
                className={index === activeIndex ? "question-card question-card-active" : "question-card"}
                type="button"
                onClick={() => setActiveIndex(index)}
              >
                <span className="question-number">{index + 1}</span>
                <span>
                  <strong>{questionTypeLabel(question.type)}</strong>
                  <small>{question.prompt.trim() || t("editor.toComplete")}</small>
                </span>
                {question.mediaKey && questionMediaKind(question.mediaKey) === "audio"
                  ? <Music className="question-card-media-icon" size={14} aria-label={t("editor.audioAdded")} />
                  : question.mediaKey
                    ? <ImagePlus className="question-card-media-icon" size={14} aria-label={t("editor.imageAdded")} />
                    : null}
              </button>
            ))}
          </div>
          <div className="question-add-grid" aria-label={t("editor.addQuestion")}>
            {simpleQuestionTypes.map((type) => (
              <button className="secondary-action" type="button" onClick={() => addQuestion(type)} key={type}>
                <Plus size={16} />
                {questionTypeLabel(type)}
              </button>
            ))}
          </div>
          <details className="editor-disclosure">
            <summary>{t("editor.moreTypes")}</summary>
            <div className="question-add-grid">
              {advancedQuestionTypes.map((type) => (
                <button className="secondary-action" type="button" onClick={() => addQuestion(type)} key={type}>
                  <Plus size={16} />
                  {questionTypeLabel(type)}
                </button>
              ))}
            </div>
          </details>
        </aside>

        {previewOpen && activeQuestion ? (
          <section className="editor-preview-panel" aria-label={t("editor.preview")}>
            <header className="section-heading">
              <div>
                <h2>{t("editor.previewTitle")}</h2>
              </div>
              <button className="icon-button" type="button" aria-label={t("editor.closePreview")} onClick={() => setPreviewOpen(false)}>×</button>
            </header>
            <div className="preview-question-card">
              <span className="status-pill status-question">{t("practice.question")}</span>
              <h3><QuestionPrompt prompt={activeQuestion.prompt || "…"} blankLabel={t("practice.blank")} /></h3>
              {activeQuestion.choices.length > 0 ? (
                <div className="answer-grid">
                  {activeQuestion.choices.map((choice, index) => (
                    <button key={index} type="button" className={`answer-tile ${choiceClasses[index] ?? ""}`} tabIndex={-1}>
                      <span className="answer-symbol">{choiceLetters[index]}</span>
                      <span>{choice.label || "…"}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="status-message">{t("editor.previewNoChoices")}</p>
              )}
            </div>
          </section>
        ) : null}

        <form className="question-editor" onSubmit={save}>
          {isLoading ? <p className="status-message">{t("editor.loading")}</p> : null}

          <section className="form-section">
            <div className="section-heading">
              <h2>{t("editor.quizInfo")}</h2>
              <span>{t("editor.draftOrPublication")}</span>
            </div>
            <div className="form-grid">
              <label>
                {t("editor.quizTitle")}
                <input
                  value={draft.title}
                  placeholder="Ex: Irregular verbs"
                  onChange={(event) => updateDraft("title", event.target.value)}
                />
              </label>
              <label>
                {t("editor.level")}
                <input
                  value={draft.level}
                  placeholder="Ex: A2, 5e, Terminale"
                  onChange={(event) => updateDraft("level", event.target.value)}
                />
              </label>
            </div>
            <details className="editor-disclosure editor-advanced-options">
              <summary>{t("editor.advancedOptions")}</summary>
              <div className="form-grid">
                <label>
                  {t("editor.quizDescription")}
                  <input
                    value={draft.description}
                    placeholder="Ex: 10 minutes pour reviser en classe"
                    onChange={(event) => updateDraft("description", event.target.value)}
                  />
                </label>
                <label>
                  {t("editor.primaryLanguage")}
                  <select
                    value={draft.primaryLanguage}
                    onChange={(event) => updateDraft("primaryLanguage", event.target.value as QuizEditorDraft["primaryLanguage"])}
                  >
                    <option value="en">{t("editor.english")}</option>
                    <option value="fr">{t("editor.french")}</option>
                  </select>
                </label>
                <label>
                  {t("editor.visibility")}
                  <select
                    value={draft.visibility}
                    onChange={(event) => updateDraft("visibility", event.target.value as QuizEditorDraft["visibility"])}
                  >
                    <option value="private">{t("editor.private")}</option>
                    <option value="public">{t("editor.public")}</option>
                    <option value="secret_link">{t("editor.secretLink")}</option>
                  </select>
                </label>
                <label className="checkbox-row bank-checkbox-row">
                  <input
                    type="checkbox"
                    checked={draft.examMode}
                    onChange={(event) => updateDraft("examMode", event.target.checked)}
                  />
                  <span>
                    <strong>{t("editor.examMode")}</strong>
                    <small>{t("editor.examModeHelp")}</small>
                  </span>
                </label>
                <label>
                  {t("editor.status")}
                  <select
                    value={draft.status}
                    onChange={(event) => updateDraft("status", event.target.value as QuizEditorDraft["status"])}
                  >
                    <option value="draft">{t("editor.draft")}</option>
                    <option value="published">{t("editor.published")}</option>
                  </select>
                </label>
              </div>
            </details>
          </section>

          {activeQuestion ? (
            <>
              <section className="form-section">
                <div className="section-heading">
                  <div>
                    <h2>{t("editor.question")} {activeIndex + 1}</h2>
                    <span>{questionTypeLabel(activeQuestion.type)}</span>
                  </div>
                  {draft.questions.length > 1 ? (
                    <button className="danger-action compact-button" type="button" onClick={removeActiveQuestion}>
                      <Trash2 size={16} />
                      {t("editor.delete")}
                    </button>
                  ) : null}
                </div>
                <div className="form-grid compact-controls">
                  <label>
                    {t("editor.type")}
                    <select
                      value={activeQuestion.type}
                      onChange={(event) => changeQuestionType(event.target.value as QuestionType)}
                    >
                      {[...simpleQuestionTypes, ...advancedQuestionTypes].map((type) => (
                        <option value={type} key={type}>{questionTypeLabel(type)}</option>
                      ))}
                    </select>
                    <span className="field-help">{t(questionTypeHelpKey(activeQuestion.type) as TranslationKey)}</span>
                  </label>
                </div>
                <label>
                  {t("editor.prompt")}
                  <textarea
                    value={activeQuestion.prompt}
                    placeholder="Ex: Choose the past form of go."
                    rows={4}
                    onChange={(event) => updateQuestion({ prompt: event.target.value })}
                  />
                </label>
                <details className="editor-disclosure editor-advanced-options question-options-panel">
                  <summary>{t("editor.questionOptions")}</summary>
                  <div className="form-grid compact-controls">
                    <label>
                      {t("editor.time")}
                      <input
                        type="number"
                        min={5}
                        max={180}
                        value={activeQuestion.timeLimitSeconds}
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
                        value={activeQuestion.points}
                        onChange={(event) => updateQuestion({ points: Number(event.target.value) })}
                      />
                    </label>
                  </div>
                  <label className="checkbox-row bank-checkbox-row">
                    <input
                      type="checkbox"
                      checked={Boolean(activeQuestion.addToBank)}
                      onChange={(event) => updateQuestion({ addToBank: event.target.checked })}
                    />
                    {t("bank.addToBank")}
                  </label>
                  <div className="question-media-panel">
                    <div className="question-media-header">
                      <div>
                        <h3>{t("editor.questionMedia")}</h3>
                        <span>{t("editor.mediaHelp")}</span>
                      </div>
                      <div className="media-upload-actions">
                        <label className="secondary-action media-upload-button">
                          <ImagePlus size={16} />
                          {isUploadingMedia ? t("editor.uploading") : activeQuestionImageUrl ? t("editor.replace") : t("editor.addImage")}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            onChange={(event) => void uploadActiveQuestionImage(event)}
                            disabled={isUploadingMedia}
                          />
                        </label>
                        <label className="secondary-action media-upload-button">
                          <Music size={16} />
                          {isUploadingMedia ? t("editor.uploading") : activeQuestionAudioUrl ? t("editor.replace") : t("editor.addAudio")}
                          <input
                            type="file"
                            accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/wav,audio/wave,audio/x-wav,audio/webm,audio/ogg"
                            onChange={(event) => void uploadActiveQuestionAudio(event)}
                            disabled={isUploadingMedia}
                          />
                        </label>
                      </div>
                    </div>
                    {activeQuestionImageUrl ? (
                      <div className="question-media-preview">
                        <img src={activeQuestionImageUrl} alt="" />
                        <button className="danger-action compact-button" type="button" onClick={() => updateQuestion({ mediaKey: null })}>
                          <X size={16} />
                          {t("editor.remove")}
                        </button>
                      </div>
                    ) : activeQuestionAudioUrl ? (
                      <div className="question-media-preview question-audio-preview">
                        <audio controls src={activeQuestionAudioUrl} />
                        <button className="danger-action compact-button" type="button" onClick={() => updateQuestion({ mediaKey: null })}>
                          <X size={16} />
                          {t("editor.remove")}
                        </button>
                      </div>
                    ) : null}
                    {mediaUploadError ? <p className="status-message error-message" role="alert">{mediaUploadError}</p> : null}
                  </div>
                  <label>
                    {t("editor.explanation")}
                    <textarea
                      value={activeQuestion.explanation}
                      placeholder="Ex: Go becomes went in the simple past."
                      rows={3}
                      onChange={(event) => updateQuestion({ explanation: event.target.value })}
                    />
                  </label>
                </details>
              </section>

              <section className="form-section">
                <div className="section-heading">
                  <h2>{t("editor.answers")}</h2>
                  <span>{activeQuestion.type === "matching" ? t("editor.matchingPairs") : activeQuestion.type === "fill_blank" ? t("editor.fillBlankCorrections") : isFreeTextQuestionType(activeQuestion.type) ? t("editor.acceptedCorrections") : activeQuestion.type === "word_order" ? t("editor.correctOrder") : t("editor.oneCorrectAnswer")}</span>
                </div>
                <p className="answer-guidance">{t(questionAnswerHelpKey(activeQuestion.type) as TranslationKey)}</p>
                {activeQuestion.type === "fill_blank" ? (
                  <>
                    <div className="fill-blank-builder">
                      <div className="word-token-editor-header fill-blank-builder-header">
                        <div>
                          <strong>{t("editor.fillBlankBuilderTitle")}</strong>
                          <small>{t("editor.fillBlankBuilderHelp")}</small>
                        </div>
                        <button
                          className="secondary-action compact-button"
                          type="button"
                          onClick={applyFillBlankBuilder}
                          disabled={!fillBlankBuilderPreview?.blankCount}
                        >
                          {t("editor.fillBlankBuilderApply")}
                        </button>
                      </div>
                      <textarea
                        className="fill-blank-source-box"
                        value={fillBlankSourceText}
                        placeholder={t("editor.fillBlankBuilderPlaceholder")}
                        rows={5}
                        onChange={(event) => setFillBlankSourceText(event.target.value)}
                      />
                      <p className="fill-blank-builder-preview">
                        {fillBlankBuilderPreview?.blankCount
                          ? t("editor.fillBlankBuilderPreview").replace("{count}", String(fillBlankBuilderPreview.blankCount))
                          : t("editor.fillBlankBuilderNoBlank")}
                      </p>
                    </div>
                    <label>
                      {t("editor.oneBlankCorrectionPerLine")}
                      <textarea
                        className="accepted-answers-box"
                        value={activeQuestion.acceptedAnswers.join("\n")}
                        placeholder="went | walked\nwas"
                        rows={6}
                        onChange={(event) => updateAcceptedAnswers(event.target.value)}
                      />
                    </label>
                  </>
                ) : isFreeTextQuestionType(activeQuestion.type) ? (
                  <label>
                    {t("editor.oneCorrectionPerLine")}
                    <textarea
                      className="accepted-answers-box"
                      value={activeQuestion.acceptedAnswers.join("\n")}
                      placeholder="saw\nSaw"
                      rows={6}
                      onChange={(event) => updateAcceptedAnswers(event.target.value)}
                    />
                  </label>
                ) : activeQuestion.type === "matching" ? (
                  <div className="matching-editor">
                    <div className="word-token-editor-header">
                      <strong>{t("editor.matchingPairs")}</strong>
                      <button className="secondary-action compact-button" type="button" onClick={addMatchingPair} disabled={activeQuestion.choices.length >= 16}>
                        <Plus size={16} />
                        {t("editor.add")}
                      </button>
                    </div>
                    <div className="matching-editor-grid">
                      {matchingPairs(activeQuestion).map((pair, pairIndex) => (
                        <div className="matching-editor-row" key={`matching-pair-${pairIndex}`}>
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
                          <button className="secondary-action compact-button" type="button" onClick={() => removeMatchingPair(pairIndex)} disabled={matchingPairs(activeQuestion).length <= 2}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : activeQuestion.type === "word_order" ? (
                  <div className="word-order-editor">
                    <label>
                      {t("editor.correctSentence")}
                      <textarea
                        value={wordOrderSentenceText}
                        placeholder="Ex: I went to school yesterday"
                        rows={3}
                        onChange={(event) => updateWordOrderSentence(event.target.value)}
                      />
                    </label>
                    <div className="word-token-editor-header">
                      <strong>{t("editor.words")}</strong>
                      <button className="secondary-action compact-button" type="button" onClick={addWordOrderToken} disabled={activeQuestion.choices.length >= 12}>
                        <Plus size={16} />
                        {t("editor.add")}
                      </button>
                    </div>
                    <div className="word-token-editor-grid">
                      {activeQuestion.choices.map((choice, index) => (
                        <div className="word-token-editor-row" key={`word-order-token-${index}`}>
                          <span>{index + 1}</span>
                          <input
                            value={choice.label}
                            placeholder={`${t("editor.word")} ${index + 1}`}
                            onChange={(event) => updateWordOrderToken(index, event.target.value)}
                          />
                          <button className="secondary-action compact-button" type="button" onClick={() => removeWordOrderToken(index)} disabled={activeQuestion.choices.length <= 2}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={activeQuestion.type === "true_false" ? "choice-editor-grid two-choices" : "choice-editor-grid"}>
                    {activeQuestion.choices.map((choice, index) => (
                      <div key={`${activeQuestion.type}-${choiceLetters[index]}`} className={`choice-editor ${choiceClasses[index]}`}>
                        <div className="choice-editor-header">
                          <span className="choice-letter">{choiceLetters[index]}</span>
                          <label className="radio-row">
                            <input
                              type="radio"
                              name={`correct-choice-${activeIndex}`}
                              checked={choice.isCorrect}
                              onChange={() => updateChoice(index, { isCorrect: true })}
                            />
                            {t("editor.goodAnswer")}
                          </label>
                        </div>
                        <label>
                          {t("editor.answer")} {choiceLetters[index]}
                          <input
                            value={choice.label}
                            placeholder={`Texte de la reponse ${choiceLetters[index]}`}
                            onChange={(event) => updateChoice(index, { label: event.target.value })}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}

          {error ? <p className="status-message error-message" role="alert">{error}</p> : null}

          <div className="editor-actions">
            {autoSaveState === "dirty" ? (
              <span className="auto-save-hint auto-save-hint-dirty">{t("editor.unsaved")}</span>
            ) : autoSaveState === "saving" ? (
              <span className="auto-save-hint">{t("editor.savingAuto")}</span>
            ) : autoSaveState === "saved" ? (
              <span className="auto-save-hint auto-save-hint-ok">{t("editor.savedAuto")}</span>
            ) : autoSaveState === "error" ? (
              <span className="auto-save-hint auto-save-hint-error">{t("editor.saveError")}</span>
            ) : null}
            <button type="submit" disabled={isLoading || isSaving}>
              {isSaving ? t("editor.saving") : t("editor.saveQuiz")}
            </button>
          </div>
        </form>
      </section>
      {isBankPanelOpen ? (
        <QuestionBankPanel
          onClose={() => setIsBankPanelOpen(false)}
          onInsert={(question) => {
            setDraft((current) => {
              setActiveIndex(current.questions.length);
              return { ...current, questions: [...current.questions, question] };
            });
            setIsBankPanelOpen(false);
          }}
        />
      ) : null}
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

function wordOrderChoicesFromSentence(value: string) {
  return value
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((label) => ({ label, isCorrect: true }));
}

function wordOrderSentence(question: QuestionDraft) {
  return question.choices.map((choice) => choice.label.trim()).filter(Boolean).join(" ");
}

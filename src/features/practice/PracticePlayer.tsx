import { useEffect, useMemo, useState } from "react";
import { Check, Send, X } from "lucide-react";
import { blankCountFromPrompt, buildFillBlankAnswerText } from "../../../worker/live/fillBlank";
import { buildMatchingAnswerText, matchingPairsFromChoices, type MatchingAnswerPair } from "../../../worker/live/matching";
import { api } from "../../api/client";
import { userFacingErrorMessage } from "../../errorMessages";
import { useI18n } from "../../i18n/useI18n";
import { questionAudioUrl, questionImageUrl } from "../media/mediaUrl";
import { QuestionPrompt } from "../questions/QuestionPrompt";
import { practiceQuizPath, practiceStartPath, type PracticeAccess } from "./practiceAccess";
import {
  buildPracticeAnswerPayload,
  choicesForQuestion,
  moveTokenToAnswer,
  moveTokenToBank,
  practiceCorrectionDisplay,
  practicePromptParts,
  summarizePracticeAnswers,
  wordOrderAnswerText,
  type PracticeAnswerRecord,
  type PublicChoice,
  type WordOrderState
} from "./practicePlayerModel";

type PublicQuiz = {
  title: string;
  description: string;
  level: string;
  exam_mode?: number;
  default_time_limit_seconds?: number;
};

type PublicQuestion = {
  id: string;
  type: "multiple_choice" | "true_false" | "short_answer" | "reformulation" | "word_order" | "fill_blank" | "matching";
  order_index: number;
  prompt: string;
  media_key?: string | null;
  time_limit_seconds: number;
  points: number;
};

type PracticeCorrection = {
  explanation: string;
  correctChoices: Array<{ id: string; label: string }>;
  acceptedAnswers: string[];
};

type PracticeAnswerResult = PracticeAnswerRecord & {
  correction: PracticeCorrection | null;
};

type PublicQuizResponse = {
  quiz: PublicQuiz;
  questions: PublicQuestion[];
  choices: PublicChoice[];
};

export function PracticePlayer({ access }: { access: PracticeAccess }) {
  const { locale, t } = useI18n();
  const [quiz, setQuiz] = useState<PublicQuiz | null>(null);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [choices, setChoices] = useState<PublicChoice[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    try { return window.localStorage.getItem("practice_sound") === "1"; } catch { return false; }
  });
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<PracticeAnswerResult[]>([]);
  const [answerText, setAnswerText] = useState("");
  const [fillBlankAnswers, setFillBlankAnswers] = useState<string[]>([]);
  const [matchingAnswer, setMatchingAnswer] = useState<MatchingAnswerPair[]>([]);
  const [selectedMatchingLeftId, setSelectedMatchingLeftId] = useState<string | null>(null);
  const [wordOrder, setWordOrder] = useState<WordOrderState>({ bank: [], answer: [] });
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const accessKey = access.kind === "secret" ? `secret:${access.token}` : `public:${access.slug}`;

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([
      api<PublicQuizResponse>(practiceQuizPath(access)),
      api<{ attemptId: string }>(practiceStartPath(access), { method: "POST" })
    ])
      .then(([quizResponse, attemptResponse]) => {
        if (cancelled) return;
        setQuiz(quizResponse.quiz);
        setQuestions(quizResponse.questions);
        setChoices(quizResponse.choices);
        setAttemptId(attemptResponse.attemptId);
        setQuestionStartedAt(Date.now());
      })
      .catch((reason: Error) => {
        if (!cancelled) setError(userFacingErrorMessage(locale, reason));
      });

    return () => {
      cancelled = true;
    };
  }, [accessKey, locale]);

  const question = questions[index] ?? null;
  const promptParts = practicePromptParts(question?.prompt ?? "");
  const questionImageUrlValue = questionImageUrl(question?.media_key);
  const questionAudioUrlValue = questionAudioUrl(question?.media_key);
  const questionChoices = useMemo(() => question ? choicesForQuestion(question.id, choices) : [], [choices, question]);
  const answerResult = question ? answers.find((answer) => answer.questionId === question.id) ?? null : null;
  const correctionDisplay = answerResult?.correction ? practiceCorrectionDisplay({
    explanation: answerResult.correction.explanation,
    acceptedAnswers: answerResult.correction.acceptedAnswers
  }) : null;
  const summary = useMemo(() => summarizePracticeAnswers(answers, questions.length), [answers, questions.length]);
  const examMode = quiz?.exam_mode === 1;
  const wordOrderChoiceSignature = question?.type === "word_order"
    ? questionChoices.map((choice) => `${choice.id}:${choice.label}`).join("|")
    : "";
  const fillBlankCount = question?.type === "fill_blank" ? blankCountFromPrompt(question.prompt) : 0;
  const fillBlankComplete = fillBlankCount > 0 && fillBlankAnswers.every((answer) => answer.trim().length > 0);
  const matchingPairs = useMemo(() => question?.type === "matching" ? matchingPairsFromChoices(questionChoices) : [], [question?.type, questionChoices]);
  const matchingRightChoices = useMemo(() => matchingPairs.map((pair) => pair.right).reverse(), [matchingPairs]);
  const matchingComplete = matchingPairs.length > 0 && matchingAnswer.length === matchingPairs.length;

  useEffect(() => {
    setWordOrder({
      bank: question?.type === "word_order"
        ? [...questionChoices].reverse().map((choice) => ({ id: choice.id, label: choice.label }))
        : [],
      answer: []
    });
  }, [question?.id, question?.type, wordOrderChoiceSignature]);

  useEffect(() => {
    setFillBlankAnswers(Array.from({ length: fillBlankCount }, () => ""));
  }, [fillBlankCount, question?.id]);

  useEffect(() => {
    setMatchingAnswer([]);
    setSelectedMatchingLeftId(null);
  }, [question?.id]);

  function toggleSound() {
    setSoundOn((current) => {
      const next = !current;
      try { window.localStorage.setItem("practice_sound", next ? "1" : "0"); } catch { /* noop */ }
      return next;
    });
  }

  function playFeedbackSound(isCorrect: boolean) {
    if (!soundOn) return;
    try {
      const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = isCorrect ? 660 : 240;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.28);
    } catch { /* audio is optional */ }
  }

  async function submitAnswer(choiceId?: string) {
    if (!question || !attemptId || answerResult || isSubmitting) return;
    if ((question.type === "short_answer" || question.type === "reformulation") && !answerText.trim()) return;
    if (question.type === "fill_blank" && !fillBlankComplete) return;
    if (question.type === "matching" && !matchingComplete) return;
    if (question.type === "word_order" && wordOrder.answer.length !== questionChoices.length) return;

    const submittedAnswerText = question.type === "word_order"
      ? wordOrderAnswerText(wordOrder.answer)
      : question.type === "fill_blank"
        ? buildFillBlankAnswerText(fillBlankAnswers)
      : question.type === "matching"
        ? buildMatchingAnswerText(matchingAnswer)
        : answerText;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await api<Omit<PracticeAnswerResult, "questionId">>(`/api/practice/${encodeURIComponent(attemptId)}/answers`, {
        method: "POST",
        body: JSON.stringify(buildPracticeAnswerPayload({
          questionId: question.id,
          choiceId,
          answerText: submittedAnswerText,
          startedAt: questionStartedAt,
          now: Date.now()
        }))
      });
      setAnswers((current) => [...current, { questionId: question.id, ...result }]);
      playFeedbackSound(result.isCorrect);
    } catch (reason) {
      setError(userFacingErrorMessage(locale, reason));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function nextQuestion() {
    setAnswerText("");
    setFillBlankAnswers([]);
    setMatchingAnswer([]);
    setSelectedMatchingLeftId(null);
    if (index + 1 >= questions.length) {
      if (attemptId) {
        await api(`/api/practice/${encodeURIComponent(attemptId)}/finish`, { method: "POST" }).catch(() => null);
      }
      setIsFinished(true);
      return;
    }
    setIndex((value) => value + 1);
    setQuestionStartedAt(Date.now());
  }

  function chooseMatchingRight(rightId: string) {
    if (!selectedMatchingLeftId || answerResult || isSubmitting) return;
    setMatchingAnswer((current) => [
      ...current.filter((pair) => pair.leftId !== selectedMatchingLeftId && pair.rightId !== rightId),
      { leftId: selectedMatchingLeftId, rightId }
    ]);
    setSelectedMatchingLeftId(null);
  }

  function pairedRightId(leftId: string) {
    return matchingAnswer.find((pair) => pair.leftId === leftId)?.rightId;
  }

  function pairedLeftId(rightId: string) {
    return matchingAnswer.find((pair) => pair.rightId === rightId)?.leftId;
  }

  // Exam mode global countdown: when the quiz is in exam mode, the learner has
  // a total time budget (questions × default per-question limit). On expiry the
  // attempt is finished and only the final score is shown.
  useEffect(() => {
    if (!examMode || !quiz || !attemptId || questions.length === 0 || isFinished) return;
    if (timeLeft === null) {
      const totalSeconds = questions.length * (quiz.default_time_limit_seconds ?? 60);
      setTimeLeft(totalSeconds);
      return;
    }
    if (timeLeft <= 0) {
      api(`/api/practice/${encodeURIComponent(attemptId)}/finish`, { method: "POST" }).catch(() => null);
      setIsFinished(true);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((value) => (value === null ? null : value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [examMode, quiz, attemptId, questions.length, timeLeft, isFinished]);

  if (error && !quiz) return <p className="status-message error-message" role="alert">{error}</p>;
  if (!quiz || !attemptId) return <p className="status-message">{t("practice.loading")}</p>;
  if (questions.length === 0) {
    return (
      <section className="empty-state">
        <h1>{quiz.title}</h1>
        <p>{t("practice.emptyQuestion")}</p>
      </section>
    );
  }
  if (isFinished) {
    return (
      <section className="practice-page">
        <header className="practice-hero">
          <p className="eyebrow">{t("practice.result")}</p>
          <h1>{quiz.title}</h1>
          <div className="practice-score">
            <strong>{summary.correctCount} / {summary.questionCount}</strong>
            <span>{t("practice.correctAnswers")}</span>
          </div>
        </header>
        {examMode ? (
          <p className="status-message">{t("practice.examFinished")}</p>
        ) : (
          <div className="practice-review-list">
            {answers.map((answer, answerIndex) => (
              <article className="practice-review-card" key={answer.questionId}>
                <div>
                  <p className="eyebrow">{t("practice.question")} {answerIndex + 1}</p>
                  <h2>{questions[answerIndex]?.prompt}</h2>
                </div>
                <span className={answer.isCorrect ? "result-pill result-good" : "result-pill result-bad"}>
                  {answer.isCorrect ? t("practice.correct") : t("practice.review")}
                </span>
              </article>
            ))}
          </div>
        )}
        <a className="button-link secondary-action" href="/">{t("practice.backGallery")}</a>
      </section>
    );
  }

  return (
    <section className="practice-page">
      <header className="practice-hero">
        <div>
          <p className="eyebrow">{t("practice.training")}</p>
          <h1>{quiz.title}</h1>
          {quiz.description ? <p>{quiz.description}</p> : null}
        </div>
        <div className="practice-score">
          <strong>{summary.correctCount} / {summary.questionCount}</strong>
          <span>{t("practice.correctAnswers")}</span>
        </div>
        {timeLeft !== null ? (
          <div className="practice-countdown" role="timer" aria-label={`${t("practice.examTimeLeft")} ${timeLeft}s`}>
            <strong>{timeLeft}s</strong>
            <span>{t("practice.examTimeLeft")}</span>
          </div>
        ) : null}
        <button type="button" className="secondary-action sound-toggle" onClick={toggleSound} aria-pressed={soundOn} title={t("practice.toggleSound")}>
          {soundOn ? "🔊" : "🔇"} {t("practice.sound")}
        </button>
      </header>

      <article className={answerResult ? "practice-question-card practice-question-card-answered" : "practice-question-card"}>
        <div className="practice-question-topline">
          <span className="status-pill status-question">{t("practice.question")} {index + 1} / {questions.length}</span>
        </div>
        <div className={promptParts.focus ? "practice-prompt-card practice-prompt-card-focused" : "practice-prompt-card"}>
          {promptParts.focus ? (
            <>
              <span className="practice-prompt-kicker">{t("practice.focusVerb")}</span>
              <h2 className="practice-prompt-focus">{promptParts.focus}</h2>
              <p className="practice-prompt-instruction">{promptParts.instruction}</p>
              <p className="practice-answer-format">{t("practice.expectedFormat")} : <strong>{t("practice.pastSimpleParticiple")}</strong></p>
            </>
          ) : (
            <h2>
              <QuestionPrompt prompt={promptParts.instruction} blankLabel={t("practice.blank")} />
            </h2>
          )}
        </div>
        {questionImageUrlValue ? <img className="question-image practice-question-image" src={questionImageUrlValue} alt="" /> : null}
        {questionAudioUrlValue ? <audio className="question-audio-player practice-question-audio" controls src={questionAudioUrlValue} /> : null}

        {!answerResult && question?.type === "word_order" ? (
          <div className="word-order-player">
            <div className="word-order-answer" aria-label={t("practice.yourSentence")}>
              {wordOrder.answer.length > 0 ? wordOrder.answer.map((token) => (
                <button
                  key={token.id}
                  type="button"
                  className="word-token-button selected"
                  onClick={() => setWordOrder((current) => moveTokenToBank(current, token.id))}
                  disabled={Boolean(answerResult) || isSubmitting}
                >
                  {token.label}
                </button>
              )) : <span>{t("practice.composeSentence")}</span>}
            </div>
            <div className="word-order-bank" aria-label={t("practice.availableWords")}>
              {wordOrder.bank.map((token) => (
                <button
                  key={token.id}
                  type="button"
                  className="word-token-button"
                  onClick={() => setWordOrder((current) => moveTokenToAnswer(current, token.id))}
                  disabled={Boolean(answerResult) || isSubmitting}
                >
                  {token.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="word-order-submit"
              onClick={() => void submitAnswer()}
              disabled={wordOrder.answer.length !== questionChoices.length || Boolean(answerResult) || isSubmitting}
            >
              <Send size={18} />
              {t("practice.validate")}
            </button>
          </div>
        ) : !answerResult && question?.type === "matching" ? (
          <div className="matching-player">
            <div className="matching-column" aria-label={t("practice.leftColumn")}>
              {matchingPairs.map((pair) => (
                <button
                  key={pair.left.id}
                  type="button"
                  className={`matching-option ${selectedMatchingLeftId === pair.left.id ? "selected" : ""} ${pairedRightId(pair.left.id) ? "matched" : ""}`}
                  onClick={() => setSelectedMatchingLeftId(pair.left.id)}
                  disabled={Boolean(answerResult) || isSubmitting}
                >
                  <span>{pair.left.label}</span>
                  {pairedRightId(pair.left.id) ? <small>{matchingRightChoices.find((right) => right.id === pairedRightId(pair.left.id))?.label}</small> : null}
                </button>
              ))}
            </div>
            <div className="matching-column" aria-label={t("practice.rightColumn")}>
              {matchingRightChoices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className={`matching-option ${pairedLeftId(choice.id) ? "matched" : ""}`}
                  onClick={() => chooseMatchingRight(choice.id)}
                  disabled={!selectedMatchingLeftId || Boolean(answerResult) || isSubmitting}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            <button type="button" className="word-order-submit" onClick={() => void submitAnswer()} disabled={!matchingComplete || Boolean(answerResult) || isSubmitting}>
              <Send size={18} />
              {t("practice.validate")}
            </button>
          </div>
        ) : !answerResult && question?.type === "fill_blank" ? (
          <form className="fill-blank-form" onSubmit={(event) => {
            event.preventDefault();
            void submitAnswer();
          }}>
            {fillBlankAnswers.map((value, blankIndex) => (
              <label key={`practice-fill-blank-${blankIndex}`}>
                {t("practice.blank")} {blankIndex + 1}
                <input
                  value={value}
                  onChange={(event) => setFillBlankAnswers((current) => current.map((answer, index) => index === blankIndex ? event.target.value : answer))}
                  disabled={Boolean(answerResult) || isSubmitting}
                  autoFocus={blankIndex === 0}
                />
              </label>
            ))}
            <button type="submit" disabled={!fillBlankComplete || Boolean(answerResult) || isSubmitting}>
              <Send size={18} />
              {t("practice.validate")}
            </button>
          </form>
        ) : !answerResult && (question?.type === "short_answer" || question?.type === "reformulation") ? (
          <form className="short-answer-form" onSubmit={(event) => {
            event.preventDefault();
            void submitAnswer();
          }}>
            <input
              value={answerText}
              onChange={(event) => setAnswerText(event.target.value)}
              disabled={Boolean(answerResult) || isSubmitting}
              placeholder={t("practice.yourAnswer")}
              autoFocus
            />
            <button type="submit" disabled={!answerText.trim() || Boolean(answerResult) || isSubmitting}>
              <Send size={18} />
              {t("practice.validate")}
            </button>
          </form>
        ) : !answerResult ? (
          <div className="answer-grid practice-answer-grid">
            {questionChoices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className={`answer-tile answer-${choice.color}`}
                onClick={() => void submitAnswer(choice.id)}
                disabled={Boolean(answerResult) || isSubmitting}
              >
                <span className="answer-symbol">{choice.symbol}</span>
                <span>{choice.label}</span>
              </button>
            ))}
          </div>
        ) : null}
      {answerResult ? (
        <section className={answerResult.isCorrect ? "practice-feedback practice-feedback-inline feedback-good" : "practice-feedback practice-feedback-inline feedback-bad"} role="status">
          <div className="practice-feedback-heading">
            {answerResult.isCorrect ? <Check size={22} /> : <X size={22} />}
            <strong>{answerResult.isCorrect ? t("practice.correct") : t("practice.notThisTime")}</strong>
          </div>
          {correctionDisplay?.mainCorrection ? (
            <div className="practice-correction-card">
              <span>{t("practice.goodAnswer")}</span>
              <strong>{correctionDisplay.mainCorrection}</strong>
              {correctionDisplay.note ? <small>{correctionDisplay.note}</small> : null}
            </div>
          ) : null}
          {answerResult.correction?.correctChoices.length ? (
            <p>{t("practice.goodAnswer")} : {answerResult.correction.correctChoices.map((choice) => choice.label).join(", ")}</p>
          ) : null}
          {correctionDisplay && correctionDisplay.acceptedAnswers.length > 0 ? (
            <details className="practice-accepted-answers">
              <summary>{t("practice.acceptedCorrections")}</summary>
              <p>{correctionDisplay.acceptedAnswers.join(", ")}</p>
            </details>
          ) : null}
          <button type="button" onClick={() => void nextQuestion()}>
            {index + 1 >= questions.length ? t("practice.seeResult") : t("practice.nextQuestion")}
          </button>
        </section>
      ) : null}
      </article>

      {error ? <p className="status-message error-message" role="alert">{error}</p> : null}
    </section>
  );
}

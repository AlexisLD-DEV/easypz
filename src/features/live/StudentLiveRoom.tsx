import { lazy, Suspense, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Send } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { LiveStateMessage, ServerLiveMessage } from "../../../worker/live/protocol";
import successPopAnimation from "../../assets/lottie/success-pop.json";
import { blankCountFromPrompt, buildFillBlankAnswerText } from "../../../worker/live/fillBlank";
import { buildMatchingAnswerText, matchingPairsFromChoices, type MatchingAnswerPair } from "../../../worker/live/matching";
import { countdownSecondsUntilStart } from "../../../worker/live/timing";
import { useI18n } from "../../i18n/useI18n";
import { questionAudioUrl, questionImageUrl } from "../media/mediaUrl";
import { moveTokenToAnswer, moveTokenToBank, wordOrderAnswerText, type WordOrderState } from "../practice/practicePlayerModel";
import { QuestionPrompt } from "../questions/QuestionPrompt";
import { buildGamifiedLeaderboard, participantAvatar } from "./liveGamification";
import { livePhaseView } from "./livePhaseViewModel";
import { studentAnswerMotionDelay, studentFeedbackPolish } from "./studentLiveAnimation";
import { countdownProgressPercent, questionTimeProgress, studentChoiceLabel, studentChoiceTileClassName, studentLivePromptParts } from "./studentLiveDisplay";
import { studentFeedbackView, toStudentFeedback, type StudentFeedback, type StudentFeedbackView } from "./studentFeedback";

const loadDotLottieReact = () => import("@lottiefiles/dotlottie-react").then((module) => ({ default: module.DotLottieReact }));
const DotLottieReact = lazy(loadDotLottieReact);

export function StudentLiveRoom({
  sessionId,
  participantId,
  participantToken,
  hideLobbyStatus = false
}: {
  sessionId: string;
  participantId: string;
  participantToken: string;
  hideLobbyStatus?: boolean;
}) {
  const { t } = useI18n();
  const shouldReduceMotion = useReducedMotion();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [liveState, setLiveState] = useState<LiveStateMessage | null>(null);
  const [feedback, setFeedback] = useState<StudentFeedback | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [fillBlankAnswers, setFillBlankAnswers] = useState<string[]>([]);
  const [matchingAnswer, setMatchingAnswer] = useState<MatchingAnswerPair[]>([]);
  const [selectedMatchingLeftId, setSelectedMatchingLeftId] = useState<string | null>(null);
  const [wordOrder, setWordOrder] = useState<WordOrderState>({ bank: [], answer: [] });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${protocol}://${window.location.host}/api/live/sessions/${sessionId}/socket?role=student&participantId=${encodeURIComponent(participantId)}&participantToken=${encodeURIComponent(participantToken)}`);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerLiveMessage;
      if (message.type === "state") setLiveState(message);
      if (message.type === "answer:accepted" || message.type === "answer:rejected") setFeedback(toStudentFeedback(message));
    };
    setSocket(ws);
    return () => ws.close();
  }, [participantId, participantToken, sessionId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    void loadDotLottieReact();
  }, []);

  const question = liveState?.currentQuestion ?? null;
  const showQuestionOnDevice = hideLobbyStatus;
  const promptParts = question ? studentLivePromptParts(question, showQuestionOnDevice ? question.prompt : t("live.lookAtBoard")) : null;
  const questionImageUrlValue = questionImageUrl(question?.mediaKey);
  const questionAudioUrlValue = questionAudioUrl(question?.mediaKey);
  const settings = liveState?.settings ?? { showLeaderboard: true, showStudentFeedback: true };
  const countdownSeconds = useMemo(() => {
    if (!question || liveState?.status !== "question") return 0;
    return countdownSecondsUntilStart(liveState.questionStartedAt, now);
  }, [liveState?.questionStartedAt, liveState?.status, now, question]);
  const countdownActive = countdownSeconds > 0;
  const countdownProgress = countdownProgressPercent(countdownSeconds, 5);
  const countdownRingStyle = { "--countdown-progress": `${countdownProgress * 3.6}deg` } as CSSProperties;
  const questionTimer = questionTimeProgress({
    questionStartedAt: liveState?.questionStartedAt ?? null,
    now,
    timeLimitSeconds: question?.timeLimitSeconds ?? 0
  });
  const gamifiedLeaderboard = useMemo(
    () => buildGamifiedLeaderboard(liveState?.leaderboard ?? [], participantId),
    [liveState?.leaderboard, participantId]
  );
  const currentParticipant = gamifiedLeaderboard.find((row) => row.participantId === participantId) ?? null;
  const currentAvatar = currentParticipant?.avatar ?? participantAvatar(participantId, "");
  const myScore = currentParticipant?.score ?? 0;
  const feedbackDisplay = feedback ? studentFeedbackView(feedback, settings.showStudentFeedback) : null;
  const feedbackPolish = feedbackDisplay ? studentFeedbackPolish(feedbackDisplay.tone) : null;
  const successPopAnimationData = useMemo(() => JSON.stringify(successPopAnimation), []);
  const answeredCurrentQuestion = feedback?.type === "accepted" && feedback.questionId === question?.id;
  const wordOrderChoiceSignature = question?.type === "word_order"
    ? question.choices.map((choice) => `${choice.id}:${choice.label}`).join("|")
    : "";
  const fillBlankCount = question?.type === "fill_blank" ? blankCountFromPrompt(question.prompt) : 0;
  const fillBlankComplete = fillBlankCount > 0 && fillBlankAnswers.every((answer) => answer.trim().length > 0);
  const matchingPairs = useMemo(() => question?.type === "matching" ? matchingPairsFromChoices(question.choices) : [], [question]);
  const matchingRightChoices = useMemo(() => matchingPairs.map((pair) => pair.right).reverse(), [matchingPairs]);
  const matchingComplete = matchingPairs.length > 0 && matchingAnswer.length === matchingPairs.length;
  const status = liveState?.status ?? "lobby";
  const phase = livePhaseView(status);
  const celebrationPreloader = !shouldReduceMotion ? (
    <Suspense fallback={null}>
      <DotLottieReact className="student-feedback-lottie-preload" data={successPopAnimationData} autoplay aria-hidden="true" />
    </Suspense>
  ) : null;
  const statusLabels = {
    lobby: t("dashboard.liveLobby"),
    question: t("dashboard.liveQuestion"),
    reveal: t("dashboard.liveReveal"),
    ended: t("dashboard.liveEnded")
  };

  useEffect(() => {
    setFeedback(null);
    setAnswerText("");
    setFillBlankAnswers(Array.from({ length: fillBlankCount }, () => ""));
    setMatchingAnswer([]);
    setSelectedMatchingLeftId(null);
    setWordOrder({
      bank: question?.type === "word_order"
        ? [...question.choices].reverse().map((choice) => ({ id: choice.id, label: choice.label }))
        : [],
      answer: []
    });
  }, [fillBlankCount, question?.id, question?.type, wordOrderChoiceSignature]);

  function answer(choiceId?: string) {
    if (!question || !socket || answeredCurrentQuestion || countdownActive) return;
    if (question.type === "word_order" && wordOrder.answer.length !== question.choices.length) return;
    if (question.type === "fill_blank" && !fillBlankComplete) return;
    if (question.type === "matching" && !matchingComplete) return;

    const submittedAnswerText = question.type === "word_order"
      ? wordOrderAnswerText(wordOrder.answer)
      : question.type === "fill_blank"
        ? buildFillBlankAnswerText(fillBlankAnswers)
      : question.type === "matching"
        ? buildMatchingAnswerText(matchingAnswer)
      : question.type === "short_answer" || question.type === "reformulation"
        ? answerText
        : undefined;

    socket.send(JSON.stringify({
      type: "student:answer",
      questionId: question.id,
      choiceId,
      answerText: submittedAnswerText,
      sentAt: Date.now()
    }));
  }

  function chooseMatchingRight(rightId: string) {
    if (!selectedMatchingLeftId || answeredCurrentQuestion || countdownActive) return;
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

  if (countdownActive) {
    return (
      <section className="student-live student-live-countdown-only">
        {celebrationPreloader}
        <motion.div
          className="countdown-panel countdown-panel-hero"
          role="status"
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 24 }}
        >
          <p className="eyebrow">{t("live.startsIn")}</p>
          <motion.div
            key={countdownSeconds}
            className="countdown-ring"
            style={countdownRingStyle}
            animate={shouldReduceMotion ? undefined : { scale: [1, 1.04, 1] }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.38, ease: "easeOut" }}
          >
            <strong>{countdownSeconds}</strong>
          </motion.div>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="student-live">
      {celebrationPreloader}
      {!hideLobbyStatus ? <header className="student-live-header">
        <div className="student-identity">
          <span className={`participant-avatar large ${currentAvatar.tone}`} aria-hidden="true">{currentAvatar.initials}</span>
          <div className="student-score-card">
            <p className="eyebrow">{t("live.score")}</p>
            <strong>{myScore}</strong>
            <small>{t("live.pointsLabel")}</small>
          </div>
        </div>
        {settings.showLeaderboard ? (
        <div className="student-rank-card">
          <span>{t("live.yourRank")}</span>
          <strong>{currentParticipant?.rankLabel ?? "-"}</strong>
          <small>{currentParticipant?.correctAnswers ?? 0} {t("live.correctAnswers")}</small>
        </div>
        ) : null}
        <span className={`status-pill status-${status}`}>{statusLabels[status as keyof typeof statusLabels] ?? status}</span>
      </header> : null}

      {!question ? (
        <div className="student-waiting">
          <p className="eyebrow">{t("live.waiting")}</p>
          <h1>{t("live.getReady")}</h1>
          <p className="student-helper-text">{studentPhaseHelp(phase.key, t)}</p>
        </div>
      ) : (
        <motion.div
          className="student-question"
          key={question.id}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 28 }}
        >
          <div className={`student-phase-banner live-phase-${phase.tone}`}>
            <p className="eyebrow">{t("live.question")} {(liveState?.currentQuestionIndex ?? 0) + 1} / {liveState?.questionCount ?? "-"}</p>
            <strong>{studentPhaseHelp(phase.key, t)}</strong>
          </div>
          {promptParts?.focus ? (
            <div className="practice-prompt-card practice-prompt-card-focused student-prompt-card">
              <span className="practice-prompt-kicker">{t("practice.focusVerb")}</span>
              <h1 className="practice-prompt-focus">{promptParts.focus}</h1>
              <p className="practice-prompt-instruction">{promptParts.instruction}</p>
              <p className="practice-answer-format">{t("practice.expectedFormat")} : <strong>{t("practice.pastSimpleParticiple")}</strong></p>
            </div>
          ) : (
            <h1>
              <QuestionPrompt prompt={promptParts?.instruction ?? ""} blankLabel={t("live.blank")} />
            </h1>
          )}
          {liveState?.status === "question" && question.timeLimitSeconds > 0 ? (
            <div className="student-question-timer" role="timer" aria-label={`${t("live.timeLeft")} ${questionTimer.remainingSeconds}s`}>
              <span>{t("live.timeLeft")}</span>
              <strong>{questionTimer.remainingSeconds}s</strong>
              <div className="student-question-timer-track" aria-hidden="true">
                <motion.span
                  initial={false}
                  animate={{ width: `${questionTimer.progressPercent}%` }}
                  transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.24, ease: "linear" }}
                />
              </div>
            </div>
          ) : null}
          {question.type !== "multiple_choice" && questionImageUrlValue ? <img className="question-image student-question-image" src={questionImageUrlValue} alt="" /> : null}
          {questionAudioUrlValue ? <audio className="question-audio-player student-question-audio" controls src={questionAudioUrlValue} /> : null}
          {answeredCurrentQuestion ? (
            <section className="student-answer-state" role="status">
              <strong>{t("live.answerRecorded")}</strong>
              <span>{t("live.waitForCorrection")}</span>
            </section>
          ) : null}
          {countdownActive ? (
            <div className="countdown-panel" role="status">
              <p className="eyebrow">{t("live.startsIn")}</p>
              <strong>{countdownSeconds}</strong>
            </div>
          ) : null}

          {question.type === "word_order" ? (
            <div className="word-order-player">
              <div className="word-order-answer" aria-label={t("live.yourSentence")}>
                {wordOrder.answer.length > 0 ? wordOrder.answer.map((token) => (
                  <button
                    key={token.id}
                    type="button"
                    className="word-token-button selected"
                    onClick={() => setWordOrder((current) => moveTokenToBank(current, token.id))}
                    disabled={answeredCurrentQuestion || countdownActive}
                  >
                    {token.label}
                  </button>
                )) : <span>{t("live.composeSentence")}</span>}
              </div>
              <div className="word-order-bank" aria-label={t("live.availableWords")}>
                {wordOrder.bank.map((token) => (
                  <button
                    key={token.id}
                    type="button"
                    className="word-token-button"
                    onClick={() => setWordOrder((current) => moveTokenToAnswer(current, token.id))}
                    disabled={answeredCurrentQuestion || countdownActive}
                  >
                    {token.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="word-order-submit"
                onClick={() => answer()}
                disabled={wordOrder.answer.length !== question.choices.length || answeredCurrentQuestion || countdownActive}
              >
                <Send size={18} />
                {t("live.send")}
              </button>
            </div>
          ) : question.type === "matching" ? (
            <div className="matching-player">
              <div className="matching-column" aria-label={t("live.leftColumn")}>
                {matchingPairs.map((pair) => (
                  <button
                    key={pair.left.id}
                    type="button"
                    className={`matching-option ${selectedMatchingLeftId === pair.left.id ? "selected" : ""} ${pairedRightId(pair.left.id) ? "matched" : ""}`}
                    onClick={() => setSelectedMatchingLeftId(pair.left.id)}
                    disabled={answeredCurrentQuestion || countdownActive}
                  >
                    <span>{pair.left.label}</span>
                    {pairedRightId(pair.left.id) ? <small>{matchingRightChoices.find((right) => right.id === pairedRightId(pair.left.id))?.label}</small> : null}
                  </button>
                ))}
              </div>
              <div className="matching-column" aria-label={t("live.rightColumn")}>
                {matchingRightChoices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    className={`matching-option ${pairedLeftId(choice.id) ? "matched" : ""}`}
                    onClick={() => chooseMatchingRight(choice.id)}
                    disabled={!selectedMatchingLeftId || answeredCurrentQuestion || countdownActive}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
              <button type="button" className="word-order-submit" onClick={() => answer()} disabled={!matchingComplete || answeredCurrentQuestion || countdownActive}>
                <Send size={18} />
                {t("live.send")}
              </button>
            </div>
          ) : question.type === "fill_blank" ? (
            <form className="fill-blank-form" onSubmit={(event) => {
              event.preventDefault();
              answer();
            }}>
              {fillBlankAnswers.map((value, blankIndex) => (
                <label key={`live-fill-blank-${blankIndex}`}>
                  {t("live.blank")} {blankIndex + 1}
                  <input
                    value={value}
                    onChange={(event) => setFillBlankAnswers((current) => current.map((item, index) => index === blankIndex ? event.target.value : item))}
                    disabled={answeredCurrentQuestion || countdownActive}
                    autoFocus={blankIndex === 0}
                  />
                </label>
              ))}
              <button type="submit" disabled={!fillBlankComplete || answeredCurrentQuestion || countdownActive}>
                <Send size={18} />
                {t("live.send")}
              </button>
            </form>
          ) : question.type === "short_answer" || question.type === "reformulation" ? (
            <form className="short-answer-form" onSubmit={(event) => {
              event.preventDefault();
              answer();
            }}>
              <input value={answerText} onChange={(event) => setAnswerText(event.target.value)} disabled={answeredCurrentQuestion || countdownActive} autoFocus />
              <button type="submit" disabled={!answerText.trim() || answeredCurrentQuestion || countdownActive}>
                <Send size={18} />
                {t("live.send")}
              </button>
            </form>
          ) : (
            <div className="answer-grid">
              {question.choices.map((choice, index) => (
                <motion.button
                  key={choice.id}
                  type="button"
                  className={studentChoiceTileClassName(question.type, choice.color, { showMultipleChoiceLabel: showQuestionOnDevice })}
                  onClick={() => answer(choice.id)}
                  disabled={answeredCurrentQuestion || countdownActive}
                  aria-label={question.type === "multiple_choice" ? `${t("results.answer")} ${choice.symbol}` : choice.label}
                  initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 360, damping: 25, delay: studentAnswerMotionDelay(index) }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                >
                  <span className="answer-symbol">{choice.symbol}</span>
                  {studentChoiceLabel(question.type, choice.label, { showMultipleChoiceLabel: showQuestionOnDevice }) ? (
                    <span className="answer-label">{studentChoiceLabel(question.type, choice.label, { showMultipleChoiceLabel: showQuestionOnDevice })}</span>
                  ) : null}
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      )}

      <AnimatePresence>
        {feedbackDisplay && feedbackPolish ? (
          <motion.div
            className={`student-feedback ${feedbackDisplay.tone === "good" ? "feedback-good" : feedbackDisplay.tone === "warn" ? "feedback-warn" : "feedback-neutral"} ${feedbackPolish.className}`}
            role="status"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 360, damping: 28 }}
          >
            {feedbackPolish.showCelebration ? (
              <Suspense fallback={null}>
                <DotLottieReact className="student-feedback-lottie" data={successPopAnimationData} autoplay aria-hidden="true" />
              </Suspense>
            ) : null}
            <span>{studentFeedbackText(feedbackDisplay, t)}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function studentFeedbackText(feedbackDisplay: StudentFeedbackView, t: ReturnType<typeof useI18n>["t"]) {
  if (feedbackDisplay.message === "correct") return `${t("live.correct")} +${feedbackDisplay.points}`;
  if (feedbackDisplay.message === "try_next") return t("live.tryNext");
  if (feedbackDisplay.message === "already_answered") return t("live.alreadyAnswered");
  if (feedbackDisplay.message === "too_late") return t("live.tooLate");
  if (feedbackDisplay.message === "wait_start") return t("live.waitStart");
  if (feedbackDisplay.message === "invalid_answer") return t("live.invalidAnswer");
  return t("live.answerSent");
}

function studentPhaseHelp(phase: ReturnType<typeof livePhaseView>["key"], t: ReturnType<typeof useI18n>["t"]) {
  const labels: Record<ReturnType<typeof livePhaseView>["key"], Parameters<typeof t>[0]> = {
    lobby: "live.studentLobbyHelp",
    question: "live.studentQuestionHelp",
    reveal: "live.studentRevealHelp",
    ended: "live.studentEndedHelp"
  };
  return t(labels[phase]);
}

import { useEffect, useMemo, useState } from "react";
import type { LiveStateMessage, ServerLiveMessage } from "../../../worker/live/protocol";
import { matchingPairsFromChoices } from "../../../worker/live/matching";
import { countdownSecondsUntilStart } from "../../../worker/live/timing";
import { useI18n } from "../../i18n/useI18n";
import { questionAudioUrl, questionImageUrl } from "../media/mediaUrl";
import { QuestionPrompt } from "../questions/QuestionPrompt";
import { buildGamifiedLeaderboard } from "./liveGamification";
import { livePhaseView } from "./livePhaseViewModel";

export function BoardLiveRoom({ sessionId }: { sessionId: string }) {
  const { t } = useI18n();
  const [liveState, setLiveState] = useState<LiveStateMessage | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${protocol}://${window.location.host}/api/live/sessions/${sessionId}/socket?role=board`);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerLiveMessage;
      if (message.type === "state") setLiveState(message);
    };
    return () => ws.close();
  }, [sessionId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const question = liveState?.currentQuestion ?? null;
  const status = liveState?.status ?? "lobby";
  const phase = livePhaseView(status);
  const leaderboard = buildGamifiedLeaderboard(liveState?.leaderboard ?? []);
  const showLeaderboard = liveState?.settings?.showLeaderboard ?? true;
  const questionImageUrlValue = questionImageUrl(question?.mediaKey);
  const questionAudioUrlValue = questionAudioUrl(question?.mediaKey);
  const matchingPairs = question?.type === "matching" ? matchingPairsFromChoices(question.choices) : [];
  const countdownSeconds = useMemo(() => {
    if (!question || !liveState?.questionStartedAt || liveState.status !== "question") return 0;
    return countdownSecondsUntilStart(liveState.questionStartedAt, now);
  }, [liveState?.questionStartedAt, liveState?.status, now, question]);
  const remainingSeconds = useMemo(() => {
    if (!question || !liveState?.questionStartedAt || liveState.status !== "question") return null;
    if (countdownSeconds > 0) return null;
    const elapsed = (now - liveState.questionStartedAt) / 1000;
    return Math.max(0, Math.ceil(question.timeLimitSeconds - elapsed));
  }, [countdownSeconds, liveState?.questionStartedAt, liveState?.status, now, question]);

  return (
    <section className="board-view">
      <header className="board-header">
        <div>
          <p className="eyebrow">{t("live.code")}</p>
          <strong className="board-code">{liveState?.code ?? "..."}</strong>
        </div>
        <div className="board-stats">
          <span>{liveState?.participantCount ?? 0} {t("live.participants")}</span>
          <span>{liveState?.answerCount ?? 0} {t("live.answers")}</span>
          <strong>{countdownSeconds > 0 ? countdownSeconds : remainingSeconds ?? "--"}s</strong>
        </div>
      </header>

      <main className="board-stage">
        <div className={`board-phase-banner live-phase-${phase.tone}`}>
          <p className="eyebrow">
            {question ? `${t("live.question")} ${(liveState?.currentQuestionIndex ?? 0) + 1} / ${liveState?.questionCount ?? "-"}` : t("live.waiting")}
          </p>
          <strong>{boardPhaseLabel(phase.key, t)}</strong>
        </div>
        <h1>
          <QuestionPrompt prompt={question?.prompt ?? t("live.sessionWillStart")} blankLabel={t("live.blank")} />
        </h1>
        {questionImageUrlValue ? <img className="question-image board-question-image" src={questionImageUrlValue} alt="" /> : null}
        {questionAudioUrlValue ? <audio className="question-audio-player board-question-audio" controls src={questionAudioUrlValue} /> : null}
        {question && countdownSeconds > 0 ? (
          <div className="countdown-panel board-countdown">
            <p className="eyebrow">{t("live.startsIn")}</p>
            <strong>{countdownSeconds}</strong>
          </div>
        ) : null}
        {question?.type === "word_order" ? (
          <div className="word-order-board" aria-label={t("live.availableWords")}>
            {[...question.choices].reverse().map((choice) => (
              <span className="word-token-button" key={choice.id}>{choice.label}</span>
            ))}
          </div>
        ) : question?.type === "matching" ? (
          <div className="matching-board">
            <div className="matching-column" aria-label={t("live.leftColumn")}>
              {matchingPairs.map((pair) => <span className="matching-option" key={pair.left.id}>{pair.left.label}</span>)}
            </div>
            <div className="matching-column" aria-label={t("live.rightColumn")}>
              {matchingPairs.map((pair) => pair.right).reverse().map((choice) => <span className="matching-option" key={choice.id}>{choice.label}</span>)}
            </div>
          </div>
        ) : question?.type === "fill_blank" ? null : question ? (
          <div className="answer-grid board-answer-grid">
            {question.choices.map((choice) => (
              <div key={choice.id} className={`answer-tile answer-${choice.color}`}>
                <span className="answer-symbol">{choice.symbol}</span>
                <span>{choice.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </main>

      {showLeaderboard ? (
      <aside className="board-leaderboard">
        <h2>{t("live.leaderboard")}</h2>
        <ol className="leaderboard-list compact">
          {leaderboard.slice(0, 5).map((row) => (
            <li className={`leaderboard-row ${row.isPodium ? "leaderboard-row-podium" : ""}`} key={row.participantId}>
              <span className="leaderboard-rank">{row.rankLabel}</span>
              <span className={`participant-avatar ${row.avatar.tone}`} aria-hidden="true">{row.avatar.initials}</span>
              <span className="leaderboard-participant">
                <strong>{row.displayName}</strong>
                <small>{row.correctAnswers} {t("live.correctAnswers")}</small>
              </span>
              <strong className="leaderboard-score">{row.score}</strong>
            </li>
          ))}
        </ol>
      </aside>
      ) : null}
    </section>
  );
}

function boardPhaseLabel(phase: ReturnType<typeof livePhaseView>["key"], t: ReturnType<typeof useI18n>["t"]) {
  const labels: Record<ReturnType<typeof livePhaseView>["key"], Parameters<typeof t>[0]> = {
    lobby: "live.boardLobby",
    question: "live.boardQuestion",
    reveal: "live.boardReveal",
    ended: "live.boardEnded"
  };
  return t(labels[phase]);
}

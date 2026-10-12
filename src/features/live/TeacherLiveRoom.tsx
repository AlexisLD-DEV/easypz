import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { Eye, MonitorUp, Play, SkipForward, Square, Trophy, Users } from "lucide-react";
import { api } from "../../api/client";
import { useI18n } from "../../i18n/useI18n";
import type { LiveDisplaySettings, LiveStateMessage, ServerLiveMessage } from "../../../worker/live/protocol";
import { buildGamifiedLeaderboard } from "./liveGamification";
import { livePhaseView, type LivePhaseView } from "./livePhaseViewModel";
import { liveSettingsPatchFromPreferences, readTeacherPreferences } from "../settings/teacherPreferences";
import { QuestionPrompt } from "../questions/QuestionPrompt";

type LiveBootstrap = {
  session: { id: string; code: string; title: string; status: string; exam_mode?: number };
  questions: Array<{ id: string; time_limit_seconds?: number }>;
};

export function TeacherLiveRoom({ sessionId }: { sessionId: string }) {
  const { t } = useI18n();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [liveState, setLiveState] = useState<LiveStateMessage | null>(null);
  const [bootstrap, setBootstrap] = useState<LiveBootstrap | null>(null);
  const [qr, setQr] = useState("");
  const appliedDefaultSettings = useRef(false);

  useEffect(() => {
    api<LiveBootstrap>(`/api/live/sessions/${sessionId}/bootstrap`).then(setBootstrap).catch(() => setBootstrap(null));
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${protocol}://${window.location.host}/api/live/sessions/${sessionId}/socket?role=teacher`);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerLiveMessage;
      if (message.type === "state") setLiveState(message);
    };
    setSocket(ws);
    return () => ws.close();
  }, [sessionId]);

  const code = liveState?.code ?? bootstrap?.session.code ?? "";
  const joinUrl = code ? `${window.location.origin}/join/${code}` : "";
  const boardUrl = `${window.location.origin}/live/board/${sessionId}`;
  const status = liveState?.status ?? "lobby";
  const phase = livePhaseView(status);
  const questionCount = liveState?.questionCount ?? bootstrap?.questions.length ?? 0;
  const currentQuestionNumber = liveState?.currentQuestion
    ? liveState.currentQuestionIndex + 1
    : status === "ended" && questionCount > 0
      ? Math.min((liveState?.currentQuestionIndex ?? 0) + 1, questionCount)
      : 0;
  const displayedAnswerCount = status === "ended" ? "-" : String(liveState?.answerCount ?? 0);
  const leaderboard = buildGamifiedLeaderboard(liveState?.leaderboard ?? []);
  const settings = liveState?.settings ?? { showLeaderboard: true, showStudentFeedback: true };
  const canStart = status !== "question" && status !== "ended";
  const statusLabels = {
    lobby: t("dashboard.liveLobby"),
    question: t("dashboard.liveQuestion"),
    reveal: t("dashboard.liveReveal"),
    ended: t("dashboard.liveEnded")
  };

  useEffect(() => {
    if (!joinUrl) return;
    QRCode.toDataURL(joinUrl).then(setQr).catch(() => setQr(""));
  }, [joinUrl]);

  useEffect(() => {
    if (!socket || !liveState?.settings || liveState.status !== "lobby" || appliedDefaultSettings.current) return;
    const patch = liveSettingsPatchFromPreferences(liveState.settings, readTeacherPreferences());
    appliedDefaultSettings.current = true;
    if (patch) {
      socket.send(JSON.stringify({ type: "teacher:update_settings", settings: patch }));
    }
  }, [socket, liveState]);

  function send(type: "teacher:start_question" | "teacher:reveal" | "teacher:next" | "teacher:end") {
    socket?.send(JSON.stringify({ type }));
  }

  // Exam mode: a global countdown for the whole live session. When it reaches
  // zero the teacher room ends the session automatically.
  const examMode = bootstrap?.session.exam_mode === 1;
  const [examTimeLeft, setExamTimeLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!examMode || examTimeLeft !== null) return;
    if (!bootstrap?.questions?.length) return;
    const total = bootstrap.questions.reduce((sum, q) => sum + (q.time_limit_seconds ?? 30), 0);
    if (total > 0) setExamTimeLeft(total);
  }, [examMode, examTimeLeft, bootstrap]);

  useEffect(() => {
    if (examTimeLeft === null) return;
    if (examTimeLeft <= 0) {
      send("teacher:end");
      return;
    }
    const timer = setTimeout(() => setExamTimeLeft((value) => (value === null ? null : value - 1)), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examTimeLeft]);

  function updateSettings(patch: Partial<LiveDisplaySettings>) {
    socket?.send(JSON.stringify({ type: "teacher:update_settings", settings: patch }));
  }

  return (
    <section className="live-layout">
      <div className="live-main">
        <header className="live-header">
          <div>
            <p className="eyebrow">{t("live.teacherSession")}</p>
            <h1>{bootstrap?.session.title ?? t("live.directQuiz")}</h1>
          </div>
          <span className={`status-pill status-${status}`}>{statusLabels[status as keyof typeof statusLabels] ?? status}</span>
        </header>

        <div className="session-grid">
          <div className="join-panel">
            <div>
              <p className="eyebrow">{t("live.studentCode")}</p>
              <strong className="join-code">{code || "..."}</strong>
            </div>
            {qr ? <img className="qr-code" src={qr} alt="QR code session" /> : <div className="qr-placeholder" />}
            <a className="button-link secondary-action" href={boardUrl} target="_blank" rel="noreferrer">
              <MonitorUp size={18} />
              {t("live.board")}
            </a>
          </div>

          <div className="live-control-panel">
            <section className={`live-phase-card live-phase-${phase.tone}`}>
              <p className="eyebrow">{t("live.currentStep")}</p>
              <h2>{livePhaseTitle(phase, t)}</h2>
              <p>{livePhaseHelp(phase, t)}</p>
            </section>
            <div className="metric-row">
              <span><Users size={18} /> {t("live.participants")}</span>
              <strong>{liveState?.participantCount ?? 0}</strong>
            </div>
            <div className="metric-row">
              <span>{t("live.question")}</span>
              <strong>{currentQuestionNumber || "-"} / {questionCount || "-"}</strong>
            </div>
            <div className="metric-row">
              <span>{t("live.answers")}</span>
              <strong>{displayedAnswerCount}</strong>
            </div>
            {examTimeLeft !== null ? (
              <div className="metric-row exam-countdown" role="timer" aria-label={`${t("live.examTimeLeft")} ${examTimeLeft}s`}>
                <span>{t("live.examTimeLeft")}</span>
                <strong>{examTimeLeft}s</strong>
              </div>
            ) : null}

            {liveState?.currentQuestion && liveState.currentQuestion.choices.length > 0 ? (
              <section className="live-student-preview" aria-label={t("live.studentPreview")}>
                <p className="eyebrow">{t("live.studentPreview")}</p>
                <div className="preview-question-card">
                  <h3><QuestionPrompt prompt={liveState.currentQuestion.prompt || "…"} blankLabel={t("live.blank")} /></h3>
                  <div className="answer-grid">
                    {liveState.currentQuestion.choices.map((choice, index) => (
                      <button key={choice.id} type="button" className="answer-tile" tabIndex={-1}>
                        <span className="answer-symbol">{String.fromCharCode(65 + index)}</span>
                        <span>{choice.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}
            <div className="toolbar live-actions">
              <button type="button" onClick={() => send("teacher:start_question")} disabled={!canStart}>
                <Play size={18} />
                {t("live.startQuiz")}
              </button>
              <button type="button" onClick={() => send("teacher:reveal")} disabled={status !== "question"}>
                <Eye size={18} />
                {t("live.showCorrection")}
              </button>
              <button type="button" onClick={() => send("teacher:next")} disabled={status === "lobby" || status === "ended"}>
                <SkipForward size={18} />
                {t("live.next")}
              </button>
              <button type="button" className="danger-action" onClick={() => send("teacher:end")} disabled={status === "ended"}>
                <Square size={18} />
                {t("live.end")}
              </button>
            </div>
            <div className="live-settings-panel" aria-label={t("live.sessionSettings")}>
              <div className="section-heading compact-heading">
                <h2>{t("live.sessionSettings")}</h2>
                <span>{t("live.manualPace")}</span>
              </div>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={settings.showLeaderboard}
                  onChange={(event) => updateSettings({ showLeaderboard: event.target.checked })}
                />
                <span>
                  <strong><Trophy size={16} /> {t("live.showLeaderboard")}</strong>
                  <small>{t("live.showLeaderboardHelp")}</small>
                </span>
              </label>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={settings.showStudentFeedback}
                  onChange={(event) => updateSettings({ showStudentFeedback: event.target.checked })}
                />
                <span>
                  <strong><Eye size={16} /> {t("live.showStudentFeedback")}</strong>
                  <small>{t("live.showStudentFeedbackHelp")}</small>
                </span>
              </label>
            </div>
            {status === "ended" ? (
              <div className="card-actions">
                <a className="button-link secondary-action" href={`/sessions/${encodeURIComponent(sessionId)}/results`}>{t("live.viewResults")}</a>
                <a className="button-link secondary-action" href={`/api/teacher/live-sessions/${encodeURIComponent(sessionId)}/export.csv`}>{t("live.exportCsv")}</a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <aside className="leaderboard-panel">
        <h2>{t("live.leaderboard")}</h2>
        <ol className="leaderboard-list">
          {leaderboard.map((row) => (
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
    </section>
  );
}

function livePhaseTitle(phase: LivePhaseView, t: ReturnType<typeof useI18n>["t"]) {
  const labels: Record<LivePhaseView["key"], Parameters<typeof t>[0]> = {
    lobby: "live.phaseLobby",
    question: "live.phaseQuestion",
    reveal: "live.phaseReveal",
    ended: "live.phaseEnded"
  };
  return t(labels[phase.key]);
}

function livePhaseHelp(phase: LivePhaseView, t: ReturnType<typeof useI18n>["t"]) {
  const labels: Record<LivePhaseView["key"], Parameters<typeof t>[0]> = {
    lobby: "live.phaseLobbyHelp",
    question: "live.phaseQuestionHelp",
    reveal: "live.phaseRevealHelp",
    ended: "live.phaseEndedHelp"
  };
  return t(labels[phase.key]);
}

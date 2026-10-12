import { useState } from "react";
import { api } from "../../api/client";
import { useI18n } from "../../i18n/useI18n";
import { studentJoinErrorMessage } from "./joinErrors";

export function StudentJoin({ code: initialCode = "" }: { code?: string }) {
  const { t } = useI18n();
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function join(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const joinErrorMessages = {
      banned_name: t("join.bannedName"),
      name_required: t("join.nameRequired"),
      rate_limited: t("join.rateLimited"),
      session_not_found: t("join.sessionNotFound")
    };
    if (!displayName.trim()) {
      setError(studentJoinErrorMessage("name_required", joinErrorMessages, t("join.fallback")));
      return;
    }
    try {
      const result = await api<{ sessionId: string; participantId: string; participantToken: string }>(`/api/live/${code.trim().toUpperCase()}/join`, {
        method: "POST",
        body: JSON.stringify({ displayName: displayName.trim() })
      });
      window.location.href = `/live/student/${result.sessionId}/${result.participantId}?token=${encodeURIComponent(result.participantToken)}`;
    } catch (reason) {
      setError(studentJoinErrorMessage(reason instanceof Error ? reason.message : "request_failed", joinErrorMessages, t("join.fallback")));
    }
  }

  return (
    <section className="auth-panel">
      <h1>{t("join.title")}</h1>
      <form onSubmit={join}>
        <label>
          {t("join.code")}
          <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} required />
        </label>
        <label>
          {t("join.firstName")}
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={30} required />
        </label>
        {error ? <p className="status-message error-message" role="alert">{error}</p> : null}
        <button type="submit">{t("join.submit")}</button>
      </form>
    </section>
  );
}

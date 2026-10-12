import { Copy, ExternalLink, RefreshCw, RotateCcw } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client";
import { useI18n } from "../../i18n/useI18n";

const codeEmailStorageKey = "easypz-code-email";
const codeEmailPattern = /^codex[a-z0-9]{4,16}@ez1\.fr$/;
const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";

type CodeSyncResponse =
  | {
      status: "found";
      message: {
        code: string | null;
        link: string | null;
        receivedAt: number;
      };
    }
  | {
      status: "empty";
      checkedSince: number;
      checkedUntil: number;
    };
type CodeSyncMessage = Extract<CodeSyncResponse, { status: "found" }>["message"];

export function CodePage() {
  const { t } = useI18n();
  const [email, setEmail] = useState(() => readStoredCodeEmail());
  const [copyStatus, setCopyStatus] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "found" | "empty" | "error">("idle");
  const [message, setMessage] = useState<CodeSyncMessage | null>(null);

  function replaceEmail() {
    const nextEmail = generateCodeEmail();
    window.localStorage.setItem(codeEmailStorageKey, nextEmail);
    setEmail(nextEmail);
    setCopyStatus("");
    setSyncStatus("idle");
    setMessage(null);
  }

  async function copy(value: string, label: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        fallbackCopy(value);
      }
    } catch {
      fallbackCopy(value);
    }
    setCopyStatus(label);
    window.setTimeout(() => setCopyStatus(""), 1600);
  }

  async function sync() {
    setSyncing(true);
    setSyncStatus("idle");
    setMessage(null);
    try {
      const data = await api<CodeSyncResponse>(`/api/code-inbox/sync?email=${encodeURIComponent(email)}`);
      if (data.status === "found") {
        setMessage(data.message);
        setSyncStatus("found");
      } else {
        setSyncStatus("empty");
      }
    } catch {
      setSyncStatus("error");
    } finally {
      setSyncing(false);
    }
  }

  const statusMessage = syncStatus === "found"
    ? t("code.found")
    : syncStatus === "empty"
      ? t("code.empty")
      : syncStatus === "error"
        ? t("code.error")
        : "";

  return (
    <section className="code-page" aria-labelledby="code-title">
      <section className="code-card">
        <div className="code-card-heading">
          <p className="eyebrow">{t("code.eyebrow")}</p>
          <h1 id="code-title">{t("code.title")}</h1>
        </div>

        <div className="code-email-box">
          <label htmlFor="code-email">{t("code.emailLabel")}</label>
          <div className="code-email-row">
            <input
              id="code-email"
              readOnly
              value={email}
              onFocus={(event) => event.currentTarget.select()}
            />
            <button type="button" className="secondary-action code-icon-button" onClick={() => void copy(email, t("code.emailCopied"))} title={t("code.copyEmail")}>
              <Copy size={18} aria-hidden="true" />
              <span>{t("code.copy")}</span>
            </button>
            <button type="button" className="secondary-action code-square-button" onClick={replaceEmail} title={t("code.newEmail")}>
              <RotateCcw size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <button type="button" className="code-sync-button" onClick={() => void sync()} disabled={syncing}>
          <RefreshCw className={syncing ? "code-spin" : ""} size={18} aria-hidden="true" />
          <span>{syncing ? t("code.syncing") : t("code.sync")}</span>
        </button>

        {copyStatus ? <p className="status-message">{copyStatus}</p> : null}
        {statusMessage ? (
          <p className={syncStatus === "error" ? "status-message error-message" : "status-message"} role={syncStatus === "error" ? "alert" : "status"}>
            {statusMessage}
          </p>
        ) : null}

        {message?.code ? (
          <div className="code-result-row">
            <span>{t("code.codeLabel")}</span>
            <strong>{message.code}</strong>
            <button type="button" className="secondary-action code-square-button" onClick={() => void copy(message.code ?? "", t("code.codeCopied"))} title={t("code.copyCode")}>
              <Copy size={18} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {message?.link ? (
          <div className="code-link-row">
            <a className="button-link secondary-action" href={message.link} target="_blank" rel="noreferrer">
              <ExternalLink size={18} aria-hidden="true" />
              <span>{t("code.openLink")}</span>
            </a>
            <button type="button" className="secondary-action code-icon-button" onClick={() => void copy(message.link ?? "", t("code.linkCopied"))} title={t("code.copyLink")}>
              <Copy size={18} aria-hidden="true" />
              <span>{t("code.copy")}</span>
            </button>
          </div>
        ) : null}
      </section>
    </section>
  );
}

function readStoredCodeEmail() {
  const stored = window.localStorage.getItem(codeEmailStorageKey);
  if (stored && codeEmailPattern.test(stored)) return stored;
  const email = generateCodeEmail();
  window.localStorage.setItem(codeEmailStorageKey, email);
  return email;
}

function generateCodeEmail() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `codex${suffix}@ez1.fr`;
}

function fallbackCopy(value: string) {
  const element = document.createElement("textarea");
  element.value = value;
  element.setAttribute("readonly", "");
  element.style.position = "fixed";
  element.style.opacity = "0";
  document.body.appendChild(element);
  element.select();
  document.execCommand("copy");
  element.remove();
}

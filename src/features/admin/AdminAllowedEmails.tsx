import { useEffect, useState } from "react";
import { userFacingErrorMessage } from "../../errorMessages";
import { useI18n } from "../../i18n/useI18n";

type AllowedEmail = {
  email: string;
  role: "admin" | "teacher";
  created_at: string;
};

type BannedTerm = {
  term: string;
  created_at: string;
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error ?? "request_failed");
  return data as T;
}

export function AdminAllowedEmails() {
  const { locale, t } = useI18n();
  const [emails, setEmails] = useState<AllowedEmail[]>([]);
  const [terms, setTerms] = useState<BannedTerm[]>([]);
  const [email, setEmail] = useState("");
  const [term, setTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadEmails() {
    const data = await requestJson<{ emails: AllowedEmail[] }>("/api/admin/allowed-emails");
    setEmails(data.emails);
  }

  async function loadBannedTerms() {
    const data = await requestJson<{ terms: BannedTerm[] }>("/api/admin/banned-terms");
    setTerms(data.terms);
  }

  useEffect(() => {
    Promise.all([loadEmails(), loadBannedTerms()]).catch((reason) => setError(userFacingErrorMessage(locale, reason)));
  }, [locale]);

  async function addEmail(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await requestJson("/api/admin/allowed-emails", {
        method: "POST",
        body: JSON.stringify({ email, role: "teacher" })
      });
      setEmail("");
      await loadEmails();
    } catch (reason) {
      setError(userFacingErrorMessage(locale, reason));
    }
  }

  async function removeEmail(target: string) {
    setError(null);
    try {
      await requestJson(`/api/admin/allowed-emails/${encodeURIComponent(target)}`, { method: "DELETE" });
      await loadEmails();
    } catch (reason) {
      setError(userFacingErrorMessage(locale, reason));
    }
  }

  async function addTerm(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await requestJson("/api/admin/banned-terms", {
        method: "POST",
        body: JSON.stringify({ term })
      });
      setTerm("");
      await loadBannedTerms();
    } catch (reason) {
      setError(userFacingErrorMessage(locale, reason));
    }
  }

  async function removeTerm(target: string) {
    setError(null);
    try {
      await requestJson(`/api/admin/banned-terms/${encodeURIComponent(target)}`, { method: "DELETE" });
      await loadBannedTerms();
    } catch (reason) {
      setError(userFacingErrorMessage(locale, reason));
    }
  }

  return (
    <section className="admin-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t("admin.eyebrow")}</p>
          <h1>{t("admin.title")}</h1>
        </div>
      </header>

      {error ? <p className="status-message error-message" role="alert">{error}</p> : null}

      <div className="admin-grid">
        <article className="admin-section">
          <h2>{t("admin.allowedEmails")}</h2>
          <form className="inline-form" onSubmit={addEmail}>
            <input value={email} onChange={(event) => setEmail(event.target.value)} aria-label={t("admin.teacherEmail")} placeholder="prof@example.com" />
            <button type="submit">{t("admin.add")}</button>
          </form>
          <ul className="admin-list">
            {emails.map((item) => (
              <li key={item.email}>
                <span>{item.email} - {item.role}</span>
                <button className="secondary-action compact-button" type="button" onClick={() => removeEmail(item.email)}>{t("admin.remove")}</button>
              </li>
            ))}
          </ul>
        </article>

        <article className="admin-section">
          <h2>{t("admin.bannedTerms")}</h2>
          <p className="admin-help">{t("admin.bannedTermsHelp")}</p>
          <form className="inline-form" onSubmit={addTerm}>
            <input value={term} onChange={(event) => setTerm(event.target.value)} aria-label={t("admin.bannedTerm")} placeholder={t("admin.bannedTermPlaceholder")} maxLength={60} />
            <button type="submit">{t("admin.add")}</button>
          </form>
          <ul className="admin-list">
            {terms.map((item) => (
              <li key={item.term}>
                <span>{item.term}</span>
                <button className="secondary-action compact-button" type="button" onClick={() => removeTerm(item.term)}>{t("admin.remove")}</button>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

import { useState } from "react";
import { api } from "../../api/client";
import { safeLoginRedirect } from "../../authRouting";
import { userFacingErrorMessage } from "../../errorMessages";
import { useI18n } from "../../i18n/useI18n";

function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { locale, t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      window.location.href = safeLoginRedirect(window.location.search);
    } catch (reason) {
      setError(userFacingErrorMessage(locale, reason));
    }
  }

  return (
    <section className="auth-panel">
      <h1>{mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}</h1>
      <form onSubmit={submit}>
        <label>
          {t("auth.email")}
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          {t("auth.password")}
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
        </label>
        {error ? <p className="status-message error-message" role="alert">{error}</p> : null}
        <button type="submit">{mode === "login" ? t("auth.loginButton") : t("auth.registerButton")}</button>
      </form>
    </section>
  );
}

export function LoginPage() {
  return <AuthForm mode="login" />;
}

export function RegisterPage() {
  return <AuthForm mode="register" />;
}

import { useState } from "react";
import { ApiError } from "../api/client";
import { useI18n } from "../i18n/LanguageContext";
import { useAdmin } from "../state/Admin";

export function LoginForm() {
  const { t } = useI18n();
  const { signIn } = useAdmin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(username, password);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429 ? t("too_many_attempts") : t("wrong_credentials"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel login" onSubmit={submit}>
      <h2 style={{ fontSize: 28 }}>{t("login_title")}</h2>
      <label className="f" htmlFor="admin-user">
        {t("username")}
        <input id="admin-user" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
      </label>
      <label className="f" htmlFor="admin-pass">
        {t("password")}
        <input id="admin-pass" type="password" autoComplete="current-password" value={password}
          onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {error && <div className="note bad" role="alert">{error}</div>}
      <button className="btn" type="submit" disabled={busy}>{t("login_btn")}</button>
    </form>
  );
}

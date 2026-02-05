import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

type LoginResponse = { token: string };

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/admin/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        },
      );

      if (!response.ok) {
        setError(t("admin.login.invalid"));
        return;
      }

      const data = (await response.json()) as LoginResponse;
      localStorage.setItem("nodex_admin_token", data.token);
      navigate("/vendors");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.login.failed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="login-page">
      <h1>{t("admin.login.title")}</h1>
      <form className="login-form" onSubmit={handleSubmit}>
        <label>
          {t("admin.login.username")}
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label>
          {t("admin.login.password")}
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && <div className="error-banner">{error}</div>}
        <button className="primary" type="submit" disabled={isLoading}>
          {isLoading ? t("admin.login.signingIn") : t("admin.login.signIn")}
        </button>
      </form>
    </section>
  );
}

import { useState } from "react";

const FRIENDLY_ERRORS = {
  "auth/invalid-credential": "Email ou senha incorretos.",
  "auth/invalid-login-credentials": "Email ou senha incorretos.",
  "auth/wrong-password": "Email ou senha incorretos.",
  "auth/user-not-found": "Email ou senha incorretos.",
  "auth/invalid-email": "Email inválido.",
  "auth/user-disabled": "Esta conta foi desativada.",
  "auth/too-many-requests":
    "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
  "auth/network-request-failed":
    "Falha de rede. Verifique sua conexão e tente novamente.",
};

function friendlyError(err) {
  if (!err) return null;
  return FRIENDLY_ERRORS[err.code] || err.message || "Erro ao fazer login.";
}

export function Login({ onSignIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);
    setSubmitting(true);
    const result = await onSignIn(email.trim(), password);
    setSubmitting(false);
    if (!result.ok) {
      setErrorMsg(friendlyError(result.error));
    }
  };

  return (
    <main className="login">
      <form className="login__card" onSubmit={handleSubmit} noValidate>
        <img
          className="login__logo"
          src="/logo.svg"
          alt="ClimaControl"
          width={220}
          height={220}
        />
        <h1 className="login__title sr-only">ClimaControl</h1>
        <p className="login__subtitle">
          Acesse o dashboard de climatização autônoma
        </p>

        <label className="login__field">
          <span className="login__label">Email</span>
          <input
            type="email"
            className="login__input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
            required
            disabled={submitting}
          />
        </label>

        <label className="login__field">
          <span className="login__label">Senha</span>
          <input
            type="password"
            className="login__input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            disabled={submitting}
          />
        </label>

        <button
          type="submit"
          className="btn btn--primary login__submit"
          disabled={submitting || !email || !password}
        >
          {submitting ? "Entrando..." : "Entrar"}
        </button>

        {errorMsg && (
          <p className="login__error" role="alert">
            {errorMsg}
          </p>
        )}

        <p className="login__hint">
          Esqueceu a senha? Procure o administrador do sistema.
        </p>
      </form>
    </main>
  );
}

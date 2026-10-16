import { useState } from "react";
import { login } from "../services/movementApi";

export function OperatorLogin({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
      setPassword("");
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="operator-login">
      <form className="panel panel--padded operator-login__form" onSubmit={handleSubmit}>
        <img src="/logo.svg" width={72} height={72} alt="Movement" />
        <h1>Acessar o Movement</h1>
        <p>Entre para acompanhar seu ambiente.</p>
        <label htmlFor="operator-username">Usuário</label>
        <input id="operator-username" autoComplete="username" required maxLength={120}
          value={username} onChange={(event) => setUsername(event.target.value)} />
        <label htmlFor="operator-password">Senha</label>
        <input id="operator-password" type="password" autoComplete="current-password" required maxLength={256}
          value={password} onChange={(event) => setPassword(event.target.value)} />
        {error && <p role="alert">{error}</p>}
        <button className="btn btn--primary" type="submit" disabled={busy}>
          {busy ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}

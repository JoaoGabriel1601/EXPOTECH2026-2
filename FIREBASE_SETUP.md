# Firebase — Ações pendentes (precisam ser feitas no console)

Estas tarefas não podem ser executadas via código — precisam ser feitas manualmente no [Firebase Console](https://console.firebase.google.com/project/movimenteunifecaf).

## 1. Rotacionar API key (Tarefa 1.3)

A API key antiga (`GOOGLE_FIREBASE_CREDENTIAL_REMOVED`) já foi exposta no histórico do Git. Mesmo que API keys do Firebase Web sejam projetadas para serem públicas, o ideal é rotacioná-la:

1. Acesse [Google Cloud Console — Credentials](https://console.cloud.google.com/apis/credentials?project=movimenteunifecaf)
2. Crie uma nova API key
3. Em **Application restrictions**, escolha **HTTP referrers** e adicione:
   - `http://localhost:5173/*` (dev)
   - `https://movimenteunifecaf.web.app/*` (produção Firebase Hosting)
   - `https://movimenteunifecaf.firebaseapp.com/*`
4. Em **API restrictions**, restrinja a:
   - Identity Toolkit API
   - Token Service API
   - Firebase Realtime Database API
   - Firebase Installations API
5. Substitua o valor de `VITE_FIREBASE_API_KEY` no arquivo `.env`
6. Delete a key antiga

## 2. Configurar Security Rules do Realtime Database (Tarefa 1.4)

No console Firebase → Realtime Database → Rules, substitua pelas regras abaixo:

```json
{
  "rules": {
    "sensores": {
      ".read": true,
      ".write": "auth != null && auth.token.admin === true"
    },
    "historico": {
      ".read": true,
      ".write": "auth != null && auth.token.admin === true",
      ".indexOn": ["t"]
    },
    "controle": {
      ".read": true,
      ".write": "auth != null"
    },
    "eventos": {
      ".read": true,
      ".write": "auth != null && auth.token.admin === true",
      ".indexOn": ["timestamp"]
    }
  }
}
```

> **Nota:** Estas regras assumem que o ESP32 escreverá usando uma identidade autenticada (custom token com claim `admin: true`). Para uso somente leitura no dashboard, deixe `.read: true`. Para deploy mais restrito, mude `.read` para `auth != null`.

## 3. (Opcional) Adicionar Firebase Authentication

Para a Tarefa 1.5, habilite no console:
- **Authentication → Sign-in method → Email/Password** (e/ou Google)
- Crie ao menos um usuário admin
- No backend (ESP32 ou Cloud Function), gere custom tokens com `admin: true`

## 4. (Opcional) Configurar GitHub Actions Secrets

Para a Tarefa 6.2 (CI/CD), adicione no repositório GitHub → Settings → Secrets:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_MEASUREMENT_ID`
- `FIREBASE_DATABASE_URL`
- `FIREBASE_SERVICE_ACCOUNT` (gere em Project Settings → Service accounts → Generate new private key)

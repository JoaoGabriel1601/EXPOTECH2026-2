# Deploy da API no Render

Guia para publicar a ClimaControl API no Render (plano free, sem cartão) e
apontar o dashboard para ela.

---

## Pré-requisitos

- [ ] Conta no [Render](https://render.com) (login com GitHub é o mais fácil)
- [ ] O projeto num repositório **GitHub** (com a pasta `api/` versionada)
- [ ] O JSON da conta de serviço do Firebase em mãos (o mesmo `serviceAccount.json`)

> ⚠️ **Nunca** suba `api/serviceAccount.json` nem os `.env` para o GitHub — eles já
> estão no `.gitignore`. No Render, a credencial vai numa **variável de ambiente**.

---

## Passo 1 — Subir para o GitHub

```bash
cd "Projeto Integrador"        # a pasta que tem o .git
git add api docs .env.example src/services .gitignore
git status                     # confira que .env e serviceAccount.json NÃO aparecem
git commit -m "feat: API REST gateway + integração do dashboard"
git push
```

Confirme no GitHub que **não** há `serviceAccount.json` nem `.env` no repositório.

---

## Passo 2 — Criar o serviço no Render

### Opção A — Blueprint (recomendada, usa o `api/render.yaml`)

1. Render → **New** → **Blueprint**
2. Conecte o repositório → o Render lê `api/render.yaml` e já configura:
   build `npm install`, start `npm start`, health check `/health`, Node 22,
   `CORS_ORIGIN` e `FIREBASE_DATABASE_URL` preenchidos.
3. Ele vai pedir só o que está marcado como secreto: **`FIREBASE_SERVICE_ACCOUNT`** (ver Passo 3).

### Opção B — Web Service manual

1. Render → **New** → **Web Service** → conecte o repo
2. Preencha:
   | Campo | Valor |
   |---|---|
   | Root Directory | `api` |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Health Check Path | `/health` |
   | Instance Type | **Free** |
3. Adicione as variáveis de ambiente do Passo 3.

---

## Passo 3 — Variáveis de ambiente (checklist)

Em **Environment** no painel do Render:

| Variável | Valor | Secreto? |
|---|---|---|
| `NODE_VERSION` | `22` | não |
| `FIREBASE_DATABASE_URL` | `https://movimenteunifecaf-default-rtdb.firebaseio.com` | não |
| `CORS_ORIGIN` | `https://movimenteunifecaf.web.app,https://movimenteunifecaf.firebaseapp.com,http://localhost:5173` | não |
| `FIREBASE_SERVICE_ACCOUNT` | **JSON inteiro** da conta de serviço, em **uma linha** | 🔒 **sim** |

### Como colar a `FIREBASE_SERVICE_ACCOUNT`

O Render aceita o valor multilinha, mas o mais seguro é colar em uma linha só.
Para gerar a versão de uma linha a partir do arquivo:

```bash
# imprime o JSON compactado (1 linha) para copiar
node -e "console.log(JSON.stringify(require('./api/serviceAccount.json')))"
```

Copie a saída inteira (começa com `{"type":"service_account"...`) e cole no campo.

> O código aceita o JSON em `FIREBASE_SERVICE_ACCOUNT` **ou** um caminho em
> `GOOGLE_APPLICATION_CREDENTIALS`. No Render use a primeira; o arquivo local fica só em dev.

---

## Passo 4 — Deploy e verificação

1. Clique em **Create / Deploy**. O primeiro build leva ~2–3 min.
2. A URL pública sai como `https://climacontrol-api.onrender.com` (o nome pode variar).
3. Teste:
   - `https://SEU-APP.onrender.com/health` → `{"status":"ok","firebase":"up"}`
   - `https://SEU-APP.onrender.com/api/docs` → Swagger UI
   - `https://SEU-APP.onrender.com/api/v1/controle` → `200` com o estado atual

Se `/health` mostrar `"firebase":"down"`, a credencial está errada — revise a
`FIREBASE_SERVICE_ACCOUNT` (JSON completo e válido).

---

## Passo 5 — Apontar o dashboard para a API publicada

A `VITE_API_URL` é embutida no **build** do front. Para produção:

```bash
# no .env do dashboard, antes de buildar:
VITE_API_URL=https://SEU-APP.onrender.com
VITE_USE_MOCK_DATA=false
```

```bash
nvm use            # Node 22
npm run build      # gera dist/ já apontando para a API do Render
firebase deploy    # publica no Firebase Hosting
```

Pronto: dashboard em `movimenteunifecaf.web.app` consumindo a API no Render.

---

## ⚠️ Caveat do plano free

O serviço **hiberna após ~15 min** sem requisições; a primeira chamada depois disso
leva **~50 s** (cold start). Uma chamada a `https://SEU-APP.onrender.com/health`
reativa o serviço.

---

## Solução de problemas

| Sintoma | Causa provável | Correção |
|---|---|---|
| `/health` → `firebase: down` | `FIREBASE_SERVICE_ACCOUNT` ausente/inválida | Recolar o JSON completo em 1 linha |
| Dashboard com erro de CORS | domínio não está em `CORS_ORIGIN` | Adicionar a origem exata (com `https://`) |
| Build falha no Render | Node errado | Garantir `NODE_VERSION=22` |
| `503` em todas as rotas de dados | sem credencial ou DB URL | Revisar `FIREBASE_*` |
| Front não chama a API | `VITE_API_URL` não embutida | Rebuildar após setar a variável |

---

## Segurança — lembrete

- A service account dá **acesso admin** ao banco (ignora as security rules).
  Como ela foi compartilhada durante o desenvolvimento, **rotacione-a após a entrega**:
  Console Firebase → Contas de serviço → gerar nova chave → atualizar no Render → apagar a antiga.
- Mantenha `serviceAccount.json` e `.env` fora do Git (já estão no `.gitignore`).

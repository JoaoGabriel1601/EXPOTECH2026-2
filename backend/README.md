# Movement — API própria (marco 1)

Python 3.12+, FastAPI e PostgreSQL nativo. Não exige Docker.

## Escopo entregue

- Telemetria autenticada por dispositivo, provisionado por CLI local.
- PostgreSQL com migração Alembic, chaves estrangeiras, índices e limites de dados.
- Reenvio idempotente por `(device_id, message_id)`; conteúdo diferente retorna 409.
- Login de um operador configurado no servidor; sessão assinada de duração limitada.
- Última leitura com idade/obsolescência e histórico ordenado por horário da medição.
- Dashboard web integrado à API. Credenciais nunca entram em variáveis `VITE_*`.

Ainda pendentes: integração do firmware e mobile, protocolo de comandos, padrões
Strategy/Command, otimização, deploy VPS, física/circuito e defesa acadêmica.
Os endpoints de leitura exigem login. Este marco usa um operador para todos os
ambientes; permissões por ambiente e múltiplos operadores são evolução posterior.

## 1. Preparar o ambiente (PowerShell, pasta backend)

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.lock
.\.venv\Scripts\python.exe -m pip install --no-deps -e .
```

`requirements.lock` fixa as versões verificadas, incluindo ferramentas de teste.
Não é necessário ativar o ambiente virtual para usar esses comandos.

## Configuração automática no Windows (instância própria)

Se o PostgreSQL já estiver instalado, é possível criar uma instância persistente
exclusiva do projeto na porta 5433. Não é necessário saber a senha da instalação
existente nem alterar o serviço da porta 5432.

Na pasta `backend`:

```powershell
.\.venv\Scripts\movement.exe local setup --port 5433
```

Esse comando cria `movement` e `movement_test`, aplica as migrações, cadastra
`sala-01`/`esp32-01` e gera os arquivos privados de configuração. As senhas são
aleatórias; a aplicação utiliza um usuário sem privilégios de administração.
As conexões ficam restritas a `127.0.0.1`, com autenticação SCRAM-SHA-256.

Os acessos ficam em `.local/postgres-dev/access.txt`, na raiz do projeto,
ignorado pelo Git. O diretório `.local/postgres-dev/data` contém os dados
persistentes: não o apague ao encerrar o desenvolvimento.

Para iniciar a API e o banco, na **raiz**:

```powershell
.\scripts\start-backend.ps1
```

Em outro terminal, também na raiz, execute `npm run dev`. Abra o dashboard e
entre com o usuário/senha do arquivo privado. O banco começa vazio, aguardando
telemetria; enviar uma leitura simulada é opcional, conforme a seção abaixo.

Ctrl+C encerra a API; o banco continua iniciado. Para parar apenas a instância
do projeto, preservando os dados:

```powershell
.\scripts\stop-database.ps1
```

Na pasta backend, `movement.exe local start`, `local stop` e `local status`
também estão disponíveis dentro de `.venv/Scripts`. O `setup` pode ser repetido
para concluir uma configuração interrompida; credenciais e bancos existentes
da instância são preservados. Arquivos `.env` de outra configuração são recusados.

O comando detecta os binários em `C:/Program Files/PostgreSQL/<versão>/bin`.
Para outro caminho, use `--postgres-bin`. Este utilitário é específico para
desenvolvimento Windows; o deploy VPS terá configuração própria.

Para testes, a URL privada está em `.local/postgres-dev/test.env`. Ela pode ser
carregada pelo `python-dotenv` sem copiar a senha para o terminal:

```powershell
.\.venv\Scripts\python.exe -c "from dotenv import load_dotenv; import pytest; load_dotenv('../.local/postgres-dev/test.env'); raise SystemExit(pytest.main(['-q']))"
```

Se você utilizar essa configuração automática, pule as etapas manuais 2 a 4.

## 2. Criar usuário e bancos pelo pgAdmin ou psql

Use uma conta administrativa **apenas para provisionar**. Substitua a senha:

```sql
CREATE ROLE movement LOGIN PASSWORD 'SUBSTITUA_POR_SENHA_FORTE';
CREATE DATABASE movement OWNER movement;
CREATE DATABASE movement_test OWNER movement;
```

No pgAdmin, execute cada `CREATE DATABASE` separadamente, fora de transações.
A API utiliza o usuário `movement`, não a conta administrativa do PostgreSQL.
Não execute o provisionamento novamente se esses nomes já existirem.

## 3. Configurar segredos localmente

Copie `.env.example` para `.env` (ignorado pelo Git). Preencha:

- `MOVEMENT_DATABASE_URL`: URL do banco `movement` com driver `postgresql+psycopg`.
  Caracteres especiais no usuário/senha precisam de codificação de URL.
- `MOVEMENT_SESSION_SECRET`: gere com o comando abaixo.
- `MOVEMENT_OPERATOR_PASSWORD_HASH`: gere com `movement password-hash` abaixo.
- `MOVEMENT_OPERATOR_USERNAME`: usuário do dashboard (padrão `admin`).

```powershell
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))"
.\.venv\Scripts\movement.exe password-hash
```

O gerador solicita e confirma a senha sem exibi-la. O `.env` guarda somente seu hash.
Não envie senhas no chat, não versione `.env` e não coloque tokens em variáveis Vite.

## 4. Migrar e cadastrar dispositivo

```powershell
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\movement.exe create-device --room sala-01 --name "Sala 01" --device esp32-01
```

Guarde o token exibido em local privado. O banco armazena apenas seu hash.
O cadastro repetido não modifica a credencial existente. Nesta etapa, um dispositivo
é vinculado a cada ambiente. O vínculo é definido no servidor, não no payload recebido.

## 5. Iniciar a API

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000 --reload
```

- Swagger da **API própria**: http://127.0.0.1:8000/docs
- Contrato gerado pelo código: http://127.0.0.1:8000/openapi.json
- Processo: `GET /health`
- Banco e migrações: `GET /ready`

As migrações são explícitas; iniciar a API não cria tabelas automaticamente.
O esquema de autenticação é HTTP Bearer. Obtenha a sessão em `/auth/login` e use
o botão Authorize no Swagger. Para publicar telemetria, utilize o token do dispositivo,
que não tem permissão para consultar os ambientes.

## 6. Enviar a primeira leitura simulada

Em outro terminal, na pasta backend:

```powershell
.\.venv\Scripts\python.exe scripts/publish_sample.py
```

O token do dispositivo é solicitado sem eco. A leitura é um exemplo simulado,
não uma medição de hardware. Para repetir a mesma leitura via HTTP, preserve
`message_id` e todo o conteúdo; a resposta passa de 201 para 200 sem duplicar.

## 7. Abrir o dashboard

Na raiz do repositório, copie `.env.example` para `.env` e confira:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_ROOM_ID=sala-01
VITE_USE_MOCK_DATA=false
```

```powershell
npm run dev
```

Abra http://localhost:5173 e entre com o operador configurado no backend.
A sessão fica em `sessionStorage` e é descartada ao sair; expiração exige novo login.
Em simulação local não é necessário login. No modo API, o controle remoto permanece
desabilitado até o marco de comandos confirmados.

O `.env.production` existente força mock: para validar um build integrado, defina
explicitamente `VITE_USE_MOCK_DATA=false` no ambiente de build. A hospedagem estática
atual não deve ser confundida com uma API já implantada na VPS.

## Testes com PostgreSQL real

Use **somente** banco separado cujo nome termine em `_test`:

```powershell
$env:MOVEMENT_TEST_DATABASE_URL='postgresql+psycopg://movement:SENHA_CODIFICADA@127.0.0.1:5432/movement_test'
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m ruff check app migrations tests scripts
.\.venv\Scripts\python.exe -m ruff format --check app migrations tests scripts
```

Cada execução cria e remove apenas seu schema aleatório. Os testes aplicam a
migração real e verificam também se ela corresponde aos modelos SQLAlchemy.
Ausência de banco de testes causa falha, em vez de um resultado falsamente aprovado.

## Próximos marcos

1. Firmware publicando por HTTPS, com reenvios estáveis e sincronização de relógio.
2. Comandos confirmados, modo manual e retorno automático, com padrão Command.
3. Strategy de publicação e problema matemático de otimização.
4. Integração mobile, diagramas, circuito lógico e memorial de física.
5. VPS, Nginx/HTTPS, proteção contra abuso de login, backup e deploy controlado.

O serviço ainda não foi publicado. PostgreSQL autogerenciado na VPS depende de
confirmação acadêmica, pois o edital exige banco gerenciado.

# Backend local configurado — 16/10/2026

## Configuração efetiva

- PostgreSQL 18 nativo, com instância própria do projeto em `127.0.0.1:5433`.
- Instalação existente na porta 5432 preservada e disponível.
- Bancos `movement` e `movement_test`, com proprietário `movement`.
- Usuário da aplicação sem superusuário, criação de bancos ou criação de roles.
- Autenticação SCRAM-SHA-256; instância restrita ao endereço de loopback.
- Migração `0001_telemetry` aplicada no banco principal.
- Ambiente `sala-01` e dispositivo `esp32-01` cadastrados.
- Banco principal inicialmente sem leituras simuladas.
- API em `http://127.0.0.1:8000` e dashboard configurado para essa API.

## Arquivos privados (ignorados pelo Git)

| Arquivo | Função |
|---|---|
| `backend/.env` | Conexão e configuração privada da API |
| `.env` | URL da API e ambiente do dashboard, sem credenciais |
| `.local/postgres-dev/instance.json` | Credenciais e metadados da instância local |
| `.local/postgres-dev/access.txt` | Acessos para o desenvolvedor |
| `.local/postgres-dev/test.env` | URL exclusiva do banco de testes |
| `.local/postgres-dev/data/` | Dados persistentes do PostgreSQL |

Senhas e tokens não são registrados neste documento. O arquivo temporário de
senha utilizado por initdb é removido após a inicialização.

## Validação

- Configuração executada e repetida sem recriar bancos ou substituir credenciais.
- Instância encerrada e reiniciada, preservando ambiente e dispositivo.
- Conexão da API ao banco `movement` na porta 5433 verificada.
- `GET /health` e `GET /ready` retornaram 200.
- Consulta sem sessão retornou 401.
- Login com o operador configurado retornou 200.
- Consulta autenticada à sala retornou 200, sem leitura, aguardando telemetria.
- 23 testes de backend aprovados usando `movement_test` da nova instância.
- Ruff e formatação aprovados.

Os testes usam schemas temporários separados e não inserem leituras no banco
principal. Não houve deploy na VPS nem integração de hardware nesta configuração.

## Operação diária (PowerShell, raiz do projeto)

```powershell
.\scripts\start-backend.ps1
```

Em outro terminal:

```powershell
npm run dev
```

Para encerrar o banco após parar a API, preservando seus dados:

```powershell
.\scripts\stop-database.ps1
```

Esta instância não foi registrada como serviço Windows. Depois de reiniciar
a máquina, `start-backend.ps1` inicia o banco e a API novamente.

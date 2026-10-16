# Validação do marco 1 — 16/10/2026

## Ambiente

- Windows, Node.js e Python 3.12 em ambiente virtual do projeto.
- PostgreSQL 18 instalado no Windows, sem Docker.
- Instância PostgreSQL temporária na porta 55432, restrita a 127.0.0.1.
- Banco `movement_test`; cada execução pytest usa schema aleatório próprio.
- Os bancos habituais do usuário não foram utilizados nem modificados.

## Resultados locais

| Verificação | Resultado |
|---|---|
| `npm test` | 38 testes aprovados |
| `npm run lint` | Aprovado |
| `npm run check:sync` | 5 pares sincronizados |
| `npm run build` | Aprovado; aviso de chunk superior a 500 kB |
| pytest + PostgreSQL | 19 testes aprovados |
| Ruff lint e formatação | Aprovados |
| Alembic upgrade / downgrade / upgrade | Executados em schema vazio de testes |
| Alembic check | Modelos e migração sem divergências |

O TestClient emitiu aviso de depreciação do adaptador httpx na versão de Starlette
instalada; os testes passaram. A migração para o adaptador recomendado pode ser
tratada em atualização de dependências, sem ocultar o aviso atual.

## Comportamentos verificados

- Publicação autenticada e vínculo de ambiente definido pelo servidor.
- Consultas autenticadas com sessão de operador.
- Credencial de dispositivo não permite ler ambientes.
- Sessão de operador não permite publicar como dispositivo.
- Reenvios idênticos retornam a mesma leitura.
- Quatro reenvios concorrentes produzem somente um registro.
- Mesmo identificador com conteúdo diferente retorna conflito.
- Campos inválidos, identificador de ambiente forjado e horários inadequados são rejeitados.
- Dispositivo desabilitado não publica.
- Última leitura segue horário da medição, não ordem de chegada.
- Histórico ordenado, limitado e filtrável.
- Estado de A/C desligado é preservado com alvo positivo.
- Leituras antigas são identificadas com a API acessível.
- Hashes de senha têm salt; sessões expiram e rejeitam outro usuário/segredo.

## Verificação no navegador

API local e dashboard foram iniciados com dados **simulados** no PostgreSQL de testes.
Foram observados login, métricas, gráficos, cálculo de uso pelo estado efetivo,
controles desabilitados, identificação de leitura antiga e logout. Nenhum erro
de console foi observado na consulta realizada.

## Limites desta validação

- Não houve publicação de dados de hardware nem compilação do firmware.
- O mobile ainda não foi migrado para a API.
- O workflow CI foi criado, mas não foi executado no GitHub nesta etapa.
- Nenhum deploy na VPS foi realizado.
- Comandos, otimização, circuito/física e padrões GoF ainda são próximos marcos.
- O banco habitual de desenvolvimento depende de configuração privada em `backend/.env`.

# Vídeo Pitch — ClimaControl (roteiro + slides)

Estrutura sugerida para o vídeo pitch (~3 min). Cada bloco tem **o que mostrar na tela**
e **a fala** (ajuste ao seu estilo). Foque a narrativa na **API como contrato**.

> Dica: abra `/health` da API 1–2 min antes de gravar (cold start do plano free).

---

## Slide 1 — Abertura (0:00–0:20)
**Tela:** logo + nome do projeto + integrantes.
**Fala:** "ClimaControl: um sistema de climatização autônoma que ajusta o ar-condicionado
sozinho conforme a ocupação e o calor externo — economizando energia. Somos [nomes],
da UNIFECAF."

## Slide 2 — Problema (0:20–0:40)
**Tela:** foto de sala cheia / ar ligado em ambiente vazio; ícone de consumo.
**Fala:** "Ambientes climatizados desperdiçam energia: o A/C fica no mesmo set-point
com 2 ou 40 pessoas. Queríamos um controle que reage à realidade da sala."

## Slide 3 — Solução & Arquitetura (0:40–1:10)
**Tela:** diagrama.
```
ESP32 (sensores + IA local) ─►            ◄── lê  ┐
                              Firebase RTDB        ├─ Dashboard web (HTTPS)
        ◄── controla A/C ── API REST /api/v1 ◄── escreve ┘
```
**Fala:** "O ESP32 lê ocupação e temperatura, uma IA calcula o alvo ideal, e tudo conversa
através de uma **API REST** que criamos — o coração do projeto e o nosso contrato."

## Slide 4 — A API é um contrato (1:10–1:45)
**Tela:** Swagger (`/api/docs`) rolando os recursos.
**Fala:** "A API segue REST de verdade: recursos como `/sensores` e `/controle`, verbos
HTTP corretos (GET, PATCH, POST, DELETE), status codes coerentes, versionada em `/v1`,
e documentada em **OpenAPI** — que é a fonte da verdade, validada automaticamente."

## Slide 5 — Demonstração ao vivo (1:45–2:20)
**Tela:** Swagger "Try it out".
**Fala + ações:**
- `GET /sensores` → **200**. "Leitura pública, resposta padronizada."
- `PATCH /controle` com `temp_alvo: 99` → **400**. "A API recusa o que viola a regra de negócio — erro no padrão RFC 7807."
- `PATCH /controle` sem token → **401**. "Escrever exige autenticação por JWT do Firebase."

## Slide 6 — Segurança, resiliência e qualidade (2:20–2:45)
**Tela:** bullets + print do GitHub Actions verde.
**Fala:** "Temos autenticação JWT, rate limiting, validação de entrada, timeout e circuit
breaker contra falhas do banco. E uma esteira de **CI** que roda 19 testes e o lint do
contrato a cada commit — se quebrar, não sobe."

## Slide 7 — Multidisciplinar (2:45–2:55)
**Tela:** 4 ícones.
**Fala:** "O projeto integra quatro áreas: **eletrônica/física** no hardware, **IA/pesquisa
operacional** no cálculo do alvo, **engenharia de software** na API e **UX** no dashboard."

## Slide 8 — Encerramento (2:55–3:00)
**Tela:** URLs (dashboard + Swagger) + QR code opcional.
**Fala:** "ClimaControl: no ar, documentado e testado. Obrigado!"

---

## Checklist de gravação
- [ ] API "acordada" (`/health` → 200) antes de gravar a demo
- [ ] Swagger aberto e logado (token, se for mostrar escrita autenticada)
- [ ] GitHub Actions com run verde visível
- [ ] Dashboard aberto (https://movimenteunifecaf.web.app)
- [ ] Áudio limpo; tela legível (zoom no navegador ~125%)

## Links para a descrição do vídeo
- Repositório: https://github.com/JoaoGabriel1601/Projeto-Integrador
- API / Swagger: https://climacontrol-api.onrender.com/api/docs
- Dashboard: https://movimenteunifecaf.web.app

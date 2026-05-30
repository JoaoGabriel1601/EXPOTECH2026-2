/**
 * Contrato formal da API (OpenAPI 3.1). É a "fonte da verdade" do que a API
 * oferece: recursos, métodos, parâmetros, schemas e status codes.
 * Servido com Swagger UI em /api/docs.
 */
export const openapiSpec = {
  openapi: "3.1.0",
  info: {
    title: "ClimaControl API",
    version: "1.0.0",
    description:
      "API REST do ClimaControl — gateway sobre o Firebase Realtime Database.\n\n" +
      "Projeto Integrador UNIFECAF. Versionada por URL (`/api/v1`).",
  },
  servers: [
    { url: "http://localhost:3001", description: "Desenvolvimento local" },
    { url: "https://climacontrol-api.onrender.com", description: "Produção (Render)" },
  ],
  tags: [
    { name: "sensores", description: "Leitura atual dos sensores (singleton)" },
    { name: "controle", description: "Estado de controle do A/C (singleton)" },
    { name: "historico", description: "Série temporal (coleção)" },
    { name: "eventos", description: "Log de eventos (coleção)" },
  ],
  paths: {
    "/api/v1/sensores": {
      get: {
        tags: ["sensores"],
        summary: "Leitura atual dos sensores",
        responses: {
          200: { description: "OK", content: jsonEnvelope("Sensores") },
          404: { description: "Sem leitura disponível", content: errorContent() },
          503: { description: "Banco indisponível", content: errorContent() },
        },
      },
      put: {
        tags: ["sensores"],
        summary: "ESP32 envia a leitura completa",
        requestBody: { required: true, content: schemaContent("SensoresInput") },
        responses: {
          200: { description: "Atualizado", content: jsonEnvelope("Sensores") },
          400: { description: "Validação falhou", content: errorContent() },
        },
      },
    },
    "/api/v1/controle": {
      get: {
        tags: ["controle"],
        summary: "Estado atual de controle do A/C",
        responses: {
          200: { description: "OK", content: jsonEnvelope("Controle") },
          404: { description: "Não inicializado", content: errorContent() },
        },
      },
      patch: {
        tags: ["controle"],
        summary: "Atualização parcial (ligar A/C, ajustar temp_alvo…)",
        requestBody: { required: true, content: schemaContent("ControlePatch") },
        responses: {
          200: { description: "OK", content: jsonEnvelope("Controle") },
          400: { description: "Validação falhou (ex.: temp_alvo fora de 16–28)", content: errorContent() },
        },
      },
    },
    "/api/v1/historico": {
      get: {
        tags: ["historico"],
        summary: "Série temporal filtrada por período",
        parameters: [
          { name: "period", in: "query", schema: { type: "string", enum: ["1h", "4h", "8h", "12h", "24h"], default: "12h" } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 500, default: 200 } },
        ],
        responses: { 200: { description: "OK", content: jsonEnvelopeArray("HistoricoSample") } },
      },
      post: {
        tags: ["historico"],
        summary: "ESP32 anexa uma amostra",
        requestBody: { required: true, content: schemaContent("HistoricoSample") },
        responses: {
          201: { description: "Criado", content: jsonEnvelope("HistoricoSample") },
          400: { description: "Validação falhou", content: errorContent() },
        },
      },
    },
    "/api/v1/eventos": {
      get: {
        tags: ["eventos"],
        summary: "Últimos eventos",
        parameters: [{ name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 200, default: 50 } }],
        responses: { 200: { description: "OK", content: jsonEnvelopeArray("Evento") } },
      },
      post: {
        tags: ["eventos"],
        summary: "Registra um evento",
        requestBody: { required: true, content: schemaContent("EventoInput") },
        responses: {
          201: { description: "Criado", content: jsonEnvelope("Evento") },
          400: { description: "Validação falhou", content: errorContent() },
        },
      },
    },
  },
  components: {
    schemas: {
      Sensores: {
        type: "object",
        properties: {
          ocupacao: { type: "integer", example: 12 },
          temp_interna: { type: "number", example: 23.5 },
          temp_externa: { type: "number", example: 31.2 },
          temp_alvo: { type: "integer", example: 22 },
          umid_interna: { type: "number", example: 55 },
          umid_externa: { type: "number", example: 70 },
          ac_ligado: { type: "boolean", example: true },
          modo_manual: { type: "boolean", example: false },
          temp_alvo_ia: { type: ["integer", "null"], example: 21 },
          ia_ativa: { type: "boolean", example: true },
        },
      },
      SensoresInput: {
        type: "object",
        required: ["ocupacao", "temp_interna", "temp_externa", "temp_alvo", "umid_interna", "umid_externa", "ac_ligado"],
        properties: {
          ocupacao: { type: "integer", minimum: 0, maximum: 500 },
          temp_interna: { type: "number" },
          temp_externa: { type: "number" },
          temp_alvo: { type: "integer", minimum: 0, maximum: 30 },
          umid_interna: { type: "number" },
          umid_externa: { type: "number" },
          ac_ligado: { type: "boolean" },
        },
      },
      Controle: {
        type: "object",
        properties: {
          ac_ligado: { type: "boolean" },
          modo_manual: { type: "boolean" },
          temp_alvo: { type: "integer" },
          ia_ativa: { type: "boolean" },
          atualizado_em: { type: "integer", description: "timestamp ms" },
        },
      },
      ControlePatch: {
        type: "object",
        minProperties: 1,
        properties: {
          ac_ligado: { type: "boolean" },
          modo_manual: { type: "boolean" },
          temp_alvo: { type: "integer", minimum: 16, maximum: 28, example: 22 },
          ia_ativa: { type: "boolean" },
        },
      },
      HistoricoSample: {
        type: "object",
        required: ["o", "ti", "te", "ta", "ui", "ue"],
        properties: {
          t: { type: "integer", description: "timestamp ms (servidor preenche se ausente)" },
          o: { type: "integer", description: "ocupação" },
          ti: { type: "number", description: "temp interna" },
          te: { type: "number", description: "temp externa" },
          ta: { type: "integer", description: "temp alvo" },
          ui: { type: "number", description: "umidade interna" },
          ue: { type: "number", description: "umidade externa" },
        },
      },
      Evento: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string", example: "ac_ligado_manual" },
          payload: {},
          timestamp: { type: "integer" },
        },
      },
      EventoInput: {
        type: "object",
        required: ["type"],
        properties: {
          type: { type: "string", example: "ac_ligado_manual" },
          payload: {},
          timestamp: { type: "integer" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              status: { type: "integer", example: 400 },
              message: { type: "string" },
              details: { type: "array", items: { type: "object" } },
            },
          },
          meta: { type: "object" },
        },
      },
    },
  },
};

function envelope(schemaName, dataSchema) {
  return {
    type: "object",
    properties: {
      data: dataSchema || { $ref: `#/components/schemas/${schemaName}` },
      meta: {
        type: "object",
        properties: {
          version: { type: "string", example: "v1" },
          timestamp: { type: "integer" },
        },
      },
    },
  };
}

function jsonEnvelope(schemaName) {
  return { "application/json": { schema: envelope(schemaName) } };
}

function jsonEnvelopeArray(schemaName) {
  return {
    "application/json": {
      schema: envelope(null, { type: "array", items: { $ref: `#/components/schemas/${schemaName}` } }),
    },
  };
}

function schemaContent(schemaName) {
  return { "application/json": { schema: { $ref: `#/components/schemas/${schemaName}` } } };
}

function errorContent() {
  return { "application/json": { schema: { $ref: "#/components/schemas/Error" } } };
}

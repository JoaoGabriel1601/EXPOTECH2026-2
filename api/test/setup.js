// Roda antes dos testes. Desativa o rate limit (limite altíssimo) para não
// interferir nas asserções, e marca o ambiente como teste.
process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_MAX = "1000000";
process.env.CORS_ORIGIN = "*";

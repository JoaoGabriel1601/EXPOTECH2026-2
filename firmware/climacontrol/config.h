#pragma once

// =============================================================================
//  ClimaControl — Firmware ESP32
//  Configuração de credenciais e pinagem.
//
//  Antes de gravar:
//   1. Preencha WIFI_SSID / WIFI_PASSWORD com sua rede.
//   2. Em FIREBASE_*, copie os mesmos valores do .env do dashboard
//      (VITE_FIREBASE_API_KEY, VITE_FIREBASE_DATABASE_URL).
//   3. Crie um usuário em Firebase Auth (Authentication → Users → Add user)
//      e coloque email/senha em FIREBASE_USER_EMAIL / FIREBASE_USER_PASSWORD.
//      O ESP32 escreve no RTDB como esse usuário; as Security Rules devem
//      permitir leitura/escrita autenticada nos caminhos /sensores, /controle,
//      /historico, /eventos, /ia.
//   4. Ajuste a pinagem se sua placa for diferente. GPIOs 34/35 são
//      input-only no ESP32 — bons para o D0 dos TCRT5000.
// =============================================================================

// ---------------------- WiFi ------------------------------------------------
#define WIFI_SSID       "SUA_REDE_WIFI"
#define WIFI_PASSWORD   "SUA_SENHA_WIFI"

// ---------------------- Firebase --------------------------------------------
#define FIREBASE_API_KEY       "VITE_FIREBASE_API_KEY"
#define FIREBASE_DATABASE_URL  "https://seu-projeto-default-rtdb.firebaseio.com"
#define FIREBASE_USER_EMAIL    "esp32@climacontrol.local"
#define FIREBASE_USER_PASSWORD "trocar-essa-senha"

// ---------------------- Pinagem ESP32 ---------------------------------------
// DHT11 (3 unidades): 1 externo + 2 internos (perto/longe do A/C).
#define PIN_DHT_EXT     4
#define PIN_DHT_INT_1   16  // perto do A/C
#define PIN_DHT_INT_2   17  // longe do A/C

// TCRT5000 (D0 digital). Par direcional para contagem entrada/saída:
//   pessoa entrando: dispara A antes de B
//   pessoa saindo:   dispara B antes de A
#define PIN_TCRT_A      34  // sensor externo (porta de fora)
#define PIN_TCRT_B      35  // sensor interno (porta de dentro)

// LED IR de comando para o A/C (driver com transistor recomendado).
#define PIN_IR_LED      25

// LED de status (built-in da maioria das placas ESP32 dev kit).
#define PIN_STATUS_LED  2

// ---------------------- Tempos ----------------------------------------------
// Espelham as constantes do dashboard (src/constants/index.js):
#define UPDATE_INTERVAL_MS   5000UL    // leitura/escrita ao /sensores
#define HISTORY_APPEND_MS    60000UL   // push em /historico

// Janela máxima entre A e B para validar um cruzamento (ms).
#define BEAM_PAIR_WINDOW_MS  1500UL

// Anti-trepidação (debounce) dos TCRT5000.
#define BEAM_DEBOUNCE_MS     80UL

// ---------------------- Protocolo IR do A/C ---------------------------------
// IRremoteESP8266 suporta dezenas de marcas. Troque para a sua aqui:
// SAMSUNG_AC, LG, DAIKIN, MITSUBISHI_AC, GREE, MIDEA, FUJITSU_AC, COOLIX, etc.
// Lista completa: https://github.com/crankyoldgit/IRremoteESP8266
#define AC_PROTOCOL_SAMSUNG  1
// #define AC_PROTOCOL_LG       1
// #define AC_PROTOCOL_DAIKIN   1

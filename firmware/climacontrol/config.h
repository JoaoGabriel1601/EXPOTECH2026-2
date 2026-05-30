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
//   4. Ajuste a pinagem se sua placa for diferente. No hardware real os
//      HC-SR04 ligados em 5V geram ECHO em 5V — use divisor (1kΩ + 2kΩ)
//      para entrar em 3.3V no ESP32, ou alimente o HC-SR04 em 3V3 (a
//      sensibilidade cai, mas é seguro). No Wokwi alimentamos em 3V3.
// =============================================================================

// ---------------------- WiFi ------------------------------------------------
// No simulador Wokwi a única rede disponível é "Wokwi-GUEST" (aberta). O flag
// WOKWI_SIMULATION é definido pelo platformio.ini quando compilamos para o
// simulador — assim mantemos as credenciais reais no firmware de produção
// sem precisar editar este arquivo antes de cada build.
#ifdef WOKWI_SIMULATION
  #define WIFI_SSID     "Wokwi-GUEST"
  #define WIFI_PASSWORD ""
#else
  #define WIFI_SSID     "SUA_REDE_WIFI"
  #define WIFI_PASSWORD "SUA_SENHA_WIFI"
#endif

// ---------------------- Firebase --------------------------------------------
#define FIREBASE_API_KEY       "VITE_FIREBASE_API_KEY"
#define FIREBASE_DATABASE_URL  "https://seu-projeto-default-rtdb.firebaseio.com"
#define FIREBASE_USER_EMAIL    "esp32@climacontrol.local"
#define FIREBASE_USER_PASSWORD "trocar-essa-senha"

// ---------------------- Pinagem ESP32 ---------------------------------------
// DHT (3 unidades): 1 externo + 2 internos (perto/longe do A/C).
// O tipo é DHT11 no hardware real e DHT22 no Wokwi (única peça disponível);
// a troca é automática em sensors.cpp via #ifdef WOKWI_SIMULATION.
#define PIN_DHT_EXT     4
#define PIN_DHT_INT_1   16  // perto do A/C
#define PIN_DHT_INT_2   17  // longe do A/C

// HC-SR04 (ultrassônico). Par direcional para contagem entrada/saída:
//   pessoa entrando: dispara A antes de B
//   pessoa saindo:   dispara B antes de A
// TRIG é saída digital; ECHO é entrada (use divisor 5V→3.3V).
#define PIN_TRIG_A      18  // sensor externo (porta de fora)
#define PIN_ECHO_A      19
#define PIN_TRIG_B      21  // sensor interno (porta de dentro)
#define PIN_ECHO_B      22

// LED IR de comando para o A/C (driver com transistor recomendado).
#define PIN_IR_LED      25

// LED de status (built-in da maioria das placas ESP32 dev kit).
#define PIN_STATUS_LED  2

// ---------------------- Tempos ----------------------------------------------
// Espelham as constantes do dashboard (src/constants/index.js):
#define UPDATE_INTERVAL_MS   5000UL    // leitura/escrita ao /sensores
#define HISTORY_APPEND_MS    60000UL   // push em /historico

// Janela máxima entre A e B para validar um cruzamento (ms).
#define BEAM_PAIR_WINDOW_MS  2000UL

// Distância (cm) abaixo da qual consideramos o feixe ultrassônico cortado.
#define BEAM_DISTANCE_CM     30

// Período mínimo entre disparos do mesmo HC-SR04 (ms). O sensor precisa
// de ~50ms para que o eco anterior dissipe; abaixo disso aparecem ecos
// fantasmas e contagens duplicadas.
#define BEAM_SAMPLE_MS       60UL

// Após validar um cruzamento, ignora novos eventos até que ambos os
// feixes estejam livres por este tempo. Evita contar a mesma pessoa
// duas vezes enquanto ela ainda está sob os sensores.
#define BEAM_RELEASE_MS      1500UL

// ---------------------- Protocolo IR do A/C ---------------------------------
// IRremoteESP8266 suporta dezenas de marcas. Troque para a sua aqui:
// SAMSUNG_AC, LG, DAIKIN, MITSUBISHI_AC, GREE, MIDEA, FUJITSU_AC, COOLIX, etc.
// Lista completa: https://github.com/crankyoldgit/IRremoteESP8266
#define AC_PROTOCOL_SAMSUNG  1
// #define AC_PROTOCOL_LG       1
// #define AC_PROTOCOL_DAIKIN   1

// =============================================================================
//  ClimaControl — Firmware ESP32
//  Projeto Integrador — UNIFECAF
//
//  Espelha o backend que o dashboard React em src/ espera:
//    /sensores  → leitura corrente (ocupação, temps, umids, ac_ligado…)
//    /controle  → escrita do usuário (override manual via dashboard)
//    /historico → série temporal, push a cada 60s
//    /eventos   → log de ações (ac_ligado_manual, modo_manual_on, …)
//
//  Bibliotecas (Arduino IDE → Library Manager):
//    - Firebase Arduino Client Library for ESP8266 and ESP32  (mobizt)
//    - DHT sensor library  (Adafruit)
//    - Adafruit Unified Sensor
//    - IRremoteESP8266
//
//  Board: "ESP32 Dev Module" (esp32 by Espressif Systems).
// =============================================================================

#include <Arduino.h>
#include <WiFi.h>
#include <time.h>

#include <Firebase_ESP_Client.h>
#include <addons/RTDBHelper.h>
#include <addons/TokenHelper.h>

#include "config.h"
#include "climate.h"
#include "sensors.h"
#include "ir_ac.h"

// -----------------------------------------------------------------------------
//  Estado global do firmware
// -----------------------------------------------------------------------------
FirebaseData    fbdo;
FirebaseData    stream;       // canal dedicado para o /controle stream
FirebaseAuth    fbAuth;
FirebaseConfig  fbConfig;

bool   manualMode    = false;
bool   acOn          = false;
int    targetTempC   = 0;
int    lastSentTemp  = -1;
bool   lastSentOn    = false;

uint32_t lastTickMs       = 0;
uint32_t lastHistoryMs    = 0;
uint32_t lastBeamUpdateMs = 0;

// Marca para epoch em milissegundos (NTP sincronizado em setup).
uint64_t nowEpochMs() {
  time_t s = time(nullptr);
  return (uint64_t)s * 1000ULL;
}

// -----------------------------------------------------------------------------
//  WiFi + NTP
// -----------------------------------------------------------------------------
void connectWifi() {
  Serial.printf("[wifi] conectando a %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    digitalWrite(PIN_STATUS_LED, !digitalRead(PIN_STATUS_LED));
    delay(300);
    Serial.print('.');
  }
  digitalWrite(PIN_STATUS_LED, HIGH);
  Serial.printf("\n[wifi] ok, ip=%s\n", WiFi.localIP().toString().c_str());

  // Horário de Brasília (UTC-3). Sem isso, os timestamps que mandamos em
  // /historico e /eventos ficariam em 1970 e o dashboard não conseguiria
  // ordenar nem renderizar os gráficos.
  configTime(-3 * 3600, 0, "pool.ntp.org", "time.google.com");
  Serial.print("[ntp] sincronizando");
  while (time(nullptr) < 100000) { delay(200); Serial.print('.'); }
  Serial.println(" ok");
}

// -----------------------------------------------------------------------------
//  Stream callback — recebe escritas do dashboard em /controle
// -----------------------------------------------------------------------------
void streamCallback(FirebaseStream data) {
  String path = data.dataPath();   // "/" (atualização do nó inteiro) ou "/campo"
  String type = data.dataType();

  // Tratamento campo a campo: o dashboard usa update() com vários keys.
  auto applyField = [](const String& key, FirebaseStream& d) {
    if (key == "ac_ligado") {
      acOn = d.boolData();
    } else if (key == "modo_manual") {
      manualMode = d.boolData();
    } else if (key == "temp_alvo") {
      if (d.dataType() == "int")        targetTempC = d.intData();
      else if (d.dataType() == "float") targetTempC = (int)d.floatData();
    } else if (key == "reset_ocupacao") {
      sensors::setOccupancy(0);
    }
  };

  if (path == "/") {
    // Atualização do objeto /controle inteiro.
    FirebaseJson* j = data.jsonObjectPtr();
    if (j) {
      FirebaseJsonData v;
      if (j->get(v, "ac_ligado") && v.success)    acOn        = v.boolValue;
      if (j->get(v, "modo_manual") && v.success)  manualMode  = v.boolValue;
      if (j->get(v, "temp_alvo") && v.success)    targetTempC = (int)v.intValue;
    }
  } else {
    String key = path.substring(1);  // remove "/"
    applyField(key, data);
  }

  Serial.printf("[ctrl] manual=%d ac=%d alvo=%d\n", manualMode, acOn, targetTempC);
}

void streamTimeoutCallback(bool timeout) {
  if (timeout) Serial.println("[stream] timeout, reconectando…");
}

// -----------------------------------------------------------------------------
//  Firebase setup
// -----------------------------------------------------------------------------
void connectFirebase() {
  fbConfig.api_key       = FIREBASE_API_KEY;
  fbConfig.database_url  = FIREBASE_DATABASE_URL;
  fbAuth.user.email      = FIREBASE_USER_EMAIL;
  fbAuth.user.password   = FIREBASE_USER_PASSWORD;
  fbConfig.token_status_callback = tokenStatusCallback;

  Firebase.begin(&fbConfig, &fbAuth);
  Firebase.reconnectWiFi(true);
  fbdo.setResponseSize(2048);

  Serial.print("[fb] autenticando");
  while (!Firebase.ready()) { delay(200); Serial.print('.'); }
  Serial.println(" ok");

  if (!Firebase.RTDB.beginStream(&stream, "/controle")) {
    Serial.printf("[stream] erro: %s\n", stream.errorReason().c_str());
  }
  Firebase.RTDB.setStreamCallback(&stream, streamCallback, streamTimeoutCallback);
}

// -----------------------------------------------------------------------------
//  Escritas em /sensores, /historico, /eventos
// -----------------------------------------------------------------------------
void writeSensors(int people, const sensors::Reading& env, int alvo, bool on) {
  FirebaseJson json;
  json.set("ocupacao",     people);
  json.set("temp_interna", env.tempInt);
  json.set("temp_externa", env.tempExt);
  json.set("temp_alvo",    alvo);
  json.set("umid_interna", env.umidInt);
  json.set("umid_externa", env.umidExt);
  json.set("ac_ligado",    on);
  json.set("modo_manual",  manualMode);

  if (!Firebase.RTDB.updateNode(&fbdo, "/sensores", &json)) {
    Serial.printf("[fb] /sensores falhou: %s\n", fbdo.errorReason().c_str());
  }
}

void pushHistory(int people, const sensors::Reading& env, int alvo) {
  FirebaseJson j;
  j.set("t",  (double)nowEpochMs());  // milissegundos epoch
  j.set("o",  people);
  j.set("ti", env.tempInt);
  j.set("te", env.tempExt);
  j.set("ta", alvo);
  j.set("ui", env.umidInt);
  j.set("ue", env.umidExt);
  if (!Firebase.RTDB.pushJSON(&fbdo, "/historico", &j)) {
    Serial.printf("[fb] /historico falhou: %s\n", fbdo.errorReason().c_str());
  }
}

void logEvent(const char* type, FirebaseJson* payload = nullptr) {
  FirebaseJson j;
  j.set("type", type);
  j.set("timestamp", (double)nowEpochMs());
  if (payload) j.set("payload", *payload);
  else         j.set("payload/_", false);  // mantém payload: null no JSON
  Firebase.RTDB.pushJSON(&fbdo, "/eventos", &j);
}

// -----------------------------------------------------------------------------
//  Lógica de decisão
// -----------------------------------------------------------------------------
// Retorna o alvo final levando em conta o modo manual / IA.
//
//   modo_manual = true   → respeita temp_alvo que veio do dashboard
//   modo_manual = false  → calcula com climate::calcTargetTemp()
//
// A IA, quando ativa, escreve em /controle/temp_alvo direto pelo navegador
// (ver src/hooks/useSensorData.js). Como ouvimos esse caminho via stream,
// o ESP32 não precisa rodar o modelo — basta obedecer ao /controle.
int decideTarget(int people, float tempExt) {
  if (manualMode) return targetTempC;
  int t = climate::calcTargetTemp(people, tempExt);
  targetTempC = t;            // sincroniza o cache local
  acOn        = (t > 0);
  return t;
}

// -----------------------------------------------------------------------------
//  Setup / loop
// -----------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_STATUS_LED, LOW);

  sensors::begin();
  ir_ac::begin();

  connectWifi();
  connectFirebase();

  Serial.println("[boot] pronto");
}

void loop() {
  uint32_t now = millis();

  // 1) Sensores de feixe rodam tão rápido quanto possível para não perder
  //    cruzamentos. Tudo o mais é throttled.
  if (now - lastBeamUpdateMs >= 10) {
    sensors::updateBeams(now);
    lastBeamUpdateMs = now;
  }

  // 2) Tick principal: lê DHTs, decide alvo, escreve /sensores, comanda IR.
  if (now - lastTickMs >= UPDATE_INTERVAL_MS) {
    lastTickMs = now;

    auto env    = sensors::readEnv();
    int  people = sensors::occupancy();
    int  alvo   = decideTarget(people, env.tempExt);

    if (Firebase.ready()) {
      writeSensors(people, env, alvo, acOn);

      if (now - lastHistoryMs >= HISTORY_APPEND_MS) {
        lastHistoryMs = now;
        pushHistory(people, env, alvo);
      }
    }

    // 3) IR: só transmite quando o estado realmente muda. Cada send() bloqueia
    //    a stack IR por ~200ms — chamar a cada tick travaria o stream Firebase.
    bool changed = (acOn != lastSentOn) ||
                   (acOn && alvo != lastSentTemp);
    if (changed) {
      ir_ac::send(acOn, alvo);
      lastSentOn   = acOn;
      lastSentTemp = alvo;

      FirebaseJson payload;
      payload.set("temp", alvo);
      payload.set("origem", manualMode ? "manual" : "automatico");
      logEvent(acOn ? "ac_ligado" : "ac_desligado", &payload);
    }

    Serial.printf("[tick] pess=%d  ti=%.1f te=%.1f  alvo=%d  ac=%d  manual=%d\n",
                  people, env.tempInt, env.tempExt, alvo, acOn, manualMode);
  }

  // O Firebase Client cuida do stream em background; só precisamos garantir
  // que loop() não bloqueie mais que ~200ms entre iterações.
}

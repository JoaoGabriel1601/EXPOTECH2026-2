// =============================================================================
//  ClimaControl — Firmware ESP32
//  Projeto Integrador — UNIFECAF
//
//  Integração via ThingSpeak (substitui o Firebase RTDB):
//    - PUBLICA as leituras nos 8 fields do canal (a cada THINGSPEAK_UPDATE_MS).
//      Cada publicação vira um ponto no histórico que o dashboard lê.
//        field1 ocupacao   field2 temp_interna  field3 temp_externa
//        field4 temp_alvo  field5 umid_interna  field6 umid_externa
//        field7 ac_ligado  field8 modo_manual
//    - CONSOME comandos de controle do dashboard pela fila TalkBack
//      (polling em /talkbacks/<id>/commands/execute.json):
//        AC_ON | AC_OFF | MANUAL_ON | MANUAL_OFF | TARGET:<n>
//
//  Bibliotecas (Arduino IDE → Library Manager):
//    - DHT sensor library  (Adafruit)
//    - Adafruit Unified Sensor
//    - IRremoteESP8266
//  (HTTPClient e WiFi já vêm no core ESP32 — sem dependência de Firebase.)
//
//  Board: "ESP32 Dev Module" (esp32 by Espressif Systems).
// =============================================================================

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>

#include "config.h"
#include "climate.h"
#include "sensors.h"
#include "ir_ac.h"

// -----------------------------------------------------------------------------
//  Estado global do firmware
// -----------------------------------------------------------------------------
bool   manualMode    = false;
bool   acOn          = false;
int    targetTempC   = 0;
int    lastSentTemp  = -1;
bool   lastSentOn    = false;

// Última leitura calculada no tick — reaproveitada na publicação ao ThingSpeak.
sensors::Reading lastEnv  = {};
int    lastPeople   = 0;
int    lastAlvo     = 0;

uint32_t lastTickMs       = 0;
uint32_t lastBeamUpdateMs = 0;
uint32_t lastPublishMs    = 0;
uint32_t lastTalkbackMs   = 0;

// -----------------------------------------------------------------------------
//  WiFi
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
}

// -----------------------------------------------------------------------------
//  Publicação no ThingSpeak (/update)
// -----------------------------------------------------------------------------
// O ThingSpeak data a entrada com o horário do servidor (created_at), então
// não precisamos de NTP nem de enviar timestamp.
void publishThingSpeak(int people, const sensors::Reading& env, int alvo, bool on) {
  if (WiFi.status() != WL_CONNECTED) return;

  // temp_alvo só faz sentido com o A/C ligado; com ele desligado mandamos 0
  // para o dashboard exibir "—" e o cálculo de uso do A/C bater.
  int alvoField = on ? alvo : 0;

  String url = String(THINGSPEAK_HOST) + "/update?api_key=" + THINGSPEAK_WRITE_KEY +
               "&field1=" + String(people) +
               "&field2=" + String(env.tempInt, 1) +
               "&field3=" + String(env.tempExt, 1) +
               "&field4=" + String(alvoField) +
               "&field5=" + String(env.umidInt, 1) +
               "&field6=" + String(env.umidExt, 1) +
               "&field7=" + String(on ? 1 : 0) +
               "&field8=" + String(manualMode ? 1 : 0);

  HTTPClient http;
  http.begin(url);
  int code = http.GET();
  if (code == 200) {
    // O corpo é o id da entrada (>0) em sucesso, ou "0" se foi rejeitado
    // (ex.: publicou antes dos 15s do rate limit).
    String body = http.getString();
    Serial.printf("[ts] update ok, entry=%s\n", body.c_str());
  } else {
    Serial.printf("[ts] update falhou: HTTP %d\n", code);
  }
  http.end();
}

// -----------------------------------------------------------------------------
//  Controle via fila TalkBack
// -----------------------------------------------------------------------------
// Aplica um command_string vindo do dashboard.
void applyCommand(const String& cmd) {
  if (cmd.length() == 0) return;
  Serial.printf("[talkback] comando: %s\n", cmd.c_str());

  if (cmd == "AC_ON") {
    manualMode = true;
    acOn       = true;
  } else if (cmd == "AC_OFF") {
    manualMode = true;
    acOn       = false;
  } else if (cmd == "MANUAL_ON") {
    manualMode = true;
  } else if (cmd == "MANUAL_OFF") {
    manualMode = false;
  } else if (cmd.startsWith("TARGET:")) {
    targetTempC = cmd.substring(7).toInt();
    manualMode  = true;
    acOn        = true;
  }
}

// Extrai o valor de "command_string" da resposta JSON do execute.json.
// Resposta típica: {"id":12,"command_string":"AC_ON","created_at":...}
// Quando a fila está vazia o ThingSpeak devolve um corpo sem esse campo.
String parseCommandString(const String& resp) {
  int key = resp.indexOf("command_string");
  if (key < 0) return "";
  int colon = resp.indexOf(':', key);
  if (colon < 0) return "";
  int q1 = resp.indexOf('"', colon);
  if (q1 < 0) return "";
  int q2 = resp.indexOf('"', q1 + 1);
  if (q2 < 0) return "";
  return resp.substring(q1 + 1, q2);
}

void pollTalkback() {
  if (WiFi.status() != WL_CONNECTED) return;

  String url = String(THINGSPEAK_HOST) + "/talkbacks/" + THINGSPEAK_TALKBACK_ID +
               "/commands/execute.json";

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  String reqBody = String("api_key=") + THINGSPEAK_TALKBACK_KEY;
  int code = http.POST(reqBody);
  if (code == 200) {
    String resp = http.getString();
    applyCommand(parseCommandString(resp));
  } else {
    Serial.printf("[talkback] poll HTTP %d\n", code);
  }
  http.end();
}

// -----------------------------------------------------------------------------
//  Lógica de decisão
// -----------------------------------------------------------------------------
//   modo_manual = true   → respeita targetTempC vindo do TalkBack
//   modo_manual = false  → calcula com climate::calcTargetTemp()
int decideTarget(int people, float tempExt) {
  if (manualMode) return targetTempC;
  int t = climate::calcTargetTemp(people, tempExt);
  targetTempC = t;        // sincroniza o cache local
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

  // 2) Polling do TalkBack: aplica comandos do dashboard antes de decidir.
  if (now - lastTalkbackMs >= TALKBACK_POLL_MS) {
    lastTalkbackMs = now;
    pollTalkback();
  }

  // 3) Tick principal: lê DHTs, decide alvo, comanda IR e guarda a leitura.
  if (now - lastTickMs >= UPDATE_INTERVAL_MS) {
    lastTickMs = now;

    lastEnv    = sensors::readEnv();
    lastPeople = sensors::occupancy();
    lastAlvo   = decideTarget(lastPeople, lastEnv.tempExt);

    // IR: só transmite quando o estado realmente muda. Cada send() bloqueia
    // a stack IR por ~200ms.
    bool changed = (acOn != lastSentOn) ||
                   (acOn && lastAlvo != lastSentTemp);
    if (changed) {
      ir_ac::send(acOn, lastAlvo);
      lastSentOn   = acOn;
      lastSentTemp = lastAlvo;
    }

    Serial.printf("[tick] pess=%d  ti=%.1f te=%.1f  alvo=%d  ac=%d  manual=%d\n",
                  lastPeople, lastEnv.tempInt, lastEnv.tempExt, lastAlvo, acOn, manualMode);
  }

  // 4) Publicação ao ThingSpeak (respeita o rate limit de 15s do free tier).
  if (now - lastPublishMs >= THINGSPEAK_UPDATE_MS) {
    lastPublishMs = now;
    publishThingSpeak(lastPeople, lastEnv, lastAlvo, acOn);
  }
}

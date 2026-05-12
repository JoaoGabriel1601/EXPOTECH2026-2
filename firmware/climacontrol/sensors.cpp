#include "sensors.h"
#include "config.h"

#include <DHT.h>

namespace sensors {

namespace {

DHT dhtExt(PIN_DHT_EXT,   DHT11);
DHT dhtIn1(PIN_DHT_INT_1, DHT11);
DHT dhtIn2(PIN_DHT_INT_2, DHT11);

// Cache do último valor válido, para mascarar leituras NaN do DHT11.
float cacheTempExt = NAN, cacheUmidExt = NAN;
float cacheTempIn1 = NAN, cacheUmidIn1 = NAN;
float cacheTempIn2 = NAN, cacheUmidIn2 = NAN;

// ---- Contagem direcional com par TCRT5000 ----------------------------------
// Estado: nenhuma viga ativa, ou aguardando o segundo sensor após o primeiro.
enum BeamState { IDLE, WAIT_B_AFTER_A, WAIT_A_AFTER_B };
BeamState beamState = IDLE;
uint32_t  beamStartMs = 0;
uint32_t  lastChangeAMs = 0;
uint32_t  lastChangeBMs = 0;
int       lastReadA = HIGH;
int       lastReadB = HIGH;
int       occ = 0;

// Lê o D0 do TCRT5000. Em geral é ativo-baixo: LOW quando o feixe é cortado.
// Se o seu módulo for invertido, troque o LOW por HIGH abaixo.
bool beamTriggered(int pin, int& lastRead, uint32_t& lastChangeMs, uint32_t nowMs) {
  int cur = digitalRead(pin);
  if (cur != lastRead && (nowMs - lastChangeMs) >= BEAM_DEBOUNCE_MS) {
    lastChangeMs = nowMs;
    lastRead = cur;
    return cur == LOW;  // borda de descida = feixe cortado
  }
  return false;
}

float fallback(float fresh, float cached) {
  return isnan(fresh) ? cached : fresh;
}

}  // namespace

void begin() {
  dhtExt.begin();
  dhtIn1.begin();
  dhtIn2.begin();

  pinMode(PIN_TCRT_A, INPUT);
  pinMode(PIN_TCRT_B, INPUT);
}

Reading readEnv() {
  float te = dhtExt.readTemperature();
  float ue = dhtExt.readHumidity();
  float t1 = dhtIn1.readTemperature();
  float u1 = dhtIn1.readHumidity();
  float t2 = dhtIn2.readTemperature();
  float u2 = dhtIn2.readHumidity();

  cacheTempExt = fallback(te, cacheTempExt);
  cacheUmidExt = fallback(ue, cacheUmidExt);
  cacheTempIn1 = fallback(t1, cacheTempIn1);
  cacheUmidIn1 = fallback(u1, cacheUmidIn1);
  cacheTempIn2 = fallback(t2, cacheTempIn2);
  cacheUmidIn2 = fallback(u2, cacheUmidIn2);

  Reading r;
  r.tempExt        = cacheTempExt;
  r.umidExt        = cacheUmidExt;
  r.tempIntNearAc  = cacheTempIn1;
  r.tempIntFarAc   = cacheTempIn2;
  r.tempInt        = (cacheTempIn1 + cacheTempIn2) / 2.0f;
  r.umidInt        = (cacheUmidIn1 + cacheUmidIn2) / 2.0f;
  r.validExt       = !isnan(cacheTempExt);
  r.validInt       = !isnan(cacheTempIn1) || !isnan(cacheTempIn2);
  return r;
}

void updateBeams(uint32_t nowMs) {
  bool aFired = beamTriggered(PIN_TCRT_A, lastReadA, lastChangeAMs, nowMs);
  bool bFired = beamTriggered(PIN_TCRT_B, lastReadB, lastChangeBMs, nowMs);

  // Timeout: a primeira viga disparou mas a segunda não veio a tempo →
  // descartamos o cruzamento (provavelmente alguém deu meia-volta).
  if (beamState != IDLE && (nowMs - beamStartMs) > BEAM_PAIR_WINDOW_MS) {
    beamState = IDLE;
  }

  switch (beamState) {
    case IDLE:
      if (aFired) {
        beamState = WAIT_B_AFTER_A;
        beamStartMs = nowMs;
      } else if (bFired) {
        beamState = WAIT_A_AFTER_B;
        beamStartMs = nowMs;
      }
      break;

    case WAIT_B_AFTER_A:
      if (bFired) {
        occ = min(occ + 1, 999);  // entrou: A → B
        beamState = IDLE;
      }
      break;

    case WAIT_A_AFTER_B:
      if (aFired) {
        occ = max(occ - 1, 0);    // saiu: B → A
        beamState = IDLE;
      }
      break;
  }
}

int  occupancy()           { return occ; }
void setOccupancy(int v)   { occ = constrain(v, 0, 999); }

}  // namespace sensors

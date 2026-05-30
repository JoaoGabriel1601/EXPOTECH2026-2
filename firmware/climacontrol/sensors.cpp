#include "sensors.h"
#include "config.h"

#include <DHT.h>

namespace sensors {

namespace {

// Wokwi não tem peça DHT11 — só DHT22. Compilamos no tipo certo conforme
// o alvo: hardware real usa DHT11 (o que está soldado na bancada), e o
// simulador usa DHT22 (única opção disponível na biblioteca de partes).
#ifdef WOKWI_SIMULATION
  #define DHT_MODEL DHT22
#else
  #define DHT_MODEL DHT11
#endif

DHT dhtExt(PIN_DHT_EXT,   DHT_MODEL);
DHT dhtIn1(PIN_DHT_INT_1, DHT_MODEL);
DHT dhtIn2(PIN_DHT_INT_2, DHT_MODEL);

// Cache do último valor válido, para mascarar leituras NaN do DHT11.
float cacheTempExt = NAN, cacheUmidExt = NAN;
float cacheTempIn1 = NAN, cacheUmidIn1 = NAN;
float cacheTempIn2 = NAN, cacheUmidIn2 = NAN;

// ---- Contagem direcional com par HC-SR04 -----------------------------------
// Cada sensor mede a distância via pulso ultrassônico. Consideramos o
// "feixe" cortado quando algo passa a menos de BEAM_DISTANCE_CM. A máquina
// de estados é equivalente ao .ino de referência (people_counter_hc_sr04):
//   IDLE → SAW_A se A dispara isolado    → ao ver B: ENTRADA (occ++)
//   IDLE → SAW_B se B dispara isolado    → ao ver A: SAÍDA  (occ--)
//   TIMEOUT em SAW_*: descarta o cruzamento (alguém deu meia-volta).
// Após validar um cruzamento, RELEASE bloqueia novas contagens até que
// ambos os sensores voltem a ler livre por BEAM_RELEASE_MS.
enum BeamState { IDLE, SAW_A, SAW_B, RELEASE };
BeamState beamState = IDLE;
uint32_t  beamStartMs   = 0;
uint32_t  releaseStartMs = 0;
uint32_t  lastSampleAMs = 0;
uint32_t  lastSampleBMs = 0;
long      lastDistA = 999;
long      lastDistB = 999;
int       occ      = 0;
int       totalIn  = 0;
int       totalOut = 0;

// Dispara o HC-SR04 e retorna a distância em cm. 999 significa fora de
// alcance ou eco perdido — tratado como "feixe livre".
long medirDistancia(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duracao = pulseIn(echoPin, HIGH, 30000UL);
  if (duracao == 0) return 999;
  return duracao * 0.0343f / 2.0f;
}

// Amostra um sensor respeitando BEAM_SAMPLE_MS (50–60ms entre pulsos)
// para não receber ecos fantasmas do disparo anterior.
long sampleBeam(int trigPin, int echoPin, uint32_t& lastSampleMs,
                long& cached, uint32_t nowMs) {
  if (nowMs - lastSampleMs < BEAM_SAMPLE_MS) return cached;
  lastSampleMs = nowMs;
  cached = medirDistancia(trigPin, echoPin);
  return cached;
}

float fallback(float fresh, float cached) {
  return isnan(fresh) ? cached : fresh;
}

}  // namespace

void begin() {
  dhtExt.begin();
  dhtIn1.begin();
  dhtIn2.begin();

  pinMode(PIN_TRIG_A, OUTPUT);
  pinMode(PIN_ECHO_A, INPUT);
  pinMode(PIN_TRIG_B, OUTPUT);
  pinMode(PIN_ECHO_B, INPUT);
  digitalWrite(PIN_TRIG_A, LOW);
  digitalWrite(PIN_TRIG_B, LOW);
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
  long d1 = sampleBeam(PIN_TRIG_A, PIN_ECHO_A, lastSampleAMs, lastDistA, nowMs);
  long d2 = sampleBeam(PIN_TRIG_B, PIN_ECHO_B, lastSampleBMs, lastDistB, nowMs);

  bool a = (d1 < BEAM_DISTANCE_CM);
  bool b = (d2 < BEAM_DISTANCE_CM);

  // Timeout: a primeira viga disparou mas a segunda não veio a tempo →
  // descartamos o cruzamento (provavelmente alguém deu meia-volta).
  if ((beamState == SAW_A || beamState == SAW_B) &&
      (nowMs - beamStartMs) > BEAM_PAIR_WINDOW_MS) {
    beamState = IDLE;
  }

  switch (beamState) {
    case IDLE:
      if (a && !b) {
        beamState   = SAW_A;
        beamStartMs = nowMs;
      } else if (b && !a) {
        beamState   = SAW_B;
        beamStartMs = nowMs;
      }
      break;

    case SAW_A:
      if (b) {                          // entrou: A → B
        occ = min(occ + 1, 999);
        totalIn++;
        beamState      = RELEASE;
        releaseStartMs = nowMs;
      }
      break;

    case SAW_B:
      if (a) {                          // saiu: B → A
        occ = max(occ - 1, 0);
        totalOut++;
        beamState      = RELEASE;
        releaseStartMs = nowMs;
      }
      break;

    case RELEASE:
      // Espera ambos os feixes liberarem por BEAM_RELEASE_MS antes de
      // voltar a contar. Garante que a mesma pessoa não vire duas
      // contagens enquanto ainda está sob os sensores.
      if (a || b) {
        releaseStartMs = nowMs;
      } else if (nowMs - releaseStartMs >= BEAM_RELEASE_MS) {
        beamState = IDLE;
      }
      break;
  }
}

int  occupancy()           { return occ; }
void setOccupancy(int v)   { occ = constrain(v, 0, 999); }
int  totalEntries()        { return totalIn; }
int  totalExits()          { return totalOut; }

}  // namespace sensors

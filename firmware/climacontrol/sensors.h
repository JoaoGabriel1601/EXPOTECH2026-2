#pragma once

#include <Arduino.h>

namespace sensors {

struct Reading {
  float tempExt;    // DHT11 externo
  float umidExt;
  float tempInt;    // média dos dois DHT11 internos
  float umidInt;
  float tempIntNearAc;
  float tempIntFarAc;
  bool  validExt;
  bool  validInt;
};

void begin();

// Lê os três DHT11. Mantém o último valor válido se a leitura falhar
// (DHT11 retorna NaN com frequência razoável e isso polui o dashboard).
Reading readEnv();

// Atualiza a máquina de estados do par TCRT5000 a partir das leituras
// digitais atuais. Chame em todo loop().
void updateBeams(uint32_t nowMs);

// Contagem corrente de pessoas dentro da sala. Saturada em [0, 999].
int occupancy();

// Permite sobrescrever a ocupação (ex.: reset manual via Firebase).
void setOccupancy(int value);

}  // namespace sensors

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

// Atualiza a máquina de estados do par HC-SR04 a partir de novas amostras
// de distância. Chame em todo loop(); o módulo decide internamente quando
// disparar o ultrassom (respeitando BEAM_SAMPLE_MS) para evitar ecos
// fantasmas.
void updateBeams(uint32_t nowMs);

// Contagem corrente de pessoas dentro da sala. Saturada em [0, 999].
int occupancy();

// Permite sobrescrever a ocupação (ex.: reset manual via Firebase).
void setOccupancy(int value);

// Acumuladores de cruzamentos desde o boot. Úteis para diagnóstico
// e logging em /eventos.
int totalEntries();
int totalExits();

}  // namespace sensors

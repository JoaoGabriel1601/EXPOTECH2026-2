#pragma once

// Porta C++ de src/constants/index.js → calcTargetTemp.
// Mantém paridade 1:1 com a regra usada no dashboard, para que o ESP32
// e o React cheguem ao mesmo temp_alvo dadas as mesmas entradas.

namespace climate {

constexpr int MIN_TARGET_TEMP    = 16;
constexpr int EXT_TEMP_HOT       = 30;
constexpr int EXT_TEMP_VERY_HOT  = 35;

struct Rule {
  int minPeople;
  int maxPeople;  // -1 = sem limite superior
  int baseTemp;   // 0 = A/C desligado
};

constexpr Rule RULES[] = {
  {  0,  0,  0 },
  {  1,  5, 24 },
  {  6, 15, 22 },
  { 16, 30, 20 },
  { 31, -1, 18 },
};

inline int calcTargetTemp(int people, float externalTemp) {
  if (people <= 0) return 0;

  int target = 18;
  for (const auto& r : RULES) {
    bool inRange = people >= r.minPeople &&
                   (r.maxPeople < 0 || people <= r.maxPeople);
    if (inRange) {
      target = r.baseTemp;
      break;
    }
  }

  if (externalTemp > EXT_TEMP_VERY_HOT) {
    target = (target - 2 < MIN_TARGET_TEMP) ? MIN_TARGET_TEMP : target - 2;
  } else if (externalTemp > EXT_TEMP_HOT) {
    target = (target - 1 < MIN_TARGET_TEMP) ? MIN_TARGET_TEMP : target - 1;
  }
  return target;
}

}  // namespace climate

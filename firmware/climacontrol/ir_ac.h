#pragma once

#include <Arduino.h>

namespace ir_ac {

void begin();

// Envia o estado completo do A/C via LED IR. O firmware só chama send()
// quando algo realmente mudou (on/off ou nova temp_alvo), porque cada
// transmissão consome ~200ms e bloqueia o loop.
void send(bool on, int targetTempC);

}  // namespace ir_ac

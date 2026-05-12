#include "ir_ac.h"
#include "config.h"

#include <IRremoteESP8266.h>
#include <IRsend.h>
#include <ir_Samsung.h>
#include <ir_LG.h>
#include <ir_Daikin.h>

// A camada IRac da IRremoteESP8266 abstrai os protocolos. Usamos os builders
// específicos quando disponíveis, porque dão controle direto sobre temperatura,
// modo e fan speed sem precisar montar bytes manualmente.

namespace ir_ac {

namespace {

#if defined(AC_PROTOCOL_SAMSUNG)
  IRSamsungAc ac(PIN_IR_LED);
#elif defined(AC_PROTOCOL_LG)
  IRLgAc ac(PIN_IR_LED);
#elif defined(AC_PROTOCOL_DAIKIN)
  IRDaikinESP ac(PIN_IR_LED);
#else
  #error "Defina um AC_PROTOCOL_* em config.h"
#endif

constexpr int TEMP_MIN = 16;
constexpr int TEMP_MAX = 30;

int clampTemp(int t) {
  if (t < TEMP_MIN) return TEMP_MIN;
  if (t > TEMP_MAX) return TEMP_MAX;
  return t;
}

}  // namespace

void begin() {
  ac.begin();
  ac.off();
}

void send(bool on, int targetTempC) {
  if (!on) {
    ac.off();
    ac.send();
    return;
  }

  ac.on();
  ac.setTemp(clampTemp(targetTempC));

#if defined(AC_PROTOCOL_SAMSUNG)
  ac.setMode(kSamsungAcCool);
  ac.setFan(kSamsungAcFanAuto);
  ac.setSwing(false);
#elif defined(AC_PROTOCOL_LG)
  ac.setMode(kLgAcCool);
  ac.setFan(kLgAcFanAuto);
#elif defined(AC_PROTOCOL_DAIKIN)
  ac.setMode(kDaikinCool);
  ac.setFan(kDaikinFanAuto);
  ac.setSwingVertical(false);
  ac.setSwingHorizontal(false);
#endif

  ac.send();
}

}  // namespace ir_ac

import { randomInt } from "node:crypto";
import { checkPin } from "./pin-strength";

export {
  PIN_MIN_LENGTH,
  PIN_MAX_LENGTH,
  normalizePin,
  checkPin,
  pinWarning,
} from "./pin-strength";
export type { PinStrength, PinCheck } from "./pin-strength";

/** PIN acak 6 angka yang tergolong kuat — dipakai admin saat reset PIN (server saja). */
export function randomPin(): string {
  for (;;) {
    let pin = "";
    for (let i = 0; i < 6; i++) pin += String(randomInt(0, 10));
    if (checkPin(pin).strength === "kuat") return pin;
  }
}

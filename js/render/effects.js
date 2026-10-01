// Patlama görsel efektleri (saf hesaplar; DOM'suz, Node'da test edilir). Renderer kullanır.
// - Parlama: her yeni patlama için yarıçapla orantılı, FLASH_FRAMES karede sönen ışık lekesi.
// - Sarsıntı: G ≥ SHAKE_MIN patlamada genlik SHAKE_K·√G (en fazla SHAKE_MAX px), SHAKE_FRAMES karede söner.
export const EFFECTS = Object.freeze({ FLASH_FRAMES: 6, SHAKE_MIN: 64, SHAKE_FRAMES: 12, SHAKE_MAX: 6, SHAKE_K: 0.4 });

// view.blasts halka tamponunda lastSerial'dan sonraki patlamalar için fn(x, y, power); en son sırayı döner.
export function forEachNewBlast(blasts, lastSerial, fn) {
  const latest = blasts.latest;
  const ring = blasts.serial.length;
  for (let s = Math.max(lastSerial, latest - ring) + 1; s <= latest; s++) {
    const h = (s - 1) % ring;
    if (blasts.serial[h] === s) fn(blasts.x[h], blasts.y[h], blasts.power[h]);
  }
  return latest;
}

export const shakeAmplitude = (G) => (G < EFFECTS.SHAKE_MIN ? 0 : Math.min(EFFECTS.SHAKE_MAX, EFFECTS.SHAKE_K * Math.sqrt(G)));

export function flashAlpha(age, reducedMotion) {
  if (age < 0 || age >= EFFECTS.FLASH_FRAMES) return 0;
  const a = 1 - age / EFFECTS.FLASH_FRAMES;
  return reducedMotion ? a * 0.5 : a;
}

// Karenin sarsıntı ofseti: kareye bağlı deterministik gürültü, genlik kalan kare sayısıyla doğrusal söner.
export function shakeOffset(frame, amp, left, out) {
  if (!(amp > 0) || !(left > 0)) {
    out.x = 0;
    out.y = 0;
    return out;
  }
  const f = (amp * Math.min(left, EFFECTS.SHAKE_FRAMES)) / EFFECTS.SHAKE_FRAMES;
  let h = Math.imul(frame + 1, 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  out.x = ((h & 255) / 127.5 - 1) * f;
  out.y = (((h >>> 8) & 255) / 127.5 - 1) * f;
  return out;
}

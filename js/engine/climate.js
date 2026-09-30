// Ortam sıcaklığı sabitleri ve gün/gece döngüsü.
// Saf fonksiyonlar; yalnızca aritmetik (Math.sin/exp/pow yok: tarayıcılar arası determinizm).
export const DEFAULT_AMBIENT = 20;
export const AMBIENT_MIN = -40;
export const AMBIENT_MAX = 60;
// Alanın geçerli aralığı (debug değişmezi): mutlak sıfır ile makul üst sınır.
export const TEMP_MIN = -273;
export const TEMP_MAX = 5000;

export function clampAmbient(c) {
  if (!Number.isFinite(c)) return DEFAULT_AMBIENT;
  return c < AMBIENT_MIN ? AMBIENT_MIN : c > AMBIENT_MAX ? AMBIENT_MAX : c;
}

// Gün/gece döngüsü: 1× hızda bir gün ≈ 4 dakika. Tick'ten türetilir (undo ve seed ile tutarlı).
export const DAY_TICKS = 14400;
export const DAY_AMPLITUDE = 10; // °C (gece −, öğle +)
export const DAY_START = 0.25; // tick 0 = sabah

export function dayPhase(tick) {
  const p = DAY_START + tick / DAY_TICKS;
  return p - Math.floor(p);
}

// p = 0 gece yarısı (−1), 0.5 öğle (+1). Üçgen dalga, kübik yumuşatma (tepelerde türev 0).
export function dayWave(p) {
  const tri = p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
  return tri * (1.5 - 0.5 * tri * tri);
}

export function ambientAt(base, tick, cycle) {
  return cycle ? base + DAY_AMPLITUDE * dayWave(dayPhase(tick)) : base;
}

// Gökyüzü aydınlığı: 0 gece yarısı, 1 öğle.
export function daylight(p) {
  return (dayWave(p) + 1) / 2;
}

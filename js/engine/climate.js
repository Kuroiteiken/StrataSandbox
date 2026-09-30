// Ortam sıcaklığı sabitleri (gün/gece döngüsü sonraki adımda eklenir).
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

// Uyarlanır görsel kalite: kare iş süresi (fizik + render) sürekli yüksekse dekoratif
// efektler bir kademe azaltılır; uzun süre düşük kalırsa geri yükseltilir. Fizik doğruluğu
// hiçbir seviyede değişmez. Histerezis: düşürme 2 sn, yükseltme 5 sn kesintisiz koşul ister.

export const LEVELS = Object.freeze(['high', 'medium', 'low']);

const DOWN_MS = 12; // kare başına iş bu değeri sürekli aşarsa kalite düşer
const UP_MS = 6; // bu değerin altında kalırsa kalite yükselir
const HOLD_DOWN_MS = 2000;
const HOLD_UP_MS = 5000;
const EMA = 0.1; // üstel hareketli ortalama katsayısı (tek karelik sıçramaları bastırır)

export function createQualityGovernor(initialMode = 'auto') {
  let mode = initialMode;
  let level = mode === 'auto' ? LEVELS[0] : mode;
  let ema = 0;
  let condition = null; // 'down' | 'up' | null
  let since = 0;

  const reset = () => {
    ema = 0;
    condition = null;
  };

  return {
    get mode() {
      return mode;
    },
    get level() {
      return level;
    },
    setMode(next) {
      mode = next;
      level = mode === 'auto' ? LEVELS[0] : mode;
      reset();
    },
    update(now, workMs) {
      if (mode !== 'auto') return level;
      ema = ema === 0 ? workMs : ema + (workMs - ema) * EMA;
      const idx = LEVELS.indexOf(level);
      let wanted = null;
      if (ema > DOWN_MS && idx < LEVELS.length - 1) wanted = 'down';
      else if (ema < UP_MS && idx > 0) wanted = 'up';
      if (wanted !== condition) {
        condition = wanted;
        since = now;
      } else if (wanted === 'down' && now - since >= HOLD_DOWN_MS) {
        level = LEVELS[idx + 1];
        condition = null;
      } else if (wanted === 'up' && now - since >= HOLD_UP_MS) {
        level = LEVELS[idx - 1];
        condition = null;
      }
      return level;
    },
  };
}

// Hücre durumunu piksel tamponuna çevirir (saf fonksiyon; DOM'suz, allocation yok).
// Renderer bunu ImageData'nın Uint32 view'ına uygular. Simülasyon durumu yalnızca okunur.
import { MATERIALS } from '../engine/materials.js';
import { SHADES, RAMP_SIZE, HEAT_RAMP_SIZE, DYN, DYNAMIC, withAlpha } from './palette.js';
import { RATES } from '../engine/reactions.js';

const { LIFE_MIN, LIFE_SPAN } = MATERIALS;
const SHADE_MASK = SHADES - 1;
const RAMP_MAX = RAMP_SIZE - 1;
const HEAT_MAX = HEAT_RAMP_SIZE - 1;

// Materyal başına en yüksek spawn ömrü (rampa normalizasyonu için).
const MAX_LIFE = new Float32Array(256);
for (let t = 0; t < 256; t++) MAX_LIFE[t] = Math.max(1, LIFE_MIN[t] + LIFE_SPAN[t]);

// Hücre ve kareye bağlı [0, 1) titreme gürültüsü (kozmetik; fizik RNG'sine dokunmaz).
function flicker(i, frame) {
  let h = Math.imul(i ^ Math.imul(frame >> 1, 0x9e3779b1), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 24) / 256;
}

const clampRamp = (v) => (v < 0 ? 0 : v > RAMP_MAX ? RAMP_MAX : v | 0);

// Aynı endianness'ta paketli iki rengin bayt bayt karışımı (f ∈ [0, 1]); alfa baytları 255 ise 255 kalır.
function mixPacked(a, b, f) {
  const g = 1 - f;
  return (
    (((a & 255) * g + (b & 255) * f) | 0) |
    (((((a >>> 8) & 255) * g + ((b >>> 8) & 255) * f) | 0) << 8) |
    (((((a >>> 16) & 255) * g + ((b >>> 16) & 255) * f) | 0) << 16) |
    (((((a >>> 24) & 255) * g + ((b >>> 24) & 255) * f) | 0) << 24)
  ) >>> 0;
}

// glow (isteğe bağlı): ışık yayan hücrelerin (ateş, lav, yanma) rengi, alfa = yoğunluk;
// diğer hücreler 0. Renderer bunu bulanıklaştırıp 'lighter' ile ekler.
export function fillPixels(view, out, pal, ramps, frame, reducedMotion, glow = null) {
  const { type, variant, life, flags, width, height, stride } = view;
  const { fire, lava, burn, heat, spent, littleEndian } = ramps;
  const glassHeat = RATES.glassHeat;
  let o = 0;
  for (let y = 0; y < height; y++) {
    let i = (y + 1) * stride + 1;
    for (let x = 0; x < width; x++, i++, o++) {
      const t = type[i];
      if (t === 0) {
        out[o] = 0;
        if (glow) glow[o] = 0;
        continue;
      }
      let g = 0;
      switch (DYNAMIC[t]) {
        case DYN.FIRE: {
          const f = reducedMotion ? 0.5 : flicker(i, frame);
          const heatLevel = life[i] / MAX_LIFE[t];
          out[o] = fire[clampRamp(heatLevel * 46 + f * 17)];
          if (glow) g = withAlpha(out[o], (40 + heatLevel * 200) | 0, littleEndian);
          break;
        }
        case DYN.LAVA: {
          // Yavaş nabız: hücreye özgü faz + zamanla kayan dalga (üçgen dalga).
          const phase = reducedMotion ? variant[i] & 63 : ((variant[i] & 63) + (frame >> 2) + ((x + y * 3) >> 1)) & 63;
          const tri = phase < 32 ? phase : 63 - phase; // 0..31
          out[o] = lava[clampRamp(14 + tri * 1.5)];
          if (glow) g = withAlpha(out[o], 110 + tri * 2, littleEndian);
          break;
        }
        case DYN.BURN: {
          const f = reducedMotion ? 0.5 : flicker(i, frame);
          const burnLevel = life[i] / MAX_LIFE[t];
          out[o] = burn[t][clampRamp(burnLevel * 52 + f * 11)];
          if (glow) g = withAlpha(out[o], (30 + burnLevel * 150) | 0, littleEndian);
          break;
        }
        case DYN.CLONER: {
          // variant öğrenilen materyali tutar; ton hücre indeksinden. Öğrenmiş: %50, bütçesi bitmiş: %20 karışım.
          let c = pal[t * SHADES + (i & SHADE_MASK)];
          if ((flags[i] & 2) !== 0) c = mixPacked(c, pal[variant[i] * SHADES + (i & SHADE_MASK)], life[i] > 0 ? 0.5 : 0.2);
          out[o] = c;
          break;
        }
        case DYN.SINK: {
          const c = pal[t * SHADES + (i & SHADE_MASK)];
          out[o] = life[i] > 0 ? c : mixPacked(c, spent, 0.5);
          break;
        }
        case DYN.SAND: {
          const l = life[i];
          out[o] = l === 0 ? pal[t * SHADES + (variant[i] & SHADE_MASK)] : heat[Math.min(HEAT_MAX, ((l * HEAT_MAX) / glassHeat) | 0)];
          break;
        }
        default:
          out[o] = pal[t * SHADES + (variant[i] & SHADE_MASK)];
      }
      if (glow) glow[o] = g;
    }
  }
}

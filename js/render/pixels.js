// Hücre durumunu piksel tamponuna çevirir (saf fonksiyon; DOM'suz, allocation yok).
// Renderer bunu ImageData'nın Uint32 view'ına uygular. Simülasyon durumu yalnızca okunur.
import { MATERIALS, MAT } from '../engine/materials.js';
import { SHADES, RAMP_SIZE, DYN, DYNAMIC, withAlpha, THERMAL_LUT } from './palette.js';

const { LIFE_MIN, LIFE_SPAN } = MATERIALS;
const SHADE_MASK = SHADES - 1;
const RAMP_MAX = RAMP_SIZE - 1;
const WATER = MAT.WATER;

// Akkorluk: 450 °C'de başlar, 800 °C'de tam karışım; rampa 450..1500 °C.
const INC_START = 450;
const INC_FULL = 800;
const INC_MAX = 1500;
const COLD_START = 4; // bu sıcaklığın altındaki su açık maviye kayar
// Lav rengi: 750 °C (katılaşma) koyu, 1150 °C (doğuş) parlak.
const LAVA_COLD = 750;
const LAVA_HOT = 1150;

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

// Akkorluk (T ≥ INC_START): karışım oranı ve rampa rengi. Izgara ve parçacık çizimi aynı ifadeleri paylaşır.
const incFactor = (T) => (T >= INC_FULL ? 1 : (T - INC_START) / (INC_FULL - INC_START));
const incColor = (T, incandescent) =>
  incandescent[clampRamp((((T > INC_MAX ? INC_MAX : T) - INC_START) * RAMP_MAX) / (INC_MAX - INC_START))];

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

// glow (isteğe bağlı): ışık yayan hücrelerin rengi, alfa = yoğunluk; diğerleri 0.
// Renderer bunu bulanıklaştırıp 'lighter' ile ekler.
// Dönüş: akkor (≥ INC_START) hücre sayısı; renderer glow zincirini bununla da açar.
export function fillPixels(view, out, pal, ramps, frame, reducedMotion, glow = null) {
  const { type, variant, life, flags, width, height, stride } = view;
  const temp = view.temp;
  const { fire, lava, burn, incandescent, coldTint, spent, littleEndian } = ramps;
  let hotCells = 0;
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
          const T = temp[i];
          const heat = T >= LAVA_HOT ? 1 : T <= LAVA_COLD ? 0 : (T - LAVA_COLD) / (LAVA_HOT - LAVA_COLD);
          // Yavaş nabız: hücreye özgü faz + zamanla kayan dalga (üçgen dalga).
          const phase = reducedMotion ? variant[i] & 63 : ((variant[i] & 63) + (frame >> 2) + ((x + y * 3) >> 1)) & 63;
          const tri = phase < 32 ? phase : 63 - phase; // 0..31
          out[o] = lava[clampRamp(4 + heat * 30 + tri * 0.9)];
          if (glow) g = withAlpha(out[o], (50 + heat * 90 + tri * 2) | 0, littleEndian);
          break;
        }
        case DYN.BURN: {
          const f = reducedMotion ? 0.5 : flicker(i, frame);
          const burnLevel = life[i] / MAX_LIFE[t];
          out[o] = burn[t][clampRamp(burnLevel * 52 + f * 11)];
          if (glow) g = withAlpha(out[o], (30 + burnLevel * 150) | 0, littleEndian);
          break;
        }
        case DYN.SMOKE: {
          // Duman yarı saydam; ömrü azaldıkça soluklaşır (alfa 70..190).
          const f = life[i] / MAX_LIFE[t];
          out[o] = withAlpha(pal[t * SHADES + (variant[i] & SHADE_MASK)], (70 + 120 * (f > 1 ? 1 : f)) | 0, littleEndian);
          break;
        }
        case DYN.HAZE:
          out[o] = withAlpha(pal[t * SHADES + (variant[i] & SHADE_MASK)], 80, littleEndian); // metan: çok saydam
          break;
        default: {
          let c;
          if (DYNAMIC[t] === DYN.CLONER) {
            // variant öğrenilen materyali tutar; ton hücre indeksinden. Öğrenmiş: %50, bütçesi bitmiş: %20 karışım.
            c = pal[t * SHADES + (i & SHADE_MASK)];
            if ((flags[i] & 2) !== 0) c = mixPacked(c, pal[variant[i] * SHADES + (i & SHADE_MASK)], life[i] > 0 ? 0.5 : 0.2);
          } else if (DYNAMIC[t] === DYN.SINK) {
            c = pal[t * SHADES + (i & SHADE_MASK)];
            if (life[i] === 0) c = mixPacked(c, spent, 0.5);
          } else {
            c = pal[t * SHADES + (variant[i] & SHADE_MASK)];
          }
          // Akkorluk ve soğuk su tonu: ateş, lav ve yanma dışındaki tüm maddeler (kaynaklar dahil).
          const T = temp[i];
          if (T >= INC_START) {
            hotCells++;
            const f = incFactor(T);
            const hot = incColor(T, incandescent);
            c = mixPacked(c, hot, f);
            if (glow) g = withAlpha(hot, (f * 150) | 0, littleEndian);
          } else if (t === WATER && T < COLD_START) {
            const u = (COLD_START - (T < -1 ? -1 : T)) / (COLD_START + 1);
            c = mixPacked(c, coldTint, u * 0.35);
          }
          out[o] = c;
        }
      }
      if (glow) glow[o] = g;
    }
  }
  return hotCells;
}

// Termal görünüm: her hücre sıcaklık rampasıyla (hava daha koyu rampayla); karıştırma yok.
export function fillThermal(view, out, ramps) {
  const { type, width, height, stride } = view;
  const temp = view.temp;
  const { thermal, thermalAir } = ramps;
  let o = 0;
  for (let y = 0; y < height; y++) {
    let i = (y + 1) * stride + 1;
    for (let x = 0; x < width; x++, i++, o++) {
      const T = temp[i];
      const k = T <= -40 ? 0 : T >= 1200 ? 1240 : Math.round(T) + 40;
      out[o] = (type[i] === 0 ? thermalAir : thermal)[THERMAL_LUT[k]];
    }
  }
}

// Savrulan parçacıklar (ızgaradan sonra çizilir): malzeme rengi; ≥ INC_START °C akkor ve ışıma. Dönüş: akkor sayısı.
export function drawDebris(view, out, pal, ramps, glow = null) {
  const d = view.debris;
  if (!d || d.count === 0) return 0;
  const { width, height } = view;
  const { incandescent, littleEndian } = ramps;
  let hot = 0;
  for (let k = 0; k < d.count; k++) {
    const x = Math.floor(d.x[k]);
    const y = Math.floor(d.y[k]);
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const o = y * width + x;
    let c = pal[d.type[k] * SHADES + (d.variant[k] & SHADE_MASK)];
    const T = d.temp[k];
    if (T >= INC_START) {
      hot++;
      const f = incFactor(T);
      const h = incColor(T, incandescent);
      c = mixPacked(c, h, f);
      if (glow) glow[o] = withAlpha(h, (f * 150) | 0, littleEndian);
    }
    out[o] = c;
  }
  return hot;
}

// Termal görünümde parçacıklar sıcaklık rampasıyla.
export function drawDebrisThermal(view, out, ramps) {
  const d = view.debris;
  if (!d || d.count === 0) return;
  const { width, height } = view;
  for (let k = 0; k < d.count; k++) {
    const x = Math.floor(d.x[k]);
    const y = Math.floor(d.y[k]);
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const T = d.temp[k];
    const idx = T <= -40 ? 0 : T >= 1200 ? 1240 : Math.round(T) + 40;
    out[y * width + x] = ramps.thermal[THERMAL_LUT[idx]];
  }
}

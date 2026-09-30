// Materyal renklerinden Uint32 palet tablosu (LUT) ve dinamik renk rampaları üretir.
// ImageData baytları [R,G,B,A] sırasındadır; Uint32 view üzerinden yazarken
// platformun endianness'ına göre paketlenir.
import { MAT } from '../engine/materials.js';

export const SHADES = 32; // materyal başına ton sayısı (variant & 31)
export const RAMP_SIZE = 64;
export const HEAT_RAMP_SIZE = 32;

export const IS_LITTLE_ENDIAN = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;

// Dinamik renk türleri (pixels.js kullanır).
export const DYN = Object.freeze({ NONE: 0, FIRE: 1, LAVA: 2, BURN: 3, SAND: 4 });
export const DYNAMIC = new Uint8Array(256);
DYNAMIC[MAT.FIRE] = DYN.FIRE;
DYNAMIC[MAT.LAVA] = DYN.LAVA;
DYNAMIC[MAT.BURNING_WOOD] = DYN.BURN;
DYNAMIC[MAT.BURNING_PLANT] = DYN.BURN;
DYNAMIC[MAT.BURNING_OIL] = DYN.BURN;
DYNAMIC[MAT.SAND] = DYN.SAND;

// Kareler arası canlanan materyaller (bunlar varken tampon her karede yeniden doldurulur).
export const ANIMATED_IDS = Object.freeze([MAT.FIRE, MAT.LAVA, MAT.BURNING_WOOD, MAT.BURNING_PLANT, MAT.BURNING_OIL]);

export function parseHex(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Geçersiz hex renk: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function packRGBA(r, g, b, a, littleEndian = IS_LITTLE_ENDIAN) {
  return littleEndian
    ? ((a << 24) | (b << 16) | (g << 8) | r) >>> 0
    : ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
}

const clampByte = (v) => Math.max(0, Math.min(255, Math.round(v)));

export function buildPalette(materials, littleEndian = IS_LITTLE_ENDIAN) {
  const pal = new Uint32Array(256 * SHADES);
  for (const def of materials.list) {
    if (!def.color) continue; // EMPTY: şeffaf (0)
    const [r, g, b] = parseHex(def.color);
    for (let s = 0; s < SHADES; s++) {
      // 37 ≡ 5 (mod 32) → permütasyon: ardışık variant'lar belirgin farklı ton alır.
      const f = 0.9 + (0.2 * ((s * 37) % SHADES)) / (SHADES - 1);
      pal[def.id * SHADES + s] = packRGBA(clampByte(r * f), clampByte(g * f), clampByte(b * f), 255, littleEndian);
    }
  }
  return pal;
}

// Renk duraklarından ([konum 0..1, '#rrggbb'] listesi) doğrusal gradyan tablosu.
export function gradient(stops, size, littleEndian = IS_LITTLE_ENDIAN) {
  const out = new Uint32Array(size);
  const rgb = stops.map(([pos, hex]) => [pos, parseHex(hex)]);
  for (let k = 0; k < size; k++) {
    const t = size === 1 ? 0 : k / (size - 1);
    let s = 0;
    while (s < rgb.length - 2 && t > rgb[s + 1][0]) s++;
    const [p0, c0] = rgb[s];
    const [p1, c1] = rgb[s + 1];
    const u = p1 === p0 ? 0 : Math.max(0, Math.min(1, (t - p0) / (p1 - p0)));
    out[k] = packRGBA(
      clampByte(c0[0] + (c1[0] - c0[0]) * u),
      clampByte(c0[1] + (c1[1] - c0[1]) * u),
      clampByte(c0[2] + (c1[2] - c0[2]) * u),
      255,
      littleEndian,
    );
  }
  return out;
}

// Dinamik rampalar: düşük indeks = sönük/soğuk, yüksek indeks = sıcak/parlak.
export function buildRamps(littleEndian = IS_LITTLE_ENDIAN) {
  const g = (stops) => gradient(stops, RAMP_SIZE, littleEndian);
  const burn = new Array(256).fill(null);
  burn[MAT.BURNING_WOOD] = g([[0, '#1a120d'], [0.35, '#4a2616'], [0.7, '#9a4a1e'], [0.9, '#e0762a'], [1, '#ffb45a']]);
  burn[MAT.BURNING_PLANT] = g([[0, '#1e1a0e'], [0.4, '#5a4a18'], [0.75, '#c8682a'], [1, '#ffc060']]);
  burn[MAT.BURNING_OIL] = g([[0, '#2a1006'], [0.4, '#8a2e0c'], [0.75, '#f06a1c'], [1, '#ffd070']]);
  return {
    littleEndian,
    fire: g([[0, '#4a1004'], [0.3, '#b02a08'], [0.55, '#f0601a'], [0.8, '#ffae3a'], [1, '#fff2c4']]),
    lava: g([[0, '#6a1604'], [0.4, '#c8380c'], [0.75, '#f26a1e'], [1, '#ffb450']]),
    burn,
    heat: gradient([[0, '#d9bb82'], [0.6, '#f0924a'], [1, '#ff6a2a']], HEAT_RAMP_SIZE, littleEndian),
  };
}

// Paketli rengin alfa baytını değiştirir (glow yoğunluğu).
export function withAlpha(color, alpha, littleEndian = IS_LITTLE_ENDIAN) {
  return littleEndian ? ((color & 0x00ffffff) | (alpha << 24)) >>> 0 : ((color & 0xffffff00) | alpha) >>> 0;
}

// Materyal renklerinden Uint32 palet tablosu (LUT) üretir.
// ImageData baytları [R,G,B,A] sırasındadır; Uint32 view üzerinden yazarken
// platformun endianness'ına göre paketlenir.

export const SHADES = 32; // materyal başına ton sayısı (variant & 31)

export const IS_LITTLE_ENDIAN = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;

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

// Fırça geometrisi (saf, DOM'suz): footprint (dx, dy) çiftleri, ana hat ve çizgi
// interpolasyonu. Hem boyama (engine) hem önizleme (renderer) aynı veriyi kullanır.

export const BRUSH_SHAPES = Object.freeze(['circle', 'square', 'spray']);
export const MIN_BRUSH = 1;
export const MAX_BRUSH = 16;
export const SPRAY_DENSITY = 0.15; // spray: footprint hücresi başına boyanma olasılığı

export function clampBrushSize(size) {
  const s = Math.round(Number(size));
  if (!Number.isFinite(s)) return MIN_BRUSH;
  return Math.min(MAX_BRUSH, Math.max(MIN_BRUSH, s));
}

const footprintCache = new Map();
const outlineCache = new Map();

// Boyut = çap (hücre). Çift boyutlarda merkez iki hücre arasındadır (+0.5).
export function footprint(shape, size) {
  const s = clampBrushSize(size);
  const key = `${shape}:${s}`;
  let fp = footprintCache.get(key);
  if (fp) return fp;
  const lo = -Math.floor((s - 1) / 2);
  const hi = lo + s - 1;
  const c = s % 2 === 0 ? 0.5 : 0;
  const r2 = (s / 2) * (s / 2);
  const pts = [];
  for (let dy = lo; dy <= hi; dy++) {
    for (let dx = lo; dx <= hi; dx++) {
      if (shape === 'square' || (dx - c) * (dx - c) + (dy - c) * (dy - c) <= r2) pts.push(dx, dy);
    }
  }
  fp = Int16Array.from(pts);
  footprintCache.set(key, fp);
  return fp;
}

// Footprint'in dış kenarları: [x1, y1, x2, y2] segmentleri, merkez hücrenin sol üst
// köşesine göre hücre köşesi koordinatlarında.
export function footprintOutline(shape, size) {
  const key = `${shape}:${clampBrushSize(size)}`;
  let segs = outlineCache.get(key);
  if (segs) return segs;
  const fp = footprint(shape, size);
  const set = new Set();
  for (let k = 0; k < fp.length; k += 2) set.add(`${fp[k]},${fp[k + 1]}`);
  const has = (x, y) => set.has(`${x},${y}`);
  const out = [];
  for (let k = 0; k < fp.length; k += 2) {
    const x = fp[k];
    const y = fp[k + 1];
    if (!has(x, y - 1)) out.push(x, y, x + 1, y);
    if (!has(x, y + 1)) out.push(x, y + 1, x + 1, y + 1);
    if (!has(x - 1, y)) out.push(x, y, x, y + 1);
    if (!has(x + 1, y)) out.push(x + 1, y, x + 1, y + 1);
  }
  segs = Int16Array.from(out);
  outlineCache.set(key, segs);
  return segs;
}

// Bresenham: (x0,y0)'dan (x1,y1)'e boşluksuz 8-komşulu hücre dizisi; iki uç dahil.
// İnce çapraz duvarlar köşe sızıntısı kuralı sayesinde sıvı/gaz geçirmez.
export function lineCells(x0, y0, x1, y1, visit) {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    visit(x, y);
    if (x === x1 && y === y1) return;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

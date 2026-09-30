// Sahne üretim yardımcıları. Yalnızca aritmetik (+ − × ÷, floor, sqrt) kullanılır;
// Math.sin/exp/pow yok: tarayıcılar arası bit farkı sahne determinizmini bozmasın (ADR-008).
// Tüm yazmalar sim.setCell üzerinden (sınır kontrollü) yapılır.
import { Rng } from '../engine/rng.js';
import { lineCells } from '../engine/brush.js';

const smoothstep = (u) => u * u * (3 - 2 * u);

// n örneklik pürüzsüz value noise, [0, 1]. knots: kontrol noktası sayısı.
export function valueNoise(n, seed, layer, knots) {
  const rng = new Rng(String(seed), `noise-${layer}`);
  const k = Math.max(1, knots);
  const pts = Array.from({ length: k + 1 }, () => rng.next());
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const pos = n === 1 ? 0 : (i / (n - 1)) * k;
    const j = Math.min(k - 1, Math.floor(pos));
    const u = smoothstep(pos - j);
    out[i] = pts[j] + (pts[j + 1] - pts[j]) * u;
  }
  return out;
}

// Normalize koordinat yardımcıları: X(0..1), Y(0..1) → hücre.
export function frame(sim) {
  const W = sim.view.width;
  const H = sim.view.height;
  return {
    W,
    H,
    X: (f) => Math.round(f * (W - 1)),
    Y: (f) => Math.round(f * (H - 1)),
    // Kısa kenara göre ölçek (en az 1 hücre).
    S: (f) => Math.max(1, Math.round(f * Math.min(W, H))),
  };
}

export function rect(sim, x0, y0, x1, y1, material) {
  const xa = Math.min(x0, x1);
  const xb = Math.max(x0, x1);
  const ya = Math.min(y0, y1);
  const yb = Math.max(y0, y1);
  for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) sim.setCell(x, y, material);
}

export function disk(sim, cx, cy, r, material, { onlyEmpty = false } = {}) {
  const r2 = (r + 0.5) * (r + 0.5);
  const ri = Math.ceil(r);
  for (let dy = -ri; dy <= ri; dy++) {
    for (let dx = -ri; dx <= ri; dx++) {
      if (dx * dx + dy * dy > r2) continue;
      if (onlyEmpty && !isEmpty(sim, cx + dx, cy + dy)) continue;
      sim.setCell(cx + dx, cy + dy, material);
    }
  }
}

export function isEmpty(sim, x, y) {
  const c = sim.getCell(x, y);
  return c !== null && c.material === 0;
}

// Kalın çizgi (kare fırça ile).
export function thickLine(sim, x0, y0, x1, y1, material, thickness = 1) {
  const lo = -Math.floor((thickness - 1) / 2);
  const hi = lo + thickness - 1;
  lineCells(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), (x, y) => {
    for (let dy = lo; dy <= hi; dy++) for (let dx = lo; dx <= hi; dx++) sim.setCell(x + dx, y + dy, material);
  });
}

// Tarama çizgisi ile çokgen doldurma (hücre merkezleri; even-odd).
export function fillPolygon(sim, points, material) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of points) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const xs = [];
  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
    const sy = y + 0.5;
    xs.length = 0;
    for (let k = 0; k < points.length; k++) {
      const [ax, ay] = points[k];
      const [bx, by] = points[(k + 1) % points.length];
      if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) xs.push(ax + ((sy - ay) * (bx - ax)) / (by - ay));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) sim.setCell(x, y, material);
    }
  }
}

// Yükseklik haritası: her x için tops[x] satırından bottom'a kadar doldurur.
export function fillColumns(sim, tops, bottom, material) {
  for (let x = 0; x < tops.length; x++) {
    for (let y = Math.max(0, Math.round(tops[x])); y <= bottom; y++) sim.setCell(x, y, material);
  }
}

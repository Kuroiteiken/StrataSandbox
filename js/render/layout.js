// Sunum geometrisi (saf fonksiyonlar, DOM'suz): grid ↔ tuval eşlemesi.
// Fizik grid'i açılışta bir kez seçilir; sonrasında yalnızca sunum ölçeği değişir (ADR-002).

const INTEGER_SCALE_MIN_AREA = 0.85; // tam sayı ölçek, sığdırma alanının en az %85'ini kullanmalı

// Grid'i tuvale sığdırır. Piksel keskinliği için mümkünse tam sayı ölçek seçilir.
export function computeLayout(gridW, gridH, pixelW, pixelH) {
  if (!(pixelW > 0) || !(pixelH > 0)) return { scale: 0, drawW: 0, drawH: 0, offsetX: 0, offsetY: 0 };
  const fit = Math.min(pixelW / gridW, pixelH / gridH);
  const intScale = Math.floor(fit);
  const ratio = intScale / fit;
  const scale = intScale >= 1 && ratio * ratio >= INTEGER_SCALE_MIN_AREA ? intScale : fit;
  const drawW = Math.round(gridW * scale);
  const drawH = Math.round(gridH * scale);
  return {
    scale,
    drawW,
    drawH,
    offsetX: Math.floor((pixelW - drawW) / 2),
    offsetY: Math.floor((pixelH - drawH) / 2),
  };
}

const clampInt = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Tuval pikseli (device px) → hücre. Çizim alanı dışında null (clamp: true ise kenara sabitler).
export function pointToCell(px, py, layout, gridW, gridH, { clamp = false } = {}) {
  if (!(layout.drawW > 0) || !(layout.drawH > 0)) return null;
  let x = Math.floor(((px - layout.offsetX) * gridW) / layout.drawW);
  let y = Math.floor(((py - layout.offsetY) * gridH) / layout.drawH);
  if (clamp) return { x: clampInt(x, 0, gridW - 1), y: clampInt(y, 0, gridH - 1) };
  if (!(x >= 0 && y >= 0 && x < gridW && y < gridH)) return null;
  return { x, y };
}

// Açılışta sabit iç grid boyutu: tam sayı CSS px hücre, hücre bütçesi aşılmaz.
export function chooseGridSize(cssW, cssH, budget, { minCell = 3, minWidth = 64, minHeight = 48 } = {}) {
  const w = Number.isFinite(cssW) && cssW > 0 ? cssW : 0;
  const h = Number.isFinite(cssH) && cssH > 0 ? cssH : 0;
  let cell = Math.max(minCell, Math.ceil(Math.sqrt((w * h) / budget)));
  let width = Math.floor(w / cell);
  let height = Math.floor(h / cell);
  while (width * height > budget) {
    cell++;
    width = Math.floor(w / cell);
    height = Math.floor(h / cell);
  }
  return { cell, width: Math.max(minWidth, width), height: Math.max(minHeight, height) };
}

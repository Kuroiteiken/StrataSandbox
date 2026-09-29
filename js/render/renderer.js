// Render engine (Phase 1 minimal sürüm). Simülasyon durumunu yalnızca okur.
// Grid → ImageData (Uint32 view) → gizli canvas → ana canvas'a büyütülmüş çizim.
// Phase 4: procedural arka plan, dinamik renkler, clientToCell, capture.
import { MATERIALS } from '../engine/materials.js';
import { buildPalette, SHADES } from './palette.js';

const SHADE_MASK = SHADES - 1;
const INTEGER_SCALE_MIN_AREA = 0.85; // tam sayı ölçek, sığdırma alanının en az %85'ini kullanmalı

// Grid'i tuvale sığdırır. Piksel keskinliği için mümkünse tam sayı ölçek seçilir.
export function computeLayout(gridW, gridH, pixelW, pixelH) {
  if (pixelW <= 0 || pixelH <= 0) return { scale: 0, drawW: 0, drawH: 0, offsetX: 0, offsetY: 0 };
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

export class Renderer {
  constructor(canvas, { frameColor = '#0e0c0a', worldColor = '#1b1713' } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.palette = buildPalette(MATERIALS);
    this.frameColor = frameColor;
    this.worldColor = worldColor;
    this.gridW = 0;
    this.gridH = 0;
    this.buffer = null;
    this.bufferCtx = null;
    this.image = null;
    this.pixels = null;
    this.lastVersion = -1;
    this.layout = computeLayout(1, 1, 0, 0);
    this.lastRenderMs = 0;
  }

  resize(cssW, cssH, dpr) {
    const w = Math.max(0, Math.round(cssW * dpr));
    const h = Math.max(0, Math.round(cssH * dpr));
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
  }

  _ensureBuffer(w, h) {
    if (this.gridW === w && this.gridH === h) return;
    if (this.buffer) this.buffer.width = 0; // iOS canvas bellek limiti: eskisini serbest bırak
    this.buffer = document.createElement('canvas');
    this.buffer.width = w;
    this.buffer.height = h;
    this.bufferCtx = this.buffer.getContext('2d');
    this.image = this.bufferCtx.createImageData(w, h);
    this.pixels = new Uint32Array(this.image.data.buffer);
    this.gridW = w;
    this.gridH = h;
    this.lastVersion = -1;
  }

  _fill(view) {
    const { type, variant, width, height, stride } = view;
    const px = this.pixels;
    const pal = this.palette;
    let o = 0;
    for (let y = 0; y < height; y++) {
      let i = (y + 1) * stride + 1;
      for (let x = 0; x < width; x++, i++, o++) {
        const t = type[i];
        px[o] = t === 0 ? 0 : pal[t * SHADES + (variant[i] & SHADE_MASK)];
      }
    }
  }

  render(view) {
    const start = performance.now();
    this._ensureBuffer(view.width, view.height);
    if (view.version !== this.lastVersion) {
      this._fill(view);
      this.bufferCtx.putImageData(this.image, 0, 0);
      this.lastVersion = view.version;
    }

    const { ctx, canvas } = this;
    const l = computeLayout(view.width, view.height, canvas.width, canvas.height);
    this.layout = l;
    ctx.imageSmoothingEnabled = false; // canvas resize bu ayarı sıfırlar; her karede set edilir
    ctx.fillStyle = this.frameColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = this.worldColor;
    ctx.fillRect(l.offsetX, l.offsetY, l.drawW, l.drawH);
    ctx.drawImage(this.buffer, l.offsetX, l.offsetY, l.drawW, l.drawH);
    this.lastRenderMs = performance.now() - start;
  }
}

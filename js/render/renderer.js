// Render engine. Simülasyon durumunu (sim.view) yalnızca okur; fizik kuralı içermez.
// Katmanlar: cache'li arka plan → sim tamponu (ImageData, büyütülmüş) → (Phase 5) brush preview
// → (Phase 8) glow.
import { MATERIALS } from '../engine/materials.js';
import { buildPalette, buildRamps, ANIMATED_IDS } from './palette.js';
import { fillPixels } from './pixels.js';
import { paintBackground } from './background.js';
import { computeLayout, pointToCell } from './layout.js';
import { footprintOutline } from '../engine/brush.js';

export { computeLayout } from './layout.js';

const BACKGROUND_RES = 0.5; // arka plan yarım çözünürlükte çizilip yumuşak büyütülür (bellek)
const PREVIEW_COLOR = 'rgba(240, 196, 106, 0.85)';
const SPRAY_DASH = [3, 3];
const NO_DASH = [];

export class Renderer {
  constructor(canvas, { seed = 'strata', frameColor = '#0e0c0a' } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.palette = buildPalette(MATERIALS);
    this.ramps = buildRamps();
    this.frameColor = frameColor;
    this.seed = seed;
    this.reducedMotion = false;
    this.frame = 0;

    this.gridW = 0;
    this.gridH = 0;
    this.buffer = null;
    this.bufferCtx = null;
    this.image = null;
    this.pixels = null;
    this.lastView = null;
    this.lastVersion = -1;

    this.layout = computeLayout(1, 1, 0, 0);
    this._layoutKey = '';
    this.background = null;
    this._backgroundKey = '';
    this.lastRenderMs = 0;
    this.preview = { x: 0, y: 0, shape: 'circle', size: 1, visible: false };
    this.dpr = 1;
  }

  // Fırça önizlemesi: yalnızca çizim katmanı; simülasyonu değiştirmez.
  setBrushPreview({ x, y, shape, size, visible }) {
    const p = this.preview;
    p.x = x;
    p.y = y;
    p.shape = shape;
    p.size = size;
    p.visible = Boolean(visible) && Number.isInteger(x) && Number.isInteger(y);
  }

  resize(cssW, cssH, dpr) {
    this.dpr = dpr > 0 ? dpr : 1;
    const w = Math.max(0, Math.round(cssW * dpr));
    const h = Math.max(0, Math.round(cssH * dpr));
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
  }

  setBackground(seed) {
    this.seed = seed;
    this._backgroundKey = '';
  }

  setReducedMotion(enabled) {
    this.reducedMotion = Boolean(enabled);
    this.lastVersion = -1; // titreşimsiz görünüme hemen geç
  }

  // Ekran (CSS px, ör. PointerEvent.clientX/Y) → hücre. Çizim alanı dışında null.
  clientToCell(clientX, clientY, options) {
    const rect = this.canvas.getBoundingClientRect();
    if (!(rect.width > 0) || !(rect.height > 0)) return null;
    const px = ((clientX - rect.left) * this.canvas.width) / rect.width;
    const py = ((clientY - rect.top) * this.canvas.height) / rect.height;
    return pointToCell(px, py, this.layout, this.gridW, this.gridH, options);
  }

  _ensureBuffer(w, h) {
    if (this.gridW === w && this.gridH === h && this.buffer) return;
    if (this.buffer) this.buffer.width = 0; // iOS canvas bellek limiti: eskisini serbest bırak
    this.buffer = document.createElement('canvas');
    this.buffer.width = w;
    this.buffer.height = h;
    this.bufferCtx = this.buffer.getContext('2d');
    this.image = this.bufferCtx.createImageData(w, h);
    this.pixels = new Uint32Array(this.image.data.buffer);
    this.gridW = w;
    this.gridH = h;
    this.lastView = null;
  }

  _ensureLayout() {
    const key = `${this.gridW}x${this.gridH}@${this.canvas.width}x${this.canvas.height}`;
    if (key === this._layoutKey) return;
    this._layoutKey = key;
    this.layout = computeLayout(this.gridW, this.gridH, this.canvas.width, this.canvas.height);
  }

  _ensureBackground() {
    const { drawW, drawH } = this.layout;
    const w = Math.max(1, Math.ceil(drawW * BACKGROUND_RES));
    const h = Math.max(1, Math.ceil(drawH * BACKGROUND_RES));
    const key = `${w}x${h}:${this.seed}`;
    if (key === this._backgroundKey) return;
    this._backgroundKey = key;
    if (this.background) this.background.width = 0;
    this.background = document.createElement('canvas');
    this.background.width = w;
    this.background.height = h;
    paintBackground(this.background.getContext('2d'), w, h, this.seed);
  }

  _isAnimated(view) {
    if (this.reducedMotion || !view.counts) return false;
    for (let k = 0; k < ANIMATED_IDS.length; k++) if (view.counts[ANIMATED_IDS[k]] > 0) return true;
    return false;
  }

  _drawPreview() {
    const { ctx, layout: l, preview: p } = this;
    const segs = footprintOutline(p.shape, p.size);
    const cw = l.drawW / this.gridW;
    const ch = l.drawH / this.gridH;
    const ox = l.offsetX + p.x * cw;
    const oy = l.offsetY + p.y * ch;
    ctx.save();
    ctx.beginPath();
    ctx.rect(l.offsetX, l.offsetY, l.drawW, l.drawH);
    ctx.clip();
    ctx.beginPath();
    for (let k = 0; k < segs.length; k += 4) {
      ctx.moveTo(ox + segs[k] * cw, oy + segs[k + 1] * ch);
      ctx.lineTo(ox + segs[k + 2] * cw, oy + segs[k + 3] * ch);
    }
    ctx.setLineDash(p.shape === 'spray' ? SPRAY_DASH : NO_DASH);
    ctx.strokeStyle = PREVIEW_COLOR;
    ctx.lineWidth = Math.max(1, Math.round(this.dpr));
    ctx.stroke();
    ctx.restore();
  }

  render(view) {
    const start = performance.now();
    this.frame++;
    this._ensureBuffer(view.width, view.height);
    this._ensureLayout();

    if (view !== this.lastView || view.version !== this.lastVersion || this._isAnimated(view)) {
      fillPixels(view, this.pixels, this.palette, this.ramps, this.frame, this.reducedMotion);
      this.bufferCtx.putImageData(this.image, 0, 0);
      this.lastView = view;
      this.lastVersion = view.version;
    }

    const { ctx, canvas } = this;
    const l = this.layout;
    ctx.fillStyle = this.frameColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (l.drawW > 0 && l.drawH > 0) {
      this._ensureBackground();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.background, l.offsetX, l.offsetY, l.drawW, l.drawH);
      ctx.imageSmoothingEnabled = false; // canvas resize bu ayarı sıfırlar; her karede set edilir
      ctx.drawImage(this.buffer, l.offsetX, l.offsetY, l.drawW, l.drawH);
      if (this.preview.visible) this._drawPreview();
    }
    this.lastRenderMs = performance.now() - start;
  }
}

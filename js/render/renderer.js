// Render engine. Simülasyon durumunu (sim.view) yalnızca okur; fizik kuralı içermez.
// Katmanlar: cache'li arka plan → sim tamponu (ImageData, büyütülmüş) → glow ('lighter')
// → brush preview. Kalite: high (iki katman glow), medium (tek katman), low (glow yok).
import { MATERIALS } from '../engine/materials.js';
import { buildPalette, buildRamps, ANIMATED_IDS } from './palette.js';
import { fillPixels, fillThermal, drawDebris, drawDebrisThermal } from './pixels.js';
import { EFFECTS, forEachNewBlast, shakeAmplitude, flashAlpha, shakeOffset } from './effects.js';
import { radiusOf } from '../engine/explosions.js';
import { paintBackground } from './background.js';
import { daylight } from '../engine/climate.js';
import { computeLayout, pointToCell } from './layout.js';
import { footprintOutline } from '../engine/brush.js';

export { computeLayout } from './layout.js';

const BACKGROUND_RES = 0.5; // arka plan yarım çözünürlükte çizilip yumuşak büyütülür (bellek)
const PREVIEW_COLOR = 'rgba(240, 196, 106, 0.85)';
const SPRAY_DASH = [3, 3];
const NO_DASH = [];
const QUALITIES = new Set(['high', 'medium', 'low']);

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

    this.quality = 'high';
    this.glowW = 0;
    this.glowH = 0;
    this.glowSrc = null; // grid çözünürlüğünde ışık kaynakları
    this.glowHalf = null; // yarım çözünürlük (dar hale)
    this.glowQuarter = null; // çeyrek çözünürlük (geniş hale)
    this.glowImage = null;
    this.glowPixels = null;
    this._glowReady = false;
    this.viewMode = 'normal'; // 'normal' | 'thermal'
    this._hotCells = 0; // son doldurmadaki akkor hücre sayısı (glow kararı)
    this._lastBlast = 0; // view.blasts'ta görülen son patlama sırası
    this._flashX = new Float32Array(8);
    this._flashY = new Float32Array(8);
    this._flashR = new Float32Array(8);
    this._flashStart = new Int32Array(8).fill(-1000);
    this._flashHead = 0;
    this._shakeAmp = 0;
    this._shakeLeft = 0;
    this._shake = { x: 0, y: 0 };
  }

  // Görsel kalite yalnızca dekoratif efektleri etkiler (fizik değişmez).
  setQuality(level) {
    if (!QUALITIES.has(level) || level === this.quality) return;
    this.quality = level;
    this.lastVersion = -1; // glow tamponunu hemen yeniden hesapla
  }

  // 'normal' | 'thermal'. Termal görünümde glow yok; mod değişince tampon hemen yenilenir.
  setViewMode(mode) {
    if ((mode !== 'normal' && mode !== 'thermal') || mode === this.viewMode) return;
    this.viewMode = mode;
    this.lastVersion = -1;
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

  // Gün/gece açıkken gökyüzü 32 aydınlık adımında önbelleklenir (her adım bir kez çizilir).
  _ensureBackground(view) {
    const { drawW, drawH } = this.layout;
    const w = Math.max(1, Math.ceil(drawW * BACKGROUND_RES));
    const h = Math.max(1, Math.ceil(drawH * BACKGROUND_RES));
    const step = view?.dayCycle ? Math.round(daylight(view.dayPhase) * 32) : 16;
    const key = `${w}x${h}:${this.seed}:${step}`;
    if (key === this._backgroundKey) return;
    this._backgroundKey = key;
    if (this.background) this.background.width = 0;
    this.background = document.createElement('canvas');
    this.background.width = w;
    this.background.height = h;
    paintBackground(this.background.getContext('2d'), w, h, this.seed, step / 32);
  }

  _isAnimated(view) {
    if (this.viewMode === 'thermal' || this.reducedMotion) return false;
    return this._hasEmitters(view);
  }

  // Işık yayan (ve canlanan) materyaller: ateş, lav, yanan materyaller.
  _hasEmitters(view) {
    if (!view.counts) return false;
    for (let k = 0; k < ANIMATED_IDS.length; k++) if (view.counts[ANIMATED_IDS[k]] > 0) return true;
    return false;
  }

  _ensureGlow(w, h) {
    if (this.glowW === w && this.glowH === h && this.glowSrc) return;
    for (const c of [this.glowSrc, this.glowHalf, this.glowQuarter]) if (c) c.width = 0;
    const make = (cw, ch) => {
      const c = document.createElement('canvas');
      c.width = Math.max(1, cw);
      c.height = Math.max(1, ch);
      return c;
    };
    this.glowSrc = make(w, h);
    this.glowHalf = make(Math.ceil(w / 2), Math.ceil(h / 2));
    this.glowQuarter = make(Math.ceil(w / 4), Math.ceil(h / 4));
    this.glowImage = this.glowSrc.getContext('2d').createImageData(w, h);
    this.glowPixels = new Uint32Array(this.glowImage.data.buffer);
    this.glowW = w;
    this.glowH = h;
  }

  // Sim tamponunu (ve gerekiyorsa glow zincirini) durumdan yeniden üretir.
  _refresh(view) {
    if (this.viewMode === 'thermal') {
      fillThermal(view, this.pixels, this.ramps);
      drawDebrisThermal(view, this.pixels, this.ramps);
      this.bufferCtx.putImageData(this.image, 0, 0);
      this._glowReady = false;
      this.lastView = view;
      this.lastVersion = view.version;
      return;
    }
    // Işık yayanlar (ateş, lav, yanma) ya da önceki karede akkor hücre varsa glow zinciri çalışır.
    const wantGlow = this.quality !== 'low' && (this._hasEmitters(view) || this._hotCells > 0);
    if (wantGlow) this._ensureGlow(view.width, view.height);
    this._hotCells = fillPixels(view, this.pixels, this.palette, this.ramps, this.frame, this.reducedMotion, wantGlow ? this.glowPixels : null);
    this._hotCells += drawDebris(view, this.pixels, this.palette, this.ramps, wantGlow ? this.glowPixels : null);
    this.bufferCtx.putImageData(this.image, 0, 0);
    if (wantGlow) {
      // Kademeli küçültme = ucuz, taşınabilir bulanıklık (ctx.filter gerekmez).
      this.glowSrc.getContext('2d').putImageData(this.glowImage, 0, 0);
      for (const [src, dst] of [[this.glowSrc, this.glowHalf], [this.glowHalf, this.glowQuarter]]) {
        const c = dst.getContext('2d');
        c.clearRect(0, 0, dst.width, dst.height);
        c.imageSmoothingEnabled = true;
        c.drawImage(src, 0, 0, dst.width, dst.height);
      }
    }
    this._glowReady = wantGlow;
    this.lastView = view;
    this.lastVersion = view.version;
  }

  // Yeni patlamalar: parlama kaydı ve (azaltılmış hareket kapalıysa) sarsıntı.
  _collectBlasts(view) {
    if (!view.blasts) return;
    this._lastBlast = forEachNewBlast(view.blasts, this._lastBlast, (x, y, G) => {
      const h = this._flashHead++ % 8;
      this._flashX[h] = x;
      this._flashY[h] = y;
      this._flashR[h] = radiusOf(G);
      this._flashStart[h] = this.frame;
      const amp = this.reducedMotion ? 0 : shakeAmplitude(G);
      if (amp > 0) {
        this._shakeAmp = Math.max(this._shakeLeft > 0 ? this._shakeAmp : 0, amp);
        this._shakeLeft = EFFECTS.SHAKE_FRAMES;
      }
    });
  }

  _drawFlashes(ctx, ox, oy, cw, ch) {
    if (this.quality === 'low' || this.viewMode === 'thermal' || typeof ctx.createRadialGradient !== 'function') return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let h = 0; h < 8; h++) {
      const a = flashAlpha(this.frame - this._flashStart[h], this.reducedMotion);
      if (a <= 0) continue;
      const cx = ox + (this._flashX[h] + 0.5) * cw;
      const cy = oy + (this._flashY[h] + 0.5) * ch;
      const rad = Math.max(cw, this._flashR[h] * cw * 1.4);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, `rgba(255, 250, 225, ${a})`);
      g.addColorStop(0.4, `rgba(255, 190, 80, ${a * 0.5})`);
      g.addColorStop(1, 'rgba(255, 120, 20, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawGlow(ctx, x, y, w, h) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(this.glowQuarter, x, y, w, h);
    if (this.quality === 'high') {
      ctx.globalAlpha = 0.5;
      ctx.drawImage(this.glowHalf, x, y, w, h);
    }
    ctx.restore();
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

  // PNG yakalama: arka plan + simülasyon (fırça önizlemesi hariç), mevcut çizim
  // boyutunda. Native canvas API; harici kütüphane yok.
  capture(view) {
    this._ensureBuffer(view.width, view.height);
    this._ensureLayout();
    if (view !== this.lastView || view.version !== this.lastVersion) this._refresh(view);
    const w = Math.max(view.width, this.layout.drawW);
    const h = Math.max(view.height, this.layout.drawH);
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d');
    this._ensureBackground(view);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.background, 0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.buffer, 0, 0, w, h);
    if (this._glowReady) this._drawGlow(ctx, 0, 0, w, h);
    return new Promise((resolve, reject) => {
      out.toBlob((blob) => {
        out.width = 0; // bellek
        if (blob) resolve(blob);
        else reject(new Error('PNG oluşturulamadı'));
      }, 'image/png');
    });
  }

  render(view) {
    const start = performance.now();
    this.frame++;
    this._ensureBuffer(view.width, view.height);
    this._ensureLayout();
    this._collectBlasts(view);

    if (view !== this.lastView || view.version !== this.lastVersion || this._isAnimated(view)) this._refresh(view);

    const { ctx, canvas } = this;
    const l = this.layout;
    ctx.fillStyle = this.frameColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (l.drawW > 0 && l.drawH > 0) {
      const s = shakeOffset(this.frame, this._shakeAmp * this.dpr, this.reducedMotion ? 0 : this._shakeLeft, this._shake);
      if (this._shakeLeft > 0) this._shakeLeft--;
      const ox = Math.round(l.offsetX + s.x);
      const oy = Math.round(l.offsetY + s.y);
      this._ensureBackground(view);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.background, ox, oy, l.drawW, l.drawH);
      ctx.imageSmoothingEnabled = false; // canvas resize bu ayarı sıfırlar; her karede set edilir
      ctx.drawImage(this.buffer, ox, oy, l.drawW, l.drawH);
      if (this._glowReady) this._drawGlow(ctx, ox, oy, l.drawW, l.drawH);
      this._drawFlashes(ctx, ox, oy, l.drawW / this.gridW, l.drawH / this.gridH);
      if (this.preview.visible) this._drawPreview();
    }
    this.lastRenderMs = performance.now() - start;
  }
}

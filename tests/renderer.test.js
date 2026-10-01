// Renderer'ın canvas'a bağlı kısmı sahte bir 2D context ile sürülür: ne zaman
// tamponu yeniden doldurduğunu (putImageData) ve koordinat dönüşümünü doğrular.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';

let puts;
let strokes;
let dashes;
let draws;
let lighterDraws;

function fakeContext() {
  return {
    imageSmoothingEnabled: true,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    fillRect() {},
    clearRect() {},
    globalCompositeOperation: 'source-over',
    globalAlpha: 1,
    filter: 'none',
    drawImage() {
      draws++;
      if (this.globalCompositeOperation === 'lighter') lighterDraws++;
    },
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    fill() {},
    stroke() {
      strokes++;
    },
    _stack: [],
    save() {
      this._stack.push([this.globalCompositeOperation, this.globalAlpha, this.imageSmoothingEnabled]);
    },
    restore() {
      const top = this._stack.pop();
      if (top) [this.globalCompositeOperation, this.globalAlpha, this.imageSmoothingEnabled] = top;
    },
    rect() {},
    clip() {},
    setLineDash(d) {
      dashes.push(d.length);
    },
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient() {
      return { addColorStop() {} };
    },
    arc() {},
    translate() {},
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData() {
      puts++;
    },
  };
}

function fakeCanvas(width = 0, height = 0) {
  const ctx = fakeContext();
  return {
    width,
    height,
    getContext: () => ctx,
    toBlob: (cb, type) => cb({ type, size: 1 }),
    getBoundingClientRect: () => ({ left: 100, top: 50, width: 400, height: 200 }),
  };
}

beforeEach(() => {
  puts = 0;
  strokes = 0;
  dashes = [];
  draws = 0;
  lighterDraws = 0;
  globalThis.document = { createElement: () => fakeCanvas() };
});

const { Renderer } = await import('../js/render/renderer.js');

// Yeniden doldurma sayımı (putImageData) glow zincirinden etkilenmesin diye varsayılan
// kurulum glow'suz (low) kalitededir; glow testleri kaliteyi açıkça yükseltir.
function setup({ quality = 'low' } = {}) {
  const canvas = fakeCanvas();
  const renderer = new Renderer(canvas);
  renderer.setQuality(quality);
  renderer.resize(400, 200, 2); // 800×400 device px
  return { canvas, renderer };
}

test('durağan dünyada tampon yalnızca durum değişince yeniden doldurulur', () => {
  const { renderer } = setup();
  const sim = new Simulation({ width: 100, height: 50 });
  sim.setCell(1, 1, MAT.STONE);
  renderer.render(sim.view);
  renderer.render(sim.view);
  assert.equal(puts, 1);
  sim.setCell(2, 2, MAT.STONE);
  renderer.render(sim.view);
  assert.equal(puts, 2);
});

test('aynı boyutta yeni bir simülasyon gelince (aynı version olsa bile) tampon yenilenir', () => {
  const { renderer } = setup();
  const a = new Simulation({ width: 100, height: 50 });
  const b = new Simulation({ width: 100, height: 50 });
  assert.equal(a.view.version, b.view.version);
  renderer.render(a.view);
  renderer.render(b.view);
  assert.equal(puts, 2);
});

test('canlanan materyal (ateş, lava) varken her karede yenilenir; reduced motion\'da yenilenmez', () => {
  const { renderer } = setup();
  const sim = new Simulation({ width: 100, height: 50 });
  sim.setCell(5, 5, MAT.LAVA);
  renderer.render(sim.view);
  renderer.render(sim.view);
  renderer.render(sim.view);
  assert.equal(puts, 3);
  renderer.setReducedMotion(true);
  renderer.render(sim.view);
  renderer.render(sim.view);
  assert.equal(puts, 4, 'reduced motion: ilk karede bir kez, sonra durum değişmedikçe yok');
});

test('clientToCell ekran koordinatını DPR ve yerleşimi hesaba katarak hücreye çevirir', () => {
  const { renderer } = setup();
  const sim = new Simulation({ width: 100, height: 50 });
  renderer.render(sim.view); // 800×400 device px, grid 100×50 → ölçek 8, ofset 0
  // Tuval CSS'te (100, 50) konumunda 400×200 boyutunda: CSS px başına 2 device px.
  assert.deepEqual(renderer.clientToCell(100, 50), { x: 0, y: 0 });
  assert.deepEqual(renderer.clientToCell(100 + 3.99, 50), { x: 0, y: 0 });
  assert.deepEqual(renderer.clientToCell(100 + 4, 50 + 4), { x: 1, y: 1 });
  assert.deepEqual(renderer.clientToCell(499, 249), { x: 99, y: 49 });
  assert.equal(renderer.clientToCell(99, 50), null);
});

test('renderer simülasyon durumunu değiştirmez', () => {
  const { renderer } = setup();
  const sim = new Simulation({ width: 100, height: 50 });
  for (let x = 0; x < 100; x += 3) sim.setCell(x, 10, [MAT.FIRE, MAT.LAVA, MAT.SAND, MAT.BURNING_WOOD][x % 4]);
  const snapshot = [sim.view.type.slice(), sim.view.life.slice(), sim.view.variant.slice(), sim.view.flags.slice()];
  for (let k = 0; k < 5; k++) renderer.render(sim.view);
  assert.deepEqual([sim.view.type, sim.view.life, sim.view.variant, sim.view.flags], snapshot);
});

test('fırça önizlemesi görünürken çizilir, gizliyken çizilmez', () => {
  const { renderer } = setup();
  const sim = new Simulation({ width: 100, height: 50 });
  renderer.render(sim.view); // arka plan cache'lenir
  strokes = 0;
  renderer.setBrushPreview({ x: 10, y: 10, shape: 'circle', size: 7, visible: true });
  renderer.render(sim.view);
  assert.equal(strokes, 1);
  renderer.setBrushPreview({ x: 10, y: 10, shape: 'circle', size: 7, visible: false });
  strokes = 0;
  renderer.render(sim.view);
  assert.equal(strokes, 0);
});

test('spray önizlemesi kesikli çizgiyle çizilir', () => {
  const { renderer } = setup();
  const sim = new Simulation({ width: 100, height: 50 });
  renderer.setBrushPreview({ x: 10, y: 10, shape: 'spray', size: 9, visible: true });
  renderer.render(sim.view);
  assert.ok(dashes.some((n) => n > 0), 'kesikli çizgi yok');
});

test('fırça önizlemesi simülasyonu değiştirmez ve tamponu yeniden doldurmaz', () => {
  const { renderer } = setup();
  const sim = new Simulation({ width: 100, height: 50 });
  sim.setCell(3, 3, MAT.STONE);
  renderer.render(sim.view);
  const before = puts;
  const type = sim.view.type.slice();
  for (let k = 0; k < 5; k++) {
    renderer.setBrushPreview({ x: k * 5, y: 7, shape: 'square', size: 4, visible: true });
    renderer.render(sim.view);
  }
  assert.equal(puts, before);
  assert.deepEqual(sim.view.type, type);
});

test('capture arka plan + simülasyonu PNG olarak döner, fırça önizlemesini içermez', async () => {
  const { renderer } = setup();
  const sim = new Simulation({ width: 100, height: 50 });
  sim.setCell(4, 4, MAT.SAND);
  renderer.setBrushPreview({ x: 10, y: 10, shape: 'circle', size: 7, visible: true });
  renderer.render(sim.view);
  strokes = 0;
  draws = 0;
  const blob = await renderer.capture(sim.view);
  assert.equal(blob.type, 'image/png');
  assert.equal(strokes, 0, 'önizleme yakalamaya girmemeli');
  assert.equal(draws, 2, 'arka plan + sim tamponu');
});

test('glow yalnızca ışık yayan materyal varken ve kalite düşük değilken çizilir', () => {
  const { renderer } = setup({ quality: 'high' });
  const sim = new Simulation({ width: 100, height: 50 });
  sim.setCell(3, 3, MAT.STONE);
  renderer.render(sim.view);
  assert.equal(lighterDraws, 0, 'ışık kaynağı yokken glow yok');
  sim.setCell(10, 10, MAT.LAVA);
  lighterDraws = 0;
  renderer.render(sim.view);
  assert.ok(lighterDraws >= 1, 'lav varken glow çizilmeli');
  renderer.setQuality('low');
  lighterDraws = 0;
  renderer.render(sim.view);
  assert.equal(lighterDraws, 0, 'düşük kalitede glow yok');
  assert.equal(renderer.quality, 'low');
});

test('termal görünümde glow çizilmez ve mod değişince tampon hemen yenilenir', () => {
  const { renderer } = setup({ quality: 'high' });
  const sim = new Simulation({ width: 100, height: 50 });
  sim.setCell(5, 5, MAT.FIRE);
  renderer.setViewMode('thermal');
  renderer.render(sim.view);
  assert.equal(lighterDraws, 0);
  const before = puts;
  renderer.setViewMode('normal');
  renderer.render(sim.view);
  assert.ok(puts > before);
});

test('yalnızca akkor (sıcak) taş varken de glow çizilir', () => {
  const { renderer } = setup({ quality: 'high' });
  const sim = new Simulation({ width: 100, height: 50 });
  sim.setCell(5, 5, MAT.STONE);
  sim.setTemp(5, 5, 1000);
  renderer.render(sim.view); // ilk kare akkor sayısını öğrenir
  sim.setTemp(5, 5, 1001);
  renderer.render(sim.view);
  assert.ok(lighterDraws > 0);
});

test('büyük patlama sarsıntı başlatır; azaltılmış harekette sarsıntı yok', () => {
  const sim = new Simulation({ width: 40, height: 30 });
  sim.blastAt(20, 15, 10); // G 100 ≥ SHAKE_MIN
  const { renderer } = setup({ quality: 'high' });
  renderer.render(sim.view);
  assert.ok(renderer._shakeLeft > 0);
  const { renderer: calm } = setup({ quality: 'high' });
  calm.setReducedMotion(true);
  calm.render(sim.view);
  assert.equal(calm._shakeLeft, 0);
});

// app/pointer.js: sahte canvas + gerçek Simulation. Renderer'ın clientToCell'i
// basit bir eşlemeyle taklit edilir (10 CSS px = 1 hücre).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { attachPointer } from '../js/app/pointer.js';
import { countMaterial, cellType, runTicks } from './helpers.js';

function fakeCanvas() {
  const handlers = {};
  return {
    handlers,
    captured: new Set(),
    addEventListener: (type, fn) => {
      handlers[type] = fn;
    },
    removeEventListener: (type) => {
      delete handlers[type];
    },
    setPointerCapture(id) {
      this.captured.add(id);
    },
    releasePointerCapture(id) {
      this.captured.delete(id);
    },
    hasPointerCapture(id) {
      return this.captured.has(id);
    },
  };
}

const W = 40;
const H = 30;
const fakeRenderer = {
  clientToCell(cx, cy, { clamp = false } = {}) {
    let x = Math.floor(cx / 10);
    let y = Math.floor(cy / 10);
    if (clamp) {
      x = Math.max(0, Math.min(W - 1, x));
      y = Math.max(0, Math.min(H - 1, y));
    } else if (x < 0 || y < 0 || x >= W || y >= H) return null;
    return { x, y };
  },
};

function ev(x, y, extra = {}) {
  return {
    clientX: x * 10 + 5,
    clientY: y * 10 + 5,
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    shiftKey: false,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    ...extra,
  };
}

function setup(brush = { material: MAT.STONE, size: 1, shape: 'square', replace: false }) {
  const canvas = fakeCanvas();
  const sim = new Simulation({ width: W, height: H, debug: true });
  const cursors = [];
  const strokeEnds = [];
  const input = attachPointer(canvas, {
    renderer: fakeRenderer,
    sim,
    getBrush: () => brush,
    onCursor: (cell, type) => cursors.push([cell, type]),
    onStrokeEnd: () => strokeEnds.push(sim.canUndo),
  });
  const fire = (type, e) => canvas.handlers[type](e);
  return { canvas, sim, input, fire, cursors, strokeEnds };
}

test('basıp sürükleyip bırakmak boşluksuz bir çizgi boyar ve undo noktası oluşturur', () => {
  const { sim, fire } = setup();
  fire('pointerdown', ev(2, 2));
  fire('pointermove', ev(20, 12));
  fire('pointerup', ev(20, 12));
  assert.equal(countMaterial(sim, MAT.STONE), 19); // max(18, 10) + 1
  assert.equal(sim.canUndo, true);
  sim.undo();
  assert.equal(countMaterial(sim, MAT.STONE), 0);
});

test('birleştirilmiş (coalesced) olayların ara noktaları da çizgiye katılır', () => {
  const { sim, fire } = setup();
  fire('pointerdown', ev(1, 1));
  const coalesced = [ev(10, 1), ev(10, 20)];
  fire('pointermove', ev(10, 20, { getCoalescedEvents: () => coalesced }));
  fire('pointerup', ev(10, 20));
  // Yalnızca son nokta kullanılsaydı (1,1)→(10,20) çaprazı çizilirdi; köşe (10,1) boyanmazdı.
  assert.equal(cellType(sim, 10, 1), MAT.STONE);
  assert.equal(cellType(sim, 5, 1), MAT.STONE);
});

test('sağ tık geçici silgidir ve context menu engellenir', () => {
  const { sim, fire } = setup();
  sim.paintAt(5, 5, { material: MAT.STONE, size: 3, shape: 'square' });
  const menu = ev(5, 5);
  fire('contextmenu', menu);
  assert.equal(menu.defaultPrevented, true);
  fire('pointerdown', ev(5, 5, { button: 2 }));
  fire('pointerup', ev(5, 5, { button: 2 }));
  assert.equal(cellType(sim, 5, 5), MAT.EMPTY);
});

test('Shift basılıyken replace modu dolu hücrelerin üzerine yazar', () => {
  const { sim, fire } = setup({ material: MAT.SAND, size: 1, shape: 'square', replace: false });
  sim.paintAt(7, 7, { material: MAT.STONE, size: 1, shape: 'square' });
  fire('pointerdown', ev(7, 7));
  fire('pointerup', ev(7, 7));
  assert.equal(cellType(sim, 7, 7), MAT.STONE, 'shift olmadan üzerine yazılmamalı');
  fire('pointerdown', ev(7, 7, { shiftKey: true }));
  fire('pointerup', ev(7, 7, { shiftKey: true }));
  assert.equal(cellType(sim, 7, 7), MAT.SAND);
});

test('basılı tutulunca materyal akmaya devam eder; bırakınca durur', () => {
  const { sim, fire } = setup({ material: MAT.SAND, size: 1, shape: 'square', replace: false });
  fire('pointerdown', ev(20, 0));
  runTicks(sim, 20);
  const during = countMaterial(sim, MAT.SAND);
  assert.ok(during >= 15, `akış=${during}`);
  fire('pointerup', ev(20, 0));
  runTicks(sim, 20);
  assert.equal(countMaterial(sim, MAT.SAND), during);
});

test('pointercancel stroke\'u bitirir, akışı durdurur ve capture\'ı bırakır', () => {
  const { sim, fire, canvas } = setup({ material: MAT.SAND, size: 1, shape: 'square', replace: false });
  fire('pointerdown', ev(20, 0));
  assert.equal(canvas.hasPointerCapture(1), true);
  fire('pointercancel', ev(20, 0));
  assert.equal(canvas.hasPointerCapture(1), false);
  const n = countMaterial(sim, MAT.SAND);
  runTicks(sim, 10);
  assert.equal(countMaterial(sim, MAT.SAND), n);
  assert.equal(sim.canUndo, true);
});

test('çizim sürerken ikinci pointer (ikinci parmak) yok sayılır', () => {
  const { sim, fire } = setup();
  fire('pointerdown', ev(2, 2, { pointerType: 'touch' }));
  fire('pointerdown', ev(30, 20, { pointerId: 2, pointerType: 'touch' }));
  fire('pointermove', ev(30, 25, { pointerId: 2, pointerType: 'touch' }));
  fire('pointerup', ev(2, 2, { pointerType: 'touch' }));
  assert.equal(cellType(sim, 30, 20), MAT.EMPTY);
  assert.equal(countMaterial(sim, MAT.STONE), 1);
});

test('tuval dışında başlayan basış boyamaz', () => {
  const { sim, fire } = setup();
  fire('pointerdown', ev(-3, -3));
  fire('pointerup', ev(-3, -3));
  assert.equal(sim.getStats().particles, 0);
});

test('sürüklerken tuval dışına taşan hareket kenara sabitlenir', () => {
  const { sim, fire } = setup();
  fire('pointerdown', ev(35, 5));
  fire('pointermove', ev(80, 5));
  fire('pointerup', ev(80, 5));
  assert.equal(cellType(sim, W - 1, 5), MAT.STONE);
});

test('imleç hareketi onCursor ile bildirilir (touch dahil pointer türüyle)', () => {
  const { fire, cursors } = setup();
  fire('pointermove', ev(3, 4));
  fire('pointermove', ev(5, 6, { pointerType: 'touch' }));
  assert.deepEqual(cursors.at(-2), [{ x: 3, y: 4 }, 'mouse']);
  assert.deepEqual(cursors.at(-1), [{ x: 5, y: 6 }, 'touch']);
});

test('detach tüm dinleyicileri kaldırır', () => {
  const { input, canvas } = setup();
  input.detach();
  assert.deepEqual(Object.keys(canvas.handlers), []);
});

test('stroke bitince onStrokeEnd çağrılır (panel undo durumunu güncelleyebilsin)', () => {
  const { fire, strokeEnds } = setup();
  fire('pointerdown', ev(3, 3));
  fire('pointerup', ev(3, 3));
  assert.deepEqual(strokeEnds, [true], 'stroke sonunda canUndo true olmalı');
  fire('pointerdown', ev(8, 8));
  fire('pointercancel', ev(8, 8));
  assert.equal(strokeEnds.length, 2);
});

test('pointer capture kaybolursa stroke biter ve akış durur', () => {
  const { sim, fire, strokeEnds } = setup({ material: MAT.SAND, size: 1, shape: 'square', replace: false });
  fire('pointerdown', ev(20, 0));
  fire('lostpointercapture', ev(20, 0));
  assert.equal(strokeEnds.length, 1);
  const n = countMaterial(sim, MAT.SAND);
  runTicks(sim, 10);
  assert.equal(countMaterial(sim, MAT.SAND), n, 'hold durmalıydı');
});

test('buton bırakılmış halde gelen pointermove (kaçan pointerup) çizimi bitirir, boyamaz', () => {
  const { sim, fire, strokeEnds } = setup();
  fire('pointerdown', ev(2, 2, { buttons: 1 }));
  fire('pointermove', ev(15, 2, { buttons: 0 }));
  assert.equal(strokeEnds.length, 1);
  assert.equal(countMaterial(sim, MAT.STONE), 1, 'buton basılı değilken çizgi çekilmemeli');
});

test('ısı aracıyla da sağ tık geçici silgidir', () => {
  const { sim, fire } = setup({ material: MAT.EMPTY, tool: 'heat', size: 1, shape: 'square', replace: false });
  sim.setCell(3, 3, MAT.STONE);
  fire('pointerdown', ev(3, 3, { button: 2 }));
  fire('pointerup', ev(3, 3, { button: 2 }));
  assert.equal(cellType(sim, 3, 3), MAT.EMPTY);
});

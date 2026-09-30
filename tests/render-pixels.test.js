import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { buildPalette, buildRamps, SHADES } from '../js/render/palette.js';
import { MATERIALS } from '../js/engine/materials.js';
import { fillPixels } from '../js/render/pixels.js';
import { hashView } from './helpers.js';

const LE = true;
const pal = buildPalette(MATERIALS, LE);
const ramps = buildRamps(LE);

// LE paketli pikselin algısal parlaklığı (0..255).
function luma(v) {
  const r = v & 255;
  const g = (v >>> 8) & 255;
  const b = (v >>> 16) & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const red = (v) => v & 255;
const blue = (v) => (v >>> 16) & 255;

function render(sim, frame = 0, reducedMotion = true) {
  const { width, height } = sim.view;
  const out = new Uint32Array(width * height);
  fillPixels(sim.view, out, pal, ramps, frame, reducedMotion);
  return out;
}

function simWith(cells, w = 4, h = 3) {
  const sim = new Simulation({ width: w, height: h });
  for (const [x, y, m, life] of cells) {
    sim.setCell(x, y, m);
    if (life !== undefined) sim.world.life[sim.world.index(x, y)] = life;
  }
  return sim;
}

test('pikseller hücrelerle birebir eşleşir; boş hücreler şeffaf', () => {
  const sim = simWith([[2, 1, MAT.SAND]]);
  const out = render(sim);
  for (let k = 0; k < out.length; k++) {
    if (k === 1 * 4 + 2) assert.equal(out[k] >>> 24, 255, 'kum opak olmalı');
    else assert.equal(out[k], 0, `piksel ${k} şeffaf olmalı`);
  }
});

test('statik materyal paletteki tonuyla çizilir', () => {
  const sim = simWith([[0, 0, MAT.STONE]]);
  const v = sim.view.variant[sim.world.index(0, 0)];
  assert.equal(render(sim)[0], pal[MAT.STONE * SHADES + (v & (SHADES - 1))]);
});

test('ömrü yüksek (taze) ateş sönmekte olan ateşten daha parlaktır', () => {
  const sim = simWith([[0, 0, MAT.FIRE, 26], [1, 0, MAT.FIRE, 2]]);
  const out = render(sim);
  assert.ok(luma(out[0]) > luma(out[1]) + 40, `taze=${luma(out[0])} sönük=${luma(out[1])}`);
});

test('yanan odun yandıkça kararır (düşük life = kömürleşmiş)', () => {
  const sim = simWith([[0, 0, MAT.BURNING_WOOD, 600], [1, 0, MAT.BURNING_WOOD, 20]]);
  const out = render(sim);
  assert.ok(luma(out[0]) > luma(out[1]) + 20, `taze=${luma(out[0])} kömür=${luma(out[1])}`);
});

test('ısınan kum soğuk kumdan daha kızıldır', () => {
  const sim = simWith([[0, 0, MAT.SAND, 0], [1, 0, MAT.SAND, 280]]);
  const out = render(sim);
  assert.ok(red(out[1]) - blue(out[1]) > red(out[0]) - blue(out[0]) + 20, 'ısınan kum kızarmalı');
});

test('lava hareketli modda kareler arasında canlanır, azaltılmış harekette sabit kalır', () => {
  const sim = new Simulation({ width: 16, height: 1 });
  for (let x = 0; x < 16; x++) sim.setCell(x, 0, MAT.LAVA);
  const a = render(sim, 0, false);
  const b = render(sim, 40, false);
  assert.notDeepEqual([...a], [...b], 'lava animasyonu yok');
  assert.deepEqual([...render(sim, 0, true)], [...render(sim, 40, true)], 'reduced motion sabit olmalı');
});

test('ateş titremesi azaltılmış harekette kapanır', () => {
  const sim = simWith([[0, 0, MAT.FIRE, 18], [1, 0, MAT.FIRE, 18], [2, 0, MAT.FIRE, 18]]);
  assert.deepEqual([...render(sim, 0, true)], [...render(sim, 7, true)]);
});

test('fillPixels simülasyon durumunu değiştirmez', () => {
  const sim = new Simulation({ width: 12, height: 8 });
  for (let x = 0; x < 12; x++) {
    sim.setCell(x, 2, [MAT.SAND, MAT.WATER, MAT.FIRE, MAT.LAVA, MAT.BURNING_WOOD, MAT.STEAM][x % 6]);
  }
  const before = hashView(sim);
  render(sim, 3, false);
  render(sim, 4, true);
  assert.equal(hashView(sim), before);
});

test('glow tamponu yalnızca ışık yayan materyallerde (ateş, lav, yanma) dolar', () => {
  const sim = new Simulation({ width: 6, height: 1 });
  const mats = [MAT.FIRE, MAT.LAVA, MAT.BURNING_WOOD, MAT.SAND, MAT.WATER, MAT.STONE];
  mats.forEach((m, x) => sim.setCell(x, 0, m));
  sim.world.life[sim.world.index(0, 0)] = 20;
  sim.world.life[sim.world.index(2, 0)] = 400;
  const out = new Uint32Array(6);
  const glow = new Uint32Array(6);
  fillPixels(sim.view, out, pal, ramps, 0, true, glow);
  for (let x = 0; x < 3; x++) assert.ok(glow[x] >>> 24 > 0, `ışık yok: ${x}`);
  for (let x = 3; x < 6; x++) assert.equal(glow[x], 0, `ışık yaymamalı: ${x}`);
});

test('sönmekte olan ateş taze ateşten daha az ışık yayar', () => {
  const sim = new Simulation({ width: 2, height: 1 });
  sim.setCell(0, 0, MAT.FIRE);
  sim.setCell(1, 0, MAT.FIRE);
  sim.world.life[sim.world.index(0, 0)] = 26;
  sim.world.life[sim.world.index(1, 0)] = 2;
  const out = new Uint32Array(2);
  const glow = new Uint32Array(2);
  fillPixels(sim.view, out, pal, ramps, 0, true, glow);
  assert.ok(glow[0] >>> 24 > glow[1] >>> 24, 'alfa (yoğunluk) ömürle azalmalı');
});

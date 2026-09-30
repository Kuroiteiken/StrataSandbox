import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT, MATERIALS } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { HEAT } from '../js/engine/heat.js';
import { runTicks, hashView, countMaterial } from './helpers.js';

const T = (sim, x, y) => sim.getCell(x, y).temp;

function filled(w, h, matAt) {
  const sim = new Simulation({ width: w, height: h, seed: 'heat' });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const m = matAt(x, y);
    if (m !== MAT.EMPTY) sim.setCell(x, y, m);
  }
  return sim;
}

function energy(sim) {
  const { width, height, stride, type, temp } = sim.view;
  let e = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y + 1) * stride + x + 1;
    e += MATERIALS.CAP[type[i]] * temp[i];
  }
  return e;
}

test('havasız kapalı dünyada toplam ısı enerjisi (Σ C·T) korunur', () => {
  const sim = filled(40, 40, (x) => (x < 20 ? MAT.STONE : MAT.GLASS));
  for (let y = 18; y <= 21; y++) for (let x = 18; x <= 21; x++) sim.setTemp(x, y, 1000);
  const e0 = energy(sim);
  runTicks(sim, 60);
  assert.ok(Math.abs(energy(sim) - e0) / e0 < 1e-4, `enerji ${e0} → ${energy(sim)}`);
  assert.ok(T(sim, 22, 20) > 21, 'ısı yayılmalı');
});

test('tek sıcak nokta her yöne eşit yayılır (yön bias\'ı yok)', () => {
  const sim = filled(41, 41, () => MAT.STONE);
  sim._heat.sleep = false; // stencil simetrisi; uykunun ±SLEEP_EPS yaklaşıklığı ayrı testte
  sim.setTemp(20, 20, 1000);
  runTicks(sim, 40);
  for (let d = 1; d <= 6; d++) {
    const l = T(sim, 20 - d, 20);
    const r = T(sim, 20 + d, 20);
    const u = T(sim, 20, 20 - d);
    const dn = T(sim, 20, 20 + d);
    assert.ok(Math.abs(l - r) < 1e-3 && Math.abs(u - dn) < 1e-3 && Math.abs(l - u) < 1e-3, `d=${d}: ${l} ${r} ${u} ${dn}`);
  }
});

test('değerler başlangıçtaki min–max aralığında kalır (salınım yok)', () => {
  const sim = filled(20, 20, (x, y) => ((x + y) % 2 === 0 ? MAT.WATER : MAT.STONE));
  for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) if ((x * 3 + y) % 2 === 0) sim.setTemp(x, y, 1000);
  for (let k = 0; k < 20; k++) {
    sim.step();
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
      const v = T(sim, x, y);
      assert.ok(v >= 20 - 1e-3 && v <= 1000 + 1e-3, `(${x},${y})=${v}`);
    }
  }
});

test('hava ortam sıcaklığına yaklaşır; kenar çerçevesi ortam sıcaklığındadır', () => {
  const sim = new Simulation({ width: 20, height: 20 });
  sim.setTemp(10, 10, 600);
  sim.setAmbient(-10);
  runTicks(sim, 600);
  for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) assert.ok(Math.abs(T(sim, x, y) + 10) < 1, `(${x},${y})`);
  assert.equal(sim.world.temp[0], -10);
});

test('ateş ve yanan materyaller kaynak sıcaklığının altına inmez', () => {
  const sim = new Simulation({ width: 6, height: 6 });
  sim.setCell(2, 5, MAT.BURNING_WOOD);
  sim.setTemp(2, 5, 20);
  sim.step();
  assert.ok(T(sim, 2, 5) >= 700);
});

test('boyanan lav doğuş sıcaklığıyla gelir', () => {
  const sim = new Simulation({ width: 4, height: 4 });
  sim.setCell(1, 1, MAT.LAVA);
  assert.equal(T(sim, 1, 1), 1150);
});

test('uyuyan satır optimizasyonu sonucu yalnızca SLEEP_EPS mertebesinde değiştirir (faz değişimi dahil)', () => {
  const run = (sleep) => {
    const sim = new Simulation({ width: 60, height: 40, seed: 'sleep' });
    for (let y = 30; y < 40; y++) for (let x = 0; x < 60; x++) sim.setCell(x, y, MAT.STONE);
    for (let y = 26; y < 30; y++) for (let x = 25; x < 35; x++) sim.setCell(x, y, MAT.WATER);
    for (let y = 31; y < 34; y++) for (let x = 5; x < 9; x++) sim.setTemp(x, y, 800);
    // Spec §2.4: eriyen buz bloğu ve ılık hava alanı — uyku altında faz değişimi de sınanır.
    for (let y = 27; y < 30; y++) for (let x = 45; x < 49; x++) sim.setCell(x, y, MAT.ICE);
    for (let y = 4; y < 14; y++) for (let x = 38; x < 56; x++) sim.setTemp(x, y, 45);
    sim._heat.sleep = sleep;
    runTicks(sim, 500);
    return sim;
  };
  const a = run(true);
  const b = run(false);
  let maxDiff = 0;
  for (let i = 0; i < a.view.temp.length; i++) maxDiff = Math.max(maxDiff, Math.abs(a.view.temp[i] - b.view.temp[i]));
  assert.ok(maxDiff <= 2 * HEAT.SLEEP_EPS, `en büyük fark ${maxDiff}`);
  assert.deepEqual([...a.view.counts], [...b.view.counts]);
  assert.ok(countMaterial(a, MAT.ICE) < 12, 'buzun bir kısmı erimeli (faz değişimi gerçekten oldu)');
});

test('ortam ayarı dünyayı anında değiştirmez: undo noktası yok, materyaller aynı', () => {
  const sim = new Simulation({ width: 10, height: 10 });
  sim.setCell(3, 3, MAT.WATER);
  const types = [...sim.view.type];
  sim.setAmbient(-30);
  assert.equal(sim.canUndo, false);
  assert.deepEqual([...sim.view.type], types);
  assert.equal(sim.ambient, -30);
  sim.setAmbient(500);
  assert.equal(sim.ambient, 60, 'aralığa kırpılır');
});

test('ortam değişince (duraklatılmışken de) boyanan ve silinen hücre yeni ortamda doğar', () => {
  const sim = new Simulation({ width: 10, height: 10 });
  sim.setAmbient(-40);
  sim.paintAt(2, 2, { material: MAT.WATER, size: 1, shape: 'square' });
  assert.equal(T(sim, 2, 2), -40, 'boya');
  sim.setCell(4, 4, MAT.STONE);
  sim.paintAt(4, 4, { material: MAT.EMPTY, size: 1, shape: 'square' });
  assert.equal(T(sim, 4, 4), -40, 'silgi');
  sim.setDayCycle(true);
  sim.setCell(6, 6, MAT.SAND);
  assert.equal(T(sim, 6, 6), Math.fround(sim.ambient), 'gün/gece açılınca');
  // Undo tick'i geri alır; ortam o tick'e göre yeniden hesaplanır.
  for (let k = 0; k < 500; k++) sim.step();
  sim.beginStroke();
  sim.paintAt(1, 1, { material: MAT.SAND, size: 1, shape: 'square' });
  sim.endStroke();
  for (let k = 0; k < 3000; k++) sim.step();
  sim.undo();
  sim.setCell(8, 8, MAT.SAND);
  assert.equal(T(sim, 8, 8), Math.fround(sim.ambient), 'undo sonrası');
});

test('setTemp sonlu olmayanı reddeder, aralığa kırpar, dünya dışını reddeder', () => {
  const sim = new Simulation({ width: 4, height: 4 });
  assert.equal(sim.setTemp(1, 1, NaN), false);
  assert.equal(sim.setTemp(9, 9, 100), false);
  sim.setTemp(1, 1, 1e9);
  assert.equal(T(sim, 1, 1), 5000);
});

test('ısı geçişi deterministiktir', () => {
  const run = () => {
    const sim = filled(30, 20, (x, y) => (y > 12 ? MAT.STONE : x % 5 === 0 ? MAT.WATER : MAT.EMPTY));
    sim.setTemp(15, 15, 1200);
    runTicks(sim, 200);
    return hashView(sim);
  };
  assert.equal(run(), run());
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { SCENES, getScene, DEFAULT_SCENE_ID } from '../js/scenes/index.js';
import { valueNoise, fillPolygon } from '../js/scenes/tools.js';
import { countMaterial, runTicks, cellType } from './helpers.js';

const SIZES = [[320, 180], [400, 225], [120, 166], [64, 48]];

// Yalnızca materyal yerleşiminin özeti (kozmetik ton hariç).
function typeHash(sim) {
  const { type } = sim.view;
  let h = 0x811c9dc5;
  for (let i = 0; i < type.length; i++) {
    h ^= type[i];
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function load(id, seed, w = 320, h = 180) {
  const sim = new Simulation({ width: w, height: h, debug: true });
  sim.loadScene(getScene(id), seed);
  return sim;
}

const present = (sim, ...mats) => mats.every((m) => countMaterial(sim, m) > 0);

test('varsayılan sahne Volcano; sahne kaydı Volcano, Hourglass, Oasis, Chaos Lab, Benchmark ve Boş içerir', () => {
  assert.equal(DEFAULT_SCENE_ID, 'volcano');
  const ids = SCENES.map((s) => s.id);
  for (const id of ['volcano', 'hourglass', 'oasis', 'chaos', 'benchmark', 'empty']) assert.ok(ids.includes(id), id);
  assert.equal(getScene('benchmark').hidden, true, 'benchmark yalnızca debug seçicide');
});

for (const scene of SCENES) {
  test(`${scene.id}: farklı grid boyutlarında hatasız üretilir ve dünya değişmezleri korunur`, () => {
    for (const [w, h] of SIZES) {
      const sim = load(scene.id, 'sizes', w, h);
      assert.deepEqual(sim.world.checkInvariants(), [], `${w}×${h}`);
      sim.step(); // debug değişmezleri
    }
  });

  test(`${scene.id}: aynı (seed, W, H) aynı başlangıcı üretir`, () => {
    assert.equal(typeHash(load(scene.id, 'same')), typeHash(load(scene.id, 'same')));
  });
}

test('Volcano taş, lav, kum, su, bitki ve odun içerir', () => {
  for (const [w, h] of SIZES) {
    assert.ok(present(load('volcano', 'v', w, h), MAT.STONE, MAT.LAVA, MAT.SAND, MAT.WATER, MAT.PLANT, MAT.WOOD), `${w}×${h}`);
  }
});

test('Volcano ve Oasis seed ile değişir', () => {
  assert.notEqual(typeHash(load('volcano', 'a')), typeHash(load('volcano', 'b')));
  assert.notEqual(typeHash(load('oasis', 'a')), typeHash(load('oasis', 'b')));
});

test('Hourglass cam duvarlar, çerçeve ve üst haznede kum içerir; kum gerçek fizikle alt hazneye akar', () => {
  const sim = load('hourglass', 'hg', 200, 220);
  assert.ok(present(sim, MAT.GLASS, MAT.WOOD, MAT.SAND));
  const { height } = sim.view;
  const sandBelow = () => {
    let n = 0;
    for (let y = Math.floor(height / 2) + 2; y < height; y++) for (let x = 0; x < sim.view.width; x++) if (cellType(sim, x, y) === MAT.SAND) n++;
    return n;
  };
  const total = countMaterial(sim, MAT.SAND);
  const before = sandBelow();
  runTicks(sim, 300);
  assert.ok(sandBelow() > before + 50, `alt hazne: ${before} → ${sandBelow()}`);
  assert.equal(countMaterial(sim, MAT.SAND), total, 'kum korunmalı');
});

test('Oasis kumul, su, taş, bitki ve odun (palmiye) içerir', () => {
  for (const [w, h] of SIZES) {
    assert.ok(present(load('oasis', 'o', w, h), MAT.SAND, MAT.WATER, MAT.STONE, MAT.PLANT, MAT.WOOD), `${w}×${h}`);
  }
});

test('Chaos Lab en az 4 farklı materyal içerir, doluluk %40\'ı geçmez ve seed ile değişir', () => {
  for (const seed of ['c1', 'c2', 'c3', 'c4']) {
    const sim = load('chaos', seed);
    const mats = [MAT.SAND, MAT.WATER, MAT.OIL, MAT.LAVA, MAT.WOOD, MAT.PLANT, MAT.STONE, MAT.GLASS, MAT.STEAM].filter((m) => countMaterial(sim, m) > 0);
    assert.ok(mats.length >= 4, `seed ${seed}: ${mats.length} materyal`);
    const fill = sim.getStats().particles / (sim.view.width * sim.view.height);
    assert.ok(fill <= 0.4, `seed ${seed}: doluluk ${fill.toFixed(2)}`);
  }
  assert.notEqual(typeHash(load('chaos', 'c1')), typeHash(load('chaos', 'c2')));
});

test('Benchmark seed\'den bağımsız sabit yerleşim üretir ve yük materyallerini içerir', () => {
  assert.equal(typeHash(load('benchmark', 'x')), typeHash(load('benchmark', 'y')));
  const sim = load('benchmark', 'x', 400, 225);
  assert.ok(present(sim, MAT.SAND, MAT.WATER, MAT.LAVA, MAT.FIRE, MAT.STEAM, MAT.PLANT, MAT.WOOD));
  assert.ok(sim.getStats().particles > 400 * 225 * 0.25, 'benchmark yeterince yüklü olmalı');
});

test('Boş sahne boştur', () => {
  assert.equal(load('empty', 'e').getStats().particles, 0);
});

test('sahne üretimi büyük gridde de hızlıdır (< 60 ms)', () => {
  for (const scene of SCENES) {
    const sim = new Simulation({ width: 400, height: 225 });
    const t0 = performance.now();
    sim.loadScene(scene, 'perf');
    const ms = performance.now() - t0;
    assert.ok(ms < 60, `${scene.id}: ${ms.toFixed(1)} ms`);
  }
});

// ---- Yardımcılar ----

test('valueNoise deterministik, [0,1] aralığında ve pürüzsüz', () => {
  const a = valueNoise(300, 'seed', 'layer', 8);
  assert.deepEqual([...a], [...valueNoise(300, 'seed', 'layer', 8)]);
  for (let i = 0; i < a.length; i++) {
    assert.ok(a[i] >= 0 && a[i] <= 1);
    if (i > 0) assert.ok(Math.abs(a[i] - a[i - 1]) < 0.08);
  }
});

test('fillPolygon üçgenin içini doldurur, dışını doldurmaz', () => {
  const sim = new Simulation({ width: 20, height: 20 });
  fillPolygon(sim, [[2, 18], [10, 2], [18, 18]], MAT.STONE);
  assert.equal(cellType(sim, 10, 12), MAT.STONE);
  assert.equal(cellType(sim, 2, 2), MAT.EMPTY);
  assert.equal(cellType(sim, 18, 5), MAT.EMPTY);
});

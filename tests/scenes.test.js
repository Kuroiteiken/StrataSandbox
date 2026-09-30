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

test('Volcano lavı yalnızca sağ yarıktan taşar; sol taraftaki göle ulaşmaz', () => {
  for (const [w, h] of [[320, 180], [124, 142], [165, 318], [280, 207], [100, 300], [64, 48], [400, 225]]) {
    for (const seed of ['l1', 'l2', 'l3', 'readme']) {
      const sim = load('volcano', seed, w, h);
      runTicks(sim, 600);
      let leftLava = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < Math.floor(w * 0.22); x++) if (cellType(sim, x, y) === MAT.LAVA) leftLava++;
      assert.equal(leftLava, 0, `${w}×${h} seed ${seed}: sol bölgede ${leftLava} lav hücresi`);
    }
  }
});

test('Volcano ve Oasis seed ile değişir', () => {
  assert.notEqual(typeHash(load('volcano', 'a')), typeHash(load('volcano', 'b')));
  assert.notEqual(typeHash(load('oasis', 'a')), typeHash(load('oasis', 'b')));
});

const HG_SIZES = [[200, 220], [201, 221], [320, 180], [400, 225], [64, 48], [400, 120], [120, 300]];

function sandHalves(sim) {
  const { width, height } = sim.view;
  let top = 0;
  let bottom = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cellType(sim, x, y) !== MAT.SAND) continue;
      if (y < height / 2) top++;
      else bottom++;
    }
  }
  return { top, bottom };
}

// Boğaz tüpü: iki hücre (cx, cx+1), orta satırlar (hourglass.js ile aynı formül).
function neckHasSand(sim) {
  const { width: W, height: H } = sim.view;
  const cx = Math.floor((W - 2) / 2);
  const midRow = Math.floor((H - 1) / 2);
  const neckStart = H % 2 === 1 ? midRow - 1 : midRow;
  for (let y = neckStart; y <= H - 1 - neckStart; y++) for (const x of [cx, cx + 1]) if (cellType(sim, x, y) === MAT.SAND) return true;
  return false;
}

test('Kum saati: kum ve kaynaklar dışındaki şekil orta satıra göre tam simetrik, başta tüm kum üstte', () => {
  const norm = (m) => (m === MAT.SAND || m === MAT.CLONER || m === MAT.SINK ? MAT.EMPTY : m);
  for (const [w, h] of HG_SIZES) {
    const sim = load('hourglass', 'hg', w, h);
    assert.ok(present(sim, MAT.GLASS, MAT.WOOD, MAT.SAND, MAT.CLONER, MAT.SINK), `${w}×${h}`);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        assert.equal(norm(cellType(sim, x, y)), norm(cellType(sim, x, h - 1 - y)), `${w}×${h} (${x},${y})`);
      }
    }
    assert.equal(sandHalves(sim).bottom, 0, `${w}×${h}: başta alt hazne boş`);
  }
});

test('Kum saati: üstte kumu öğrenmiş sınırsız çoğaltıcı, altta sınırsız yutucu', () => {
  const sim = load('hourglass', 'hg', 320, 180);
  assert.ok(countMaterial(sim, MAT.CLONER) > 0 && countMaterial(sim, MAT.SINK) > 0, 'kaynaklar yerleşmeli');
  for (let y = 0; y < 180; y++) {
    for (let x = 0; x < 320; x++) {
      const m = cellType(sim, x, y);
      if (m === MAT.CLONER) {
        assert.ok(y < 90, 'çoğaltıcı üst yarıda');
        assert.equal(sim.getCell(x, y).variant, MAT.SAND);
        assert.equal(sim.getCell(x, y).life, 65535);
      }
      if (m === MAT.SINK) {
        assert.ok(y >= 90, 'yutucu alt yarıda');
        assert.equal(sim.getCell(x, y).life, 65535);
      }
    }
  }
});

test('Kum saati sürekli akar: boğaz boşalmaz, üst hazne dolu kalır, alt hazne tıkanmaz', () => {
  const sim = load('hourglass', 'hg', 400, 225);
  const initialTop = sandHalves(sim).top;
  runTicks(sim, 3000);
  let flowing = 0;
  let samples = 0;
  for (let t = 3000; t < 6000; t += 20) {
    runTicks(sim, 20);
    samples++;
    if (neckHasSand(sim)) flowing++;
  }
  assert.ok(flowing / samples >= 0.8, `boğazda kum oranı ${(flowing / samples).toFixed(2)}`);
  const { top, bottom } = sandHalves(sim);
  assert.ok(top >= initialTop * 0.5, `üst ${top} / başlangıç ${initialTop}`);
  assert.ok(bottom < initialTop * 0.6, `alt ${bottom} (tıkanma)`);
});

test('Kum saati uç en-boy oranlarında da akar', () => {
  for (const [w, h] of [[64, 48], [400, 120], [120, 300]]) {
    const sim = load('hourglass', 'hg', w, h);
    runTicks(sim, 200);
    let seen = false;
    for (let t = 0; t < 200 && !seen; t += 10) {
      runTicks(sim, 10);
      seen = neckHasSand(sim);
    }
    assert.ok(seen, `${w}×${h}`);
  }
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

// Kaba duvar saati sınırı: yavaş CI runner'larında kırılmaması için geniş tutulur.
test('sahne üretimi büyük gridde de hızlıdır (< 250 ms)', () => {
  for (const scene of SCENES) {
    const sim = new Simulation({ width: 400, height: 225 });
    const t0 = performance.now();
    sim.loadScene(scene, 'perf');
    const ms = performance.now() - t0;
    assert.ok(ms < 250, `${scene.id}: ${ms.toFixed(1)} ms`);
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

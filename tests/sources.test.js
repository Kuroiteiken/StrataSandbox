// Çoğaltıcı (CLONER) ve Yutucu (SINK): üstüne konan hareketli materyali bütçesi kadar çoğaltır / yutar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { CLONER_LEARNED, SOURCE_INFINITE } from '../js/engine/reactions.js';
import { makeSim, countMaterial, runTicks, hashView, toAscii } from './helpers.js';

function source(sim, x, y, mat, options) {
  sim.setCell(x, y, mat);
  assert.equal(sim.configureSource(x, y, options), true);
}

test('çoğaltıcı üstüne dökülen kumu öğrenir ve boş komşulara kopyalar', () => {
  const sim = makeSim(`
    .......
    ...S...
    .......
    ...C...
    .......
    #######
  `, { seed: 'clone' });
  runTicks(sim, 600);
  const c = sim.getCell(3, 3);
  assert.equal(c.material, MAT.CLONER);
  assert.equal(c.variant, MAT.SAND, 'kumu öğrenmeli');
  assert.ok(countMaterial(sim, MAT.SAND) > 5, toAscii(sim));
});

test('çoğaltıcı tam olarak bütçesi kadar kopya üretir ve durur', () => {
  const sim = new Simulation({ width: 40, height: 40, seed: 'budget', debug: true });
  source(sim, 20, 10, MAT.CLONER, { learn: MAT.WATER, budget: 50 });
  runTicks(sim, 4000);
  assert.equal(countMaterial(sim, MAT.WATER), 50);
  assert.equal(sim.getCell(20, 10).life, 0);
});

test('sınırsız çoğaltıcı bütçe harcamaz', () => {
  const sim = new Simulation({ width: 30, height: 30, seed: 'inf-clone' });
  source(sim, 15, 5, MAT.CLONER, { learn: MAT.SAND, budget: Infinity });
  runTicks(sim, 400);
  assert.ok(countMaterial(sim, MAT.SAND) > 20);
  assert.equal(sim.getCell(15, 5).life, SOURCE_INFINITE);
});

test('çoğaltıcı statik materyali ve kaynakları öğrenmez; öğrenmemişken üretmez', () => {
  const sim = makeSim(`
    #####
    #CV.#
    #####
  `, { seed: 'static' });
  const before = [...sim.view.type];
  runTicks(sim, 500);
  assert.deepEqual([...sim.view.type], before);
  assert.equal(sim.world.flags[sim.world.index(1, 1)] & CLONER_LEARNED, 0);
});

test('yutucu değen hareketli materyali tam olarak bütçesi kadar yutar; statiğe dokunmaz', () => {
  const sim = new Simulation({ width: 12, height: 12, seed: 'sink', debug: true });
  for (let x = 0; x < 12; x++) sim.setCell(x, 11, MAT.SINK);
  for (let x = 0; x < 12; x++) sim.configureSource(x, 11, { budget: 2 });
  for (let y = 4; y < 10; y++) for (let x = 0; x < 12; x++) sim.setCell(x, y, MAT.SAND); // 72 kum
  sim.setCell(5, 10, MAT.STONE);
  runTicks(sim, 3000);
  assert.equal(countMaterial(sim, MAT.SAND), 72 - 24, 'toplam bütçe 12 × 2 = 24');
  assert.equal(countMaterial(sim, MAT.STONE), 1);
  for (let x = 0; x < 12; x++) assert.equal(sim.getCell(x, 11).life, 0);
});

test('sınırsız yutucu tükenmez ve gazı da yutar', () => {
  const sim = new Simulation({ width: 10, height: 10, seed: 'inf-sink' });
  source(sim, 5, 0, MAT.SINK, { budget: Infinity });
  for (let x = 3; x <= 7; x++) sim.setCell(x, 3, MAT.STEAM);
  runTicks(sim, 600);
  assert.equal(countMaterial(sim, MAT.STEAM), 0, 'yükselen buhar yutulmalı');
  assert.equal(sim.getCell(5, 0).life, SOURCE_INFINITE);
});

test('configureSource yalnızca kaynaklarda, hareketli materyal ve geçerli bütçeyle çalışır', () => {
  const sim = new Simulation({ width: 6, height: 6 });
  sim.setCell(1, 1, MAT.STONE);
  sim.setCell(2, 2, MAT.CLONER);
  sim.setCell(3, 3, MAT.SINK);
  assert.equal(sim.configureSource(1, 1, { budget: 5 }), false, 'kaynak değil');
  assert.equal(sim.configureSource(2, 2, { learn: MAT.STONE }), false, 'statik öğrenilmez');
  assert.equal(sim.configureSource(3, 3, { learn: MAT.SAND }), false, 'yutucu öğrenmez');
  assert.equal(sim.configureSource(2, 2, { budget: -1 }), false);
  assert.equal(sim.configureSource(2, 2, { budget: 70000 }), false);
  assert.equal(sim.configureSource(2, 2, { budget: 1.5 }), false);
  assert.equal(sim.configureSource(9, 9, { budget: 5 }), false, 'dünya dışı');
  assert.equal(sim.configureSource(2, 2, { learn: MAT.OIL, budget: 7 }), true);
  assert.equal(sim.getCell(2, 2).variant, MAT.OIL);
  assert.equal(sim.getCell(2, 2).life, 7);
  assert.equal(sim.canUndo, false, 'ayar undo noktası oluşturmaz');
});

test('kaynaklar deterministiktir', () => {
  const run = () => {
    const sim = new Simulation({ width: 30, height: 30, seed: 'det-src' });
    source(sim, 15, 5, MAT.CLONER, { learn: MAT.SAND, budget: 200 });
    for (let x = 10; x < 20; x++) source(sim, x, 29, MAT.SINK, { budget: 50 });
    runTicks(sim, 800);
    return hashView(sim);
  };
  assert.equal(run(), run());
});

// Görev 12 doğrulaması: kaynaklar sıcaklık alanıyla uyumlu (davranış Görev 4'te bağlandı).
test('çoğaltıcının kopyası doğuş sıcaklığıyla doğar (lav 1150 °C)', () => {
  const sim = new Simulation({ width: 12, height: 12, seed: 'hot-clone' });
  source(sim, 6, 2, MAT.CLONER, { learn: MAT.LAVA, budget: 1 });
  for (let t = 0; t < 400 && countMaterial(sim, MAT.LAVA) === 0; t++) sim.step();
  let lavaTemp = 0;
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) if (sim.getCell(x, y).material === MAT.LAVA) lavaTemp = sim.getCell(x, y).temp;
  assert.ok(lavaTemp > 1000, `lav ${lavaTemp} °C`);
});

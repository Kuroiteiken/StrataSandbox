// Barut ve Dinamit: ateş, lav ve sıcaklıkla tetiklenme; zincir; büyük yığında sınırlar (Review Focus 1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT, MATERIALS } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { BLAST, BLAST_KIND } from '../js/engine/explosions.js';
import { countMaterial, runTicks } from './helpers.js';

const explosive = (sim) => sim.getStats().blastTotals[BLAST_KIND.EXPLOSIVE];

function fill(sim, x0, y0, x1, y1, mat) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) sim.setCell(x, y, mat);
}

test('barut ateşle patlar: yığın tükenir, yakındaki cam kırılır', () => {
  const sim = new Simulation({ width: 60, height: 40, seed: 'gp', debug: true });
  fill(sim, 27, 34, 32, 39, MAT.GUNPOWDER);
  fill(sim, 36, 30, 36, 39, MAT.GLASS);
  const glass0 = countMaterial(sim, MAT.GLASS);
  sim.setCell(26, 39, MAT.FIRE);
  runTicks(sim, 150);
  assert.equal(countMaterial(sim, MAT.GUNPOWDER), 0);
  assert.ok(explosive(sim) >= 1);
  assert.ok(countMaterial(sim, MAT.GLASS) < glass0, 'cam kırılmalı');
});

test('barut lava değince patlar; ≥ 200 °C\'de kendiliğinden patlar', () => {
  const lava = new Simulation({ width: 30, height: 30, seed: 'gp-lava' });
  fill(lava, 5, 25, 25, 29, MAT.LAVA);
  fill(lava, 13, 20, 16, 22, MAT.GUNPOWDER);
  runTicks(lava, 200);
  assert.ok(explosive(lava) >= 1);
  const hot = new Simulation({ width: 20, height: 20, seed: 'gp-hot' });
  fill(hot, 8, 15, 11, 19, MAT.GUNPOWDER);
  hot.setTemp(9, 17, 400);
  runTicks(hot, 200);
  assert.equal(countMaterial(hot, MAT.GUNPOWDER), 0);
});

test('büyük yığın daha büyük patlar: kırılan taş sayısı yığınla artar', () => {
  const broken = (n) => {
    const sim = new Simulation({ width: 80, height: 60, seed: 'gp-size' });
    fill(sim, 0, 0, 79, 59, MAT.STONE);
    fill(sim, 40 - n / 2, 30 - n / 2, 40 + n / 2 - 1, 30 + n / 2 - 1, MAT.GUNPOWDER);
    const stone0 = countMaterial(sim, MAT.STONE);
    sim.setTemp(40, 30, 400);
    runTicks(sim, 400);
    return stone0 - countMaterial(sim, MAT.STONE);
  };
  const small = broken(4);
  const big = broken(16);
  assert.ok(big > small * 2, `küçük ${small}, büyük ${big}`);
});

test('zincir tick tick ilerler: 60 hücrelik barut hattı tek tick\'te bitmez ama sonuna kadar tükenir', () => {
  const sim = new Simulation({ width: 70, height: 20, seed: 'gp-line' });
  fill(sim, 0, 11, 69, 19, MAT.STONE);
  fill(sim, 2, 10, 61, 10, MAT.GUNPOWDER);
  sim.setTemp(2, 10, 400);
  const left = [];
  for (let t = 0; t < 300; t++) {
    sim.step();
    left.push(countMaterial(sim, MAT.GUNPOWDER));
  }
  const firstDrop = left.findIndex((n) => n < 60);
  assert.ok(firstDrop >= 0, 'tutuşmalı');
  assert.ok(left[firstDrop] > 0, 'hepsi aynı tick\'te bitmemeli');
  const done = left.indexOf(0);
  assert.ok(done > firstDrop + 2, `zincir birkaç tick sürmeli (başlangıç ${firstDrop}, bitiş ${done})`);
});

test('500 barut aynı anda tutuşunca tick sınırları korunur ve yığın tükenir (Review Focus 1)', () => {
  const sim = new Simulation({ width: 100, height: 60, seed: 'gp-500', debug: true });
  fill(sim, 30, 35, 54, 54, MAT.GUNPOWDER); // 25 × 20 = 500
  for (let y = 35; y <= 54; y++) for (let x = 30; x <= 54; x++) sim.setTemp(x, y, 300);
  for (let t = 0; t < 400; t++) {
    sim.step();
    const s = sim.getStats();
    assert.ok(s.blastsThisTick <= BLAST.MAX_PER_TICK, `tick ${t}: ${s.blastsThisTick} patlama`);
    assert.ok(sim._blast.cellsThisTick <= BLAST.MAX_CELLS_PER_TICK, `tick ${t}: ${sim._blast.cellsThisTick} hücre`);
  }
  assert.equal(countMaterial(sim, MAT.GUNPOWDER), 0);
  assert.ok(explosive(sim) >= 3);
  runTicks(sim, 400);
  assert.equal(sim.getStats().debrisLost, 0);
});

test('dinamit: ≥ 150 °C ile ve yakındaki patlamayla tetiklenir; tek hücre bile patlar', () => {
  const heat = new Simulation({ width: 30, height: 30, seed: 'dyn' });
  heat.setCell(15, 29, MAT.DYNAMITE);
  heat.setTemp(15, 29, 200);
  runTicks(heat, 150);
  assert.equal(countMaterial(heat, MAT.DYNAMITE), 0);
  assert.equal(explosive(heat), 1, 'güç 8 ≥ MERGE_MIN: tek hücre patlama olayı üretir');
  const chain = new Simulation({ width: 40, height: 30, seed: 'dyn2' });
  chain.setCell(28, 15, MAT.DYNAMITE);
  chain.blastAt(22, 15, 6); // d 6 → s 4,8 ≥ 0,5
  chain.step();
  assert.equal(countMaterial(chain, MAT.DYNAMITE), 0);
  chain.step();
  assert.ok(explosive(chain) >= 1);
});

test('tablolar: barut toz ve suya batar; dinamit katı, patlayıcı gücü 8', () => {
  assert.equal(MATERIALS.EXPLOSIVE_POWER[MAT.GUNPOWDER], 1);
  assert.equal(MATERIALS.EXPLODE_AT[MAT.GUNPOWDER], 200);
  assert.equal(MATERIALS.EXPLOSIVE_POWER[MAT.DYNAMITE], 8);
  assert.equal(MATERIALS.EXPLODE_AT[MAT.DYNAMITE], 150);
  assert.ok(MATERIALS.byKey.GUNPOWDER.density > MATERIALS.byKey.WATER.density);
});

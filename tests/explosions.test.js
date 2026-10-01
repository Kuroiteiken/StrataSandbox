// Patlama çekirdeği (ADR-017): yarıçap ve şiddet, dayanıklılık, enkaz, ısı, tutuşma, ateş, kuyruk ve sınırlar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { BLAST, BLAST_KIND, radiusOf, intensityAt, requestExplosion, addBlastPower } from '../js/engine/explosions.js';
import { countMaterial, cellType, hashView, runTicks } from './helpers.js';

const T = (sim, x, y) => sim.getCell(x, y).temp;

test('yarıçap ve şiddet: r = min(20, 1 + 1,5·√G), s = 2·√G·(1 − d/r)', () => {
  assert.equal(radiusOf(1), 2.5);
  assert.equal(radiusOf(36), 10);
  assert.equal(radiusOf(10000), BLAST.R_MAX);
  assert.equal(intensityAt(36, 0), 12);
  assert.equal(intensityAt(36, 5), 6);
  assert.equal(intensityAt(36, 10), 0);
});

test('dayanıklılık: aynı patlamada yakın taş kırılır, uzak taş kalır; cam uzakta da kırılır; metal ve kenar dayanır', () => {
  const sim = new Simulation({ width: 41, height: 21 });
  // Patlama (20, 10), boyut 6 → G 36: r 10, merkezde s 12.
  sim.setCell(23, 10, MAT.STONE); // d 3 → s 8,4 ≥ 8: kırılır
  sim.setCell(25, 10, MAT.STONE); // d 5 → s 6: kalır
  sim.setCell(12, 10, MAT.GLASS); // d 8 → s 2,4 ≥ 2: kırılır
  sim.setCell(21, 10, MAT.METAL); // d 1 → s 10,8 < 20: kalır
  assert.equal(sim.blastAt(20, 10, 6), true);
  assert.equal(cellType(sim, 23, 10), MAT.RUBBLE, 'taş → moloz (havuz yokken yerinde)');
  assert.equal(cellType(sim, 25, 10), MAT.STONE);
  assert.equal(cellType(sim, 12, 10), MAT.SAND, 'cam → kum');
  assert.equal(cellType(sim, 21, 10), MAT.METAL);
  assert.deepEqual(sim.world.checkInvariants(), []);
});

test('enkaz eşlemesi: buz → kar, odun → kül; magma kırılmaz', () => {
  const sim = new Simulation({ width: 21, height: 11 });
  sim.setCell(10, 4, MAT.ICE);
  sim.setCell(11, 5, MAT.WOOD);
  sim.world.set(sim.world.index(9, 5), MAT.MAGMA, 0, 0, 0, 1200);
  sim.blastAt(10, 5, 6);
  assert.equal(cellType(sim, 10, 4), MAT.SNOW);
  assert.equal(cellType(sim, 11, 5), MAT.ASH);
  assert.equal(cellType(sim, 9, 5), MAT.MAGMA);
});

test('ısı: merkez +600 °C, yarıçapın yarısında +300 °C; uzaktaki yanıcı tutuşur', () => {
  const sim = new Simulation({ width: 41, height: 21 });
  sim.setCell(20, 10, MAT.STONE);
  sim.setCell(28, 10, MAT.WOOD); // d 8 → s 2,4: kırılmaz (4) ama tutuşur (≥ 1)
  const t0 = T(sim, 20, 10);
  sim.blastAt(20, 10, 6);
  assert.ok(Math.abs(T(sim, 20, 10) - (t0 + 600)) < 1e-3 || cellType(sim, 20, 10) === MAT.RUBBLE);
  assert.equal(cellType(sim, 28, 10), MAT.BURNING_WOOD);
  assert.ok(T(sim, 25, 10) > 290, 'd 5: +300 °C civarı');
});

test('merkezdeki boş hücrelerin bir kısmı ateş olur; araç patlaması duraklatılmışken de hemen uygulanır', () => {
  const sim = new Simulation({ width: 41, height: 21 });
  sim.pause();
  assert.equal(countMaterial(sim, MAT.FIRE), 0);
  sim.blastAt(20, 10, 6);
  assert.ok(countMaterial(sim, MAT.FIRE) > 10, `ateş ${countMaterial(sim, MAT.FIRE)}`);
  assert.equal(sim.getStats().blastTotals[BLAST_KIND.TOOL], 1);
});

test('araç patlaması bir stroke: geri alınır', () => {
  const sim = new Simulation({ width: 41, height: 21 });
  for (let x = 15; x <= 25; x++) sim.setCell(x, 12, MAT.STONE);
  const before = hashView(sim);
  sim.beginStroke();
  sim.blastAt(20, 10, 6);
  sim.endStroke();
  assert.notEqual(hashView(sim), before);
  assert.equal(sim.undo(), true);
  assert.equal(hashView(sim), before);
});

test('kuyruk sınırı: tick başına en fazla 16 patlama; kalanlar sonraki tick\'lere kalır, hiçbiri kaybolmaz', () => {
  const sim = new Simulation({ width: 120, height: 60 });
  for (let k = 0; k < 40; k++) requestExplosion(sim._blast, 2 + (k % 20) * 6, 5 + Math.floor(k / 20) * 30, 4, BLAST_KIND.TOOL);
  sim.step();
  assert.equal(sim.getStats().blastsThisTick, BLAST.MAX_PER_TICK);
  runTicks(sim, 3);
  assert.equal(sim.getStats().blastTotals[BLAST_KIND.TOOL], 40);
});

test('birleştirme: aynı 8×8 blokta biriken güç tek patlama olur; MERGE_MIN altı patlama üretmez', () => {
  const sim = new Simulation({ width: 40, height: 40 });
  for (let k = 0; k < 10; k++) addBlastPower(sim._blast, 9 + (k % 3), 9 + Math.floor(k / 3) % 3, 0.5);
  addBlastPower(sim._blast, 30, 30, 1); // tek başına 1 < MERGE_MIN
  sim.step();
  assert.equal(sim.getStats().blastTotals[BLAST_KIND.EXPLOSIVE], 1);
  assert.equal(sim.view.blasts.power[(sim.view.blasts.latest - 1) % BLAST.RING], 5);
});

test('çevirme bekleyen patlamayı aynalar; temizle ve sahne yükleme kuyruğu boşaltır', () => {
  const sim = new Simulation({ width: 30, height: 30 });
  requestExplosion(sim._blast, 10, 3, 4, BLAST_KIND.TOOL);
  sim.flipVertical();
  sim.step();
  const h = (sim.view.blasts.latest - 1) % BLAST.RING;
  assert.equal(sim.view.blasts.y[h], 26);
  requestExplosion(sim._blast, 10, 3, 4, BLAST_KIND.TOOL);
  sim.clear();
  sim.step();
  assert.equal(sim.getStats().blastTotals[BLAST_KIND.TOOL], 1);
});

test('kenar hücreleri patlamada değişmez; sonlu olmayan güç reddedilir', () => {
  const sim = new Simulation({ width: 12, height: 12, debug: true });
  sim.blastAt(0, 0, 16);
  sim.step();
  assert.deepEqual(sim.world.checkInvariants(), []);
  assert.equal(requestExplosion(sim._blast, 5, 5, NaN, BLAST_KIND.TOOL), false);
  assert.equal(requestExplosion(sim._blast, 5, 5, Infinity, BLAST_KIND.TOOL), false);
  assert.equal(requestExplosion(sim._blast, -1, 5, 4, BLAST_KIND.TOOL), false);
  assert.equal(sim.blastAt(99, 5, 4), false);
});

test('patlamalar deterministiktir', () => {
  const run = () => {
    const sim = new Simulation({ width: 60, height: 40, seed: 'det-blast' });
    for (let x = 10; x < 50; x++) for (let y = 25; y < 35; y++) sim.setCell(x, y, x % 3 ? MAT.STONE : MAT.SAND);
    requestExplosion(sim._blast, 30, 25, 50, BLAST_KIND.TOOL);
    runTicks(sim, 60);
    return hashView(sim);
  };
  assert.equal(run(), run());
});

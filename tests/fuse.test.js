// Fitil: ateşi ~10 hücre/s taşır, sonundaki dinamiti patlatır; su söndürür.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { BLAST_KIND } from '../js/engine/explosions.js';
import { countMaterial, cellType, runTicks } from './helpers.js';

function line(sim, x0, x1, y, mat) {
  for (let x = x0; x <= x1; x++) sim.setCell(x, y, mat);
}

test('fitil ateşi saniyede ~10 hücre taşır ve sonundaki dinamiti patlatır', () => {
  const sim = new Simulation({ width: 80, height: 20, seed: 'fuse' });
  line(sim, 0, 79, 15, MAT.STONE);
  line(sim, 2, 61, 14, MAT.FUSE); // 60 hücre
  sim.setCell(62, 14, MAT.DYNAMITE);
  sim.setTemp(2, 14, 300);
  let boomAt = -1;
  for (let t = 0; t < 700 && boomAt < 0; t++) {
    sim.step();
    if (sim.getStats().blastTotals[BLAST_KIND.EXPLOSIVE] > 0) boomAt = t;
  }
  // 60 hücre × ~6 tick ≈ 360 tick (+ ısıyla ilk tutuşma ~16 tick); ±%30.
  assert.ok(boomAt >= 250 && boomAt <= 480, `patlama ${boomAt}. tick'te`);
  assert.equal(countMaterial(sim, MAT.FUSE), 0);
});

test('yanan fitil ateşle ve ısıyla tutuşur, yanarken kıvılcım çıkarır, sonunda küle döner', () => {
  const sim = new Simulation({ width: 30, height: 10, seed: 'fuse2' });
  line(sim, 0, 29, 8, MAT.STONE);
  line(sim, 5, 20, 7, MAT.FUSE);
  sim.setCell(4, 7, MAT.FIRE);
  let sparks = 0;
  for (let t = 0; t < 200; t++) {
    sim.step();
    if (countMaterial(sim, MAT.BURNING_FUSE) > 0 && countMaterial(sim, MAT.FIRE) > 0) sparks++;
  }
  assert.equal(countMaterial(sim, MAT.FUSE), 0);
  assert.ok(sparks > 0, 'kıvılcım');
  assert.ok(countMaterial(sim, MAT.ASH) > 0);
});

test('su fitili söndürür: ıslak bölümden sonrası yanmaz, dinamit patlamaz', () => {
  const sim = new Simulation({ width: 60, height: 20, seed: 'fuse-wet' });
  line(sim, 0, 59, 15, MAT.STONE);
  line(sim, 2, 49, 14, MAT.FUSE);
  sim.setCell(50, 14, MAT.DYNAMITE);
  for (const y of [12, 13]) {
    sim.setCell(19, y, MAT.STONE); // su teknesinin iki sıra duvarı
    sim.setCell(32, y, MAT.STONE);
  }
  for (let x = 20; x <= 31; x++) for (const y of [12, 13]) sim.setCell(x, y, MAT.WATER); // fitilin üstünde su
  sim.setTemp(2, 14, 300);
  runTicks(sim, 800);
  assert.equal(sim.getStats().blastTotals[BLAST_KIND.EXPLOSIVE], 0);
  assert.equal(cellType(sim, 45, 14), MAT.FUSE, 'ıslak bölümden sonrası sağlam');
});

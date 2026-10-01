// Metan (yoğun cep patlar, seyrek yalnız yanar), Duman (açık havada söner), yangın ve patlama dumanı.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT, MATERIALS } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { BLAST_KIND } from '../js/engine/explosions.js';
import { RATES } from '../js/engine/reactions.js';
import { countMaterial, runTicks } from './helpers.js';

const explosive = (sim) => sim.getStats().blastTotals[BLAST_KIND.EXPLOSIVE];

function cavity(sim, x0, y0, x1, y1) {
  for (let y = 0; y < sim.view.height; y++) for (let x = 0; x < sim.view.width; x++) sim.setCell(x, y, MAT.STONE);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) sim.world.set(sim.world.index(x, y), MAT.EMPTY, 0, 0, 0, 20);
}

test('yoğun metan cebi tutuşunca patlar', () => {
  const sim = new Simulation({ width: 60, height: 40, seed: 'ch4' });
  cavity(sim, 20, 15, 39, 24);
  for (let y = 15; y <= 24; y++) for (let x = 20; x <= 39; x++) sim.setCell(x, y, MAT.METHANE);
  for (let y = 19; y <= 21; y++) for (let x = 29; x <= 31; x++) sim.setTemp(x, y, 1000); // tek hücre 700 °C birkaç tick'te soğuyup çoğu seed'de tutuşturamaz
  runTicks(sim, 150);
  assert.equal(countMaterial(sim, MAT.METHANE), 0);
  assert.ok(explosive(sim) >= 1);
});

test('seyrek metan yalnız yanar, patlamaz', () => {
  const sim = new Simulation({ width: 60, height: 40, seed: 'ch4-thin' });
  for (let x = 4; x < 56; x += 4) sim.setCell(x, 30, MAT.METHANE);
  for (let x = 4; x < 56; x += 4) sim.setTemp(x, 30, 700);
  let burned = 0;
  for (let t = 0; t < 100; t++) {
    sim.step();
    burned += countMaterial(sim, MAT.BURNING_METHANE);
  }
  assert.ok(burned > 0, 'yanmalı');
  assert.equal(explosive(sim), 0);
});

test('metan havadan hafiftir, yükselir; patlamada tutuşur', () => {
  assert.ok(MATERIALS.byKey.METHANE.density < MATERIALS.byKey.EMPTY.density);
  const sim = new Simulation({ width: 40, height: 30, seed: 'ch4-blast' });
  for (let x = 15; x < 25; x++) sim.setCell(x, 10, MAT.METHANE);
  sim.blastAt(20, 14, 4);
  assert.ok(countMaterial(sim, MAT.BURNING_METHANE) > 0);
});

test('duman açık havada söner; yangın tick başına sınırlı duman çıkarır', () => {
  const sim = new Simulation({ width: 40, height: 40, seed: 'smoke' });
  for (let x = 10; x < 30; x++) sim.setCell(x, 5, MAT.SMOKE);
  runTicks(sim, 700);
  assert.equal(countMaterial(sim, MAT.SMOKE), 0);
  const fire = new Simulation({ width: 60, height: 40, seed: 'smoke-fire' });
  for (let x = 10; x < 50; x++) for (let y = 30; y < 40; y++) fire.setCell(x, y, MAT.WOOD);
  for (let x = 28; x < 33; x++) fire.setCell(x, 29, MAT.FIRE); // tek kıvılcım odunu çoğu seed'de tutuşturamaz (yanıcılık 0,25)
  let seen = 0;
  let prev = 0;
  for (let t = 0; t < 600; t++) {
    fire.step();
    const n = countMaterial(fire, MAT.SMOKE);
    assert.ok(n - prev <= RATES.maxSmokePerTick, `tick ${t}: ${n - prev} yeni duman`);
    prev = n;
    seen = Math.max(seen, n);
  }
  assert.ok(seen > 0, 'yangın duman çıkarmalı');
});

test('patlama halkasında duman çıkar', () => {
  const sim = new Simulation({ width: 60, height: 40, seed: 'smoke-blast' });
  sim.blastAt(30, 20, 8);
  assert.ok(countMaterial(sim, MAT.SMOKE) > 0);
});

test('gaz salan magmaya değen lav yavaşça sıcak dumana döner; işaretsiz magma gaz salmaz', async () => {
  const { DEGAS_BIT } = await import('../js/engine/reactions.js');
  const run = (degas) => {
    const sim = new Simulation({ width: 30, height: 30, seed: 'degas' });
    for (let y = 10; y < 30; y++) for (let x = 5; x < 25; x++) sim.setCell(x, y, MAT.LAVA);
    for (let y = 22; y < 28; y++) for (let x = 8; x < 22; x++) {
      sim.world.set(sim.world.index(x, y), MAT.MAGMA, 0, 0, 0, 1200);
      if (degas) assert.equal(sim.configureMagma(x, y, { degas: true }), true);
    }
    let smoke = 0;
    for (let t = 0; t < 6000; t++) {
      sim.step();
      smoke = Math.max(smoke, countMaterial(sim, MAT.SMOKE));
    }
    return { sim, smoke };
  };
  const on = run(true);
  assert.ok(on.smoke > 0, 'gaz salmalı');
  assert.equal(run(false).smoke, 0);
  assert.equal(on.sim.configureMagma(0, 0, { degas: true }), false, 'magma değil');
  assert.ok(DEGAS_BIT === 32);
});

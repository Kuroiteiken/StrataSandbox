// Faz geçişleri (gizli ısı), sıcaklıkla tutuşma ve buharlaşma (heat.js, ADR-015).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { countMaterial, runTicks, cellType } from './helpers.js';

function fill(sim, x0, y0, x1, y1, mat) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) sim.setCell(x, y, mat);
}

// Her tick'ten önce hücreyi sabit sıcaklıkta tutar (dış ısıtıcı).
function holdTemp(sim, x, y, c, ticks, until) {
  for (let t = 0; t < ticks; t++) {
    sim.setTemp(x, y, c);
    sim.step();
    if (until && until(sim)) return t + 1;
  }
  return -1;
}

// Ortam sıcaklığını ayarlar ve alanı baştan ona eşitler (sahne yüklemesinin yaptığı gibi).
function withAmbient(sim, c) {
  sim.setAmbient(c);
  sim.world.ambient = c;
  sim.world.clear();
  return sim;
}

test('su 100 °C\'de hemen değil, gizli ısısı dolunca buhara döner; buhar 100 °C üstünde doğar', () => {
  const sim = new Simulation({ width: 1, height: 2, seed: 'boil' }); // 1 hücre genişlik: su yana akamaz
  sim.setCell(0, 1, MAT.WATER);
  sim.setTemp(0, 1, 150);
  sim.step();
  assert.equal(cellType(sim, 0, 1), MAT.WATER, 'ilk tick\'te buharlaşmamalı');
  const t = holdTemp(sim, 0, 1, 150, 60, (s) => countMaterial(s, MAT.STEAM) > 0);
  assert.ok(t > 0, 'buhar oluşmadı');
  let steamTemp = -Infinity;
  for (let y = 0; y < 2; y++) for (let x = 0; x < 1; x++) if (cellType(sim, x, y) === MAT.STEAM) steamTemp = sim.getCell(x, y).temp;
  assert.ok(steamTemp >= 95, `buhar ${steamTemp} °C`);
});

test('faz ilerlemesi eşiğin gerisine dönülünce söner', () => {
  const sim = new Simulation({ width: 1, height: 2, seed: 'decay' });
  sim.setCell(0, 1, MAT.WATER);
  holdTemp(sim, 0, 1, 150, 2);
  assert.ok(sim.getCell(0, 1).life > 0);
  holdTemp(sim, 0, 1, 50, 400);
  assert.equal(sim.getCell(0, 1).life, 0);
  assert.equal(cellType(sim, 0, 1), MAT.WATER);
});

test('odun 300 °C üstünde kendiliğinden tutuşur, 250 °C\'de tutuşmaz', () => {
  const hot = new Simulation({ width: 3, height: 3, seed: 'ign' });
  hot.setCell(1, 1, MAT.WOOD);
  assert.ok(holdTemp(hot, 1, 1, 400, 300, (s) => countMaterial(s, MAT.BURNING_WOOD) > 0) > 0);
  const warm = new Simulation({ width: 3, height: 3, seed: 'ign' });
  warm.setCell(1, 1, MAT.WOOD);
  holdTemp(warm, 1, 1, 250, 500);
  assert.equal(countMaterial(warm, MAT.BURNING_WOOD), 0);
});

test('taş 1500 °C üstünde lava döner', () => {
  const sim = new Simulation({ width: 3, height: 3, seed: 'melt' });
  sim.setCell(1, 2, MAT.STONE);
  assert.ok(holdTemp(sim, 1, 2, 1700, 100, (s) => countMaterial(s, MAT.LAVA) > 0) > 0);
});

test('bitki 5 °C altında büyümez', () => {
  const sim = withAmbient(new Simulation({ width: 20, height: 12, seed: 'cold-grow' }), 2);
  fill(sim, 0, 4, 19, 11, MAT.WATER);
  sim.setCell(10, 3, MAT.PLANT);
  runTicks(sim, 3000);
  assert.equal(countMaterial(sim, MAT.PLANT), 1);
});

test('sıcak ortamda açık su yavaşça buharlaşır; ılıman ortamda buharlaşmaz', () => {
  const run = (ambient) => {
    const sim = withAmbient(new Simulation({ width: 12, height: 8, seed: 'evap' }), ambient);
    fill(sim, 0, 5, 11, 7, MAT.WATER);
    const before = countMaterial(sim, MAT.WATER);
    runTicks(sim, 20000);
    return before - countMaterial(sim, MAT.WATER);
  };
  assert.equal(run(20), 0);
  assert.ok(run(45) >= 5);
});

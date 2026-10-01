// Kapalı bölge basıncı (ADR-018): tarama, bit4, P formülü, katı tavan şartı, en zayıf tavan hücresinden patlama.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT, CLOSED_BIT } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { BLAST, BLAST_KIND } from '../js/engine/explosions.js';
import { countMaterial, runTicks, hashView } from './helpers.js';

const pressureBlasts = (sim) => sim.getStats().blastTotals[BLAST_KIND.PRESSURE];

// İç boşluk (x0..x1, y0..y1); duvarlar 1 hücre `wall`, kapak `lid` (null = açık üst).
function box(sim, x0, y0, x1, y1, wall, lid = wall) {
  for (let y = y0 - 1; y <= y1 + 1; y++) {
    sim.setCell(x0 - 1, y, wall);
    sim.setCell(x1 + 1, y, wall);
  }
  for (let x = x0 - 1; x <= x1 + 1; x++) sim.setCell(x, y1 + 1, wall);
  if (lid !== null) for (let x = x0 - 1; x <= x1 + 1; x++) sim.setCell(x, y0 - 1, lid);
}

// Kutunun su satırlarını (y0..y1) her tick 150 °C'de tutar (dış ısıtıcı); ilk basınç patlamasının tick'i ya da -1.
function boilUntilBurst(sim, x0, x1, y0, y1, ticks) {
  for (let t = 0; t < ticks; t++) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (sim.getCell(x, y).material === MAT.WATER) sim.setTemp(x, y, 150);
    sim.step();
    if (pressureBlasts(sim) > 0) return t;
  }
  return -1;
}

// İç 4 × 3: üst satır hava, alt iki satır su. Küçük hacim cam (2), taş (8) ve metal (20) eşiklerini ayırır:
// cam hacim ~6'da, taş ~8'de patlar; metal tamamen buharla (hacim 12, P ≈ 10) bile G ≈ 56 < 100 kalır.
function jar(wall, lid = wall) {
  const sim = new Simulation({ width: 30, height: 30, seed: `jar-${wall}-${lid}` });
  box(sim, 13, 21, 16, 23, wall, lid);
  for (let y = 22; y <= 23; y++) for (let x = 13; x <= 16; x++) sim.setCell(x, y, MAT.WATER);
  return sim;
}

test('oda sıcaklığındaki kapalı kutu patlamaz; iç hücreler bit4 alır, açık hava almaz', () => {
  const sim = new Simulation({ width: 40, height: 30 });
  box(sim, 10, 10, 20, 18, MAT.STONE);
  runTicks(sim, 100);
  assert.equal(pressureBlasts(sim), 0);
  assert.ok((sim.world.flags[sim.world.index(15, 14)] & CLOSED_BIT) !== 0);
  assert.equal(sim.world.flags[sim.world.index(30, 5)] & CLOSED_BIT, 0);
  assert.ok(sim.getStats().pressure.closed >= 1);
});

test('kapalı cam kavanozda kaynayan su kavanozu patlatır; aynı kavanoz açıkken patlamaz', () => {
  const closed = jar(MAT.GLASS);
  const t = boilUntilBurst(closed, 13, 16, 22, 23, 2000);
  assert.ok(t >= 0, 'kapalı kavanoz patlamalı');
  const open = new Simulation({ width: 30, height: 30, seed: 'jar-open' });
  box(open, 13, 21, 16, 23, MAT.GLASS, null);
  for (let y = 22; y <= 23; y++) for (let x = 13; x <= 16; x++) open.setCell(x, y, MAT.WATER);
  assert.equal(boilUntilBurst(open, 13, 16, 22, 23, 2000), -1);
});

test('taş kutu camdan çok daha fazla basınç ister; küçük metal kutu dayanır', () => {
  const glassT = boilUntilBurst(jar(MAT.GLASS), 13, 16, 22, 23, 3000);
  const stoneT = boilUntilBurst(jar(MAT.STONE), 13, 16, 22, 23, 3000);
  const metalT = boilUntilBurst(jar(MAT.METAL), 13, 16, 22, 23, 3000);
  assert.ok(glassT >= 0);
  assert.ok(stoneT === -1 || stoneT > glassT, `cam ${glassT}, taş ${stoneT}`);
  assert.equal(metalT, -1, 'metal kutu dayanmalı');
});

test('sıvı tavanlı bölge basınçlı sayılmaz (gaz sıvının içinden kabarcıkla çıkar)', () => {
  const sim = new Simulation({ width: 30, height: 30 });
  box(sim, 10, 10, 19, 19, MAT.STONE);
  for (let y = 10; y <= 13; y++) for (let x = 10; x <= 19; x++) sim.setCell(x, y, MAT.WATER);
  for (let y = 14; y <= 19; y++) for (let x = 10; x <= 19; x++) {
    sim.setCell(x, y, MAT.STEAM);
    sim.setTemp(x, y, 400);
  }
  sim.step();
  assert.equal(pressureBlasts(sim), 0);
});

test('patlama tavanın en zayıf, en üstteki hücresinden olur', () => {
  const sim = new Simulation({ width: 30, height: 30 });
  box(sim, 10, 10, 19, 15, MAT.STONE);
  sim.setCell(16, 9, MAT.GLASS); // kapakta cam
  sim.setCell(20, 14, MAT.GLASS); // yan duvarda cam: tavan değil
  for (let y = 10; y <= 15; y++) for (let x = 10; x <= 19; x++) {
    sim.setCell(x, y, MAT.STEAM);
    sim.setTemp(x, y, 300);
  }
  sim.step();
  assert.equal(pressureBlasts(sim), 1);
  const h = (sim.view.blasts.latest - 1) % BLAST.RING;
  assert.equal(sim.view.blasts.x[h], 16);
  assert.equal(sim.view.blasts.y[h], 9);
});

test('duman kapalı bölgede birikir, açık havada söner', () => {
  const sim = new Simulation({ width: 40, height: 30 });
  box(sim, 5, 10, 14, 18, MAT.STONE);
  for (let x = 6; x <= 13; x++) {
    sim.setCell(x, 12, MAT.SMOKE);
    sim.setCell(x + 20, 12, MAT.SMOKE);
  }
  runTicks(sim, 700);
  assert.equal(countMaterial(sim, MAT.SMOKE), 8, 'yalnız kapalıdakiler kalır');
});

test('kapalı odada süren yangın basınç patlaması spam\'i yapmaz (Review Focus 3)', () => {
  for (const [wall, max] of [[MAT.METAL, 0], [MAT.STONE, 3]]) {
    const sim = new Simulation({ width: 50, height: 30, seed: `room-${wall}` });
    box(sim, 10, 8, 39, 20, wall);
    for (let y = 17; y <= 20; y++) for (let x = 15; x <= 34; x++) sim.setCell(x, y, MAT.WOOD);
    sim.setCell(24, 16, MAT.FIRE);
    runTicks(sim, 3000);
    assert.ok(pressureBlasts(sim) <= max, `${wall}: ${pressureBlasts(sim)} basınç patlaması`);
  }
});

test('basınç taraması deterministiktir ve geri almadan sonra yeniden yapılır', () => {
  const run = () => {
    const sim = jar(MAT.GLASS);
    boilUntilBurst(sim, 13, 16, 22, 23, 600);
    runTicks(sim, 100);
    return hashView(sim);
  };
  assert.equal(run(), run());
});

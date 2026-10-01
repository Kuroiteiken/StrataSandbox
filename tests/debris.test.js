// Savrulan parçacıklar (ADR-017): fırlatma, DDA hareket, duvardan sızmama, iniş, kütle, geri alma ve çevirme.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { DebrisPool, DEBRIS } from '../js/engine/debris.js';
import { requestExplosion, BLAST_KIND } from '../js/engine/explosions.js';
import { countMaterial, cellType, hashView, runTicks } from './helpers.js';

const total = (sim, mat) => {
  let n = countMaterial(sim, mat);
  const d = sim.view.debris;
  for (let k = 0; k < d.count; k++) if (d.type[k] === mat) n++;
  return n;
};

// Moloz kullanılır: fazı 1500 °C'de olduğundan patlama ısısıyla (en fazla +600 °C) dönüşmez; kum merkezde cama dönebilirdi.
test('patlama molozu savurur: parçacıklar uçar, sonra iner; moloz korunur, kayıp yok', () => {
  const sim = new Simulation({ width: 80, height: 50, debug: true });
  for (let x = 30; x < 50; x++) for (let y = 40; y < 50; y++) sim.setCell(x, y, MAT.RUBBLE);
  const rubble0 = countMaterial(sim, MAT.RUBBLE);
  sim.blastAt(40, 39, 8);
  assert.ok(sim.view.debris.count > 20, `uçan ${sim.view.debris.count}`);
  assert.equal(total(sim, MAT.RUBBLE), rubble0, 'fırlatma anında kütle korunur');
  runTicks(sim, 400);
  assert.equal(sim.view.debris.count, 0, 'hepsi iner');
  assert.equal(countMaterial(sim, MAT.RUBBLE), rubble0);
  assert.equal(sim.getStats().debrisLost, 0);
});

test('parçacık 1 hücrelik duvardan ve çapraz merdivenden sızmaz', () => {
  const sim = new Simulation({ width: 60, height: 40 });
  for (let y = 0; y < 40; y++) sim.setCell(30, y, MAT.STONE); // dikey duvar
  for (let k = 0; k < 15; k++) sim.setCell(40 + k, 25 - k, MAT.STONE); // çapraz merdiven (köşeden değen)
  const pool = sim._debris;
  const w = sim.world;
  for (let k = 0; k < 200; k++) {
    const i = w.index(10 + (k % 10), 5 + Math.floor(k / 10));
    w.set(i, MAT.SAND, 0, 0, 0, 20);
    pool.launch(w, i, MAT.SAND, 6, -1 + (k % 7) * 0.3);
  }
  runTicks(sim, 300);
  for (let y = 0; y < 40; y++) for (let x = 31; x < 60; x++) assert.notEqual(cellType(sim, x, y), MAT.SAND, `duvarın ötesinde kum (${x},${y})`);
  // Merdivene alttan sol-yukarı doğru atılanlar merdivenin üstüne geçmemeli.
  const sim2 = new Simulation({ width: 40, height: 40 });
  for (let k = 0; k < 30; k++) sim2.setCell(5 + k, 34 - k, MAT.STONE);
  const w2 = sim2.world;
  for (let k = 0; k < 100; k++) {
    const i = w2.index(30 + (k % 5), 35 + Math.floor(k / 25));
    w2.set(i, MAT.SAND, 0, 0, 0, 20);
    sim2._debris.launch(w2, i, MAT.SAND, -4, -4);
  }
  runTicks(sim2, 300);
  for (let k = 0; k < 30; k++) for (let y = 0; y < 34 - k; y++) assert.notEqual(cellType(sim2, 5 + k, y), MAT.SAND, `merdivenin üstünde kum (${5 + k},${y})`);
});

test('aynı hücreye inmek isteyen parçacıklar başka hücrelere iner (kütle korunur)', () => {
  const sim = new Simulation({ width: 20, height: 20 });
  const w = sim.world;
  for (let k = 0; k < 30; k++) {
    const i = w.index(10, 2 + (k % 10));
    if (w.type[i] === MAT.EMPTY) w.set(i, MAT.SAND, 0, 0, 0, 20);
    sim._debris.launch(w, i, MAT.SAND, 0, 3);
  }
  const launched = sim.view.debris.count;
  runTicks(sim, 200);
  assert.equal(countMaterial(sim, MAT.SAND), launched);
  assert.equal(sim.getStats().debrisLost, 0);
});

test('uçuştayken geri alma havuzu da geri getirir; çevirme parçacıkları aynalar (Review Focus 2)', () => {
  const sim = new Simulation({ width: 60, height: 40, debug: true });
  for (let x = 20; x < 40; x++) for (let y = 34; y < 40; y++) sim.setCell(x, y, MAT.SAND);
  sim.blastAt(30, 33, 6);
  runTicks(sim, 3);
  const flying = sim.view.debris.count;
  assert.ok(flying > 0);
  const h0 = hashView(sim);
  sim.beginStroke();
  sim.paintAt(5, 5, { material: MAT.STONE, size: 1, shape: 'square' });
  sim.endStroke();
  runTicks(sim, 5);
  sim.undo();
  assert.equal(sim.view.debris.count, flying);
  assert.equal(hashView(sim), h0);
  const y0 = sim.view.debris.y[0];
  const vy0 = sim._debris.vy[0];
  sim.flipVertical();
  assert.equal(sim.view.debris.y[0], 40 - y0);
  assert.equal(sim._debris.vy[0], -vy0);
  runTicks(sim, 300);
  assert.deepEqual(sim.world.checkInvariants(), []);
});

test('temizle ve sahne yükleme havuzu boşaltır; istatistikteki parçacık sayısı havuzu içerir', () => {
  const sim = new Simulation({ width: 40, height: 30 });
  for (let x = 10; x < 30; x++) sim.setCell(x, 29, MAT.SAND);
  const p0 = sim.getStats().particles;
  sim.blastAt(20, 28, 5);
  // Savrulan kum havuzda sayılır; patlama ayrıca ateş ve duman üretir, sayı azalmaz.
  assert.ok(sim.getStats().debris > 0);
  assert.ok(sim.getStats().particles >= p0, `parçacık ${sim.getStats().particles} < ${p0}`);
  sim.clear();
  assert.equal(sim.view.debris.count, 0);
});

test('havuz doluysa hücre yerinde kalır; kapasite aşılmaz', () => {
  const pool = new DebrisPool(4);
  const sim = new Simulation({ width: 10, height: 10 });
  const w = sim.world;
  let ok = 0;
  for (let k = 0; k < 6; k++) {
    const i = w.index(k, 9);
    w.set(i, MAT.SAND, 0, 0, 0, 20);
    if (pool.launch(w, i, MAT.SAND, 1, -2)) ok++;
  }
  assert.equal(ok, 4);
  assert.equal(pool.count, 4);
  assert.equal(countMaterial(sim, MAT.SAND), 2);
  assert.equal(DEBRIS.CAPACITY, 2000);
});

test('parçacıklı patlamalar deterministiktir', () => {
  const run = () => {
    const sim = new Simulation({ width: 80, height: 50, seed: 'det-debris' });
    for (let x = 20; x < 60; x++) for (let y = 35; y < 50; y++) sim.setCell(x, y, (x + y) % 3 ? MAT.SAND : MAT.WATER);
    requestExplosion(sim._blast, 40, 35, 60, BLAST_KIND.TOOL);
    runTicks(sim, 120);
    return hashView(sim);
  };
  assert.equal(run(), run());
});

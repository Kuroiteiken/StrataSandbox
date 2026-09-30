import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { Simulation, SPEEDS } from '../js/engine/simulation.js';
import { makeSim, cellType } from './helpers.js';

const fallingSand = () => makeSim(`
  ..S..
  .....
  .....
  .....
  .....
  .....
  .....
  .....
`);

test('step() pause durumunda da tam olarak bir tick çalıştırır', () => {
  const sim = fallingSand();
  sim.pause();
  const before = sim.tick;
  sim.step();
  assert.equal(sim.tick, before + 1);
  assert.equal(cellType(sim, 2, 1), MAT.SAND);
});

test('pause durumunda update() hiçbir tick çalıştırmaz', () => {
  const sim = fallingSand();
  sim.pause();
  assert.equal(sim.update(1000), 0);
  assert.equal(sim.tick, 0);
  assert.equal(cellType(sim, 2, 0), MAT.SAND);
  assert.equal(sim.isPaused, true);
  sim.play();
  assert.equal(sim.isPaused, false);
  assert.ok(sim.update(50) > 0);
});

test('update() hızla ölçeklenmiş sabit tick oranı uygular (60 TPS taban)', () => {
  // 1× = 60 TPS: 50 ms → 3 tick.
  assert.equal(new Simulation({ width: 4, height: 4 }).update(50), 3);
  const cases = [
    [0.5, 80, 2], // 30 TPS
    [1, 80, 4], // 60 TPS
    [2, 40, 4], // 120 TPS
    [4, 20, 4], // 240 TPS
  ];
  for (const [speed, dt, expected] of cases) {
    const sim = new Simulation({ width: 4, height: 4 });
    sim.setSpeed(speed);
    assert.equal(sim.update(dt), expected, `hız ${speed}×, dt ${dt} ms`);
  }
});

test('update() kalan süreyi bir sonraki çağrıya taşır', () => {
  const sim = new Simulation({ width: 4, height: 4 });
  assert.equal(sim.update(10), 0);
  assert.equal(sim.update(10), 1);
});

test('uzun duraklamalardan sonra büyük dt kırpılır (devasa catch-up yok)', () => {
  const sim = new Simulation({ width: 4, height: 4 });
  // 100 ms sınırı: 1× hızda en fazla 6 tick.
  assert.equal(sim.update(5000), 6);
});

test('frame başına tick sınırı aşılınca birikmiş borç silinir', () => {
  const sim = new Simulation({ width: 4, height: 4 });
  sim.setSpeed(4);
  // 100 ms × 240 TPS = 24 tick istenir; sınır 8.
  assert.equal(sim.update(100), 8);
  assert.equal(sim.update(0), 0, 'borç bir sonraki frame\'e taşınmamalı');
});

test('NaN, undefined veya negatif dt fizik zamanlamasını bozmaz', () => {
  for (const bad of [NaN, undefined, -20, -Infinity]) {
    const sim = new Simulation({ width: 4, height: 4 });
    assert.equal(sim.update(bad), 0, `dt=${bad}`);
    assert.equal(sim.update(50), 3, `dt=${bad} sonrası zamanlama çalışmaya devam etmeli`);
  }
});

test('fizik bütçesi dolunca update() durur ama en az bir tick çalıştırır', () => {
  const sim = new Simulation({ width: 4, height: 4 });
  assert.equal(sim.update(100, 0), 1);
});

test('resetTiming birikmiş zamanı siler', () => {
  const sim = new Simulation({ width: 4, height: 4 });
  sim.update(10);
  sim.resetTiming();
  assert.equal(sim.update(10), 0);
});

test('setSpeed yalnızca desteklenen hızları kabul eder', () => {
  const sim = new Simulation({ width: 4, height: 4 });
  assert.deepEqual([...SPEEDS], [0.5, 1, 2, 4]);
  assert.throws(() => sim.setSpeed(3), RangeError);
  assert.throws(() => sim.setSpeed(0), RangeError);
  sim.setSpeed(2);
  assert.equal(sim.speed, 2);
});

test('setCell dünya dışını reddeder ve kenar çerçevesini bozmaz', () => {
  const sim = new Simulation({ width: 4, height: 4, debug: true });
  assert.equal(sim.setCell(-1, 0, MAT.SAND), false);
  assert.equal(sim.setCell(4, 0, MAT.SAND), false);
  assert.equal(sim.setCell(0, 4, MAT.SAND), false);
  assert.equal(sim.setCell(1, 1, MAT.SAND), true);
  sim.step(); // debug modunda kenar bozulsaydı hata fırlardı
});

test('setCell ve getCell tam sayı olmayan koordinatları reddeder (sayaçlar bozulmaz)', () => {
  const sim = new Simulation({ width: 4, height: 4, debug: true });
  assert.equal(sim.setCell(1.5, 2, MAT.SAND), false);
  assert.equal(sim.setCell(1, NaN, MAT.SAND), false);
  assert.equal(sim.getCell(1.5, 0), null);
  assert.equal(sim.getStats().particles, 0);
  sim.step(); // debug: sayaç tutarsızlığı olsaydı hata fırlardı
});

test('setCell iç materyal (WALL) yazmayı reddeder', () => {
  const sim = new Simulation({ width: 4, height: 4 });
  assert.equal(sim.setCell(1, 1, MAT.WALL), false);
  assert.equal(cellType(sim, 1, 1), MAT.EMPTY);
});

test('getCell hücre materyalini döner, dünya dışında null döner', () => {
  const sim = new Simulation({ width: 4, height: 4 });
  sim.setCell(2, 3, MAT.STONE);
  assert.equal(sim.getCell(2, 3).material, MAT.STONE);
  assert.equal(sim.getCell(0, 0).material, MAT.EMPTY);
  assert.equal(sim.getCell(9, 9), null);
});

test('getStats parçacık sayısını ve tick\'i raporlar', () => {
  const sim = makeSim(`
    S.S
    ...
    .#.
  `);
  sim.step();
  const stats = sim.getStats();
  assert.equal(stats.particles, 3);
  assert.equal(stats.tick, 1);
  assert.equal(stats.width, 3);
  assert.equal(stats.height, 3);
  assert.ok(stats.activeCells >= 2, `activeCells=${stats.activeCells}`);
});

test('debug modunda bozulan dünya değişmezi tick sırasında yakalanır', () => {
  const sim = new Simulation({ width: 4, height: 4, debug: true });
  sim.world.type[0] = MAT.EMPTY; // kenar çerçevesini boz
  assert.throws(() => sim.step(), /kenar/);
});

test('clear dünyayı boşaltır ama kenarı korur', () => {
  const sim = makeSim(`
    SS
    ##
  `);
  sim.clear();
  assert.equal(sim.getStats().particles, 0);
  assert.deepEqual(sim.world.checkInvariants(), []);
});

test('view her tick\'te version sayacını artırır', () => {
  const sim = new Simulation({ width: 4, height: 4 });
  const v0 = sim.view.version;
  sim.step();
  assert.ok(sim.view.version > v0);
  const v1 = sim.view.version;
  sim.setCell(1, 1, MAT.SAND);
  assert.ok(sim.view.version > v1, 'setCell de görünümü kirletmeli');
});

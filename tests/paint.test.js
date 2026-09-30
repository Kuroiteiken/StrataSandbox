import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { Simulation, TOOL_DELTA, TOOL_MIN, TOOL_MAX } from '../js/engine/simulation.js';
import { footprint } from '../js/engine/brush.js';
import { countMaterial, cellType, runTicks, hashView, toAscii } from './helpers.js';

const brush = (material, size = 5, shape = 'circle', replace = false) => ({ material, size, shape, replace });

test('paintAt fırça footprint\'i kadar hücreyi boyar', () => {
  const sim = new Simulation({ width: 40, height: 30, debug: true });
  const n = sim.paintAt(20, 15, brush(MAT.STONE, 7));
  assert.equal(n, footprint('circle', 7).length / 2);
  assert.equal(countMaterial(sim, MAT.STONE), n);
});

test('varsayılan fırça dolu hücrelerin üzerine yazmaz; replace modu yazar', () => {
  const sim = new Simulation({ width: 20, height: 10 });
  sim.paintAt(10, 5, brush(MAT.STONE, 3, 'square'));
  assert.equal(sim.paintAt(10, 5, brush(MAT.SAND, 3, 'square')), 0);
  assert.equal(countMaterial(sim, MAT.STONE), 9);
  assert.equal(sim.paintAt(10, 5, brush(MAT.SAND, 3, 'square', true)), 9);
  assert.equal(countMaterial(sim, MAT.SAND), 9);
});

test('gaz hücrelerine varsayılan modda da yazılır', () => {
  const sim = new Simulation({ width: 10, height: 10 });
  sim.setCell(5, 5, MAT.STEAM);
  assert.equal(sim.paintAt(5, 5, brush(MAT.STONE, 1)), 1);
  assert.equal(cellType(sim, 5, 5), MAT.STONE);
});

test('silgi (EMPTY) her materyali siler', () => {
  const sim = new Simulation({ width: 20, height: 10 });
  sim.paintAt(10, 5, brush(MAT.STONE, 5, 'square'));
  sim.paintAt(10, 5, brush(MAT.EMPTY, 5, 'square'));
  assert.equal(sim.getStats().particles, 0);
});

test('dünya kenarında boyamak çerçeveyi bozmaz ve dışarıyı atlar', () => {
  const sim = new Simulation({ width: 10, height: 8, debug: true });
  sim.paintAt(0, 0, brush(MAT.STONE, 9, 'square', true));
  sim.paintAt(9, 7, brush(MAT.EMPTY, 9, 'square'));
  assert.deepEqual(sim.world.checkInvariants(), []);
  assert.equal(sim.paintAt(-20, -20, brush(MAT.STONE, 3)), 0);
});

test('WALL fırça ile boyanamaz', () => {
  const sim = new Simulation({ width: 10, height: 8 });
  assert.equal(sim.paintAt(5, 4, brush(MAT.WALL, 3)), 0);
});

test('spray footprint\'in bir alt kümesini boyar ve seed ile deterministiktir', () => {
  const run = (seed) => {
    const sim = new Simulation({ width: 40, height: 40, seed });
    sim.paintAt(20, 20, brush(MAT.SAND, 16, 'spray'));
    return [countMaterial(sim, MAT.SAND), hashView(sim)];
  };
  const [n, h] = run('spray');
  const full = footprint('circle', 16).length / 2;
  assert.ok(n > 0 && n < full / 2, `spray=${n} footprint=${full}`);
  assert.deepEqual(run('spray'), [n, h]);
});

test('spray boyaması fizik RNG\'sini tüketmez (sonraki fizik dizisi değişmez)', () => {
  const physicsAfter = (spray) => {
    const sim = new Simulation({ width: 30, height: 20, seed: 'rng-iso' });
    sim.paintAt(15, 2, brush(MAT.SAND, 9, 'square'));
    if (spray) sim.paintAt(5, 15, brush(MAT.STONE, 3, 'spray'));
    return sim.rng.getState().join(',');
  };
  assert.equal(physicsAfter(true), physicsAfter(false));
});

test('paintLine hızlı çapraz harekette boşluksuz çizgi bırakır', () => {
  const sim = new Simulation({ width: 50, height: 30 });
  sim.paintLine(2, 3, 40, 25, brush(MAT.STONE, 1));
  assert.equal(countMaterial(sim, MAT.STONE), 39); // max(|dx|, |dy|) + 1
});

test('tek hücrelik çapraz taş çizgi suyu geçirmez (köşe kuralı)', () => {
  const sim = new Simulation({ width: 24, height: 24, seed: 'leak', debug: true });
  // Sol üstten sağ alta çapraz duvar; suyu duvarın üst-sağ tarafına doldur.
  sim.paintLine(0, 0, 23, 23, brush(MAT.STONE, 1));
  for (let y = 0; y < 23; y++) for (let x = y + 1; x < 24; x++) sim.setCell(x, y, MAT.WATER);
  const water = countMaterial(sim, MAT.WATER);
  runTicks(sim, 400);
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < y; x++) assert.notEqual(cellType(sim, x, y), MAT.WATER, `sızıntı (${x},${y})\n${toAscii(sim)}`);
  }
  assert.equal(countMaterial(sim, MAT.WATER), water);
});

test('pause durumunda boyama çalışır ve tick ilerlemez', () => {
  const sim = new Simulation({ width: 20, height: 20 });
  sim.pause();
  const v = sim.view.version;
  sim.paintAt(10, 10, brush(MAT.SAND, 3));
  sim.update(100);
  assert.ok(sim.view.version > v);
  assert.equal(sim.tick, 0);
});

test('basılı tutma (hold) her tick fırçayı yeniden uygular; bırakınca durur', () => {
  const sim = new Simulation({ width: 30, height: 40 });
  sim.setHold(15, 0, brush(MAT.SAND, 1));
  runTicks(sim, 30);
  const flowing = countMaterial(sim, MAT.SAND);
  assert.ok(flowing >= 20, `akış: ${flowing}`);
  sim.releaseHold();
  runTicks(sim, 30);
  assert.equal(countMaterial(sim, MAT.SAND), flowing);
});

// ---- Undo ----

test('undo dünyayı stroke başındaki ana birebir döndürür (sonraki simülasyon dahil)', () => {
  const base = () => {
    const sim = new Simulation({ width: 40, height: 30, seed: 'undo' });
    sim.paintAt(20, 3, brush(MAT.SAND, 9));
    sim.paintAt(10, 20, brush(MAT.WATER, 7));
    runTicks(sim, 20);
    return sim;
  };
  const reference = base();
  runTicks(reference, 50);

  const sim = base();
  sim.beginStroke();
  sim.paintLine(0, 10, 39, 12, brush(MAT.STONE, 3));
  sim.endStroke();
  runTicks(sim, 40);
  assert.equal(sim.canUndo, true);
  assert.equal(sim.undo(), true);
  runTicks(sim, 50);
  assert.equal(hashView(sim), hashView(reference));
  assert.equal(sim.tick, reference.tick);
});

test('undo tek seviyelidir; ikinci undo bir şey yapmaz', () => {
  const sim = new Simulation({ width: 20, height: 20 });
  sim.beginStroke();
  sim.paintAt(5, 5, brush(MAT.STONE, 3));
  sim.endStroke();
  assert.equal(sim.undo(), true);
  assert.equal(sim.canUndo, false);
  assert.equal(sim.undo(), false);
});

test('hiçbir şey boyamayan stroke önceki undo noktasını silmez', () => {
  const sim = new Simulation({ width: 20, height: 20 });
  sim.beginStroke();
  sim.paintAt(5, 5, brush(MAT.STONE, 3, 'square'));
  sim.endStroke();
  sim.beginStroke();
  sim.paintAt(5, 5, brush(MAT.SAND, 3, 'square')); // dolu hücreler: hiçbir şey boyanmaz
  sim.endStroke();
  assert.equal(sim.undo(), true);
  assert.equal(countMaterial(sim, MAT.STONE), 0, 'ilk stroke geri alınmalıydı');
});

test('clear geri alınabilir', () => {
  const sim = new Simulation({ width: 20, height: 20, debug: true });
  sim.paintAt(10, 10, brush(MAT.STONE, 5, 'square'));
  sim.clear();
  assert.equal(sim.getStats().particles, 0);
  assert.equal(sim.undo(), true);
  assert.equal(countMaterial(sim, MAT.STONE), 25);
  sim.step(); // debug: sayaçlar da geri yüklenmiş olmalı
});

test('tekrarlanan stroke\'lar yeni snapshot tamponu ayırmaz (bellek sınırlı)', () => {
  const sim = new Simulation({ width: 30, height: 30 });
  sim.beginStroke();
  sim.paintAt(5, 5, brush(MAT.STONE, 3));
  sim.endStroke();
  sim.beginStroke(); // ikinci tampon da ayrılsın
  sim.paintAt(8, 8, brush(MAT.STONE, 3));
  sim.endStroke();
  const before = [...sim._snapshots];
  for (let k = 0; k < 20; k++) {
    sim.beginStroke();
    sim.paintAt(k, 10, brush(MAT.SAND, 3));
    sim.endStroke();
  }
  assert.equal(sim._snapshots.length, 2);
  for (const snap of sim._snapshots) assert.ok(before.includes(snap), 'yeni snapshot tamponu ayrıldı');
});

test('undo sonrası view version artar (renderer yeniden çizer)', () => {
  const sim = new Simulation({ width: 10, height: 10 });
  sim.beginStroke();
  sim.paintAt(5, 5, brush(MAT.STONE, 1));
  sim.endStroke();
  const v = sim.view.version;
  sim.undo();
  assert.ok(sim.view.version > v);
});

const HEAT = { material: MAT.EMPTY, tool: 'heat', size: 1, shape: 'square' };
const COOL = { material: MAT.EMPTY, tool: 'cool', size: 1, shape: 'square' };

test('Isıt fırçası sıcaklığı TOOL_DELTA artırır ve materyale dokunmaz', () => {
  const sim = new Simulation({ width: 6, height: 6 });
  sim.setCell(2, 2, MAT.STONE);
  const types = [...sim.view.type];
  const before = sim.getCell(2, 2).temp;
  assert.equal(sim.paintAt(2, 2, HEAT), 1);
  assert.equal(sim.getCell(2, 2).temp, before + TOOL_DELTA);
  assert.deepEqual([...sim.view.type], types);
});

function maxRise(sim, before) {
  let rise = 0;
  const t = sim.view.temp;
  for (let i = 0; i < t.length; i++) rise = Math.max(rise, t[i] - before[i]);
  return rise;
}

test('Isıt sürüklenirken birikmez: her hücre tick başına en fazla bir kez TOOL_DELTA alır', () => {
  for (const size of [1, 6, 16]) {
    // Tek çağrıda uzun çizgi: fırça ayak izleri üst üste biner.
    const a = new Simulation({ width: 48, height: 24 });
    const before = Float32Array.from(a.view.temp);
    a.beginStroke();
    a.paintLine(4, 12, 40, 12, { ...HEAT, size, shape: 'circle' });
    a.endStroke();
    assert.equal(maxRise(a, before), TOOL_DELTA, `tek çağrı, boyut ${size}`);
    // İşaretçi gibi bir hücrelik ardışık parçalar (uç noktalar ortak).
    const b = new Simulation({ width: 48, height: 24 });
    b.beginStroke();
    for (let x = 4; x < 40; x++) b.paintLine(x, 12, x + 1, 12, { ...HEAT, size, shape: 'circle' });
    b.endStroke();
    assert.equal(maxRise(b, before), TOOL_DELTA, `ardışık parçalar, boyut ${size}`);
  }
});

test('Isıt: yeni tick ve yeni stroke yeniden uygular (basılı tutma ve duraklatılmış tekrar)', () => {
  const sim = new Simulation({ width: 6, height: 6 });
  sim.setCell(2, 2, MAT.STONE);
  const t0 = sim.getCell(2, 2).temp;
  sim.beginStroke();
  sim.paintAt(2, 2, HEAT);
  sim.paintAt(2, 2, HEAT); // aynı tick, aynı stroke: etkisiz
  sim.endStroke();
  assert.equal(sim.getCell(2, 2).temp, t0 + TOOL_DELTA);
  sim.beginStroke();
  sim.paintAt(2, 2, HEAT); // duraklatılmışken yeni stroke: yeniden uygular
  sim.endStroke();
  assert.equal(sim.getCell(2, 2).temp, t0 + 2 * TOOL_DELTA);
  // Basılı tutma tick başına bir kez uygular; aynı tick'teki işaretçi olayı ikinci kez eklemez.
  const h = new Simulation({ width: 6, height: 6 });
  h.setCell(2, 2, MAT.METAL);
  h.beginStroke();
  h.setHold(2, 2, { ...HEAT, size: 1 });
  let prev = h.getCell(2, 2).temp;
  for (let k = 0; k < 3; k++) {
    h.step();
    h.paintAt(2, 2, HEAT);
    const now = h.getCell(2, 2).temp;
    assert.ok(now - prev > 0 && now - prev <= TOOL_DELTA + 1e-3, `tick ${k}: artış ${now - prev}`);
    prev = now;
  }
  h.releaseHold();
  h.endStroke();
});

test('uzun basılı tutma sınırları aşmaz ve değişmezleri bozmaz', () => {
  const sim = new Simulation({ width: 8, height: 8, debug: true });
  sim.setCell(3, 3, MAT.GLASS);
  sim.setHold(3, 3, { ...HEAT, size: 3 });
  for (let t = 0; t < 200; t++) sim.step();
  sim.releaseHold();
  let max = -Infinity;
  for (const v of sim.view.temp) max = Math.max(max, v);
  assert.ok(max <= TOOL_MAX, `en yüksek ${max}`);
  sim.setHold(3, 3, { ...COOL, size: 3 });
  for (let t = 0; t < 400; t++) sim.step();
  let min = Infinity;
  for (const v of sim.view.temp) min = Math.min(min, v);
  assert.ok(min >= TOOL_MIN, `en düşük ${min}`);
});

test('ısıt stroke\'u geri alınır; undo sıcaklıkları geri getirir', () => {
  const sim = new Simulation({ width: 6, height: 6 });
  sim.setCell(2, 2, MAT.STONE);
  const before = hashView(sim);
  sim.beginStroke();
  sim.paintAt(2, 2, { ...HEAT, size: 3 });
  sim.endStroke();
  assert.equal(sim.canUndo, true, 'yalnızca sıcaklık değişse de undo noktası oluşmalı');
  sim.undo();
  assert.equal(hashView(sim), before);
});

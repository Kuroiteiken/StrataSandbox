// Faz geçişleri (gizli ısı), sıcaklıkla tutuşma ve buharlaşma (heat.js, ADR-015).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { countMaterial, runTicks, cellType, makeSim } from './helpers.js';

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

function firstTick(sim, max, pred) {
  for (let t = 0; t < max; t++) {
    sim.step();
    if (pred(sim)) return t + 1;
  }
  return -1;
}

test('göl yüzeyden donar: soğuyan havada ilk buz en üst sırada, alt sıra en son', () => {
  const sim = withAmbient(new Simulation({ width: 24, height: 16, seed: 'freeze' }), 10);
  fill(sim, 0, 8, 23, 15, MAT.STONE);
  fill(sim, 6, 8, 17, 12, MAT.WATER); // taşa oyulmuş göl, yüzey satırı 8
  sim.setAmbient(-15);
  const t = firstTick(sim, 30000, (s) => countMaterial(s, MAT.ICE) > 0);
  assert.ok(t > 0, 'buz oluşmadı');
  for (let y = 9; y <= 12; y++) for (let x = 6; x <= 17; x++) assert.notEqual(cellType(sim, x, y), MAT.ICE, `ilk buz yüzeyde olmalı (${x},${y})`);
  firstTick(sim, 60000, (s) => {
    for (let x = 6; x <= 17; x++) if (cellType(s, x, 8) !== MAT.ICE) return false;
    return true;
  });
  assert.ok([...Array(12).keys()].some((k) => cellType(sim, 6 + k, 12) === MAT.WATER), 'yüzey donduğunda dip hâlâ su');
});

test('ortam ısınınca buz çözülür', () => {
  const sim = new Simulation({ width: 8, height: 6, seed: 'thaw' });
  fill(sim, 2, 3, 5, 5, MAT.ICE);
  sim.setAmbient(15);
  const t = firstTick(sim, 30000, (s) => countMaterial(s, MAT.ICE) === 0);
  assert.ok(t > 0);
  assert.ok(countMaterial(sim, MAT.WATER) > 0);
});

test('lavın yanındaki buz gizli ısı nedeniyle hemen erimez ama erir', () => {
  const sim = makeSim(`
    ......
    .II...
    .IILLL
    ######
  `, { seed: 'ice-lava' });
  runTicks(sim, 5);
  assert.equal(countMaterial(sim, MAT.ICE), 4, 'ilk 5 tick\'te erimemeli');
  assert.ok(firstTick(sim, 2000, (s) => countMaterial(s, MAT.ICE) === 0) > 0);
});

test('metal ısıyı aynı boydaki taştan çok daha hızlı iletir', () => {
  const rodTemp = (mat) => {
    const sim = new Simulation({ width: 40, height: 5, seed: 'rod' });
    sim.setCell(0, 2, MAT.MAGMA);
    for (let x = 1; x < 32; x++) sim.setCell(x, 2, mat);
    runTicks(sim, 600);
    return sim.getCell(10, 2).temp;
  };
  const metal = rodTemp(MAT.METAL);
  const stone = rodTemp(MAT.STONE);
  assert.ok(metal > stone + 50, `metal=${metal.toFixed(1)} taş=${stone.toFixed(1)}`);
});

test('en iletken materyalde (metal) bile değerler başlangıç aralığında kalır', () => {
  const sim = new Simulation({ width: 12, height: 12 });
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    sim.setCell(x, y, MAT.METAL);
    sim.setTemp(x, y, (x + y) % 2 === 0 ? 1000 : 20);
  }
  for (let k = 0; k < 10; k++) {
    sim.step();
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
      const v = sim.getCell(x, y).temp;
      assert.ok(v >= 20 - 1e-3 && v <= 1000 + 1e-3, `(${x},${y})=${v}`);
    }
  }
});

test('erimiş metal soğuyunca metale, metal 1400 °C üstünde erimiş metale döner', () => {
  const sim = makeSim(`
    ......
    #mmmm#
    ######
  `, { seed: 'cast' });
  assert.ok(firstTick(sim, 5000, (s) => countMaterial(s, MAT.MOLTEN_METAL) === 0) > 0);
  assert.ok(countMaterial(sim, MAT.METAL) >= 4);
  const hot = new Simulation({ width: 3, height: 3, seed: 'remelt' });
  hot.setCell(1, 2, MAT.METAL);
  assert.ok(holdTemp(hot, 1, 2, 1600, 50, (s) => countMaterial(s, MAT.MOLTEN_METAL) > 0) > 0);
});

test('kar suyun üstünde yüzer ve ılık havada erir', () => {
  const sim = withAmbient(new Simulation({ width: 6, height: 8, seed: 'snow' }), 0);
  fill(sim, 0, 5, 5, 7, MAT.WATER);
  sim.setCell(2, 0, MAT.SNOW);
  runTicks(sim, 100);
  let snowY = -1;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) if (cellType(sim, x, y) === MAT.SNOW) snowY = y;
  assert.ok(snowY >= 0 && snowY < 5, `kar suyun üstünde olmalı (y=${snowY})`);
  sim.setAmbient(12);
  assert.ok(firstTick(sim, 5000, (s) => countMaterial(s, MAT.SNOW) === 0) > 0);
});

test('0 °C ortamda buz–su sınırı titreşmez (histerezis)', () => {
  const sim = withAmbient(new Simulation({ width: 10, height: 6, seed: 'hyst' }), 0);
  fill(sim, 0, 3, 9, 5, MAT.STONE);
  fill(sim, 1, 2, 4, 2, MAT.ICE);
  fill(sim, 5, 2, 8, 2, MAT.WATER);
  let changes = 0;
  let prev = [...sim.view.type];
  for (let t = 0; t < 3000; t++) {
    sim.step();
    const cur = sim.view.type;
    for (let i = 0; i < cur.length; i++) if (cur[i] !== prev[i] && (cur[i] === MAT.ICE || prev[i] === MAT.ICE)) changes++;
    prev = [...cur];
  }
  assert.ok(changes <= 8, `buz↔su geçişi ${changes}`);
});

test('magma sabit 1200 °C kaynak ve statik', () => {
  const sim = new Simulation({ width: 4, height: 4 });
  sim.setCell(1, 1, MAT.MAGMA);
  runTicks(sim, 100);
  assert.equal(cellType(sim, 1, 1), MAT.MAGMA);
  assert.ok(sim.getCell(1, 1).temp >= 1200);
});

test('eşiğin çok az üstünde bekleyen buz da sonunda erir (küçük ısı fazlası kaybolmaz)', () => {
  const sim = withAmbient(new Simulation({ width: 1, height: 1, seed: 'tiny-excess' }), 2);
  sim.setCell(0, 0, MAT.ICE);
  sim.setTemp(0, 0, 0);
  assert.ok(firstTick(sim, 60000, (s) => countMaterial(s, MAT.ICE) === 0) > 0, '2 °C ortamda buz erimedi');
});

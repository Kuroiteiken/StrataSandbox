import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { makeSim, toAscii, countMaterial, runTicks, cellType } from './helpers.js';

const count = (sim, ...mats) => mats.reduce((n, m) => n + countMaterial(sim, m), 0);

function fill(sim, x0, y0, x1, y1, mat) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) sim.setCell(x, y, mat);
}

// Belirli bir süre boyunca koşulun en az bir kez sağlandığı tick'i döner (yoksa -1).
function firstTickWhere(sim, maxTicks, predicate) {
  for (let t = 0; t < maxTicks; t++) {
    sim.step();
    if (predicate(sim)) return t + 1;
  }
  return -1;
}

// ---------- Fire ----------

test('Yakıtsız ateş ömrü bitince söner', () => {
  const sim = makeSim(`
    .....
    .....
    .....
    ..f..
  `);
  runTicks(sim, 80);
  assert.equal(countMaterial(sim, MAT.FIRE), 0, toAscii(sim));
});

test('Ateş temas ettiği odunu tutuşturur', () => {
  const sim = makeSim(`
    WWWWW
    WWWWW
    .fff.
    #####
  `, { seed: 'ignite' });
  const t = firstTickWhere(sim, 200, (s) => countMaterial(s, MAT.BURNING_WOOD) > 0);
  assert.ok(t > 0, 'odun hiç tutuşmadı');
});

test('Yanan odun ateş üretir ve zamanla tamamen tükenir (kül ya da boşluk kalır)', () => {
  const sim = new Simulation({ width: 20, height: 20, seed: 'burn', debug: true });
  fill(sim, 7, 12, 12, 17, MAT.WOOD); // 36 odun
  sim.setCell(9, 18, MAT.FIRE);
  sim.setCell(10, 18, MAT.FIRE);
  let sawFire = false;
  for (let t = 0; t < 6000; t++) {
    sim.step();
    if (countMaterial(sim, MAT.BURNING_WOOD) > 0 && countMaterial(sim, MAT.FIRE) > 0) sawFire = true;
  }
  assert.ok(sawFire, 'yanarken ateş görülmedi');
  assert.equal(count(sim, MAT.WOOD, MAT.BURNING_WOOD), 0, toAscii(sim));
});

test('Yanan odun suyla temas edince söner, su buhara döner', () => {
  const sim = makeSim(`
    ~~~
    ~B~
    ~~~
  `, { seed: 'douse' });
  const t = firstTickWhere(sim, 400, (s) => countMaterial(s, MAT.BURNING_WOOD) === 0);
  assert.ok(t > 0, 'söndürülmedi');
  assert.equal(countMaterial(sim, MAT.WOOD), 1, 'sönen odun yeniden Wood olmalı');
  assert.ok(countMaterial(sim, MAT.STEAM) >= 1, 'buhar oluşmadı');
});

test('Su altındaki yanan kalas söner ve sönük kalır (sönen hücre yeniden tutuşmaz)', () => {
  // Regresyon (0.10.0): söndürme hücrenin 700 °C kaynak sıcaklığını koruyordu, ısı geçişi
  // odunu tutuşma eşiğinin üstünde bulup yeniden yakıyordu.
  for (const [seed, burning, fuel] of [['a', 'B', MAT.WOOD], ['b', 'B', MAT.WOOD], ['c', 'b', MAT.PLANT], ['d', 'B', MAT.WOOD]]) {
    const row = `~~${burning.repeat(16)}~~`;
    const sim = makeSim(['~'.repeat(20), '~'.repeat(20), row, '~'.repeat(20), '~'.repeat(20), '#'.repeat(20)].join('\n'), { seed });
    sim.world.flash = null; // konu yeniden tutuşma; 16 hücrelik buhar patlaması kalası dağıtırdı
    runTicks(sim, 300);
    const lit = count(sim, MAT.BURNING_WOOD, MAT.BURNING_PLANT);
    assert.equal(lit, 0, `seed ${seed}: 300 tick sonra hâlâ ${lit} yanan hücre\n${toAscii(sim)}`);
    assert.ok(countMaterial(sim, fuel) >= 14, `seed ${seed}: kalas kurtarılmalı (${countMaterial(sim, fuel)}/16)`);
    runTicks(sim, 300);
    assert.equal(count(sim, MAT.BURNING_WOOD, MAT.BURNING_PLANT), 0, `seed ${seed}: sönen kalas yeniden tutuştu`);
  }
});

test('Ateş suyla temas edince söner ve suyu buharlaştırır', () => {
  const sim = makeSim(`
    ~~~
    ~f~
    ~~~
  `, { seed: 'fw' });
  const t = firstTickWhere(sim, 60, (s) => countMaterial(s, MAT.STEAM) >= 1);
  assert.ok(t > 0, 'buhar oluşmadı');
  runTicks(sim, 60);
  assert.equal(countMaterial(sim, MAT.FIRE), 0);
});

test('Tek bir ateş bir tick\'te en fazla bir su hücresini buharlaştırır (tek sahip, tek örnek)', () => {
  for (const seed of ['o1', 'o2', 'o3', 'o4', 'o5']) {
    const sim = makeSim(`
      ~~~
      ~f~
      ~~~
    `, { seed });
    sim.step();
    assert.ok(countMaterial(sim, MAT.STEAM) <= 1, `seed ${seed}: ${countMaterial(sim, MAT.STEAM)} buhar`);
  }
});

test('Yangın tek tick\'te birden fazla sıra yukarı zincirlenmez (transform damgası)', () => {
  // Altı yanan geniş yağ bloğu: yağ tutuşma olasılığı yüksek olduğu için damga olmasaydı
  // yeni tutuşan hücreler aynı tick içinde işlenip üst sıraları da tutuştururdu.
  for (const seed of ['c1', 'c2', 'c3']) {
    const sim = new Simulation({ width: 20, height: 12, seed, debug: true });
    fill(sim, 0, 0, 19, 10, MAT.OIL);
    fill(sim, 0, 11, 19, 11, MAT.BURNING_OIL);
    sim.step();
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 20; x++) {
        assert.notEqual(cellType(sim, x, y), MAT.BURNING_OIL, `seed ${seed}: satır ${y} tutuştu`);
      }
    }
  }
});

test('Bitki ateşle tutuşur ve odundan çok daha hızlı yanıp biter', () => {
  const burnTime = (mat) => {
    const sim = new Simulation({ width: 12, height: 12, seed: 'plant-burn' });
    fill(sim, 4, 6, 7, 9, mat);
    sim.setCell(5, 10, MAT.FIRE);
    sim.setCell(6, 10, MAT.FIRE);
    return firstTickWhere(sim, 8000, (s) => count(s, mat, MAT.BURNING_WOOD, MAT.BURNING_PLANT) === 0);
  };
  const plant = burnTime(MAT.PLANT);
  const wood = burnTime(MAT.WOOD);
  assert.ok(plant > 0, 'bitki bitmedi');
  assert.ok(wood > 0, 'odun bitmedi');
  assert.ok(plant * 2 < wood, `bitki=${plant} odun=${wood}`);
});

test('Yağ tutuşunca yanan yağ ateşi tek bir ateş ömründen çok daha uzun süre besler', () => {
  const sim = new Simulation({ width: 16, height: 12, seed: 'oil-fire', debug: true });
  fill(sim, 0, 8, 15, 11, MAT.OIL);
  for (const x of [5, 8, 11]) sim.setCell(x, 7, MAT.FIRE); // yüzeye düşen birkaç kıvılcım
  runTicks(sim, 150); // tek bir ateş en fazla ~30 tick yaşar
  assert.ok(count(sim, MAT.FIRE, MAT.BURNING_OIL) > 0, 'yangın sürmedi');
  runTicks(sim, 6000);
  assert.equal(count(sim, MAT.OIL, MAT.BURNING_OIL), 0, 'yağ tükenmeliydi');
});

// ---------- Lava ----------

test('Lava suyla temas edince su buhara döner ve lava soğuyarak taşa dönüşür', () => {
  const sim = new Simulation({ width: 12, height: 12, seed: 'lava-water', debug: true });
  fill(sim, 0, 9, 11, 11, MAT.LAVA);
  fill(sim, 0, 4, 11, 8, MAT.WATER);
  const t = firstTickWhere(sim, 3000, (s) => countMaterial(s, MAT.STONE) > 0);
  assert.ok(t > 0, 'taş oluşmadı');
  assert.ok(countMaterial(sim, MAT.WATER) < 60, 'su buharlaşmalıydı');
});

test('Lava yanıcı materyalleri tutuşturur', () => {
  const sim = makeSim(`
    WWWW
    LLLL
    ####
  `, { seed: 'lava-wood' });
  const t = firstTickWhere(sim, 600, (s) => countMaterial(s, MAT.BURNING_WOOD) > 0);
  assert.ok(t > 0, toAscii(sim));
});

test('Lavaya uzun süre temas eden kum cama dönüşür, kısa temas dönüştürmez', () => {
  const sim = new Simulation({ width: 10, height: 8, seed: 'glass', debug: true });
  fill(sim, 0, 5, 9, 7, MAT.LAVA);
  fill(sim, 3, 3, 6, 4, MAT.SAND);
  runTicks(sim, 15);
  assert.equal(countMaterial(sim, MAT.GLASS), 0, 'kısa temasta cam oluşmamalı');
  const t = firstTickWhere(sim, 1500, (s) => countMaterial(s, MAT.GLASS) > 0);
  assert.ok(t > 0, 'uzun temasta cam oluşmadı');
});

test('ısınan kum ısı kaynağından uzaklaşınca soğur (ısı kalıcı değil)', () => {
  const sim = new Simulation({ width: 6, height: 6, seed: 'cool' });
  sim.setCell(2, 5, MAT.SAND);
  sim.setTemp(2, 5, 600);
  runTicks(sim, 3000);
  assert.ok(sim.getCell(2, 5).temp < 30);
  assert.equal(cellType(sim, 2, 5), MAT.SAND);
});

test('Yalnız kalan lava zamanla kabuk bağlar (havayla temas soğutur)', () => {
  const sim = makeSim(`
    .....
    .....
    ..L..
    #####
  `, { seed: 'crust' });
  const t = firstTickWhere(sim, 20000, (s) => countMaterial(s, MAT.LAVA) === 0);
  assert.ok(t > 0, 'lava hiç soğumadı');
  assert.equal(countMaterial(sim, MAT.STONE), 6);
});

test('lav dış yüzeyinden katılaşır; ortası en uzun süre sıvı kalır', () => {
  const sim = new Simulation({ width: 16, height: 12, seed: 'crust-pool', debug: true });
  fill(sim, 0, 4, 15, 11, MAT.STONE);
  fill(sim, 3, 4, 12, 9, MAT.LAVA); // taşa oyulmuş, üstü açık havuz
  const edge = [];
  for (let x = 3; x <= 12; x++) edge.push([x, 4], [x, 9]);
  for (let y = 5; y <= 8; y++) edge.push([3, y], [12, y]);
  const t = firstTickWhere(sim, 20000, (s) => edge.filter(([x, y]) => cellType(s, x, y) === MAT.STONE).length >= edge.length / 2);
  assert.ok(t > 0, 'kenar katılaşmadı');
  assert.equal(cellType(sim, 7, 7), MAT.LAVA, 'orta hâlâ sıvı olmalı');
});

// ---------- Steam ----------

test('Kapalı kutudaki buhar zamanla yoğuşur ve suyun bir kısmı geri döner', () => {
  const sim = new Simulation({ width: 12, height: 10, seed: 'condense', debug: true });
  fill(sim, 0, 0, 11, 3, MAT.STEAM); // 48 buhar
  runTicks(sim, 4000);
  assert.equal(countMaterial(sim, MAT.STEAM), 0, toAscii(sim));
  const water = countMaterial(sim, MAT.WATER);
  assert.ok(water >= 15 && water < 48, `geri dönen su=${water}`);
});

// ---------- Plant ----------

test('Bitki su yakınında büyür ve büyüme tüketilen suyla birebir dengelenir', () => {
  const sim = new Simulation({ width: 20, height: 12, seed: 'grow', debug: true });
  fill(sim, 0, 4, 19, 11, MAT.WATER);
  sim.setCell(10, 3, MAT.PLANT);
  const before = count(sim, MAT.PLANT, MAT.WATER);
  runTicks(sim, 3000);
  const plants = countMaterial(sim, MAT.PLANT);
  assert.ok(plants > 1, 'bitki büyümedi');
  assert.equal(count(sim, MAT.PLANT, MAT.WATER), before, 'bitki + su korunmalı');
});

test('Bitki büyümesi sınırlıdır (bütçe mirası)', () => {
  const sim = new Simulation({ width: 60, height: 40, seed: 'bound' });
  fill(sim, 0, 1, 59, 39, MAT.WATER); // 2340 su
  sim.setCell(30, 0, MAT.PLANT);
  runTicks(sim, 20000);
  const plants = countMaterial(sim, MAT.PLANT);
  assert.ok(plants > 10, `bitki=${plants}`);
  assert.ok(plants < 1200, `kontrolsüz büyüme: bitki=${plants}`);
});

test('Su yoksa bitki büyümez', () => {
  const sim = makeSim(`
    .......
    ...P...
    SSSSSSS
  `);
  runTicks(sim, 2000);
  assert.equal(countMaterial(sim, MAT.PLANT), 1);
});

// ---------- Stabilite ----------

test('Lava + su kapalı kutusu 10k tick boyunca stabil ve parçacık sayısı artmaz', () => {
  const sim = new Simulation({ width: 30, height: 20, seed: 'stable', debug: true });
  fill(sim, 0, 14, 29, 19, MAT.LAVA);
  fill(sim, 0, 6, 29, 13, MAT.WATER);
  sim.world.flash = null; // konu kütle korunumu; buhar patlaması (flash.test.js) hücre sayısını değiştirir
  const start = sim.getStats().particles;
  let max = start;
  for (let t = 0; t < 10000; t++) {
    sim.step();
    max = Math.max(max, sim.getStats().particles);
  }
  assert.ok(max <= start, `parçacık sayısı arttı: ${start} → ${max}`);
});

test('Reaksiyonlar deterministiktir: aynı seed aynı sonucu verir', () => {
  const run = () => {
    const sim = new Simulation({ width: 24, height: 16, seed: 'det-react' });
    fill(sim, 0, 12, 23, 15, MAT.LAVA);
    fill(sim, 4, 6, 19, 9, MAT.WOOD);
    fill(sim, 0, 0, 23, 2, MAT.WATER);
    runTicks(sim, 800);
    return [MAT.LAVA, MAT.STONE, MAT.STEAM, MAT.WATER, MAT.WOOD, MAT.BURNING_WOOD, MAT.ASH].map((m) => countMaterial(sim, m));
  };
  assert.deepEqual(run(), run());
});

test('boyanan ateş pozitif ömürle, buhar kaynama noktasının üstünde başlar', () => {
  const sim = new Simulation({ width: 4, height: 4 });
  sim.setCell(1, 1, MAT.FIRE);
  sim.setCell(2, 2, MAT.STEAM);
  assert.ok(sim.getCell(1, 1).life > 0);
  assert.ok(sim.getCell(2, 2).temp >= 100);
  assert.equal(cellType(sim, 1, 1), MAT.FIRE);
});

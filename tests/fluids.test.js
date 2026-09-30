import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { makeSim, toAscii, countMaterial, runTicks, cellType } from './helpers.js';

// Her sütunda materyalin en üst hücresi (yoksa -1) ve sütun başına miktar.
function columnStats(sim, mat) {
  const { width, height } = sim.view;
  const counts = [];
  for (let x = 0; x < width; x++) {
    let n = 0;
    for (let y = 0; y < height; y++) if (cellType(sim, x, y) === mat) n++;
    counts.push(n);
  }
  return counts;
}

function frontX(sim, mat) {
  const { width, height } = sim.view;
  let max = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (cellType(sim, x, y) === mat) max = Math.max(max, x);
  return max;
}

// ---------- Sıvılar ----------

test('Su düşer ve zemine yayılarak tek sıra oluşturur', () => {
  const sim = makeSim(`
    ....~....
    ....~....
    ....~....
    ....~....
    ....~....
    .........
  `);
  runTicks(sim, 200);
  assert.equal(countMaterial(sim, MAT.WATER), 5);
  for (let x = 0; x < 9; x++) {
    for (let y = 0; y < 5; y++) assert.notEqual(cellType(sim, x, y), MAT.WATER, `su zeminde değil:\n${toAscii(sim)}`);
  }
});

test('Baraj yıkılınca su seviyelenir (sütun yükseklik farkı ≤ 1)', () => {
  const W = 20;
  const H = 10;
  const sim = new Simulation({ width: W, height: H, seed: 'dam', debug: true });
  for (let y = 2; y < H; y++) for (let x = 0; x < 4; x++) sim.setCell(x, y, MAT.WATER);
  runTicks(sim, 400);
  const cols = columnStats(sim, MAT.WATER);
  assert.equal(cols.reduce((a, b) => a + b, 0), 32);
  assert.ok(Math.max(...cols) - Math.min(...cols) <= 1, `sütunlar: ${cols.join(',')}`);
});

test('Yağ suyun üstünde yüzer (her sütunda tüm yağ, tüm suyun üstünde)', () => {
  const W = 12;
  const H = 10;
  const sim = new Simulation({ width: W, height: H, seed: 'float', debug: true });
  for (let y = 2; y < 6; y++) for (let x = 0; x < W; x++) sim.setCell(x, y, MAT.WATER);
  for (let y = 6; y < H; y++) for (let x = 0; x < W; x++) sim.setCell(x, y, MAT.OIL);
  runTicks(sim, 3000);
  for (let x = 0; x < W; x++) {
    let lowestOil = -1;
    let highestWater = H;
    for (let y = 0; y < H; y++) {
      const t = cellType(sim, x, y);
      if (t === MAT.OIL) lowestOil = Math.max(lowestOil, y);
      if (t === MAT.WATER) highestWater = Math.min(highestWater, y);
    }
    assert.ok(lowestOil < highestWater, `sütun ${x}: yağ suyun altında kaldı\n${toAscii(sim)}`);
  }
  assert.equal(countMaterial(sim, MAT.WATER), 4 * W);
  assert.equal(countMaterial(sim, MAT.OIL), 4 * W);
});

test('Sand suyun içinden dibe batar', () => {
  const sim = makeSim(`
    .S.
    ~~~
    ~~~
    ~~~
    ~~~
  `);
  runTicks(sim, 200);
  // Kum köşegen de batabilir; dip sıradaki herhangi bir hücrede olmalı.
  assert.ok([0, 1, 2].some((x) => cellType(sim, x, 4) === MAT.SAND), toAscii(sim));
  assert.equal(countMaterial(sim, MAT.WATER), 12);
});

test('Sand yağın içinden dibe batar', () => {
  const sim = makeSim(`
    .S.
    ooo
    ooo
    ooo
  `);
  runTicks(sim, 200);
  assert.ok([0, 1, 2].some((x) => cellType(sim, x, 3) === MAT.SAND), toAscii(sim));
});

test('Sand lavanın üstünde kalır (batmaz; zamanla cama dönüşebilir)', () => {
  const sim = makeSim(`
    .S.
    ...
    LLL
    LLL
  `);
  runTicks(sim, 200);
  const top = cellType(sim, 1, 1);
  assert.ok(top === MAT.SAND || top === MAT.GLASS, toAscii(sim));
  for (let y = 2; y < 4; y++) for (let x = 0; x < 3; x++) assert.notEqual(cellType(sim, x, y), MAT.SAND);
});

test('Lava havada normal hızla (tick başına bir hücre) düşer', () => {
  const sim = makeSim(`
    .L.
    ...
    ...
    ...
  `);
  runTicks(sim, 3);
  assert.equal(cellType(sim, 1, 3), MAT.LAVA, toAscii(sim));
});

function damFront(mat, ticks, seed = 'visc') {
  const sim = new Simulation({ width: 60, height: 8, seed });
  for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) sim.setCell(x, y, mat);
  runTicks(sim, ticks);
  return frontX(sim, mat);
}

test('Viskozite: aynı sürede su yağdan, yağ lavadan daha uzağa yayılır', () => {
  // 15 tick: su henüz karşı duvara ulaşmamışken karşılaştır.
  const water = damFront(MAT.WATER, 15);
  const oil = damFront(MAT.OIL, 15);
  const lava = damFront(MAT.LAVA, 15);
  assert.ok(water > oil && oil > lava, `önler: su=${water} yağ=${oil} lava=${lava}`);
});

test('Lava çok viskozdur: 40 tick\'te birkaç hücreden fazla yayılmaz', () => {
  // Viskozite olmasaydı (her tick yayılma denemesi) ön ~43'e ulaşırdı.
  for (const seed of ['l1', 'l2', 'l3']) {
    const front = damFront(MAT.LAVA, 40, seed);
    assert.ok(front <= 25, `seed ${seed}: lava önü ${front}`);
  }
});

test('Su tek hücrelik taş duvardan tünel açıp geçmez', () => {
  const sim = makeSim(`
    ~~~~#.....
    ~~~~#.....
    ~~~~#.....
  `);
  runTicks(sim, 200);
  for (let y = 0; y < 3; y++) for (let x = 5; x < 10; x++) assert.notEqual(cellType(sim, x, y), MAT.WATER, toAscii(sim));
  assert.equal(countMaterial(sim, MAT.WATER), 12);
});

test('Su çapraz birleşen iki taş arasındaki köşeden sızmaz', () => {
  const sim = makeSim(`
    ~#.
    #..
    ...
  `);
  runTicks(sim, 20);
  assert.equal(cellType(sim, 0, 0), MAT.WATER, toAscii(sim));
});

test('Dünya kenarındaki sıvı çerçeveyi aşmaz ve miktar korunur', () => {
  // debug: kenar bütünlüğü ya da sayaç bozulursa step() hata fırlatır.
  const sim = makeSim(`
    ~........~
    ~........~
    ~~......~~
  `, { seed: 'edge' });
  const water = countMaterial(sim, MAT.WATER);
  runTicks(sim, 300);
  assert.equal(countMaterial(sim, MAT.WATER), water);
});

// Su damlaları taş bölme duvarının tepesine tek tek düşer ve bir bölmeye akar.
// Akış yönü bit'i spawn'da hep aynı başlarsa tüm damlalar aynı tarafa gider.
test('Yeni oluşan su damlalarının akış yönü sağ/sol dengeli', () => {
  let left = 0;
  let right = 0;
  for (const seed of ['w1', 'w2', 'w3', 'w4']) {
    const W = 41;
    const H = 30;
    const sim = new Simulation({ width: W, height: H, seed });
    const cx = 20;
    for (let y = 3; y < H; y++) sim.setCell(cx, y, MAT.STONE);
    for (let n = 0; n < 50; n++) {
      sim.setCell(cx, 0, MAT.WATER);
      runTicks(sim, 8);
    }
    runTicks(sim, 100);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (cellType(sim, x, y) !== MAT.WATER) continue;
        if (x < cx) left++;
        else if (x > cx) right++;
      }
    }
  }
  assert.equal(left + right, 200, 'tüm damlalar bölmelere inmiş olmalı');
  const imbalance = Math.abs(left - right) / (left + right);
  assert.ok(imbalance < 0.2, `sol=${left} sağ=${right}`);
});

test('Su musluğundan akan su kutuya simetrik yayılır (birden çok seed)', () => {
  let left = 0;
  let right = 0;
  for (const seed of ['p1', 'p2', 'p3', 'p4']) {
    const W = 41;
    const sim = new Simulation({ width: W, height: 20, seed });
    for (let t = 0; t < 150; t++) {
      sim.setCell(20, 0, MAT.WATER);
      sim.step();
    }
    runTicks(sim, 30);
    const cols = columnStats(sim, MAT.WATER);
    for (let x = 0; x < W; x++) {
      if (x < 20) left += cols[x];
      else if (x > 20) right += cols[x];
    }
  }
  const imbalance = Math.abs(left - right) / (left + right);
  assert.ok(imbalance < 0.1, `sol=${left} sağ=${right}`);
});

// ---------- Gazlar ----------

test('Buhar boş kutuda tavana yükselir', () => {
  const sim = makeSim(`
    .....
    .....
    .....
    .....
    ..s..
  `);
  runTicks(sim, 30);
  let top = false;
  for (let x = 0; x < 5; x++) if (cellType(sim, x, 0) === MAT.STEAM) top = true;
  assert.ok(top, toAscii(sim));
  assert.equal(countMaterial(sim, MAT.STEAM), 1);
});

test('Ateş parçacığı yükselir', () => {
  const sim = makeSim(`
    .....
    .....
    .....
    ..f..
  `);
  // Hareketi ölç, ömrü değil (ateşin spawn ömrü 10–26 tick).
  sim.world.life[sim.world.index(2, 3)] = 500;
  runTicks(sim, 20);
  let top = false;
  for (let x = 0; x < 5; x++) if (cellType(sim, x, 0) === MAT.FIRE) top = true;
  assert.ok(top, toAscii(sim));
});

test('Yükselen gaz sütunu birlikte hareket eder (yukarıdan aşağı geçiş)', () => {
  const sim = makeSim(`
    .
    .
    s
    s
    s
  `);
  sim.step();
  assert.equal(toAscii(sim), ['.', 's', 's', 's', '.'].join('\n'));
});

test('Su altındaki buhar kabarcığı yüzeye çıkar, su aşağıda kalır', () => {
  const sim = makeSim(`
    ...
    ~~~
    ~~~
    ~~~
    ~s~
  `);
  runTicks(sim, 60);
  let steamRow = -1;
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) if (cellType(sim, x, y) === MAT.STEAM) steamRow = y;
  assert.equal(steamRow, 0, toAscii(sim));
  assert.equal(countMaterial(sim, MAT.WATER), 11);
});

test('Buhar kabarcığı bir tick\'te en fazla bir hücre yükselir (çift hareket yok)', () => {
  const sim = makeSim(`
    ~
    ~
    ~
    ~
    ~
    s
  `);
  sim.step();
  // Kural olmasaydı yukarıdaki her su tanesi kabarcıkla tekrar yer değiştirir ve
  // kabarcık tek tick'te sütunun tepesine çıkardı.
  assert.equal(cellType(sim, 0, 4), MAT.STEAM, toAscii(sim));
  assert.equal(cellType(sim, 0, 5), MAT.WATER);
});

test('Gaz statik tavandan geçmez ve köşeden sızmaz', () => {
  const sim = makeSim(`
    .#.
    #s.
    ...
  `);
  runTicks(sim, 20);
  // Yukarısı ve sol köşe kapalı; tek çıkış sağ üst köşegen, o da yan hücre (1,0)
  // taş olduğu için yasak. Buhar (2,1) üzerinden (2,0)'a ulaşabilir.
  assert.equal(cellType(sim, 1, 0), MAT.STONE);
  assert.equal(countMaterial(sim, MAT.STEAM), 1);
  assert.notEqual(cellType(sim, 0, 0), MAT.STEAM, toAscii(sim));
});

// ---------- Statikler ve korunum ----------

test('Wood, Glass ve Plant akan su ve kum altında yerinden oynamaz', () => {
  const sim = makeSim(`
    SSS~~~
    ......
    W.G.P.
    ......
  `);
  runTicks(sim, 200);
  assert.equal(cellType(sim, 0, 2), MAT.WOOD);
  assert.equal(cellType(sim, 2, 2), MAT.GLASS);
  assert.equal(cellType(sim, 4, 2), MAT.PLANT);
});

test('Birbiriyle reaksiyona girmeyen karışık kutuda her materyalin miktarı korunur', () => {
  const W = 30;
  const H = 20;
  const sim = new Simulation({ width: W, height: H, seed: 'mix', debug: true });
  // Lava ve buhar reaksiyona girdiği için (Phase 3) karışımda yok.
  const mats = [MAT.SAND, MAT.WATER, MAT.OIL, MAT.ASH];
  const expected = new Map(mats.map((m) => [m, 0]));
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < W; x++) {
      const m = mats[(x * 7 + y * 3) % mats.length];
      if ((x + y) % 2 === 0 && sim.setCell(x, y, m)) expected.set(m, expected.get(m) + 1);
    }
  }
  runTicks(sim, 600);
  for (const m of mats) assert.equal(countMaterial(sim, m), expected.get(m), `materyal ${m}`);
});

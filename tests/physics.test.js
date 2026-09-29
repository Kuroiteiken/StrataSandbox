import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { makeSim, toAscii, ascii, countMaterial, runTicks, hashView, cellType } from './helpers.js';
import { Simulation } from '../js/engine/simulation.js';

test('Sand boş alanda her tick tam bir hücre düşer', () => {
  const sim = makeSim(`
    ..S..
    .....
    .....
    .....
    .....
  `);
  sim.step();
  assert.equal(cellType(sim, 2, 1), MAT.SAND);
  assert.equal(countMaterial(sim, MAT.SAND), 1);
  runTicks(sim, 2);
  assert.equal(cellType(sim, 2, 3), MAT.SAND);
});

test('Sand zeminde (dünya kenarında) durur', () => {
  const sim = makeSim(`
    ..S..
    .....
    .....
  `);
  runTicks(sim, 10);
  assert.equal(toAscii(sim), ascii(`
    .....
    .....
    ..S..
  `));
});

test('Düşen Sand sütunu birlikte iner (üst taneler geride kalmaz)', () => {
  const sim = makeSim(`
    S
    S
    S
    .
    .
  `);
  sim.step();
  assert.equal(toAscii(sim), ascii(`
    .
    S
    S
    S
    .
  `));
});

test('Sand, Stone üzerinde durur ve Stone yerinden oynamaz', () => {
  const sim = makeSim(`
    .S.
    ...
    ###
    ...
  `);
  runTicks(sim, 10);
  assert.equal(toAscii(sim), ascii(`
    ...
    .S.
    ###
    ...
  `));
});

test('Üst üste bırakılan Sand kuleye değil yığına dönüşür', () => {
  const sim = makeSim(`
    ...S...
    ...S...
    ...S...
    ...S...
    ...S...
    .......
  `);
  runTicks(sim, 60);
  assert.equal(countMaterial(sim, MAT.SAND), 5);
  // 5 tane için kararlı yığın en fazla 2 hücre yüksekliktedir.
  for (let x = 0; x < 7; x++) {
    let h = 0;
    for (let y = 0; y < 6; y++) if (cellType(sim, x, y) === MAT.SAND) h++;
    assert.ok(h <= 2, `sütun ${x} yüksekliği ${h}:\n${toAscii(sim)}`);
  }
});

test('Sand çapraz birleşen iki Stone arasındaki köşeden sızmaz', () => {
  const sim = makeSim(`
    S#.
    #..
    ...
  `);
  runTicks(sim, 10);
  assert.equal(cellType(sim, 0, 0), MAT.SAND);
});

test('Sand boşluğa doğru köşegen kayar', () => {
  const sim = makeSim(`
    .S.
    .#.
    ...
  `);
  runTicks(sim, 10);
  assert.equal(countMaterial(sim, MAT.SAND), 1);
  assert.equal(cellType(sim, 1, 0), MAT.EMPTY, 'Sand stone tepesinde kalmamalı');
  assert.ok(cellType(sim, 0, 2) === MAT.SAND || cellType(sim, 2, 2) === MAT.SAND, toAscii(sim));
});

test('Kapalı kutuda Sand miktarı korunur', () => {
  const sim = new Simulation({ width: 24, height: 18, seed: 'mass', debug: true });
  let placed = 0;
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 24; x++) {
      if ((x * 7 + y * 13) % 3 === 0 && sim.setCell(x, y, MAT.SAND)) placed++;
    }
  }
  for (let x = 4; x < 20; x++) sim.setCell(x, 12, MAT.STONE);
  runTicks(sim, 400);
  assert.equal(countMaterial(sim, MAT.SAND), placed);
  assert.equal(countMaterial(sim, MAT.STONE), 16);
});

// Merkezden dökülen kumun sol/sağ kütle dengesi (tek seed şans eseri dengeli olabilir; birden çok seed).
function pourImbalance(seed) {
  const W = 41;
  const sim = new Simulation({ width: W, height: 30, seed });
  const center = (W - 1) / 2;
  for (let t = 0; t < 200; t++) {
    sim.setCell(center, 0, MAT.SAND);
    sim.step();
  }
  runTicks(sim, 200);
  let left = 0;
  let right = 0;
  for (let y = 0; y < 30; y++) {
    for (let x = 0; x < W; x++) {
      if (cellType(sim, x, y) !== MAT.SAND) continue;
      if (x < center) left++;
      else if (x > center) right++;
    }
  }
  return { left, right };
}

test('Dökülen kumda kalıcı sol/sağ bias yok', () => {
  let left = 0;
  let right = 0;
  for (const seed of ['b1', 'b2', 'b3', 'b4', 'b5', 'b6']) {
    const r = pourImbalance(seed);
    left += r.left;
    right += r.right;
  }
  const imbalance = Math.abs(left - right) / (left + right);
  assert.ok(imbalance < 0.05, `sol=${left} sağ=${right} dengesizlik=${imbalance.toFixed(3)}`);
});

// Tek tek bırakılan taneler taş bir bölme duvarının tepesine düşer ve sağa ya da
// sola kayarak ayrı bölmelere iner. Taneler birbirine değmez; ölçülen şey saf
// köşegen tercihi.
function spikeChoices(seed) {
  const W = 41;
  const H = 40;
  const sim = new Simulation({ width: W, height: H, seed });
  const cx = 20;
  for (let y = 3; y < H; y++) sim.setCell(cx, y, MAT.STONE);
  for (let n = 0; n < 60; n++) {
    sim.setCell(cx, 0, MAT.SAND);
    runTicks(sim, 6); // tane sivriden kayıp aşağı düşmeye başlar
  }
  runTicks(sim, 60);
  let left = 0;
  let right = 0;
  for (let y = 4; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (cellType(sim, x, y) !== MAT.SAND) continue;
      if (x < cx) left++;
      else if (x > cx) right++;
    }
  }
  return { left, right };
}

test('Köşegen kayma yönü seçimi sağ/sol dengeli', () => {
  let left = 0;
  let right = 0;
  for (const seed of ['s1', 's2', 's3', 's4', 's5', 's6']) {
    const r = spikeChoices(seed);
    left += r.left;
    right += r.right;
  }
  assert.equal(left + right, 360, 'tüm taneler sivriden kaymış olmalı');
  const imbalance = Math.abs(left - right) / (left + right);
  // Adil yazı-tura: std sapma ≈ %5; sabit yön tercihi ≈ %100.
  assert.ok(imbalance < 0.15, `sol=${left} sağ=${right} dengesizlik=${imbalance.toFixed(3)}`);
});

// İki tane aynı boşluk için yarışır; kazanan tarama sırasına bağlıdır.
// Farklı tick paritelerinde başlatılınca kazanan taraf değişmeli (kalıcı bias yok).
test('Aynı hücre için yarışan tanelerde tarama yönü kalıcı avantaj sağlamaz', () => {
  let leftWins = 0;
  let rightWins = 0;
  for (let delay = 0; delay < 20; delay++) {
    const sim = makeSim(`
      ...
      #.#
      ###
    `, { seed: `race-${delay}` });
    runTicks(sim, delay);
    sim.setCell(0, 0, MAT.SAND);
    sim.setCell(2, 0, MAT.SAND);
    runTicks(sim, 5);
    assert.equal(cellType(sim, 1, 1), MAT.SAND, toAscii(sim));
    if (cellType(sim, 0, 0) === MAT.EMPTY) leftWins++;
    if (cellType(sim, 2, 0) === MAT.EMPTY) rightWins++;
  }
  assert.equal(leftWins + rightWins, 20);
  assert.ok(leftWins >= 5 && rightWins >= 5, `sol kazandı=${leftWins} sağ kazandı=${rightWins}`);
});

test('Aynı seed ve başlangıç, 1000 tick sonra aynı dünyayı üretir', () => {
  const run = (seed) => {
    const sim = new Simulation({ width: 32, height: 24, seed });
    for (let t = 0; t < 1000; t++) {
      if (t < 300) sim.setCell(16, 0, MAT.SAND);
      sim.step();
    }
    return hashView(sim);
  };
  assert.equal(run('det'), run('det'));
  assert.notEqual(run('det'), run('det-other'));
});

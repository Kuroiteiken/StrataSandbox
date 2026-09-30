import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../js/engine/world.js';
import { MAT } from '../js/engine/materials.js';

function countType(world, mat) {
  let n = 0;
  for (let i = 0; i < world.size; i++) if (world.type[i] === mat) n++;
  return n;
}

test('yeni dünyanın kenarı WALL, içi EMPTY', () => {
  const w = new World(4, 3);
  // (4+2)×(3+2) = 30 hücre; kenar = 2·6 + 2·3 = 18, iç = 12.
  assert.equal(w.size, 30);
  assert.equal(countType(w, MAT.WALL), 18);
  assert.equal(countType(w, MAT.EMPTY), 12);
});

test('index(x, y) padding\'i hesaba katar ve satırlar stride kadar ayrıktır', () => {
  const w = new World(4, 3); // stride = 6
  assert.equal(w.index(0, 0), 7);
  assert.equal(w.index(1, 0), 8);
  assert.equal(w.index(0, 1), 13);
  assert.equal(w.index(3, 2), 22);
});

test('inBounds yalnızca iç hücreleri kabul eder', () => {
  const w = new World(4, 3);
  assert.equal(w.inBounds(0, 0), true);
  assert.equal(w.inBounds(3, 2), true);
  assert.equal(w.inBounds(-1, 0), false);
  assert.equal(w.inBounds(4, 0), false);
  assert.equal(w.inBounds(0, 3), false);
  assert.equal(w.inBounds(1.5, 0), false);
  assert.equal(w.inBounds(0, NaN), false);
});

test('set hücreyi yazar ve materyal sayaçlarını günceller', () => {
  const w = new World(4, 3);
  const i = w.index(1, 1);
  w.set(i, MAT.SAND, 7, 99, 1);
  assert.equal(w.type[i], MAT.SAND);
  assert.equal(w.variant[i], 7);
  assert.equal(w.life[i], 99);
  assert.equal(w.flags[i], 1);
  assert.equal(w.counts[MAT.SAND], 1);
  assert.equal(w.counts[MAT.EMPTY], 11);

  w.set(i, MAT.STONE, 0, 0, 0);
  assert.equal(w.counts[MAT.SAND], 0);
  assert.equal(w.counts[MAT.STONE], 1);
});

test('swap tüm alanları taşır, iki hücreyi damgalar, sayaçları değiştirmez', () => {
  const w = new World(4, 3);
  const a = w.index(1, 0);
  const b = w.index(1, 1);
  w.set(a, MAT.SAND, 7, 99, 1);
  w.beginTick();
  w.swap(a, b);
  assert.deepEqual([w.type[b], w.variant[b], w.life[b], w.flags[b]], [MAT.SAND, 7, 99, 1]);
  assert.deepEqual([w.type[a], w.variant[a], w.life[a], w.flags[a]], [MAT.EMPTY, 0, 0, 0]);
  assert.equal(w.stamp[a], w.clock);
  assert.equal(w.stamp[b], w.clock);
  assert.equal(w.counts[MAT.SAND], 1);
});

test('transform tipi ve life değerini ayarlar, hücreyi damgalar', () => {
  const w = new World(4, 3);
  const i = w.index(2, 2);
  w.set(i, MAT.SAND, 3, 10, 0);
  w.beginTick();
  w.transform(i, MAT.STONE, 42);
  assert.equal(w.type[i], MAT.STONE);
  assert.equal(w.life[i], 42);
  assert.equal(w.stamp[i], w.clock);
  assert.equal(w.counts[MAT.SAND], 0);
  assert.equal(w.counts[MAT.STONE], 1);
});

test('clear içi boşaltır, kenarı korur, sayaçları sıfırlar', () => {
  const w = new World(4, 3);
  w.set(w.index(0, 0), MAT.SAND, 1, 1, 1);
  w.set(w.index(3, 2), MAT.STONE, 1, 1, 1);
  w.clear();
  assert.equal(countType(w, MAT.WALL), 18);
  assert.equal(countType(w, MAT.EMPTY), 12);
  assert.equal(w.counts[MAT.SAND], 0);
  assert.equal(w.counts[MAT.STONE], 0);
  assert.equal(w.counts[MAT.EMPTY], 12);
});

test('beginTick sonrası önceki tick\'te damgalanan hücre güncellenmiş sayılmaz', () => {
  const w = new World(4, 3);
  const i = w.index(0, 0);
  w.beginTick();
  w.stamp[i] = w.clock;
  w.beginTick();
  assert.notEqual(w.stamp[i], w.clock);
});

test('saat taşınca stamp\'ler sıfırlanır ve saat 1\'den başlar', () => {
  const w = new World(4, 3);
  const i = w.index(0, 0);
  w.stamp[i] = 1; // eski bir tick'ten kalma değer
  w.clock = 65535;
  w.beginTick();
  assert.equal(w.clock, 1);
  assert.equal(w.stamp[i], 0, 'eski stamp yeni saatle çakışmamalı');
});

test('checkInvariants sağlam dünyada boş, bozuk kenarda sorun döner', () => {
  const w = new World(4, 3);
  assert.deepEqual(w.checkInvariants(), []);
  w.type[0] = MAT.EMPTY; // kenarı boz
  assert.ok(w.checkInvariants().length > 0);
});

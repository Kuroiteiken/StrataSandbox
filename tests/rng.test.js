import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rng, hashSeed } from '../js/engine/rng.js';

const take = (rng, n) => Array.from({ length: n }, () => rng.nextU32());

test('aynı seed ve stream aynı diziyi üretir', () => {
  assert.deepEqual(take(new Rng('volcano-42', 'sim'), 50), take(new Rng('volcano-42', 'sim'), 50));
});

test('farklı seed farklı dizi üretir', () => {
  assert.notDeepEqual(take(new Rng('a', 'sim'), 8), take(new Rng('b', 'sim'), 8));
});

test('aynı seed ile farklı stream farklı dizi üretir', () => {
  assert.notDeepEqual(take(new Rng('seed', 'scene'), 8), take(new Rng('seed', 'sim'), 8));
});

test('hashSeed dört adet 32-bit işaretsiz tam sayı döner', () => {
  const h = hashSeed('strata');
  assert.equal(h.length, 4);
  for (const v of h) assert.ok(Number.isInteger(v) && v >= 0 && v <= 0xffffffff);
});

test('next() her zaman [0, 1) aralığında kalır', () => {
  const rng = new Rng('range');
  for (let i = 0; i < 10000; i++) {
    const v = rng.next();
    assert.ok(v >= 0 && v < 1, `aralık dışı: ${v}`);
  }
});

test('int(n) yalnızca 0..n-1 üretir ve dağılımı kabaca düzgündür', () => {
  const rng = new Rng('buckets');
  const buckets = new Array(10).fill(0);
  for (let i = 0; i < 20000; i++) {
    const v = rng.int(10);
    assert.ok(Number.isInteger(v) && v >= 0 && v < 10, `aralık dışı: ${v}`);
    buckets[v]++;
  }
  for (const count of buckets) assert.ok(count > 1600 && count < 2400, `dengesiz kova: ${buckets}`);
});

test('bit() iki değeri de kabaca eşit sıklıkta üretir', () => {
  const rng = new Rng('bits');
  let ones = 0;
  for (let i = 0; i < 10000; i++) ones += rng.bit();
  assert.ok(ones > 4700 && ones < 5300, `ones=${ones}`);
});

test('chance(0) asla, chance(1) her zaman doğru döner', () => {
  const rng = new Rng('chance');
  for (let i = 0; i < 2000; i++) {
    assert.equal(rng.chance(0), false);
    assert.equal(rng.chance(1), true);
  }
});

test('chance(p) yaklaşık p oranında doğru döner', () => {
  const rng = new Rng('chance-p');
  let hits = 0;
  for (let i = 0; i < 20000; i++) if (rng.chance(0.25)) hits++;
  assert.ok(hits > 4600 && hits < 5400, `hits=${hits}`);
});

test('getState / setState diziyi kaldığı yerden aynen sürdürür', () => {
  const rng = new Rng('state');
  take(rng, 17);
  const saved = rng.getState();
  const expected = take(rng, 20);
  rng.setState(saved);
  assert.deepEqual(take(rng, 20), expected);
});

test('getState dönen dizi sonraki çekimlerle değişmez (kopya)', () => {
  const rng = new Rng('copy');
  const saved = rng.getState();
  const before = [...saved];
  take(rng, 5);
  assert.deepEqual([...saved], before);
});

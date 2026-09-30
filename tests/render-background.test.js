import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ridgeProfile } from '../js/render/background.js';

test('sırt profili aynı seed ile aynı, farklı seed ile farklı çıkar', () => {
  const a = ridgeProfile(200, 'seed-a', 1);
  assert.deepEqual([...a], [...ridgeProfile(200, 'seed-a', 1)]);
  assert.notDeepEqual([...a], [...ridgeProfile(200, 'seed-b', 1)]);
  assert.notDeepEqual([...a], [...ridgeProfile(200, 'seed-a', 2)], 'katmanlar farklı olmalı');
});

test('sırt profili istenen uzunlukta ve [0, 1] aralığında', () => {
  const p = ridgeProfile(333, 'x', 0);
  assert.equal(p.length, 333);
  for (const v of p) assert.ok(v >= 0 && v <= 1, `aralık dışı: ${v}`);
});

test('sırt profili pürüzsüzdür (komşu örnekler arasında sıçrama yok)', () => {
  const p = ridgeProfile(400, 'smooth', 0);
  for (let i = 1; i < p.length; i++) assert.ok(Math.abs(p[i] - p[i - 1]) < 0.05, `i=${i}`);
});

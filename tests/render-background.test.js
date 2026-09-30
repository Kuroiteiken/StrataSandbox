import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ridgeProfile, skyColors, starAlpha } from '../js/render/background.js';

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

test('gökyüzü renkleri: gündüz geceden açık, 0.5 bugünkü alacakaranlık', () => {
  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255);
  };
  const night = skyColors(0);
  const day = skyColors(1);
  for (let k = 0; k < 3; k++) assert.ok(lum(day[k]) > lum(night[k]));
  assert.deepEqual(skyColors(0.5), ['#15131c', '#1d1719', '#261b15']);
  assert.equal(starAlpha(0.5), 1);
  assert.ok(starAlpha(0) > starAlpha(1));
});

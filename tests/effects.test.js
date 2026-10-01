// Patlama görsel efektleri (saf hesaplar): yeni patlamaları bulma, parlama solması, sarsıntı genliği ve ofseti.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EFFECTS, forEachNewBlast, shakeAmplitude, flashAlpha, shakeOffset } from '../js/render/effects.js';

function ring(entries) {
  const n = 8;
  const b = { x: new Float32Array(n), y: new Float32Array(n), power: new Float32Array(n), serial: new Uint32Array(n), latest: 0 };
  for (const [x, y, p] of entries) {
    const h = b.latest % n;
    b.x[h] = x;
    b.y[h] = y;
    b.power[h] = p;
    b.latest++;
    b.serial[h] = b.latest;
  }
  return b;
}

test('forEachNewBlast yalnız yeni patlamaları sırayla verir; halka taşınca eskileri atlar', () => {
  const b = ring([[1, 1, 4], [2, 2, 9], [3, 3, 16]]);
  const seen = [];
  const last = forEachNewBlast(b, 1, (x, y, p) => seen.push([x, y, p]));
  assert.deepEqual(seen, [[2, 2, 9], [3, 3, 16]]);
  assert.equal(last, 3);
  const many = ring(Array.from({ length: 12 }, (_, k) => [k, k, k + 1]));
  const got = [];
  forEachNewBlast(many, 0, (x) => got.push(x));
  assert.deepEqual(got, [4, 5, 6, 7, 8, 9, 10, 11], 'halkada kalan son 8');
});

test('sarsıntı yalnız büyük patlamada; genlik √G ile artar ve üst sınırlı', () => {
  assert.equal(shakeAmplitude(EFFECTS.SHAKE_MIN - 1), 0);
  assert.ok(shakeAmplitude(100) > shakeAmplitude(64));
  assert.equal(shakeAmplitude(1e6), EFFECTS.SHAKE_MAX);
});

test('parlama FLASH_FRAMES karede söner; azaltılmış harekette yarı yoğunluk', () => {
  assert.equal(flashAlpha(0, false), 1);
  assert.equal(flashAlpha(0, true), 0.5);
  assert.equal(flashAlpha(EFFECTS.FLASH_FRAMES, false), 0);
  assert.ok(flashAlpha(2, false) > flashAlpha(4, false));
});

test('sarsıntı ofseti sınırlı, kalan kareyle söner, kare sıfırken 0', () => {
  const o = { x: 0, y: 0 };
  for (let f = 0; f < 50; f++) {
    shakeOffset(f, 6, EFFECTS.SHAKE_FRAMES, o);
    assert.ok(Math.abs(o.x) <= 6 && Math.abs(o.y) <= 6);
  }
  shakeOffset(3, 6, 0, o);
  assert.deepEqual(o, { x: 0, y: 0 });
});

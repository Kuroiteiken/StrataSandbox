import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout } from '../js/render/renderer.js';

test('alan kaybı küçükse tam sayı ölçek seçilir ve görüntü ortalanır', () => {
  // 1280/240 = 5.33 → 5; 5×240 = 1200, 5×135 = 675
  assert.deepEqual(computeLayout(240, 135, 1280, 720), {
    scale: 5, drawW: 1200, drawH: 675, offsetX: 40, offsetY: 22,
  });
});

test('tam sayı ölçek çok alan kaybettiriyorsa kesirli sığdırma seçilir', () => {
  // 700/240 = 2.917 (sınırlayan eksen); tam sayı 2 alanın ~%47'sini kullanırdı.
  const l = computeLayout(240, 135, 700, 400);
  assert.ok(l.scale > 2.9 && l.scale < 2.92, `scale=${l.scale}`);
  assert.equal(l.drawW, 700);
  assert.equal(l.offsetX, 0);
  assert.ok(l.drawH <= 400);
});

test('grid tuvalden büyükse küçültülerek sığdırılır', () => {
  const l = computeLayout(400, 200, 200, 200);
  assert.equal(l.scale, 0.5);
  assert.equal(l.drawW, 200);
  assert.equal(l.drawH, 100);
  assert.equal(l.offsetY, 50);
});

test('boyutu sıfır olan tuvalde geçerli (boş) bir yerleşim döner', () => {
  const l = computeLayout(240, 135, 0, 0);
  assert.equal(l.drawW, 0);
  assert.equal(l.drawH, 0);
});

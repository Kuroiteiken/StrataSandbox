import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout, pointToCell, chooseGridSize } from '../js/render/layout.js';

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

// ---- pointToCell: tuval pikseli → hücre ----

const layout = { scale: 4, drawW: 400, drawH: 200, offsetX: 10, offsetY: 20 }; // grid 100×50

test('pointToCell çizim alanının sol üst köşesini (0,0) hücresine eşler', () => {
  assert.deepEqual(pointToCell(10, 20, layout, 100, 50), { x: 0, y: 0 });
  assert.deepEqual(pointToCell(13.9, 23.9, layout, 100, 50), { x: 0, y: 0 });
});

test('pointToCell ölçek adımıyla sonraki hücreye geçer', () => {
  assert.deepEqual(pointToCell(14, 20, layout, 100, 50), { x: 1, y: 0 });
  assert.deepEqual(pointToCell(10 + 4 * 99 + 3, 20 + 4 * 49 + 3, layout, 100, 50), { x: 99, y: 49 });
});

test('pointToCell çizim alanı dışında null döner', () => {
  assert.equal(pointToCell(9, 30, layout, 100, 50), null);
  assert.equal(pointToCell(30, 19, layout, 100, 50), null);
  assert.equal(pointToCell(410, 30, layout, 100, 50), null);
  assert.equal(pointToCell(30, 220, layout, 100, 50), null);
});

test('pointToCell kırpma seçeneğiyle dışarıdaki noktayı en yakın kenar hücresine sabitler', () => {
  assert.deepEqual(pointToCell(0, 0, layout, 100, 50, { clamp: true }), { x: 0, y: 0 });
  assert.deepEqual(pointToCell(9999, 9999, layout, 100, 50, { clamp: true }), { x: 99, y: 49 });
});

// ---- chooseGridSize: açılışta sabit iç grid ----

test('chooseGridSize hücre bütçesini aşmadan tam sayı hücre boyutu seçer', () => {
  const g = chooseGridSize(1280, 720, 90000);
  assert.equal(g.cell, 4); // √(921600/90000) = 3.2 → 4
  assert.deepEqual([g.width, g.height], [320, 180]);
  assert.ok(g.width * g.height <= 90000);
});

test('chooseGridSize küçük ekranda en az 3 px hücre kullanır', () => {
  const g = chooseGridSize(360, 500, 40000);
  assert.equal(g.cell, 3);
  assert.deepEqual([g.width, g.height], [120, 166]);
});

test('chooseGridSize çok büyük ekranda bütçeyi korumak için hücreyi büyütür', () => {
  const g = chooseGridSize(2560, 1440, 90000);
  assert.ok(g.width * g.height <= 90000, `${g.width}×${g.height}`);
  assert.ok(g.cell >= 7);
});

test('chooseGridSize çok küçük/geçersiz konteynırda makul bir alt sınır uygular', () => {
  for (const [w, h] of [[0, 0], [50, 40], [NaN, 300]]) {
    const g = chooseGridSize(w, h, 90000);
    assert.ok(g.width >= 64 && g.height >= 48, `${w}×${h} → ${g.width}×${g.height}`);
  }
});

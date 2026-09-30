import { test } from 'node:test';
import assert from 'node:assert/strict';
import { footprint, footprintOutline, lineCells, BRUSH_SHAPES, MIN_BRUSH, MAX_BRUSH } from '../js/engine/brush.js';

const cellsOf = (fp) => {
  const set = new Set();
  for (let k = 0; k < fp.length; k += 2) set.add(`${fp[k]},${fp[k + 1]}`);
  return set;
};

test('boyut 1 fırça tek hücredir (her şekilde)', () => {
  for (const shape of BRUSH_SHAPES) assert.deepEqual([...cellsOf(footprint(shape, 1))], ['0,0']);
});

test('kare fırça boyut × boyut hücre kaplar', () => {
  for (const size of [2, 3, 7, 16]) assert.equal(footprint('square', size).length / 2, size * size);
});

test('daire fırça tek boyutlarda yatay ve dikey simetriktir', () => {
  for (const size of [3, 5, 9, 15]) {
    const set = cellsOf(footprint('circle', size));
    for (const key of set) {
      const [x, y] = key.split(',').map(Number);
      assert.ok(set.has(`${-x},${y}`) && set.has(`${x},${-y}`), `boyut ${size}: (${x},${y}) simetriği yok`);
    }
  }
});

test('daire fırçanın alanı π·(boyut/2)² değerine yakındır', () => {
  for (const size of [8, 12, 16]) {
    const area = footprint('circle', size).length / 2;
    const expected = Math.PI * (size / 2) ** 2;
    assert.ok(Math.abs(area - expected) / expected < 0.12, `boyut ${size}: alan ${area}, beklenen ~${expected.toFixed(1)}`);
  }
});

test('fırça boyutu 1..16 aralığına sıkıştırılır', () => {
  assert.equal(MIN_BRUSH, 1);
  assert.equal(MAX_BRUSH, 16);
  assert.equal(footprint('square', 40).length / 2, 16 * 16);
  assert.equal(footprint('square', 0).length / 2, 1);
});

test('aynı şekil ve boyut için footprint cache\'ten aynı nesne döner', () => {
  assert.equal(footprint('circle', 9), footprint('circle', 9));
});

test('tek hücre fırçanın ana hattı 4 kenardan oluşur ve kapalıdır', () => {
  const segs = footprintOutline('square', 1);
  assert.equal(segs.length / 4, 4);
});

test('fırça ana hattı kapalı bir çokgendir (her köşe çift sayıda kenara bağlı)', () => {
  for (const [shape, size] of [['circle', 9], ['square', 5], ['circle', 16]]) {
    const segs = footprintOutline(shape, size);
    const degree = new Map();
    for (let k = 0; k < segs.length; k += 4) {
      for (const key of [`${segs[k]},${segs[k + 1]}`, `${segs[k + 2]},${segs[k + 3]}`]) degree.set(key, (degree.get(key) ?? 0) + 1);
    }
    for (const [key, d] of degree) assert.equal(d % 2, 0, `${shape} ${size}: köşe ${key} derecesi ${d}`);
  }
});

test('lineCells iki ucu da içerir ve ardışık noktalar arasında boşluk bırakmaz', () => {
  for (const [x0, y0, x1, y1] of [[0, 0, 30, 17], [5, 5, 5, 5], [10, 2, -3, 9], [0, 0, 0, -12]]) {
    const pts = [];
    lineCells(x0, y0, x1, y1, (x, y) => pts.push([x, y]));
    assert.deepEqual(pts[0], [x0, y0]);
    assert.deepEqual(pts[pts.length - 1], [x1, y1]);
    assert.equal(pts.length, Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) + 1);
    for (let k = 1; k < pts.length; k++) {
      assert.ok(Math.abs(pts[k][0] - pts[k - 1][0]) <= 1 && Math.abs(pts[k][1] - pts[k - 1][1]) <= 1, 'boşluk var');
    }
  }
});

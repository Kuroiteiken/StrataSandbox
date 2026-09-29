import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packRGBA, parseHex, buildPalette, SHADES } from '../js/render/palette.js';
import { MAT, MATERIALS } from '../js/engine/materials.js';

test('packRGBA little-endian düzende ImageData bayt sırasını (R,G,B,A) korur', () => {
  // LE Uint32 değeri bellekte [R,G,B,A] olarak durur → 0xAABBGGRR
  assert.equal(packRGBA(0x11, 0x22, 0x33, 0x44, true), 0x44332211);
});

test('packRGBA big-endian düzende değeri 0xRRGGBBAA olarak üretir', () => {
  assert.equal(packRGBA(0x11, 0x22, 0x33, 0x44, false), 0x11223344);
});

test('packRGBA Uint32Array üzerinden yazıldığında baytlar doğru sırada çıkar (bu makine)', () => {
  const le = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
  const u32 = new Uint32Array(1);
  u32[0] = packRGBA(10, 20, 30, 255, le);
  assert.deepEqual([...new Uint8Array(u32.buffer)], [10, 20, 30, 255]);
});

test('parseHex #rrggbb değerini bileşenlere ayırır', () => {
  assert.deepEqual(parseHex('#d9bb82'), [0xd9, 0xbb, 0x82]);
  assert.throws(() => parseHex('d9bb82'), /hex/);
});

test('buildPalette EMPTY için tamamen şeffaf, renkli materyaller için opak tonlar üretir', () => {
  const pal = buildPalette(MATERIALS, true);
  assert.equal(pal.length, 256 * SHADES);
  for (let s = 0; s < SHADES; s++) assert.equal(pal[MAT.EMPTY * SHADES + s], 0);
  for (let s = 0; s < SHADES; s++) assert.equal(pal[MAT.SAND * SHADES + s] >>> 24, 255, 'alfa opak olmalı');
});

test('buildPalette bir materyal için birden fazla farklı ton üretir ve tonlar temel renge yakındır', () => {
  const pal = buildPalette(MATERIALS, true);
  const shades = new Set();
  for (let s = 0; s < SHADES; s++) shades.add(pal[MAT.SAND * SHADES + s]);
  assert.ok(shades.size > 4, `yalnızca ${shades.size} farklı ton`);
  const [r, g, b] = parseHex(MATERIALS.defs[MAT.SAND].color);
  for (let s = 0; s < SHADES; s++) {
    const v = pal[MAT.SAND * SHADES + s];
    const dr = Math.abs((v & 255) - r);
    const dg = Math.abs(((v >>> 8) & 255) - g);
    const db = Math.abs(((v >>> 16) & 255) - b);
    assert.ok(dr <= 40 && dg <= 40 && db <= 40, `ton ${s} temel renkten çok uzak`);
  }
});

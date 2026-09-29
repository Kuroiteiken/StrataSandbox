import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT, KIND, MATERIALS, compileMaterials } from '../js/engine/materials.js';

const displace = (mover, target) => MATERIALS.DISPLACE[mover * 256 + target];

test('Sand boş hücreye her zaman girebilir', () => {
  assert.equal(displace(MAT.SAND, MAT.EMPTY), 255);
});

test('Sand statik materyalleri ve dünya kenarını yerinden edemez', () => {
  assert.equal(displace(MAT.SAND, MAT.STONE), 0);
  assert.equal(displace(MAT.SAND, MAT.WALL), 0);
});

test('Tozlar birbirini yerinden etmez', () => {
  assert.equal(displace(MAT.SAND, MAT.SAND), 0);
});

test('Statik materyaller hareket etmez (hiçbir hedefe giremez)', () => {
  for (let target = 0; target < 256; target++) {
    assert.equal(displace(MAT.STONE, target), 0);
    assert.equal(displace(MAT.WALL, target), 0);
  }
});

test('KIND ve DENSITY tabloları tanımlardan derlenir', () => {
  assert.equal(MATERIALS.KIND[MAT.SAND], KIND.POWDER);
  assert.equal(MATERIALS.KIND[MAT.STONE], KIND.STATIC);
  assert.equal(MATERIALS.KIND[MAT.EMPTY], KIND.NONE);
  assert.ok(MATERIALS.DENSITY[MAT.SAND] > MATERIALS.DENSITY[MAT.EMPTY]);
});

test('Aynı id iki kez tanımlanırsa derleme hata verir', () => {
  assert.throws(
    () => compileMaterials([
      { id: 0, key: 'EMPTY', name: 'Empty', kind: KIND.NONE, density: 5 },
      { id: 0, key: 'DUP', name: 'Dup', kind: KIND.POWDER, density: 20 },
    ]),
    /id/,
  );
});

test('Bilinmeyen kind ile tanım derleme hatası verir', () => {
  assert.throws(
    () => compileMaterials([{ id: 0, key: 'EMPTY', name: 'Empty', kind: 99, density: 5 }]),
    /kind/,
  );
});

test('0..255 dışındaki id derleme hatası verir', () => {
  assert.throws(
    () => compileMaterials([{ id: 256, key: 'BIG', name: 'Big', kind: KIND.STATIC, density: 5 }]),
    /id/,
  );
});

test('Her materyalin bir key ile bulunabilir tanımı vardır', () => {
  assert.equal(MATERIALS.byKey.SAND.id, MAT.SAND);
  assert.equal(MATERIALS.defs[MAT.STONE].key, 'STONE');
});

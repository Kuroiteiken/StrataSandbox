import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT, KIND, MATERIALS, MATERIAL_DEFS, compileMaterials } from '../js/engine/materials.js';

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

test('Sıvılar boşluğa ve gaza girebilir, tozu ve statikleri itemez', () => {
  for (const liquid of [MAT.WATER, MAT.OIL, MAT.LAVA]) {
    assert.equal(displace(liquid, MAT.EMPTY), 255);
    assert.equal(displace(liquid, MAT.STEAM), 255);
    assert.equal(displace(liquid, MAT.SAND), 0, 'sıvı tozu yerinden edemez');
    assert.equal(displace(liquid, MAT.STONE), 0);
    assert.equal(displace(liquid, MAT.WOOD), 0);
  }
});

test('Ağır sıvı hafif sıvının altına olasılıksal geçer, tersi olmaz', () => {
  const waterIntoOil = displace(MAT.WATER, MAT.OIL);
  assert.ok(waterIntoOil > 0 && waterIntoOil < 255, `water→oil=${waterIntoOil}`);
  assert.equal(displace(MAT.OIL, MAT.WATER), 0, 'yağ suyun altına geçemez');
  assert.ok(displace(MAT.LAVA, MAT.WATER) > 0);
  assert.equal(displace(MAT.WATER, MAT.LAVA), 0);
});

test('Sand su ve yağ içinde olasılıksal batar, lavada batmaz', () => {
  for (const liquid of [MAT.WATER, MAT.OIL]) {
    const c = displace(MAT.SAND, liquid);
    assert.ok(c > 0 && c < 255, `sand→${liquid}=${c}`);
  }
  assert.equal(displace(MAT.SAND, MAT.LAVA), 0, 'kum lavadan hafif, üstünde kalır');
  assert.equal(displace(MAT.SAND, MAT.STEAM), 255);
});

test('Gazlar yalnızca havaya ve daha ağır gaza doğru yükselir', () => {
  assert.equal(displace(MAT.STEAM, MAT.EMPTY), 255);
  assert.equal(displace(MAT.FIRE, MAT.EMPTY), 255);
  assert.equal(displace(MAT.STEAM, MAT.FIRE), 255, 'buhar ateşten hafif');
  assert.equal(displace(MAT.FIRE, MAT.STEAM), 0);
  assert.equal(displace(MAT.STEAM, MAT.WATER), 0, 'sıvı-gaz değişimi sıvının düşmesiyle olur');
  assert.equal(displace(MAT.STEAM, MAT.SAND), 0);
});

test('Yoğunluk sırası planla uyumlu: gaz < hava < yağ < su < kum < lava', () => {
  const d = (m) => MATERIALS.DENSITY[m];
  assert.ok(d(MAT.STEAM) < d(MAT.FIRE) && d(MAT.FIRE) < d(MAT.EMPTY));
  assert.ok(d(MAT.EMPTY) < d(MAT.OIL) && d(MAT.OIL) < d(MAT.WATER));
  assert.ok(d(MAT.WATER) < d(MAT.SAND) && d(MAT.SAND) < d(MAT.LAVA));
});

test('Wood, Glass, Plant statiktir', () => {
  for (const m of [MAT.WOOD, MAT.GLASS, MAT.PLANT]) assert.equal(MATERIALS.KIND[m], KIND.STATIC);
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

test('faz tanımı doğrulanır: gizli ısı aralığı, eşik sırası, hedef materyal, tutuşmada burnsInto', () => {
  const E = { id: 0, key: 'EMPTY', name: 'E', kind: KIND.NONE, density: 5 };
  const S = (phase, extra = {}) => ({ id: 1, key: 'X', name: 'X', kind: KIND.STATIC, density: 255, strength: 1, phase, ...extra });
  assert.throws(() => compileMaterials([E, S({ up: { at: 10, into: 0, latent: 70000 } })]), /Gizli ısı/);
  assert.throws(() => compileMaterials([E, S({ up: { at: 10, into: 0, latent: 5 }, down: { at: 20, into: 0, latent: 5 } })]), /eşik/);
  assert.throws(() => compileMaterials([E, S({ up: { at: 10, into: 99, latent: 5 } })]), /hedef/);
  assert.throws(() => compileMaterials([E, S(undefined, { ignitesAt: 300 })]), /burnsInto/);
});

test('su, buhar, lav, kum ve taş faz tablolarında', () => {
  assert.equal(MATERIALS.UP_AT[MAT.WATER], 100);
  assert.equal(MATERIALS.UP_INTO[MAT.WATER], MAT.STEAM);
  assert.equal(MATERIALS.DOWN_AT[MAT.STEAM], 95);
  assert.equal(MATERIALS.DOWN_INTO[MAT.LAVA], MAT.STONE);
  assert.equal(MATERIALS.UP_INTO[MAT.SAND], MAT.GLASS);
  assert.equal(MATERIALS.UP_AT[MAT.STONE], 1500);
  assert.equal(MATERIALS.IGNITE_AT[MAT.WOOD], 300);
  assert.equal(MATERIALS.EVAP_AT[MAT.WATER], 35);
  assert.equal(MATERIALS.UP_AT[MAT.GLASS], Infinity);
});

test('kararsız ısı iletimi (K/C > 0,25) ve 1\'den küçük ısı kapasitesi derleme hatası verir', () => {
  const base = { id: 0, key: 'EMPTY', name: 'E', kind: KIND.NONE, density: 5 };
  assert.throws(() => compileMaterials([{ ...base, conduct: 0.3, capacity: 1 }]), /K\/C/);
  assert.throws(() => compileMaterials([{ ...base, conduct: 0.1, capacity: 0.5 }]), /kapasite/);
  assert.doesNotThrow(() => compileMaterials([{ ...base, conduct: 0.25, capacity: 1 }]));
});

test('termal tablolar: lav ve ateş sıcak doğar, ateş ve yanan odun kaynaktır, taş kaynak değildir', () => {
  assert.equal(MATERIALS.SPAWN_TEMP[MAT.LAVA], 1150);
  assert.equal(MATERIALS.SOURCE_TEMP[MAT.FIRE], 900);
  assert.equal(MATERIALS.SOURCE_TEMP[MAT.BURNING_WOOD], 700);
  assert.equal(MATERIALS.SOURCE_TEMP[MAT.STONE], -Infinity);
  for (const def of MATERIALS.list) assert.ok(MATERIALS.CONDUCT[def.id] / MATERIALS.CAP[def.id] <= 0.25, def.key);
});

test('dayanıklılık ve enkaz tabloları: statiklerin hepsinde açık değer; kenar ve magma kırılmaz', () => {
  const { STRENGTH, DEBRIS_OF, KIND: KIND_OF } = MATERIALS;
  assert.equal(STRENGTH[MAT.WALL], Infinity);
  assert.equal(STRENGTH[MAT.MAGMA], Infinity);
  assert.equal(STRENGTH[MAT.STONE], 8);
  assert.equal(STRENGTH[MAT.GLASS], 2);
  assert.equal(STRENGTH[MAT.ICE], 2);
  assert.equal(STRENGTH[MAT.WOOD], 4);
  assert.equal(STRENGTH[MAT.PLANT], 1);
  assert.equal(STRENGTH[MAT.METAL], 20);
  assert.equal(STRENGTH[MAT.CLONER], 12);
  assert.equal(STRENGTH[MAT.SINK], 12);
  assert.equal(DEBRIS_OF[MAT.STONE], MAT.RUBBLE);
  assert.equal(DEBRIS_OF[MAT.GLASS], MAT.SAND);
  assert.equal(DEBRIS_OF[MAT.ICE], MAT.SNOW);
  assert.equal(DEBRIS_OF[MAT.WOOD], MAT.ASH);
  assert.equal(DEBRIS_OF[MAT.METAL], MAT.METAL);
  assert.equal(DEBRIS_OF[MAT.SAND], MAT.SAND, 'varsayılan: kendisi');
  for (const def of MATERIALS.list) {
    if (def.kind === KIND.STATIC) assert.ok(def.strength !== undefined, `${def.key}: statik materyalin dayanıklılığı açıkça verilmeli`);
    else assert.equal(STRENGTH[def.id], 0, `${def.key}: hareketli materyal kırılmaz, savrulur`);
  }
  assert.equal(KIND_OF[MAT.RUBBLE], KIND.POWDER);
});

test('Moloz: kumdan ağır toz, lavın üstünde yüzer, taş gibi ısınır ve 1500 °C\'de lava döner', () => {
  const r = MATERIALS.byKey.RUBBLE;
  assert.equal(r.id, MAT.RUBBLE);
  assert.ok(r.density > MATERIALS.byKey.SAND.density && r.density < MATERIALS.byKey.LAVA.density);
  assert.equal(MATERIALS.UP_AT[MAT.RUBBLE], 1500);
  assert.equal(MATERIALS.UP_INTO[MAT.RUBBLE], MAT.LAVA);
  assert.equal(MATERIALS.CONDUCT[MAT.RUBBLE], MATERIALS.CONDUCT[MAT.STONE]);
});

test('derleyici: dayanıklılığı olmayan statik ve tanımsız enkaz hedefi reddedilir', () => {
  const base = MATERIAL_DEFS.filter((d) => d.id <= 1);
  assert.throws(() => compileMaterials([...base, { id: 40, key: 'X', name: 'X', kind: KIND.STATIC, density: 255, color: '#000' }]), /dayanıklılık/);
  assert.throws(() => compileMaterials([...base, { id: 40, key: 'X', name: 'X', kind: KIND.STATIC, density: 255, color: '#000', strength: 1, debris: 99 }]), /enkaz/);
  assert.throws(() => compileMaterials([...base, { id: 40, key: 'X', name: 'X', kind: KIND.POWDER, density: 9, color: '#000', explosive: { power: -1, at: 100 } }]), /patlayıcı/);
});

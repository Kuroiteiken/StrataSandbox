// Merkezi materyal tanımları + hot loop için derlenmiş düz lookup tabloları.
// Yeni materyal = MATERIAL_DEFS'e bir kayıt (+ gerekirse davranış parametresi).

export const KIND = Object.freeze({
  NONE: 0, // EMPTY (hava)
  STATIC: 1, // hiç hareket etmez
  POWDER: 2, // düşer, yığın yapar
  LIQUID: 3, // akar, yayılır
  GAS: 4, // yükselir
});

export const MAT = Object.freeze({
  EMPTY: 0,
  WALL: 1, // dünyanın görünmez kenar çerçevesi (iç materyal)
  SAND: 2,
  STONE: 3,
});

// density: yoğunluk; EMPTY (hava) = 5 referans. color: temel renk (renderer paleti üretir).
export const MATERIAL_DEFS = [
  { id: MAT.EMPTY, key: 'EMPTY', name: 'Empty', kind: KIND.NONE, density: 5, color: null },
  { id: MAT.WALL, key: 'WALL', name: 'Wall', kind: KIND.STATIC, density: 255, color: '#000000', internal: true },
  { id: MAT.SAND, key: 'SAND', name: 'Sand', kind: KIND.POWDER, density: 20, color: '#d9bb82' },
  { id: MAT.STONE, key: 'STONE', name: 'Stone', kind: KIND.STATIC, density: 255, color: '#6e6964' },
];

const VALID_KINDS = new Set(Object.values(KIND));

// mover → target yer değiştirme olasılığı (0 = asla, 255 = her zaman).
// Hareket yönünü çekirdek belirler; tablo yalnızca "girebilir mi" sorusunu yanıtlar.
function displaceChance(mover, target) {
  if (mover.kind === KIND.POWDER) {
    if (target.kind === KIND.NONE) return 255;
    return 0;
  }
  return 0;
}

export function compileMaterials(defs) {
  const KIND_T = new Uint8Array(256);
  const DENSITY = new Uint8Array(256);
  const DISPLACE = new Uint8Array(256 * 256);
  const byId = new Array(256).fill(null);
  const byKey = {};

  for (const def of defs) {
    if (!Number.isInteger(def.id) || def.id < 0 || def.id > 255) {
      throw new RangeError(`Geçersiz materyal id: ${def.id} (${def.key})`);
    }
    if (byId[def.id]) throw new Error(`Materyal id tekrar ediyor: ${def.id} (${byId[def.id].key}, ${def.key})`);
    if (!VALID_KINDS.has(def.kind)) throw new Error(`Geçersiz kind: ${def.kind} (${def.key})`);
    byId[def.id] = def;
    byKey[def.key] = def;
    KIND_T[def.id] = def.kind;
    DENSITY[def.id] = def.density;
  }

  for (const mover of defs) {
    for (const target of defs) {
      DISPLACE[mover.id * 256 + target.id] = displaceChance(mover, target);
    }
  }

  return Object.freeze({ KIND: KIND_T, DENSITY, DISPLACE, defs: byId, byKey, list: defs });
}

export const MATERIALS = compileMaterials(MATERIAL_DEFS);

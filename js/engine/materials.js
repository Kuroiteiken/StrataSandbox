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
  WATER: 4,
  OIL: 5,
  LAVA: 6,
  STEAM: 7,
  FIRE: 8,
  WOOD: 9,
  GLASS: 10,
  PLANT: 11,
});

// Ortak alanlar:
//   density: yoğunluk; EMPTY (hava) = 5 referans. Statikler 255.
//   color:   temel renk (renderer paleti üretir).
// Sıvı alanları:
//   dispersion: tick başına en fazla kaç hücre yatay akabilir
//   spread:     tick başına yatay akmaya çalışma olasılığı (viskozite; 1 = su gibi)
//   drag:       içinden geçen ağır parçacığı yavaşlatma (0 = direnç yok, 1 = geçilmez)
// Gaz alanları:
//   drift: yükselirken köşegeni önce deneme olasılığı (yatay sürüklenme)
export const MATERIAL_DEFS = [
  { id: MAT.EMPTY, key: 'EMPTY', name: 'Empty', kind: KIND.NONE, density: 5, color: null },
  { id: MAT.WALL, key: 'WALL', name: 'Wall', kind: KIND.STATIC, density: 255, color: '#000000', internal: true },
  { id: MAT.SAND, key: 'SAND', name: 'Sand', kind: KIND.POWDER, density: 20, color: '#d9bb82' },
  { id: MAT.STONE, key: 'STONE', name: 'Stone', kind: KIND.STATIC, density: 255, color: '#6e6964' },
  { id: MAT.WATER, key: 'WATER', name: 'Water', kind: KIND.LIQUID, density: 10, color: '#3f7fc2', dispersion: 5, spread: 1, drag: 0.5 },
  { id: MAT.OIL, key: 'OIL', name: 'Oil', kind: KIND.LIQUID, density: 8, color: '#6a5424', dispersion: 2, spread: 0.6, drag: 0.6 },
  { id: MAT.LAVA, key: 'LAVA', name: 'Lava', kind: KIND.LIQUID, density: 30, color: '#e4531e', dispersion: 1, spread: 0.2, drag: 0.9 },
  { id: MAT.STEAM, key: 'STEAM', name: 'Steam', kind: KIND.GAS, density: 2, color: '#c8d2da', drift: 0.45 },
  { id: MAT.FIRE, key: 'FIRE', name: 'Fire', kind: KIND.GAS, density: 3, color: '#ff8a2a', drift: 0.3 },
  { id: MAT.WOOD, key: 'WOOD', name: 'Wood', kind: KIND.STATIC, density: 255, color: '#7a5232' },
  { id: MAT.GLASS, key: 'GLASS', name: 'Glass', kind: KIND.STATIC, density: 255, color: '#a9d6d4' },
  { id: MAT.PLANT, key: 'PLANT', name: 'Plant', kind: KIND.STATIC, density: 255, color: '#4c9a3a' },
];

const VALID_KINDS = new Set(Object.values(KIND));

const toByte = (p) => Math.max(0, Math.min(255, Math.round(p * 255)));
const isAirOrGas = (k) => k === KIND.NONE || k === KIND.GAS;

// mover → target yer değiştirme olasılığı (0 = asla, 255 = her zaman).
// Hareket yönünü çekirdek belirler (toz/sıvı aşağı, gaz yukarı); tablo yalnızca
// "girebilir mi" sorusunu yanıtlar. Her yön değişimini tek bir taraf yapar:
// sıvı/toz gazın içine düşer; gaz yalnızca havaya ya da daha ağır gaza yükselir.
function displaceChance(mover, target) {
  switch (mover.kind) {
    case KIND.POWDER:
      if (isAirOrGas(target.kind)) return 255;
      if (target.kind === KIND.LIQUID && mover.density > target.density) return toByte(1 - target.drag);
      return 0;
    case KIND.LIQUID:
      if (isAirOrGas(target.kind)) return 255;
      if (target.kind === KIND.LIQUID && mover.density > target.density) return toByte(1 - target.drag);
      return 0;
    case KIND.GAS:
      if (target.kind === KIND.NONE) return 255;
      if (target.kind === KIND.GAS && target.density > mover.density) return 255;
      return 0;
    default:
      return 0;
  }
}

export function compileMaterials(defs) {
  const KIND_T = new Uint8Array(256);
  const DENSITY = new Uint8Array(256);
  const DISPERSION = new Uint8Array(256);
  const SPREAD = new Uint8Array(256);
  const DRIFT = new Uint8Array(256);
  const DISPLACE = new Uint8Array(256 * 256);
  const byId = new Array(256).fill(null);
  const byKey = {};
  const gasIds = [];

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
    DISPERSION[def.id] = def.dispersion ?? 0;
    SPREAD[def.id] = toByte(def.spread ?? 0);
    DRIFT[def.id] = toByte(def.drift ?? 0);
    if (def.kind === KIND.GAS) gasIds.push(def.id);
  }

  for (const mover of defs) {
    for (const target of defs) {
      DISPLACE[mover.id * 256 + target.id] = displaceChance(mover, target);
    }
  }

  return Object.freeze({
    KIND: KIND_T,
    DENSITY,
    DISPERSION,
    SPREAD,
    DRIFT,
    DISPLACE,
    GAS_IDS: Object.freeze(gasIds),
    defs: byId,
    byKey,
    list: defs,
  });
}

export const MATERIALS = compileMaterials(MATERIAL_DEFS);

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
  // Paletten seçilmeyen (hidden) durumlar; reaksiyonlarla oluşur.
  BURNING_WOOD: 12,
  BURNING_PLANT: 13,
  BURNING_OIL: 14,
  ASH: 15,
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
//   rise:  tick başına hareket etme olasılığı (varsayılan 1; ateş yakıtın yanında oyalanır)
// Reaksiyon alanları:
//   life:      [min, max] spawn ömrü/sayacı (ateş ömrü, buhar yoğuşma süresi, yanma süresi, bitki bütçesi)
//   flammable: ateş/yanan komşu örneklediğinde tutuşma olasılığı; burnsInto: tutuşunca olacağı materyal
//   burn:      yanan durumlar için { emit: üstüne ateş üretme, douse: suyla sönme, ash: kül bırakma,
//              extinguishTo: sönünce olacağı materyal }
//   hidden:    materyal seçicide gösterilmez (programatik olarak yazılabilir)
//   cools:     life (ısı) her tick 1 azalır; tarama döngüsünde satır içi yapılır (react() çağrısı yok)
export const MATERIAL_DEFS = [
  { id: MAT.EMPTY, key: 'EMPTY', name: 'Empty', kind: KIND.NONE, density: 5, color: null },
  { id: MAT.WALL, key: 'WALL', name: 'Wall', kind: KIND.STATIC, density: 255, color: '#000000', internal: true },
  { id: MAT.SAND, key: 'SAND', name: 'Sand', kind: KIND.POWDER, density: 20, color: '#d9bb82', cools: true },
  { id: MAT.STONE, key: 'STONE', name: 'Stone', kind: KIND.STATIC, density: 255, color: '#6e6964' },
  { id: MAT.WATER, key: 'WATER', name: 'Water', kind: KIND.LIQUID, density: 10, color: '#3f7fc2', dispersion: 5, spread: 1, drag: 0.5 },
  {
    id: MAT.OIL, key: 'OIL', name: 'Oil', kind: KIND.LIQUID, density: 8, color: '#6a5424',
    dispersion: 2, spread: 0.6, drag: 0.6, flammable: 1, burnsInto: MAT.BURNING_OIL,
  },
  { id: MAT.LAVA, key: 'LAVA', name: 'Lava', kind: KIND.LIQUID, density: 30, color: '#e4531e', dispersion: 1, spread: 0.2, drag: 0.9, reactive: true },
  { id: MAT.STEAM, key: 'STEAM', name: 'Steam', kind: KIND.GAS, density: 2, color: '#c8d2da', drift: 0.45, life: [240, 480], reactive: true },
  { id: MAT.FIRE, key: 'FIRE', name: 'Fire', kind: KIND.GAS, density: 3, color: '#ff8a2a', drift: 0.3, rise: 0.65, life: [10, 26], reactive: true },
  { id: MAT.WOOD, key: 'WOOD', name: 'Wood', kind: KIND.STATIC, density: 255, color: '#7a5232', flammable: 0.25, burnsInto: MAT.BURNING_WOOD },
  { id: MAT.GLASS, key: 'GLASS', name: 'Glass', kind: KIND.STATIC, density: 255, color: '#a9d6d4' },
  {
    id: MAT.PLANT, key: 'PLANT', name: 'Plant', kind: KIND.STATIC, density: 255, color: '#4c9a3a',
    life: [8, 8], flammable: 0.5, burnsInto: MAT.BURNING_PLANT, reactive: true,
  },
  {
    id: MAT.BURNING_WOOD, key: 'BURNING_WOOD', name: 'Burning Wood', kind: KIND.STATIC, density: 255, color: '#9a4a1e',
    hidden: true, reactive: true, life: [300, 600], burn: { emit: 0.12, douse: 0.5, ash: 0.3, extinguishTo: MAT.WOOD },
  },
  {
    id: MAT.BURNING_PLANT, key: 'BURNING_PLANT', name: 'Burning Plant', kind: KIND.STATIC, density: 255, color: '#c8682a',
    hidden: true, reactive: true, life: [30, 60], burn: { emit: 0.3, douse: 0.7, ash: 0.05, extinguishTo: MAT.PLANT },
  },
  {
    id: MAT.BURNING_OIL, key: 'BURNING_OIL', name: 'Burning Oil', kind: KIND.LIQUID, density: 8, color: '#f06a1c',
    dispersion: 2, spread: 0.6, drag: 0.6, hidden: true, reactive: true, life: [120, 240],
    burn: { emit: 0.35, douse: 0, ash: 0, extinguishTo: MAT.OIL },
  },
  { id: MAT.ASH, key: 'ASH', name: 'Ash', kind: KIND.POWDER, density: 12, color: '#8c8680', hidden: true },
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
  const RISE = new Uint8Array(256);
  const REACTIVE = new Uint8Array(256);
  const COOLS = new Uint8Array(256);
  const FLAMMABILITY = new Uint8Array(256);
  const BURNS_INTO = new Uint8Array(256);
  const LIFE_MIN = new Uint16Array(256);
  const LIFE_SPAN = new Uint16Array(256);
  const EMIT = new Uint8Array(256);
  const DOUSE = new Uint8Array(256);
  const ASH_CHANCE = new Uint8Array(256);
  const EXTINGUISH_TO = new Uint8Array(256);
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
    RISE[def.id] = toByte(def.rise ?? 1);
    REACTIVE[def.id] = def.reactive ? 1 : 0;
    COOLS[def.id] = def.cools ? 1 : 0;
    FLAMMABILITY[def.id] = toByte(def.flammable ?? 0);
    BURNS_INTO[def.id] = def.burnsInto ?? 0;
    if (def.life) {
      const [min, max] = def.life;
      if (!(min >= 0 && max >= min && max <= 65535)) throw new RangeError(`Geçersiz life aralığı (${def.key})`);
      LIFE_MIN[def.id] = min;
      LIFE_SPAN[def.id] = max - min;
    }
    if (def.burn) {
      EMIT[def.id] = toByte(def.burn.emit);
      DOUSE[def.id] = toByte(def.burn.douse);
      ASH_CHANCE[def.id] = toByte(def.burn.ash);
      EXTINGUISH_TO[def.id] = def.burn.extinguishTo;
    }
    if (def.flammable && !def.burnsInto) throw new Error(`Yanıcı materyalin burnsInto değeri yok (${def.key})`);
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
    RISE,
    REACTIVE,
    COOLS,
    FLAMMABILITY,
    BURNS_INTO,
    LIFE_MIN,
    LIFE_SPAN,
    EMIT,
    DOUSE,
    ASH_CHANCE,
    EXTINGUISH_TO,
    DISPLACE,
    GAS_IDS: Object.freeze(gasIds),
    defs: byId,
    byKey,
    list: defs,
  });
}

export const MATERIALS = compileMaterials(MATERIAL_DEFS);

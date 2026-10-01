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
  // Kaynaklar (0.10.0): üstüne konan hareketli materyali bütçesi kadar çoğaltır / yutar.
  CLONER: 21,
  SINK: 22,
  // Sıcaklık sistemi (0.10.0)
  ICE: 16,
  SNOW: 17,
  METAL: 18,
  MOLTEN_METAL: 19,
  MAGMA: 20, // gizli, sabit ısı kaynağı (sahneler yerleştirir)
  // Basınç ve patlama (0.11.0)
  RUBBLE: 24, // kırılan taş
  GUNPOWDER: 23, // barut
  DYNAMITE: 28, // dinamit
  FUSE: 29, // fitil
  BURNING_FUSE: 30, // yanan fitil
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
//   life:      [min, max] spawn ömrü/sayacı (ateş ömrü, yanma süresi, bitki bütçesi, kaynak bütçesi)
//   flammable: ateş/yanan komşu örneklediğinde tutuşma olasılığı; burnsInto: tutuşunca olacağı materyal
//   burn:      yanan durumlar için { emit: üstüne ateş üretme, douse: suyla sönme, ash: kül bırakma,
//              extinguishTo: sönünce olacağı materyal }
//   hidden:    materyal seçicide gösterilmez (programatik olarak yazılabilir)
//   temp:      doğuş sıcaklığı °C (yoksa ortam sıcaklığı)
// Isı alanları (ADR-014):
//   conduct:   iletkenlik K (iki hücre arası k = min(K_i, K_j)); varsayılan 0,02
//   capacity:  ısı kapasitesi C (≥ 1); varsayılan 2. Kararlılık için K/C ≤ 0,25 (derlemede doğrulanır)
//   source:    sabit kaynak sıcaklığı °C (hücre bunun altına inmez: ateş, yanma, magma)
// Faz ve sıcaklık kuralları (ADR-015; heat.js uygular):
//   phase:        { up?: { at, into, latent, vanish? }, down?: {...} }. Eşiği aşan hücrenin sıcaklığı
//                 eşikte sabitlenir, fazla ısı life'ta "ilerleme" olarak birikir; latent'e ulaşınca
//                 into olur (vanish olasılığıyla boşalır). life bu materyallerde yalnızca ilerlemedir.
//   ignitesAt:    bu sıcaklığın üstünde tick başına IGNITE_CHANCE ile burnsInto olur
//   evaporatesAt: bu sıcaklığın üstünde, üstü boşsa yavaşça buharlaşıp kaybolur (su)
// Patlama alanları (ADR-017; explosions.js uygular):
//   strength:  patlamaya dayanıklılık (statiklerde zorunlu; Infinity = kırılmaz). Patlama şiddeti
//              s ≥ strength olan katı enkazına döner ve savrulur. Hareketli materyaller 0'dır (savrulur).
//   debris:    kırılınca dönüştüğü materyal (varsayılan kendisi)
//   explosive: { power, at, ignite } — tetiklenince birleştirme ızgarasına yazılan güç, sıcaklıkla
//              tetiklenme eşiği °C ve ateş/lav temasında tetiklenme olasılığı (0..1)
export const MATERIAL_DEFS = [
  { id: MAT.EMPTY, key: 'EMPTY', name: 'Empty', kind: KIND.NONE, density: 5, color: null, conduct: 0.01, capacity: 1 },
  { id: MAT.WALL, key: 'WALL', name: 'Wall', kind: KIND.STATIC, density: 255, color: '#000000', internal: true, conduct: 0.01, capacity: 1, strength: Infinity },
  { id: MAT.SAND, key: 'SAND', name: 'Sand', kind: KIND.POWDER, density: 20, color: '#d9bb82', conduct: 0.04, capacity: 3, phase: { up: { at: 550, into: MAT.GLASS, latent: 300 } } },
  { id: MAT.STONE, key: 'STONE', name: 'Stone', kind: KIND.STATIC, density: 255, color: '#6e6964', conduct: 0.06, capacity: 4, strength: 8, debris: MAT.RUBBLE, phase: { up: { at: 1500, into: MAT.LAVA, latent: 800 } } },
  { id: MAT.WATER, key: 'WATER', name: 'Water', kind: KIND.LIQUID, density: 10, color: '#3f7fc2', dispersion: 5, spread: 1, drag: 0.5, conduct: 0.08, capacity: 4,
    phase: { up: { at: 100, into: MAT.STEAM, latent: 1500 }, down: { at: -1, into: MAT.ICE, latent: 300 } }, evaporatesAt: 35 },
  {
    id: MAT.OIL, key: 'OIL', name: 'Oil', kind: KIND.LIQUID, density: 8, color: '#6a5424',
    dispersion: 2, spread: 0.6, drag: 0.6, flammable: 1, burnsInto: MAT.BURNING_OIL, conduct: 0.03, capacity: 3, ignitesAt: 250,
  },
  { id: MAT.LAVA, key: 'LAVA', name: 'Lava', kind: KIND.LIQUID, density: 30, color: '#e4531e', dispersion: 1, spread: 0.2, drag: 0.9, reactive: true, temp: 1150, conduct: 0.04, capacity: 4,
    phase: { down: { at: 750, into: MAT.STONE, latent: 800 } } },
  { id: MAT.STEAM, key: 'STEAM', name: 'Steam', kind: KIND.GAS, density: 2, color: '#c8d2da', drift: 0.45, temp: 105, conduct: 0.02, capacity: 1,
    phase: { down: { at: 95, into: MAT.WATER, latent: 600, vanish: 0.4 } } },
  { id: MAT.FIRE, key: 'FIRE', name: 'Fire', kind: KIND.GAS, density: 3, color: '#ff8a2a', drift: 0.3, rise: 0.65, life: [10, 26], reactive: true, temp: 900, source: 900, conduct: 0.05, capacity: 1 },
  { id: MAT.WOOD, key: 'WOOD', name: 'Wood', kind: KIND.STATIC, density: 255, color: '#7a5232', flammable: 0.25, burnsInto: MAT.BURNING_WOOD, conduct: 0.02, capacity: 3, ignitesAt: 300, strength: 4, debris: MAT.ASH },
  { id: MAT.GLASS, key: 'GLASS', name: 'Glass', kind: KIND.STATIC, density: 255, color: '#a9d6d4', conduct: 0.05, capacity: 3, strength: 2, debris: MAT.SAND },
  {
    id: MAT.PLANT, key: 'PLANT', name: 'Plant', kind: KIND.STATIC, density: 255, color: '#4c9a3a',
    life: [8, 8], flammable: 0.5, burnsInto: MAT.BURNING_PLANT, reactive: true, conduct: 0.02, capacity: 3, ignitesAt: 250, strength: 1, debris: MAT.ASH,
  },
  {
    id: MAT.BURNING_WOOD, key: 'BURNING_WOOD', name: 'Burning Wood', kind: KIND.STATIC, density: 255, color: '#9a4a1e',
    hidden: true, reactive: true, life: [300, 600], temp: 700, source: 700, conduct: 0.04, capacity: 2, burn: { emit: 0.12, douse: 0.5, ash: 0.3, extinguishTo: MAT.WOOD }, strength: 4, debris: MAT.ASH,
  },
  {
    id: MAT.BURNING_PLANT, key: 'BURNING_PLANT', name: 'Burning Plant', kind: KIND.STATIC, density: 255, color: '#c8682a',
    hidden: true, reactive: true, life: [30, 60], temp: 700, source: 700, conduct: 0.04, capacity: 2, burn: { emit: 0.3, douse: 0.7, ash: 0.05, extinguishTo: MAT.PLANT }, strength: 1, debris: MAT.ASH,
  },
  {
    id: MAT.BURNING_OIL, key: 'BURNING_OIL', name: 'Burning Oil', kind: KIND.LIQUID, density: 8, color: '#f06a1c',
    dispersion: 2, spread: 0.6, drag: 0.6, hidden: true, reactive: true, life: [120, 240], temp: 700, source: 700, conduct: 0.04, capacity: 2,
    burn: { emit: 0.35, douse: 0, ash: 0, extinguishTo: MAT.OIL },
  },
  { id: MAT.ASH, key: 'ASH', name: 'Ash', kind: KIND.POWDER, density: 12, color: '#8c8680', hidden: true, conduct: 0.01, capacity: 2 },
  // Kaynaklar: life = kalan bütçe (65535 = sınırsız); çoğaltıcının öğrendiği materyal variant'ta (reactions.js).
  { id: MAT.CLONER, key: 'CLONER', name: 'Cloner', kind: KIND.STATIC, density: 255, color: '#6a5a86', reactive: true, life: [1000, 1000], conduct: 0.06, capacity: 4, strength: 12, debris: MAT.RUBBLE },
  { id: MAT.SINK, key: 'SINK', name: 'Sink', kind: KIND.STATIC, density: 255, color: '#1b1626', reactive: true, life: [1000, 1000], conduct: 0.06, capacity: 4, strength: 12, debris: MAT.RUBBLE },
  // Soğuk ve metal (0.10.0). Metal K/C 0,2: havaya kayıpla iletim menzili ~10 hücre (plan sapma tablosu).
  {
    id: MAT.ICE, key: 'ICE', name: 'Ice', kind: KIND.STATIC, density: 255, color: '#bfe3f2',
    temp: -15, conduct: 0.12, capacity: 3, strength: 2, debris: MAT.SNOW, phase: { up: { at: 1, into: MAT.WATER, latent: 300 } },
  },
  {
    id: MAT.SNOW, key: 'SNOW', name: 'Snow', kind: KIND.POWDER, density: 8, color: '#eef3f7',
    temp: -8, conduct: 0.01, capacity: 1, phase: { up: { at: 1, into: MAT.WATER, latent: 30 } },
  },
  {
    id: MAT.METAL, key: 'METAL', name: 'Metal', kind: KIND.STATIC, density: 255, color: '#8d98a3',
    conduct: 1.6, capacity: 8, strength: 20, phase: { up: { at: 1400, into: MAT.MOLTEN_METAL, latent: 1200 } },
  },
  {
    id: MAT.MOLTEN_METAL, key: 'MOLTEN_METAL', name: 'Molten Metal', kind: KIND.LIQUID, density: 40, color: '#ffb347',
    dispersion: 4, spread: 0.9, drag: 0.8, temp: 1450, conduct: 0.8, capacity: 4,
    phase: { down: { at: 1300, into: MAT.METAL, latent: 400 } },
  },
  {
    id: MAT.MAGMA, key: 'MAGMA', name: 'Magma', kind: KIND.STATIC, density: 255, color: '#ff5a1a',
    hidden: true, temp: 1200, source: 1200, conduct: 0.06, capacity: 4, strength: Infinity,
  },
  {
    id: MAT.RUBBLE, key: 'RUBBLE', name: 'Rubble', kind: KIND.POWDER, density: 26, color: '#5a5550',
    conduct: 0.06, capacity: 4, phase: { up: { at: 1500, into: MAT.LAVA, latent: 800 } },
  },
  {
    id: MAT.GUNPOWDER, key: 'GUNPOWDER', name: 'Gunpowder', kind: KIND.POWDER, density: 14, color: '#3a3634',
    conduct: 0.03, capacity: 2, explosive: { power: 4, at: 200, ignite: 1 },
  },
  {
    id: MAT.DYNAMITE, key: 'DYNAMITE', name: 'Dynamite', kind: KIND.STATIC, density: 255, color: '#b8322a',
    conduct: 0.03, capacity: 3, strength: 3, explosive: { power: 30, at: 150, ignite: 0.5 },
  },
  {
    id: MAT.FUSE, key: 'FUSE', name: 'Fuse', kind: KIND.STATIC, density: 255, color: '#c9b58a',
    flammable: 1, burnsInto: MAT.BURNING_FUSE, ignitesAt: 200, conduct: 0.02, capacity: 2, strength: 4, debris: MAT.ASH,
  },
  {
    id: MAT.BURNING_FUSE, key: 'BURNING_FUSE', name: 'Burning Fuse', kind: KIND.STATIC, density: 255, color: '#ff9a3a',
    hidden: true, reactive: true, life: [5, 7], temp: 600, source: 600, conduct: 0.04, capacity: 2, strength: 4, debris: MAT.ASH,
    burn: { emit: 0.1, douse: 0.8, ash: 1, extinguishTo: MAT.FUSE },
  },
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

// Faz ilerlemesi sabit noktalıdır: 1 enerji birimi (kapasite × °C) = PROGRESS_SCALE sayaç adımı.
// Böylece eşiğin çok az üstündeki ısı fazlası da birikir (heat.js kesri stokastik yuvarlar).
export const PROGRESS_SCALE = 16;
const MAX_LATENT = Math.floor(65535 / PROGRESS_SCALE); // life Uint16

function compilePhaseEdge(def, edge, name, AT, INTO, LATENT, VANISH, targets) {
  if (!edge) return;
  const { at, into, latent, vanish = 0 } = edge;
  if (!Number.isFinite(at)) throw new RangeError(`Geçersiz faz eşiği (${def.key}.${name})`);
  if (!Number.isInteger(latent) || latent < 1 || latent > MAX_LATENT) throw new RangeError(`Gizli ısı 1..${MAX_LATENT} olmalı (${def.key}.${name})`);
  if (!(vanish >= 0 && vanish <= 1)) throw new RangeError(`Geçersiz vanish (${def.key}.${name})`);
  AT[def.id] = at;
  INTO[def.id] = into;
  LATENT[def.id] = latent * PROGRESS_SCALE;
  VANISH[def.id] = toByte(vanish);
  targets.push([`${def.key}.${name}`, into]);
}

const DEFAULT_CONDUCT = 0.02;
const DEFAULT_CAPACITY = 2;

export function compileMaterials(defs) {
  const KIND_T = new Uint8Array(256);
  const DENSITY = new Uint8Array(256);
  const DISPERSION = new Uint8Array(256);
  const SPREAD = new Uint8Array(256);
  const DRIFT = new Uint8Array(256);
  const RISE = new Uint8Array(256);
  const REACTIVE = new Uint8Array(256);
  const FLAMMABILITY = new Uint8Array(256);
  const BURNS_INTO = new Uint8Array(256);
  const LIFE_MIN = new Uint16Array(256);
  const LIFE_SPAN = new Uint16Array(256);
  const EMIT = new Uint8Array(256);
  const DOUSE = new Uint8Array(256);
  const ASH_CHANCE = new Uint8Array(256);
  const EXTINGUISH_TO = new Uint8Array(256);
  const SPAWN_TEMP = new Float32Array(256).fill(NaN);
  const CONDUCT = new Float32Array(256);
  const CAP = new Float32Array(256);
  const INV_CAP = new Float32Array(256);
  const SOURCE_TEMP = new Float32Array(256).fill(-Infinity);
  const UP_AT = new Float32Array(256).fill(Infinity);
  const UP_INTO = new Uint8Array(256);
  const UP_LATENT = new Uint16Array(256);
  const UP_VANISH = new Uint8Array(256);
  const DOWN_AT = new Float32Array(256).fill(-Infinity);
  const DOWN_INTO = new Uint8Array(256);
  const DOWN_LATENT = new Uint16Array(256);
  const DOWN_VANISH = new Uint8Array(256);
  const HAS_PHASE = new Uint8Array(256);
  const IGNITE_AT = new Float32Array(256).fill(Infinity);
  const EVAP_AT = new Float32Array(256).fill(Infinity);
  const STRENGTH = new Float32Array(256);
  const DEBRIS_OF = new Uint8Array(256);
  const EXPLOSIVE_POWER = new Float32Array(256);
  const EXPLODE_AT = new Float32Array(256).fill(Infinity);
  const EXPLOSIVE_IGNITE = new Uint8Array(256);
  const debrisTargets = []; // [anahtar, hedef] — tüm tanımlardan sonra doğrulanır
  const phaseTargets = []; // [yer, into] — tüm tanımlar kaydedildikten sonra doğrulanır
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
    const K = def.conduct ?? DEFAULT_CONDUCT;
    const C = def.capacity ?? DEFAULT_CAPACITY;
    if (!(C >= 1)) throw new RangeError(`Isı kapasitesi en az 1 olmalı (${def.key})`);
    if (!(K >= 0 && K / C <= 0.25)) throw new RangeError(`Kararsız ısı iletimi: K/C > 0,25 (${def.key})`);
    CONDUCT[def.id] = K;
    CAP[def.id] = C;
    INV_CAP[def.id] = 1 / C;
    if (def.source !== undefined) SOURCE_TEMP[def.id] = def.source;
    if (def.temp !== undefined && def.temp !== null) {
      if (!Number.isFinite(def.temp)) throw new RangeError(`Geçersiz doğuş sıcaklığı (${def.key})`);
      SPAWN_TEMP[def.id] = def.temp;
    }
    if (def.phase) {
      compilePhaseEdge(def, def.phase.up, 'up', UP_AT, UP_INTO, UP_LATENT, UP_VANISH, phaseTargets);
      compilePhaseEdge(def, def.phase.down, 'down', DOWN_AT, DOWN_INTO, DOWN_LATENT, DOWN_VANISH, phaseTargets);
      if (def.phase.up && def.phase.down && !(def.phase.up.at > def.phase.down.at)) {
        throw new RangeError(`Faz eşik sırası bozuk: up.at > down.at olmalı (${def.key})`);
      }
      HAS_PHASE[def.id] = 1;
    }
    if (def.ignitesAt !== undefined) {
      if (!def.burnsInto) throw new Error(`ignitesAt için burnsInto gerekli (${def.key})`);
      IGNITE_AT[def.id] = def.ignitesAt;
    }
    if (def.evaporatesAt !== undefined) EVAP_AT[def.id] = def.evaporatesAt;
    if (def.flammable && !def.burnsInto) throw new Error(`Yanıcı materyalin burnsInto değeri yok (${def.key})`);
    if (def.kind === KIND.STATIC) {
      if (!(def.strength >= 0)) throw new RangeError(`Statik materyalin dayanıklılık değeri (strength ≥ 0) olmalı (${def.key})`);
      STRENGTH[def.id] = def.strength;
    } else if (def.strength !== undefined && def.strength !== 0) {
      throw new RangeError(`Yalnız statik materyalin dayanıklılık değeri olur (${def.key})`);
    }
    DEBRIS_OF[def.id] = def.debris ?? def.id;
    if (def.debris !== undefined) debrisTargets.push([def.key, def.debris]);
    if (def.explosive) {
      const { power, at = Infinity, ignite = 1 } = def.explosive;
      if (!(power > 0) || !(at > -Infinity) || !(ignite >= 0 && ignite <= 1)) throw new RangeError(`Geçersiz patlayıcı tanımı (${def.key})`);
      EXPLOSIVE_POWER[def.id] = power;
      EXPLODE_AT[def.id] = at;
      EXPLOSIVE_IGNITE[def.id] = toByte(ignite);
    }
    if (def.kind === KIND.GAS) gasIds.push(def.id);
  }

  for (const [where, into] of phaseTargets) {
    if (!byId[into]) throw new Error(`Faz hedef materyali tanımsız: ${into} (${where})`);
  }

  for (const [key, into] of debrisTargets) {
    if (!byId[into]) throw new Error(`Tanımsız enkaz hedef materyali: ${into} (${key})`);
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
    FLAMMABILITY,
    BURNS_INTO,
    LIFE_MIN,
    LIFE_SPAN,
    EMIT,
    DOUSE,
    ASH_CHANCE,
    EXTINGUISH_TO,
    SPAWN_TEMP,
    CONDUCT,
    CAP,
    INV_CAP,
    SOURCE_TEMP,
    UP_AT,
    UP_INTO,
    UP_LATENT,
    UP_VANISH,
    DOWN_AT,
    DOWN_INTO,
    DOWN_LATENT,
    DOWN_VANISH,
    HAS_PHASE,
    IGNITE_AT,
    EVAP_AT,
    STRENGTH,
    DEBRIS_OF,
    EXPLOSIVE_POWER,
    EXPLODE_AT,
    EXPLOSIVE_IGNITE,
    DISPLACE,
    GAS_IDS: Object.freeze(gasIds),
    defs: byId,
    byKey,
    list: defs,
  });
}

export const MATERIALS = compileMaterials(MATERIAL_DEFS);

// Materyalin doğuş sıcaklığı; tanımsızsa (NaN) ortam sıcaklığı.
export function spawnTemp(t, ambient) {
  const s = MATERIALS.SPAWN_TEMP[t];
  return s === s ? s : ambient;
}

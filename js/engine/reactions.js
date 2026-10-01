// Reaksiyon sistemi (ADR-003, ADR-004).
// - Tek sahip: her etkileşim çiftini yalnızca bir taraf işler (tablo: ARCHITECTURE.md §5).
// - Sahip hücre tick başına 8 komşusundan rastgele BİRİNİ örnekler.
// - Isı alışverişi (kaynatma, kum ısıtma, lav soğuması, yoğuşma) sıcaklık alanında (heat.js);
//   burada yalnızca temas kuralları var.
// - Dönüştürülen/oluşturulan hücre damgalanır (world.transform/set) → aynı tick'te zincirleme yok.
// react() true dönerse hücre artık aynı materyal değildir; çağıran hareketi atlar.
import { MAT, KIND, MATERIALS, spawnTemp, CLOSED_BIT } from './materials.js';
import { detonate, addBlastPower } from './explosions.js';
import { noteSteam } from './pressure.js';

const { FLAMMABILITY, BURNS_INTO, LIFE_MIN, LIFE_SPAN, EMIT, DOUSE, ASH_CHANCE, EXTINGUISH_TO, EXPLOSIVE_POWER, EXPLOSIVE_IGNITE } = MATERIALS;
const { EMPTY, WATER, LAVA, STEAM, FIRE, PLANT, ASH } = MAT;

// Oranlar (olasılıklar 0..1 → 0..256 eşik).
const p = (x) => Math.round(x * 256);
export const RATES = Object.freeze({
  fireBoil: p(0.5), // ateş komşu suyu buharlaştırıp söner
  plantGrow: p(0.012), // bitkinin tick başına büyüme denemesi olasılığı (yavaş yayılım)
  plantMinTemp: 5, // °C; bunun altında bitki büyümez
  maxFireSpawnPerTick: 400, // yanan materyallerin tick başına üretebileceği en fazla ateş
  maxGrowthPerTick: 24, // tick başına en fazla bitki büyümesi (dünya genelinde)
  maxClonesPerTick: 300, // çoğaltıcıların tick başına en fazla kopyası (dünya genelinde)
  maxSinksPerTick: 300, // yutucuların tick başına en fazla yutması (dünya genelinde)
  fireSmoke: p(0.15), // sönen ateşin dumana dönme olasılığı
  burnSmoke: p(0.1), // yanan maddenin alev üretirken duman çıkarma olasılığı
  maxSmokePerTick: 60, // yangınların tick başına en fazla dumanı (dünya genelinde)
});

export function createReactionState() {
  return { fireBudget: 0, growthBudget: 0, cloneBudget: 0, sinkBudget: 0, smokeBudget: 0 };
}

export function beginReactionTick(state) {
  state.fireBudget = RATES.maxFireSpawnPerTick;
  state.growthBudget = RATES.maxGrowthPerTick;
  state.cloneBudget = RATES.maxClonesPerTick;
  state.sinkBudget = RATES.maxSinksPerTick;
  state.smokeBudget = RATES.maxSmokePerTick;
}

// Materyalin spawn ömrü: LIFE_MIN + r mod (span + 1).
export function initialLife(t, r) {
  const span = LIFE_SPAN[t];
  return LIFE_MIN[t] + (span === 0 ? 0 : r % (span + 1));
}

const roll = (rng, threshold) => (rng.nextU32() & 255) < threshold;
const sampleNeighbor = (world, rng, i) => i + world.neighborOffsets[rng.nextU32() & 7];

function become(world, rng, i, t) {
  world.transform(i, t, initialLife(t, rng.nextU32()));
}

// Hücre boşalır; sıcaklığı korunur (sönen ateş geride sıcak hava bırakır).
function vanish(world, i) {
  world.set(i, EMPTY, 0, 0, 0, world.temp[i]);
}

function ignite(world, rng, j, nt) {
  if (EXPLOSIVE_POWER[nt] !== 0) {
    if (roll(rng, EXPLOSIVE_IGNITE[nt])) detonate(world, j); // ateş, yanan madde ve lav patlayıcıyı tetikler
    return;
  }
  const flammability = FLAMMABILITY[nt];
  if (flammability !== 0 && roll(rng, flammability)) become(world, rng, j, BURNS_INTO[nt]);
}

export const METHANE_POWER = 0.5; // yanan metan hücresinin tick başına birleştirme ızgarasına yazdığı güç
const SMOKE_TEMP = 300; // yangın dumanının doğuş sıcaklığı (°C)

const STEAM_TEMP = spawnTemp(STEAM, 0); // 105 °C

// Tüm buhar üretimi buradan geçer (kaynama, ateş, söndürme). Buhar doğuş sıcaklığıyla başlar;
// aksi halde suyun sıcaklığını alıp hemen yoğuşurdu. Ani buharlaşma sayacı (pressure.js) buradan beslenir.
export function emitSteam(world, i) {
  world.transform(i, STEAM, 0);
  world.temp[i] = STEAM_TEMP;
  if (world.flash) {
    const stride = world.stride;
    noteSteam(world.flash, (i % stride) - 1, Math.floor(i / stride) - 1); // ani buharlaşma (pressure.js)
  }
}

// ---- Materyal kuralları ----

// Ateş kısa ömürlü ve hareketli olduğundan tick başına FIRE_SAMPLES komşu örnekler
// (tek örnekle yakıtın yanından geçen kıvılcım çoğu zaman tutuşturamıyordu).
// İlk kaynatmada söndüğü için tick başına en fazla bir su buharlaşır.
const FIRE_SAMPLES = 2;

function reactFire(world, rng, i, state) {
  const life = world.life;
  if (life[i] <= 1) {
    if (state.smokeBudget > 0 && roll(rng, RATES.fireSmoke)) {
      world.transform(i, MAT.SMOKE, initialLife(MAT.SMOKE, rng.nextU32())); // sıcaklık korunur
      state.smokeBudget--;
    } else vanish(world, i);
    return true;
  }
  life[i]--;
  for (let s = 0; s < FIRE_SAMPLES; s++) {
    const j = sampleNeighbor(world, rng, i);
    const nt = world.type[j];
    if (nt === WATER) {
      if (!roll(rng, RATES.fireBoil)) continue;
      emitSteam(world, j);
      vanish(world, i);
      return true;
    }
    ignite(world, rng, j, nt);
  }
  return false;
}

// Lav yalnızca temasla tutuşturur; kaynatma, kum ısıtma ve soğuma sıcaklık alanında.
function reactLava(world, rng, i) {
  const j = sampleNeighbor(world, rng, i);
  ignite(world, rng, j, world.type[j]);
  return false;
}

// Alev: üstteki üç hücreden birine (boşsa) ateş üret; tick başına dünya geneli sınır var.
function emitFlame(world, rng, i, t, state) {
  if (state.fireBudget > 0 && roll(rng, EMIT[t])) {
    const j = i - world.stride + ((rng.nextU32() % 3) - 1);
    if (world.type[j] === EMPTY) {
      world.set(j, FIRE, rng.nextU32() & 255, initialLife(FIRE, rng.nextU32()), 0, spawnTemp(FIRE, world.ambient));
      state.fireBudget--;
    }
  }
}

// Su yanan hücreyi söndürür: su buhara döner, hücre eski materyaline iner.
// Isı buhara geçer: sönen hücre kaynak sıcaklığında kalsaydı ısı geçişi onu yeniden tutuştururdu.
function douseBurning(world, i, j, t) {
  emitSteam(world, j);
  world.transform(i, EXTINGUISH_TO[t], 0);
  if (world.temp[i] > STEAM_TEMP) world.temp[i] = STEAM_TEMP;
}

function reactBurning(world, rng, i, t, state) {
  const life = world.life;
  if (life[i] <= 1) {
    if (ASH_CHANCE[t] !== 0 && roll(rng, ASH_CHANCE[t])) world.transform(i, ASH, 0);
    else vanish(world, i);
    return true;
  }
  life[i]--;

  // Alev: üstteki üç hücreden birine (boşsa) ateş üret; tick başına dünya geneli sınır var.
  emitFlame(world, rng, i, t, state);
  if (state.smokeBudget > 0 && roll(rng, RATES.burnSmoke)) {
    const js = i - world.stride + ((rng.nextU32() % 3) - 1);
    if (world.type[js] === EMPTY) {
      world.set(js, MAT.SMOKE, rng.nextU32() & 255, initialLife(MAT.SMOKE, rng.nextU32()), 0, Math.max(world.temp[js], SMOKE_TEMP));
      state.smokeBudget--;
    }
  }

  const j = sampleNeighbor(world, rng, i);
  const nt = world.type[j];
  if (nt === WATER) {
    if (DOUSE[t] === 0 || !roll(rng, DOUSE[t])) return false;
    douseBurning(world, i, j, t);
    return true;
  }
  ignite(world, rng, j, nt);
  return false;
}

// Yanan metan: alev cephesi her tick 8 komşudaki metanı tutuşturur, bir komşudaki yanıcıyı tutuşturabilir ve
// birleştirme ızgarasına METHANE_POWER yazar (yoğun cep blokta eşiği aşıp patlar; seyrek metan yalnız yanar).
function reactBurningMethane(world, rng, i) {
  const life = world.life;
  if (life[i] <= 1) {
    vanish(world, i);
    return true;
  }
  life[i]--;
  const off = world.neighborOffsets;
  for (let k = 0; k < 8; k++) {
    const j = i + off[k];
    if (world.type[j] === MAT.METHANE) {
      world.transform(j, MAT.BURNING_METHANE, initialLife(MAT.BURNING_METHANE, rng.nextU32()));
      world.temp[j] = spawnTemp(MAT.BURNING_METHANE, 0);
    }
  }
  const j = sampleNeighbor(world, rng, i);
  ignite(world, rng, j, world.type[j]);
  if (world.blast) {
    const stride = world.stride;
    addBlastPower(world.blast, (i % stride) - 1, Math.floor(i / stride) - 1, METHANE_POWER);
  }
  return false;
}

// Duman: yalnız açık bölgede söner (kapalı bölgede birikir; CLOSED_BIT'i basınç geçişi yazar).
function reactSmoke(world, i) {
  if ((world.flags[i] & CLOSED_BIT) !== 0) return false;
  const life = world.life;
  if (life[i] <= 1) {
    vanish(world, i);
    return true;
  }
  life[i]--;
  return false;
}

// Yanan fitil: ömrü bitince küle döner, 8 komşusundaki fitili tutuşturur ve patlayıcıyı tetikler (ateş
// ~6 tick'te bir hücre ilerler: 1× hızda ~10 hücre/s). Yanarken ara sıra üstüne kıvılcım çıkarır; suyla söner.
function reactBurningFuse(world, rng, i, state) {
  const life = world.life;
  if (life[i] <= 1) {
    const off = world.neighborOffsets;
    for (let k = 0; k < 8; k++) {
      const j = i + off[k];
      const nt = world.type[j];
      if (nt === MAT.FUSE) become(world, rng, j, MAT.BURNING_FUSE);
      else if (EXPLOSIVE_POWER[nt] !== 0) detonate(world, j);
    }
    world.transform(i, ASH, 0);
    return true;
  }
  life[i]--;
  emitFlame(world, rng, i, MAT.BURNING_FUSE, state);
  const j = sampleNeighbor(world, rng, i);
  if (world.type[j] === WATER && roll(rng, DOUSE[MAT.BURNING_FUSE])) {
    douseBurning(world, i, j, MAT.BURNING_FUSE);
    return true;
  }
  return false;
}

function reactPlant(world, rng, i, state) {
  if (state.growthBudget <= 0 || world.temp[i] < RATES.plantMinTemp || !roll(rng, RATES.plantGrow)) return false;
  const budget = world.life[i];
  if (budget === 0) return false;
  const j = sampleNeighbor(world, rng, i);
  if (world.type[j] !== WATER) return false;
  // Büyüme suyu tüketir (bitki + su korunur); çocuk bütçesi ebeveynden bir eksik.
  world.transform(j, PLANT, budget - 1);
  state.growthBudget--;
  return false;
}

// ---- Kaynaklar: Çoğaltıcı ve Yutucu ----
// life: kalan bütçe; SOURCE_INFINITE (65535) sınırsızdır ve hiç azalmaz. Yalnızca hareketli
// materyaller (toz, sıvı, gaz) öğrenilir/yutulur: kap duvarları ve başka kaynaklar etkilenmez.
// Çoğaltıcı yalnızca bitişik boş hücrelere yazar (taşma yok). Çoğaltıcının öğrendiği materyal
// variant'ta tutulur; flags bit1 "öğrendi" işaretidir.
// flags bit2 "aşağı yönlü" (yalnızca sahneler/configureSource verir): kaynak 8 komşu yerine yalnızca
// yönündeki üç komşudan birini örnekler — çoğaltıcı alttakilere üretir, yutucu üsttekileri yutar.
// Yön dünya koordinatındadır; dünya çevrilince (F) alttaki kapağın kaynakları üste geçer ve rolleri
// kendiliğinden yer değiştirir.
export const SOURCE_INFINITE = 65535;
export const CLONER_LEARNED = 2;
export const SOURCE_DOWNWARD = 4;
const { KIND: KIND_OF } = MATERIALS;

export function isMover(t) {
  const k = KIND_OF[t];
  return k === KIND.POWDER || k === KIND.LIQUID || k === KIND.GAS;
}

function spend(world, i) {
  if (world.life[i] !== SOURCE_INFINITE) world.life[i]--;
}

// Aşağı yönlü kaynağın örneklediği komşu: dy satırındaki üç hücreden biri (tek RNG çağrısı).
const sampleRow = (world, rng, i, dy) => i + dy * world.stride + ((rng.nextU32() % 3) - 1);

function reactCloner(world, rng, i, state) {
  const flags = world.flags;
  const j = (flags[i] & SOURCE_DOWNWARD) !== 0 ? sampleRow(world, rng, i, 1) : sampleNeighbor(world, rng, i);
  const nt = world.type[j];
  if ((flags[i] & CLONER_LEARNED) === 0) {
    if (isMover(nt)) {
      world.variant[i] = nt;
      flags[i] |= CLONER_LEARNED;
    }
    return false;
  }
  if (nt !== EMPTY || world.life[i] === 0 || state.cloneBudget <= 0) return false;
  const m = world.variant[i];
  world.set(j, m, rng.nextU32() & 255, initialLife(m, rng.nextU32()), rng.nextU32() & 1, spawnTemp(m, world.ambient));
  spend(world, i);
  state.cloneBudget--;
  return false;
}

function reactSink(world, rng, i, state) {
  const j = (world.flags[i] & SOURCE_DOWNWARD) !== 0 ? sampleRow(world, rng, i, -1) : sampleNeighbor(world, rng, i);
  if (!isMover(world.type[j]) || world.life[i] === 0 || state.sinkBudget <= 0) return false;
  world.set(j, EMPTY, 0, 0, 0, world.ambient); // yutulan madde ısısıyla birlikte yok olur
  spend(world, i);
  state.sinkBudget--;
  return false;
}

export function react(world, rng, i, t, state) {
  switch (t) {
    case FIRE:
      return reactFire(world, rng, i, state);
    case LAVA:
      return reactLava(world, rng, i);
    case PLANT:
      return reactPlant(world, rng, i, state);
    case MAT.BURNING_WOOD:
    case MAT.BURNING_PLANT:
    case MAT.BURNING_OIL:
      return reactBurning(world, rng, i, t, state);
    case MAT.BURNING_FUSE:
      return reactBurningFuse(world, rng, i, state);
    case MAT.BURNING_METHANE:
      return reactBurningMethane(world, rng, i);
    case MAT.SMOKE:
      return reactSmoke(world, i);
    case MAT.CLONER:
      return reactCloner(world, rng, i, state);
    case MAT.SINK:
      return reactSink(world, rng, i, state);
    default:
      return false;
  }
}

// Reaksiyon sistemi (ADR-003, ADR-004).
// - Tek sahip: her etkileşim çiftini yalnızca bir taraf işler (tablo: ARCHITECTURE.md §5).
// - Sahip hücre tick başına 8 komşusundan rastgele BİRİNİ örnekler.
// - Sıcaklık alanı yok: yerel ısı/soğuma `life` sayaçlarında tutulur.
// - Dönüştürülen/oluşturulan hücre damgalanır (world.transform/set) → aynı tick'te zincirleme yok.
// react() true dönerse hücre artık aynı materyal değildir; çağıran hareketi atlar.
import { MAT, MATERIALS } from './materials.js';

const { FLAMMABILITY, BURNS_INTO, LIFE_MIN, LIFE_SPAN, EMIT, DOUSE, ASH_CHANCE, EXTINGUISH_TO } = MATERIALS;
const { EMPTY, SAND, WATER, LAVA, STEAM, FIRE, STONE, GLASS, PLANT, ASH } = MAT;

// Oranlar (olasılıklar 0..1 → 0..256 eşik).
const p = (x) => Math.round(x * 256);
export const RATES = Object.freeze({
  fireBoil: p(0.5), // ateş komşu suyu buharlaştırıp söner
  lavaBoil: p(0.6), // lava komşu suyu buharlaştırır
  lavaQuench: 25, // su teması başına lava soğuma sayacı artışı
  lavaAirCool: p(0.1), // havayla temas eden lavanın soğuma olasılığı (+1)
  lavaSolidify: 200, // bu sayaca ulaşan lava taşa döner
  sandHeatGain: 16, // lava kum komşusunu örneklediğinde kumun ısı artışı
  glassHeat: 300, // bu ısıya ulaşan kum cama döner (kum tick başına 1 soğur)
  condenseToWater: p(0.6), // buhar ömrü bitince suya dönme olasılığı (yoksa kaybolur)
  plantGrow: p(0.05), // bitkinin tick başına büyüme denemesi olasılığı
  maxFireSpawnPerTick: 400, // yanan materyallerin tick başına üretebileceği en fazla ateş
  maxGrowthPerTick: 24, // tick başına en fazla bitki büyümesi (dünya genelinde)
});

export function createReactionState() {
  return { fireBudget: 0, growthBudget: 0 };
}

export function beginReactionTick(state) {
  state.fireBudget = RATES.maxFireSpawnPerTick;
  state.growthBudget = RATES.maxGrowthPerTick;
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

function vanish(world, i) {
  world.set(i, EMPTY, 0, 0, 0);
}

function ignite(world, rng, j, nt) {
  const flammability = FLAMMABILITY[nt];
  if (flammability !== 0 && roll(rng, flammability)) become(world, rng, j, BURNS_INTO[nt]);
}

// ---- Materyal kuralları ----

// Ateş kısa ömürlü ve hareketli olduğundan tick başına FIRE_SAMPLES komşu örnekler
// (tek örnekle yakıtın yanından geçen kıvılcım çoğu zaman tutuşturamıyordu).
// İlk kaynatmada söndüğü için tick başına en fazla bir su buharlaşır.
const FIRE_SAMPLES = 2;

function reactFire(world, rng, i) {
  const life = world.life;
  if (life[i] <= 1) {
    vanish(world, i);
    return true;
  }
  life[i]--;
  for (let s = 0; s < FIRE_SAMPLES; s++) {
    const j = sampleNeighbor(world, rng, i);
    const nt = world.type[j];
    if (nt === WATER) {
      if (!roll(rng, RATES.fireBoil)) continue;
      become(world, rng, j, STEAM);
      vanish(world, i);
      return true;
    }
    ignite(world, rng, j, nt);
  }
  return false;
}

function reactSteam(world, rng, i) {
  const life = world.life;
  if (life[i] > 1) {
    life[i]--;
    return false;
  }
  if (roll(rng, RATES.condenseToWater)) become(world, rng, i, WATER);
  else vanish(world, i);
  return true;
}

// Lava soğuma sayacını artırır; eşiği geçerse taşa döner (true).
function coolLava(world, i, amount) {
  const v = world.life[i] + amount;
  if (v >= RATES.lavaSolidify) {
    world.transform(i, STONE, 0);
    return true;
  }
  world.life[i] = v;
  return false;
}

function reactLava(world, rng, i) {
  const j = sampleNeighbor(world, rng, i);
  const nt = world.type[j];
  if (nt === WATER) {
    if (!roll(rng, RATES.lavaBoil)) return false;
    become(world, rng, j, STEAM);
    return coolLava(world, i, RATES.lavaQuench);
  }
  if (nt === SAND) {
    // Lava kumu ısıtır (sahip: lava — büyük kum yığınlarının örneklemesinden ucuz).
    const heat = world.life[j] + RATES.sandHeatGain;
    if (heat >= RATES.glassHeat) world.transform(j, GLASS, 0);
    else world.life[j] = heat;
    return false;
  }
  if (nt === EMPTY) {
    return roll(rng, RATES.lavaAirCool) ? coolLava(world, i, 1) : false;
  }
  ignite(world, rng, j, nt);
  return false;
}

function reactSand(world, i) {
  // Isınan kum lava teması kesilince soğur (RNG'siz, ucuz).
  if (world.life[i] > 0) world.life[i]--;
  return false;
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
  if (state.fireBudget > 0 && roll(rng, EMIT[t])) {
    const j = i - world.stride + ((rng.nextU32() % 3) - 1);
    if (world.type[j] === EMPTY) {
      world.set(j, FIRE, rng.nextU32() & 255, initialLife(FIRE, rng.nextU32()), 0);
      state.fireBudget--;
    }
  }

  const j = sampleNeighbor(world, rng, i);
  const nt = world.type[j];
  if (nt === WATER) {
    if (DOUSE[t] === 0 || !roll(rng, DOUSE[t])) return false;
    become(world, rng, j, STEAM);
    world.transform(i, EXTINGUISH_TO[t], 0);
    return true;
  }
  ignite(world, rng, j, nt);
  return false;
}

function reactPlant(world, rng, i, state) {
  if (state.growthBudget <= 0 || !roll(rng, RATES.plantGrow)) return false;
  const budget = world.life[i];
  if (budget === 0) return false;
  const j = sampleNeighbor(world, rng, i);
  if (world.type[j] !== WATER) return false;
  // Büyüme suyu tüketir (bitki + su korunur); çocuk bütçesi ebeveynden bir eksik.
  world.transform(j, PLANT, budget - 1);
  state.growthBudget--;
  return false;
}

export function react(world, rng, i, t, state) {
  switch (t) {
    case FIRE:
      return reactFire(world, rng, i);
    case STEAM:
      return reactSteam(world, rng, i);
    case LAVA:
      return reactLava(world, rng, i);
    case SAND:
      return reactSand(world, i);
    case PLANT:
      return reactPlant(world, rng, i, state);
    case MAT.BURNING_WOOD:
    case MAT.BURNING_PLANT:
    case MAT.BURNING_OIL:
      return reactBurning(world, rng, i, t, state);
    default:
      return false;
  }
}

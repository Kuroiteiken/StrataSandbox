// Hareket çekirdekleri. Tür bazlı, materyalden bağımsız; parametreler
// materials.js'in derlenmiş tablolarından okunur. Hot path: allocation yok.
import { MAT, KIND, MATERIALS } from './materials.js';

const { DISPLACE, KIND: KIND_OF, DISPERSION, SPREAD, DRIFT, RISE } = MATERIALS;
const EMPTY = MAT.EMPTY;
const STATIC = KIND.STATIC;

// flags bit0: sıvının kalıcı akış yönü (1 = sağ, 0 = sol). Yalnızca önü tıkanınca döner.
const DIR_BIT = 1;

// Mover (tip t), j hücresine girebilir mi? Olasılıklı yer değiştirme dahil.
// Bu tick'te zaten hareket etmiş bir parçacıkla yer değiştirilmez; boş hücre serbest.
function canEnter(world, rng, t, j) {
  const target = world.type[j];
  const chance = DISPLACE[t * 256 + target];
  if (chance === 0) return false;
  if (target !== EMPTY && world.stamp[j] === world.clock) return false;
  if (chance < 255 && (rng.nextU32() & 255) >= chance) return false;
  return true;
}

// Köşegen hareket (aşağı için base = alt hücre, yukarı için base = üst hücre).
// Yol üzerindeki yan hücre statikse geçiş yok: ince çapraz duvarlardan sızıntı olmaz.
function tryDiagonal(world, rng, t, i, base, side) {
  if (KIND_OF[world.type[i + side]] === STATIC) return false;
  const diag = base + side;
  if (!canEnter(world, rng, t, diag)) return false;
  world.swap(i, diag);
  return true;
}

// j hücresine girme olasılığı (0..255), olasılık zarı atılmadan: stamp kuralı dahil.
// Yerleşmiş (hiçbir yere gidemeyen) parçacıklar böylece hiç RNG tüketmez.
function entryChance(world, t, j) {
  const target = world.type[j];
  const chance = DISPLACE[t * 256 + target];
  if (chance === 0) return 0;
  if (target !== EMPTY && world.stamp[j] === world.clock) return 0;
  return chance;
}

// Köşegen girilebilirliği (zar atılmadan): yan hücre statikse 0.
function diagonalChance(world, t, i, base, side) {
  if (KIND_OF[world.type[i + side]] === STATIC) return 0;
  return entryChance(world, t, base + side);
}

const roll = (rng, chance) => chance === 255 || (rng.nextU32() & 255) < chance;

export function stepPowder(world, rng, i, t) {
  const below = i + world.stride;
  const down = entryChance(world, t, below);
  if (down !== 0 && roll(rng, down)) {
    world.swap(i, below);
    return;
  }
  const left = diagonalChance(world, t, i, below, -1);
  const right = diagonalChance(world, t, i, below, 1);
  if (left === 0 && right === 0) return; // yerleşmiş: RNG tüketme
  let side;
  if (left === 0) side = 1;
  else if (right === 0) side = -1;
  else side = rng.bit() === 1 ? 1 : -1; // iki yön de açık: rastgele (bias yok)
  const first = side === 1 ? right : left;
  if (roll(rng, first)) {
    world.swap(i, below + side);
    return;
  }
  const second = side === 1 ? left : right;
  if (second !== 0 && roll(rng, second)) world.swap(i, below - side);
}

// Yatay akış: en fazla n hücre, yalnızca boş hücreler üzerinden. İlk dolu hücrede
// durur; bu sayede 1 hücrelik kenar çerçevesi (WALL) hiç aşılmaz.
// Gaz hücresine yatay girilmez: sıvı↔gaz değişimi yalnızca dikeyde (sıvının düşmesiyle)
// olur. Aksi halde dipteki su kabarcıkla yana yer değiştirip onu damgalar, üstteki su
// kabarcığa düşemez ve kabarcık dipte hapsolur.
// Altı açık bir hücreye gelince orada durur: bir sonraki tick'te düşmek öncelikli.
function flowSideways(world, t, i, d, n) {
  const { type, stride } = world;
  const row = t * 256;
  let target = -1;
  for (let k = 1, j = i + d; k <= n; k++, j += d) {
    if (type[j] !== EMPTY) break;
    target = j;
    if (DISPLACE[row + type[j + stride]] !== 0) break;
  }
  if (target < 0) return false;
  world.swap(i, target);
  return true;
}

export function stepLiquid(world, rng, i, t) {
  const below = i + world.stride;
  // Serbest düşüş viskoziteden bağımsızdır (lava da havada normal hızla düşer).
  if (canEnter(world, rng, t, below)) {
    world.swap(i, below);
    return;
  }
  const flags = world.flags;
  const dir = (flags[i] & DIR_BIT) !== 0 ? 1 : -1;
  if (tryDiagonal(world, rng, t, i, below, dir)) return;
  if (tryDiagonal(world, rng, t, i, below, -dir)) return;

  // Viskozite yalnızca yatay yayılmayı yavaşlatır.
  const spread = SPREAD[t];
  if (spread < 255 && (rng.nextU32() & 255) >= spread) return;
  const n = DISPERSION[t];
  if (flowSideways(world, t, i, dir, n)) return;
  flags[i] ^= DIR_BIT; // önü tıkalı: yön değiştir (bit parçacıkla birlikte taşınır)
  flowSideways(world, t, i, -dir, n);
}

// Gazlar ikinci (yukarıdan aşağı) geçişte güncellenir.
export function stepGas(world, rng, i, t) {
  const rise = RISE[t];
  if (rise < 255 && (rng.nextU32() & 255) >= rise) return; // bu tick yerinde oyalan
  const above = i - world.stride;
  const d = rng.bit() === 1 ? 1 : -1;
  const drift = DRIFT[t];
  // Sürüklenme: yükselirken zaman zaman önce köşegeni dene.
  if (drift !== 0 && (rng.nextU32() & 255) < drift && tryDiagonal(world, rng, t, i, above, d)) return;
  if (canEnter(world, rng, t, above)) {
    world.swap(i, above);
    return;
  }
  if (tryDiagonal(world, rng, t, i, above, d)) return;
  if (tryDiagonal(world, rng, t, i, above, -d)) return;
  // Tavana takıldıysa yatay kıpırda.
  if (canEnter(world, rng, t, i + d)) {
    world.swap(i, i + d);
    return;
  }
  if (canEnter(world, rng, t, i - d)) world.swap(i, i - d);
}

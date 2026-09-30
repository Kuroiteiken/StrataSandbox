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

export function stepPowder(world, rng, i, t) {
  const below = i + world.stride;
  if (canEnter(world, rng, t, below)) {
    world.swap(i, below);
    return;
  }
  const first = rng.bit() === 1 ? 1 : -1;
  if (tryDiagonal(world, rng, t, i, below, first)) return;
  tryDiagonal(world, rng, t, i, below, -first);
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

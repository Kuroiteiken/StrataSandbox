// Hareket çekirdekleri. Tür bazlı, materyalden bağımsız; parametreler
// materials.js'in derlenmiş tablolarından okunur. Hot path: allocation yok.
import { MAT, KIND, MATERIALS } from './materials.js';

const { DISPLACE, KIND: KIND_OF } = MATERIALS;
const EMPTY = MAT.EMPTY;
const STATIC = KIND.STATIC;

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

// Köşegen hareket: yol üzerindeki yan hücre statikse geçiş yok (köşe sızıntısı önlemi).
function tryDiagonal(world, rng, t, i, below, side) {
  if (KIND_OF[world.type[i + side]] === STATIC) return false;
  const diag = below + side;
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

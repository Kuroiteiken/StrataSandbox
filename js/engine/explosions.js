// Patlamalar (ADR-017): olay kuyruğu, 8×8 birleştirme ızgarası ve patlamanın uygulanması (tick geçiş 5).
// - requestExplosion: kuyruğa bir patlama ekler (araç, basınç, buhar). Kuyruk doluysa güç birleştirme
//   ızgarasına düşer, kaybolmaz.
// - addBlastPower: patlayıcıların gücü hücrenin 8×8 bloğunda toplanır; geçiş 5'in başında blok başına tek
//   olaya dönüşür (MERGE_MIN altı söner). Patlama sırasında tetiklenen patlayıcılar ızgaraya yazılır ve bir
//   sonraki tick patlar: zincir tick tick ilerler.
// - applyExplosion: yarıçap r = min(R_MAX, 1 + 1,5·√G), şiddet s = 2·√G·(1 − d/r). Katı s ≥ dayanıklılıksa
//   enkazına döner ve savrulur; toz ve sıvı savrulur; yanıcı tutuşur; her hücre ısınır; merkezde ateş çıkar.
// Yalnız aritmetik (Math.sqrt) ve verilen RNG; durum önceden ayrılır, hot loop'ta tahsis yok.
import { MAT, KIND, MATERIALS } from './materials.js';
import { TEMP_MAX } from './climate.js';

const { KIND: KIND_OF, STRENGTH, DEBRIS_OF, FLAMMABILITY, BURNS_INTO, LIFE_MIN, LIFE_SPAN, SPAWN_TEMP } = MATERIALS;
const EMPTY = MAT.EMPTY;
const FIRE = MAT.FIRE;
const U32 = 4294967296;

export const BLAST = Object.freeze({
  R_MAX: 20, // yarıçap üst sınırı
  HEAT_MAX: 600, // merkezdeki ısınma (°C), kenara doğru doğrusal azalır
  MAX_PER_TICK: 16, // tick başına işlenen patlama
  MAX_CELLS_PER_TICK: 4000, // tick başına patlamalarda etkilenen hücre
  QUEUE_CAPACITY: 64,
  MERGE_BLOCK: 8, // birleştirme ızgarası blok kenarı (hücre)
  MERGE_MIN: 2, // bir bloğun patlama olayına dönüşmesi için en az güç
  CHAIN_MIN: 0.5, // patlayıcıyı tetikleyen en az şiddet (Görev 3)
  FIRE_CHANCE: 0.5, // d < r/2 boş hücrenin ateşe dönme olasılığı
  LAUNCH_K: 0.75, // savrulma hızı = LAUNCH_K · s (havuz V_MAX ile kırpar)
  UP_BIAS: 0.35, // savrulma yönüne eklenen yukarı eğilim
  RING: 8, // view.blasts halka tamponu (parlama ve sarsıntı)
});

export const BLAST_KIND = Object.freeze({ TOOL: 1, EXPLOSIVE: 2, PRESSURE: 3, STEAM: 4 });

export const radiusOf = (G) => Math.min(BLAST.R_MAX, 1 + 1.5 * Math.sqrt(G));

export function intensityAt(G, d) {
  const r = radiusOf(G);
  return d >= r ? 0 : 2 * Math.sqrt(G) * (1 - d / r);
}

export function createBlastState(width, height) {
  const B = BLAST.MERGE_BLOCK;
  const bw = Math.ceil(width / B);
  const bh = Math.ceil(height / B);
  const n = bw * bh;
  const q = BLAST.QUEUE_CAPACITY;
  const ring = BLAST.RING;
  return {
    width,
    height,
    bw,
    bh,
    power: new Float32Array(n),
    sx: new Float32Array(n),
    sy: new Float32Array(n),
    active: new Int32Array(n),
    isActive: new Uint8Array(n),
    activeCount: 0,
    qx: new Float32Array(q),
    qy: new Float32Array(q),
    qp: new Float32Array(q),
    qk: new Uint8Array(q),
    qCount: 0,
    blastsThisTick: 0,
    cellsThisTick: 0,
    totals: new Uint32Array(8), // BLAST_KIND başına toplam (istatistik ve testler)
    ringX: new Float32Array(ring),
    ringY: new Float32Array(ring),
    ringP: new Float32Array(ring),
    ringSerial: new Uint32Array(ring),
    serial: 0, // kaydedilen patlama sayısı; renderer yeni patlamaları bununla tanır
  };
}

export function resetBlastState(s) {
  s.power.fill(0);
  s.sx.fill(0);
  s.sy.fill(0);
  s.isActive.fill(0);
  s.activeCount = 0;
  s.qCount = 0;
  s.blastsThisTick = 0;
  s.cellsThisTick = 0;
}

// Undo snapshot'ı için. Halka tamponu görseldir, kopyalanmaz (geri alma parlamayı yeniden oynatmaz).
export function copyBlastState(dst, src) {
  for (const k of ['power', 'sx', 'sy', 'active', 'isActive', 'qx', 'qy', 'qp', 'qk', 'totals']) dst[k].set(src[k]);
  dst.activeCount = src.activeCount;
  dst.qCount = src.qCount;
}

function pushEvent(s, x, y, G, kind) {
  const k = s.qCount++;
  s.qx[k] = x;
  s.qy[k] = y;
  s.qp[k] = G;
  s.qk[k] = kind;
}

function clearBlock(s, b) {
  s.power[b] = 0;
  s.sx[b] = 0;
  s.sy[b] = 0;
  s.isActive[b] = 0;
}

// Dünya çevrilince: eşiği geçen bekleyen bloklar kuyruğa alınır, kuyruktaki her olayın y'si aynalanır.
export function flipBlastState(s) {
  for (let k = 0; k < s.activeCount; k++) {
    const b = s.active[k];
    const p = s.power[b];
    if (p >= BLAST.MERGE_MIN && s.qCount < BLAST.QUEUE_CAPACITY) pushEvent(s, s.sx[b] / p, s.sy[b] / p, p, BLAST_KIND.EXPLOSIVE);
    clearBlock(s, b);
  }
  s.activeCount = 0;
  for (let k = 0; k < s.qCount; k++) s.qy[k] = s.height - 1 - s.qy[k];
}

export function addBlastPower(s, x, y, G) {
  const B = BLAST.MERGE_BLOCK;
  const b = Math.floor(y / B) * s.bw + Math.floor(x / B);
  if (s.isActive[b] === 0) {
    s.isActive[b] = 1;
    s.active[s.activeCount++] = b;
  }
  s.power[b] += G;
  s.sx[b] += G * x;
  s.sy[b] += G * y;
}

// Kuyruğa patlama ekler; geçersiz istek reddedilir. Kuyruk doluysa güç birleştirme ızgarasına düşer.
export function requestExplosion(s, x, y, G, kind) {
  if (!(G > 0) || !Number.isFinite(G) || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (x < 0 || y < 0 || x >= s.width || y >= s.height) return false;
  if (s.qCount < BLAST.QUEUE_CAPACITY) pushEvent(s, x, y, G, kind);
  else addBlastPower(s, x, y, G);
  return true;
}

// Birleştirme ızgarası → kuyruk. Kuyruk doluysa blok bekler (sonraki tick).
function flushMerge(s) {
  let keep = 0;
  for (let k = 0; k < s.activeCount; k++) {
    const b = s.active[k];
    const p = s.power[b];
    if (p >= BLAST.MERGE_MIN) {
      if (s.qCount >= BLAST.QUEUE_CAPACITY) {
        s.active[keep++] = b;
        continue;
      }
      pushEvent(s, s.sx[b] / p, s.sy[b] / p, p, BLAST_KIND.EXPLOSIVE);
    }
    clearBlock(s, b);
  }
  s.activeCount = keep;
}

const chance = (rng, p) => rng.nextU32() < p * U32;

function lifeOf(rng, t) {
  const span = LIFE_SPAN[t];
  return LIFE_MIN[t] + (span === 0 ? 0 : rng.nextU32() % (span + 1));
}

// Savurma yönü: merkezden dışa + yukarı eğilim, büyüklük LAUNCH_K · s. Havuz yoksa false.
function launch(world, pool, i, type, dx, dy, d, s) {
  if (pool === null) return false;
  let ux = 0;
  let uy = -1;
  if (d > 0) {
    ux = dx / d;
    uy = dy / d;
  }
  uy -= BLAST.UP_BIAS;
  const n = Math.sqrt(ux * ux + uy * uy) || 1;
  const v = BLAST.LAUNCH_K * s;
  return pool.launch(world, i, type, (ux / n) * v, (uy / n) * v);
}

// Patlamayı hemen uygular (geçiş 5 ve Patlat aracı). pool: null ya da { launch(world, i, type, vx, vy) }.
export function applyExplosion(world, rng, s, pool, cx, cy, G, kind) {
  const r = radiusOf(G);
  const s0 = 2 * Math.sqrt(G);
  const R = Math.ceil(r);
  const ix = Math.round(cx);
  const iy = Math.round(cy);
  const x0 = Math.max(0, ix - R);
  const x1 = Math.min(world.width - 1, ix + R);
  const y0 = Math.max(0, iy - R);
  const y1 = Math.min(world.height - 1, iy + R);
  const { type, temp, stride } = world;
  const r2 = r * r;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r2) continue;
      const i = (y + 1) * stride + x + 1;
      const t = type[i];
      if (STRENGTH[t] === Infinity) continue; // kenar ve magma
      const d = Math.sqrt(d2);
      const f = 1 - d / r;
      const sv = s0 * f;
      s.cellsThisTick++;
      const heated = temp[i] + BLAST.HEAT_MAX * f;
      temp[i] = heated > TEMP_MAX ? TEMP_MAX : heated;
      const k = KIND_OF[t];
      if (k === KIND.NONE) {
        if (d < r * 0.5 && chance(rng, BLAST.FIRE_CHANCE)) {
          world.set(i, FIRE, rng.nextU32() & 255, lifeOf(rng, FIRE), 0, Math.max(temp[i], SPAWN_TEMP[FIRE]));
        }
        continue;
      }
      if (k === KIND.GAS) continue;
      if (k === KIND.STATIC) {
        if (sv >= STRENGTH[t]) {
          const into = DEBRIS_OF[t];
          if (!launch(world, pool, i, into, dx, dy, d, sv)) world.transform(i, into, 0);
        } else if (FLAMMABILITY[t] !== 0 && sv >= 1) {
          world.transform(i, BURNS_INTO[t], lifeOf(rng, BURNS_INTO[t]));
        }
        continue;
      }
      // Toz ve sıvı: yanıcıysa önce tutuşur, sonra savrulur (havuz doluysa yerinde kalır).
      if (FLAMMABILITY[t] !== 0 && sv >= 1) world.transform(i, BURNS_INTO[t], lifeOf(rng, BURNS_INTO[t]));
      launch(world, pool, i, type[i], dx, dy, d, sv);
    }
  }
  s.blastsThisTick++;
  s.totals[kind]++;
  const h = s.serial % BLAST.RING;
  s.ringX[h] = cx;
  s.ringY[h] = cy;
  s.ringP[h] = G;
  s.serial++;
  s.ringSerial[h] = s.serial;
}

// Geçiş 5: birleştirme ızgarası kuyruğa, sonra sınırlar içinde kuyruk işlenir; kalan sonraki tick'e kalır.
export function stepExplosions(world, rng, s, pool) {
  flushMerge(s);
  s.blastsThisTick = 0;
  s.cellsThisTick = 0;
  let k = 0;
  for (; k < s.qCount; k++) {
    if (s.blastsThisTick >= BLAST.MAX_PER_TICK) break;
    // Hücre sınırı: tahmini disk alanı sığmıyorsa sonraki tick'e kalır (tick'in ilk patlaması her zaman işlenir).
    const r = radiusOf(s.qp[k]);
    if (s.blastsThisTick > 0 && s.cellsThisTick + Math.ceil(3.2 * r * r) > BLAST.MAX_CELLS_PER_TICK) break;
    applyExplosion(world, rng, s, pool, s.qx[k], s.qy[k], s.qp[k], s.qk[k]);
  }
  let n = 0;
  for (; k < s.qCount; k++, n++) {
    s.qx[n] = s.qx[k];
    s.qy[n] = s.qy[k];
    s.qp[n] = s.qp[k];
    s.qk[n] = s.qk[k];
  }
  s.qCount = n;
}

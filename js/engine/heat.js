// Isı geçişi: tick'in 3. geçişi (ADR-014, ADR-015). world.temp °C cinsinden Float32 alandır.
// - Difüzyon: 4 komşu, çift tampon (Jacobi) → tarama yönünden bias yok. İki hücre arası iletim
//   k = min(K_i, K_j) simetrik olduğu için Σ C·T korunur. Kararlılık: K/C ≤ 0,25 (materials.js
//   derlerken doğrular) → yeni değer komşuların min–max aralığında kalır.
// - Hava (EMPTY) her tick ortama biraz yaklaşır; kenar çerçevesi ortam sıcaklığındadır.
// - Kaynaklar (ateş, yanma, magma) kendi sıcaklıklarının altına inmez.
// - Faz geçişleri (gizli ısı), sıcaklıkla tutuşma ve buharlaşma difüzyondan sonra ayrı bir
//   geçişte uygulanır (tip değişikliği difüzyonun simetrisini bozmasın).
// - Uyuyan satırlar: satırda ve iki komşusunda ortamdan SLEEP_EPS'ten fazla sapan ya da eşik
//   adayı hücre yoksa satır hedef tampona olduğu gibi kopyalanır (bilinçli yaklaşıklık: ±SLEEP_EPS).
// Yalnızca aritmetik (Math.sin/exp/pow yok) ve sim RNG'si: deterministik.
import { MAT, MATERIALS, PROGRESS_SCALE } from './materials.js';
import { emitSteam, initialLife } from './reactions.js';

export const HEAT = Object.freeze({
  AIR_RELAX: 0.02, // havanın tick başına ortama yaklaşma oranı
  SLEEP_EPS: 0.5, // °C; uyuyan satır toleransı
  PROGRESS_DECAY: 2, // eşiğin gerisindeki hücrede ilerlemenin tick başına sönmesi
  IGNITE_CHANCE: 1 / 16, // tutuşma sıcaklığını aşan hücrenin tick başına tutuşma olasılığı
  EVAP_RATE: 0.00002, // buharlaşma olasılığının eşiğin üstündeki her °C için eğimi
  EVAP_MAX: 0.001, // tick başına buharlaşma olasılığının üst sınırı
});

const {
  CONDUCT, CAP, INV_CAP, SOURCE_TEMP, HAS_PHASE, UP_AT, UP_INTO, UP_LATENT, UP_VANISH,
  DOWN_AT, DOWN_INTO, DOWN_LATENT, DOWN_VANISH, IGNITE_AT, EVAP_AT, BURNS_INTO,
} = MATERIALS;
const EMPTY = MAT.EMPTY;
const STEAM = MAT.STEAM;
const U32 = 4294967296;
const DECAY = HEAT.PROGRESS_DECAY * PROGRESS_SCALE; // sayaç adımı cinsinden

// hot[y + 1]: iç satır y sıcak mı. hot[0] ve hot[height + 1] kenar satırlarıdır, hep 0.
export function createHeatState(height) {
  return { hot: new Uint8Array(height + 2), sleep: true };
}

function setBorder(world, t, amb) {
  const { width, height, stride, size } = world;
  t.fill(amb, 0, stride);
  t.fill(amb, (height + 1) * stride, size);
  for (let y = 1; y <= height; y++) {
    t[y * stride] = amb;
    t[y * stride + width + 1] = amb;
  }
}

// Satır sıcaktır: ortamdan belirgin sapan, kaynak sıcaklığının altındaki ya da bir eşik adayı hücre
// varsa (faz eşiğini aşmış, tutuşma/buharlaşma sıcaklığında ya da yarım kalmış ilerlemesi olan).
function markHotRows(world, a, hot, amb) {
  const { width, height, stride, type, life } = world;
  const eps = HEAT.SLEEP_EPS;
  for (let y = 0; y < height; y++) {
    let flag = 0;
    for (let i = (y + 1) * stride + 1, end = i + width; i < end; i++) {
      const T = a[i];
      const d = T - amb;
      const t = type[i];
      if (
        d > eps || d < -eps || SOURCE_TEMP[t] > T || T > UP_AT[t] || T < DOWN_AT[t] ||
        T >= IGNITE_AT[t] || T >= EVAP_AT[t] || (HAS_PHASE[t] !== 0 && life[i] !== 0)
      ) {
        flag = 1;
        break;
      }
    }
    hot[y + 1] = flag;
  }
}

const rowActive = (state, y) => !state.sleep || state.hot[y] !== 0 || state.hot[y + 1] !== 0 || state.hot[y + 2] !== 0;

// Eşiği aşan ısıyı ilerleme sayacına ekler (sabit noktalı; kesir sim RNG'siyle stokastik yuvarlanır,
// böylece çok küçük fazlalar da beklenen değerde birikir); latent'e ulaştıysa true.
function addProgress(life, rng, i, energy, latent) {
  const q = energy * PROGRESS_SCALE;
  let add = q | 0;
  if (rng.nextU32() < (q - add) * U32) add++;
  const v = life[i] + add;
  if (v >= latent) return true;
  life[i] = v > 65535 ? 65535 : v;
  return false;
}

function transition(world, rng, i, into, vanish) {
  if (vanish !== 0 && (rng.nextU32() & 255) < vanish) {
    world.set(i, EMPTY, 0, 0, 0, world.temp[i]);
    return;
  }
  if (into === STEAM) emitSteam(world, i);
  else world.transform(i, into, 0); // sıcaklık eşikte kalır
}

// Faz geçişleri, sıcaklıkla tutuşma, buharlaşma: güncel alan üzerinde, yalnızca işlenen satırlarda.
function applyThermalRules(world, rng, state) {
  const { width, height, stride, type, life } = world;
  const temp = world.temp;
  const ignite = (HEAT.IGNITE_CHANCE * U32) >>> 0;
  for (let y = 0; y < height; y++) {
    if (!rowActive(state, y)) continue;
    for (let i = (y + 1) * stride + 1, end = i + width; i < end; i++) {
      const t = type[i];
      if (t === EMPTY) continue;
      const T = temp[i];
      if (HAS_PHASE[t] !== 0) {
        if (T > UP_AT[t]) {
          temp[i] = UP_AT[t];
          if (addProgress(life, rng, i, (T - UP_AT[t]) * CAP[t], UP_LATENT[t])) transition(world, rng, i, UP_INTO[t], UP_VANISH[t]);
          continue;
        }
        if (T < DOWN_AT[t]) {
          temp[i] = DOWN_AT[t];
          if (addProgress(life, rng, i, (DOWN_AT[t] - T) * CAP[t], DOWN_LATENT[t])) transition(world, rng, i, DOWN_INTO[t], DOWN_VANISH[t]);
          continue;
        }
        if (life[i] !== 0) life[i] = life[i] > DECAY ? life[i] - DECAY : 0;
      }
      if (T >= IGNITE_AT[t]) {
        if (rng.nextU32() < ignite) {
          const into = BURNS_INTO[t];
          world.transform(i, into, initialLife(into, rng.nextU32()));
        }
        continue;
      }
      if (T >= EVAP_AT[t] && type[i - stride] === EMPTY) {
        const p = HEAT.EVAP_RATE * (T - EVAP_AT[t]);
        if (rng.nextU32() < (p < HEAT.EVAP_MAX ? p : HEAT.EVAP_MAX) * U32) world.set(i, EMPTY, 0, 0, 0, T);
      }
    }
  }
}

export function stepHeat(world, rng, state) {
  const { width, height, stride, type } = world;
  const a = world.temp;
  const b = world.tempNext;
  const amb = world.ambient;
  const relax = HEAT.AIR_RELAX;

  setBorder(world, a, amb);
  setBorder(world, b, amb);
  if (state.sleep) markHotRows(world, a, state.hot, amb);

  for (let y = 0; y < height; y++) {
    const start = (y + 1) * stride + 1;
    const end = start + width;
    if (!rowActive(state, y)) {
      b.set(a.subarray(start, end), start);
      continue;
    }
    for (let i = start; i < end; i++) {
      const t = type[i];
      const ti = a[i];
      const ki = CONDUCT[t];
      let kj = CONDUCT[type[i - 1]];
      let flux = (kj < ki ? kj : ki) * (a[i - 1] - ti);
      kj = CONDUCT[type[i + 1]];
      flux += (kj < ki ? kj : ki) * (a[i + 1] - ti);
      kj = CONDUCT[type[i - stride]];
      flux += (kj < ki ? kj : ki) * (a[i - stride] - ti);
      kj = CONDUCT[type[i + stride]];
      flux += (kj < ki ? kj : ki) * (a[i + stride] - ti);
      let v = ti + flux * INV_CAP[t];
      if (t === EMPTY) v += (amb - v) * relax;
      const src = SOURCE_TEMP[t];
      b[i] = v < src ? src : v;
    }
  }
  world.swapTempBuffers();
  applyThermalRules(world, rng, state);
}

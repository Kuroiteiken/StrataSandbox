// Isı geçişi: tick'in 3. geçişi (ADR-014). world.temp °C cinsinden Float32 alandır.
// - Difüzyon: 4 komşu, çift tampon (Jacobi) → tarama yönünden bias yok. İki hücre arası iletim
//   k = min(K_i, K_j) simetrik olduğu için Σ C·T korunur. Kararlılık: K/C ≤ 0,25 (materials.js
//   derlerken doğrular) → yeni değer komşuların min–max aralığında kalır.
// - Hava (EMPTY) her tick ortama biraz yaklaşır; kenar çerçevesi ortam sıcaklığındadır.
// - Kaynaklar (ateş, yanma, magma) kendi sıcaklıklarının altına inmez.
// - Uyuyan satırlar: satırda ve iki komşusunda ortamdan SLEEP_EPS'ten fazla sapan hücre yoksa
//   satır hedef tampona olduğu gibi kopyalanır (bilinçli yaklaşıklık: ±SLEEP_EPS).
// Yalnızca aritmetik (Math.sin/exp/pow yok) ve sim RNG'si: deterministik.
import { MAT, MATERIALS } from './materials.js';

export const HEAT = Object.freeze({
  AIR_RELAX: 0.02, // havanın tick başına ortama yaklaşma oranı
  SLEEP_EPS: 0.5, // °C; uyuyan satır toleransı
});

const { CONDUCT, INV_CAP, SOURCE_TEMP } = MATERIALS;
const EMPTY = MAT.EMPTY;

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

// Satır, ortamdan belirgin sapan ya da kaynak sıcaklığının altındaki bir hücre içeriyorsa sıcaktır
// (spec §2.4: kaynaklar eşik adayıdır; ortam sıcaklığında boyanan bir kaynak da ısınmalı).
function markHotRows(world, a, hot, amb) {
  const { width, height, stride, type } = world;
  const eps = HEAT.SLEEP_EPS;
  for (let y = 0; y < height; y++) {
    let flag = 0;
    for (let i = (y + 1) * stride + 1, end = i + width; i < end; i++) {
      const d = a[i] - amb;
      if (d > eps || d < -eps || SOURCE_TEMP[type[i]] > a[i]) {
        flag = 1;
        break;
      }
    }
    hot[y + 1] = flag;
  }
}

const rowActive = (state, y) => !state.sleep || state.hot[y] !== 0 || state.hot[y + 1] !== 0 || state.hot[y + 2] !== 0;

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
}

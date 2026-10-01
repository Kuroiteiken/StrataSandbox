// Kapalı bölge basıncı (ADR-018; tick geçiş 4). PERIOD tick'te bir hava ve gaz hücrelerinin 4-komşu bölgeleri
// satır parçalarıyla (run) birleşim-bul yöntemiyle etiketlenir. Üst satıra değen bölge açıktır.
// - Kapalı bölge hücrelerine flags bit4 (CLOSED_BIT) yazılır, açık bölgedekilerden silinir.
// - Basınç P = Σ w·(T+273)/293 / hacim; w(buhar) = W_STEAM, diğer gazlar ve hava 1.
// - Tavan: bölge hücrelerinin hemen üstündeki bölge dışı hücreler. Tavanında sıvı ya da toz olan bölge
//   basınçlı sayılmaz (gaz kabarcıkla çıkar). Yalnız katı tavan basınç tutar.
// - P ≥ P_BURST ve hacim ≥ V_MIN ise G = min(G_MAX, POWER_K·(P−1)·hacim). Tavanın en zayıf hücresi
//   (eşitlikte en üst, sonra en sol) 2·√G ≥ dayanıklılığıysa orada patlama istenir; değilse basınç birikir.
// Yalnız aritmetik; tamponlar önceden ayrılır.
import { MAT, KIND, MATERIALS, CLOSED_BIT } from './materials.js';
import { requestExplosion, BLAST_KIND } from './explosions.js';

const { KIND: KIND_OF, STRENGTH, GAS_IDS } = MATERIALS;
const STATIC = KIND.STATIC;

export const PRESSURE = Object.freeze({
  PERIOD: 4, // bölge tarama aralığı (tick)
  P_BURST: 3, // patlama basınç eşiği
  V_MIN: 3, // basınçlı bölgenin en küçük hacmi (hücre)
  POWER_K: 0.15, // basınç → patlama gücü
  G_MAX: 400,
  W_STEAM: 8, // buharın basınç ağırlığı (suyun genleşmesi)
  FLASH_BLOCK: 8, // ani buharlaşma blok kenarı (hücre)
  FLASH_DECAY: 0.85, // blok sayacının tick başına çarpanı (kısa pencere)
  FLASH_MIN: 6, // patlama eşiği (yarılanan sayaç)
  FLASH_POWER: 1, // ağırlık başına güç
  FLASH_SUPERHEAT: 6, // dönüşüm ağırlığı = aşırı ısınma (°C) / bu değer
  FLASH_SOURCE_MIN: 720, // en sıcak 4-komşu bu değerin altındaysa dönüşüm sayılmaz (yanan madde 700 °C)
  FLASH_WEIGHT_MAX: 3, // tek dönüşümün en çok ağırlığı
});

const WEIGHT = new Float32Array(256);
WEIGHT[MAT.EMPTY] = 1;
for (const g of GAS_IDS) WEIGHT[g] = 1;
WEIGHT[MAT.STEAM] = PRESSURE.W_STEAM;

const PASSABLE = new Uint8Array(256);
for (let t = 0; t < 256; t++) PASSABLE[t] = KIND_OF[t] === KIND.NONE || KIND_OF[t] === KIND.GAS ? 1 : 0;

export function createPressureState(width, height) {
  const max = height * Math.ceil((width + 1) / 2) + 1;
  return {
    width,
    height,
    runX0: new Int32Array(max),
    runX1: new Int32Array(max),
    runY: new Int32Array(max),
    parent: new Int32Array(max),
    vol: new Int32Array(max),
    gas: new Float32Array(max),
    open: new Uint8Array(max),
    leaky: new Uint8Array(max),
    ceil: new Int32Array(max),
    ceilStr: new Float32Array(max),
    runCount: 0,
    regions: 0,
    closed: 0,
    maxP: 0,
    forceScan: false,
  };
}

export function resetPressureState(s) {
  s.runCount = 0;
  s.regions = 0;
  s.closed = 0;
  s.maxP = 0;
  s.forceScan = true;
}

function find(parent, a) {
  while (parent[a] !== a) {
    parent[a] = parent[parent[a]];
    a = parent[a];
  }
  return a;
}

function union(parent, a, b) {
  const ra = find(parent, a);
  const rb = find(parent, b);
  if (ra === rb) return;
  if (ra < rb) parent[rb] = ra;
  else parent[ra] = rb;
}

function scanRegions(world, s, blast) {
  const { width, height, stride, type, temp, flags } = world;
  const { runX0, runX1, runY, parent, vol, gas, open, leaky, ceil, ceilStr } = s;
  // 1) Satır parçaları ve önceki satırla birleşim (4-komşu: x aralıkları çakışan parçalar).
  let n = 0;
  let prevStart = 0;
  let prevEnd = 0;
  for (let y = 0; y < height; y++) {
    const rowStart = n;
    const base = (y + 1) * stride + 1;
    let p = prevStart;
    let x = 0;
    while (x < width) {
      if (PASSABLE[type[base + x]] === 0) {
        x++;
        continue;
      }
      const x0 = x;
      while (x < width && PASSABLE[type[base + x]] !== 0) x++;
      const x1 = x - 1;
      runX0[n] = x0;
      runX1[n] = x1;
      runY[n] = y;
      parent[n] = n;
      while (p < prevEnd && runX1[p] < x0) p++;
      let q = p;
      while (q < prevEnd && runX0[q] <= x1) {
        union(parent, n, q);
        q++;
      }
      if (q > p) p = q - 1; // son çakışan parça sonraki parçayla da çakışabilir
      n++;
    }
    prevStart = rowStart;
    prevEnd = n;
  }
  s.runCount = n;
  // 2) Kök başına hacim ve açıklık.
  for (let k = 0; k < n; k++) {
    vol[k] = 0;
    gas[k] = 0;
    open[k] = 0;
    leaky[k] = 0;
    ceil[k] = -1;
    ceilStr[k] = Infinity;
  }
  for (let k = 0; k < n; k++) {
    const r = find(parent, k);
    vol[r] += runX1[k] - runX0[k] + 1;
    if (runY[k] === 0) open[r] = 1;
  }
  // 3) Hücre başına: bit4, kapalı bölgede ağırlıklı gaz toplamı ve tavan adayı.
  for (let k = 0; k < n; k++) {
    const r = parent[k] === k ? k : find(parent, k);
    const y = runY[k];
    let i = (y + 1) * stride + runX0[k] + 1;
    const end = i + runX1[k] - runX0[k] + 1;
    if (open[r] !== 0) {
      for (; i < end; i++) flags[i] &= ~CLOSED_BIT;
      continue;
    }
    // Parça uçlarındaki yan komşular: sıvı ya da toz ise gaz oradan kabarcıkla çıkar (suyun içindeki buhar cebi).
    if (KIND_OF[type[i - 1]] !== STATIC && PASSABLE[type[i - 1]] === 0) leaky[r] = 1;
    if (KIND_OF[type[end]] !== STATIC && PASSABLE[type[end]] === 0) leaky[r] = 1;
    for (; i < end; i++) {
      flags[i] |= CLOSED_BIT;
      gas[r] += (WEIGHT[type[i]] * (temp[i] + 273)) / 293;
      const c = i - stride; // tavan adayı (y = 0 olan bölge zaten açık)
      const ct = type[c];
      if (PASSABLE[ct] !== 0) continue;
      if (KIND_OF[ct] !== STATIC) {
        leaky[r] = 1;
        continue;
      }
      const str = STRENGTH[ct];
      if (str < ceilStr[r] || (str === ceilStr[r] && c < ceil[r])) {
        ceilStr[r] = str;
        ceil[r] = c;
      }
    }
  }
  // 4) Kökler: sayım ve patlama koşulu.
  let regions = 0;
  let closed = 0;
  let maxP = 0;
  for (let k = 0; k < n; k++) {
    if (parent[k] !== k) continue;
    regions++;
    if (open[k] !== 0) continue;
    closed++;
    if (leaky[k] !== 0 || vol[k] < PRESSURE.V_MIN) continue;
    const P = gas[k] / vol[k];
    if (P > maxP) maxP = P;
    if (P < PRESSURE.P_BURST || ceil[k] < 0) continue;
    const G = Math.min(PRESSURE.G_MAX, PRESSURE.POWER_K * (P - 1) * vol[k]);
    if (2 * Math.sqrt(G) < ceilStr[k]) continue; // tavan dayanıyor: basınç birikir
    const c = ceil[k];
    requestExplosion(blast, (c % stride) - 1, Math.floor(c / stride) - 1, G, BLAST_KIND.PRESSURE);
  }
  s.regions = regions;
  s.closed = closed;
  s.maxP = maxP;
}

// Geçiş 4. Tarama PERIOD tick'te bir (ya da geri alma/temizleme sonrası hemen) yapılır.
export function stepPressure(world, s, blast, tick, flash = null) {
  if (s.forceScan || tick % PRESSURE.PERIOD === 0) {
    s.forceScan = false;
    scanRegions(world, s, blast);
  }
  if (flash) stepFlash(flash, blast);
}

// ---- Ani buharlaşma: kısa pencerede bir blokta çok sayıda su→buhar dönüşümü patlar ----

export function createFlashState(width, height) {
  const B = PRESSURE.FLASH_BLOCK;
  const bw = Math.ceil(width / B);
  const n = bw * Math.ceil(height / B);
  return { bw, count: new Float32Array(n), sx: new Float32Array(n), sy: new Float32Array(n), active: new Int32Array(n), isActive: new Uint8Array(n), activeCount: 0 };
}

export function resetFlashState(f) {
  f.count.fill(0);
  f.sx.fill(0);
  f.sy.fill(0);
  f.isActive.fill(0);
  f.activeCount = 0;
}

export function copyFlashState(dst, src) {
  for (const k of ['count', 'sx', 'sy', 'active', 'isActive']) dst[k].set(src[k]);
  dst.activeCount = src.activeCount;
}

// Kaynama eşiğinin üstündeki ısı (°C) → dönüşüm ağırlığı: lav/erimiş metal gibi güçlü kaynak ağır, hafif ısıtıcı hafif sayılır.
export function flashWeight(over) {
  const w = over / PRESSURE.FLASH_SUPERHEAT;
  return w <= 0 ? 0 : w > PRESSURE.FLASH_WEIGHT_MAX ? PRESSURE.FLASH_WEIGHT_MAX : w;
}

// emitSteam her dönüşümü buraya yazar (w: ağırlık).
export function noteSteam(f, x, y, w) {
  const B = PRESSURE.FLASH_BLOCK;
  const b = Math.floor(y / B) * f.bw + Math.floor(x / B);
  if (f.isActive[b] === 0) {
    f.isActive[b] = 1;
    f.active[f.activeCount++] = b;
  }
  f.count[b] += w;
  f.sx[b] += w * x;
  f.sy[b] += w * y;
}

// Her tick: eşiği aşan blok buhar patlaması ister ve sıfırlanır; diğerleri sönümlenir.
function stepFlash(f, blast) {
  let keep = 0;
  for (let k = 0; k < f.activeCount; k++) {
    const b = f.active[k];
    const c = f.count[b];
    if (c >= PRESSURE.FLASH_MIN) {
      requestExplosion(blast, f.sx[b] / c, f.sy[b] / c, c * PRESSURE.FLASH_POWER, BLAST_KIND.STEAM);
    } else if (c * PRESSURE.FLASH_DECAY >= 0.05) {
      f.count[b] = c * PRESSURE.FLASH_DECAY;
      f.sx[b] *= PRESSURE.FLASH_DECAY;
      f.sy[b] *= PRESSURE.FLASH_DECAY;
      f.active[keep++] = b;
      continue;
    }
    f.count[b] = 0;
    f.sx[b] = 0;
    f.sy[b] = 0;
    f.isActive[b] = 0;
  }
  f.activeCount = keep;
}

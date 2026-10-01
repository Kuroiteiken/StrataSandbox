// Savrulan parçacıklar (ADR-017): patlamanın ızgaradan aldığı hücreler yay çizerek uçar ve bir yere çarpınca
// ızgaraya geri iner (tick geçiş 6). SoA havuz, önceden ayrılır; hot loop'ta tahsis yok.
// - Yol hücre hücre izlenir (DDA, tek eksen adımları): hava ve gaz geçilebilir, ilk diğer hücrede ya da
//   dünya kenarında durur. Tek eksen adımı köşeden geçişi de engeller; duvardan sızma yok.
// - İniş: çarpmadan önceki son hücre; doluysa onun 4 komşusu (köşegen yok: ince çapraz duvarın ötesine
//   inilmez). Bulunamazsa parçacık yatay hızını kaybedip düşmeye devam eder. LIFE tick sonunda yarıçap
//   SETTLE_RADIUS içinde yerleşir; bulamazsa kaybolur ve `lost` artar (testler 0 bekler).
// - Yerleşen parçacığın yerini son eleman alır (sıra deterministik).
import { MAT, KIND, MATERIALS } from './materials.js';

const { KIND: KIND_OF } = MATERIALS;
const NONE = KIND.NONE;
const GAS = KIND.GAS;
const STATIC = KIND.STATIC;

export const DEBRIS = Object.freeze({
  CAPACITY: 2000,
  GRAVITY: 0.25, // hücre/tick²
  DRAG: 0.98, // tick başına hız çarpanı
  V_MAX: 6, // hücre/tick
  LIFE: 300, // tick; sonunda zorunlu iniş
  SETTLE_RADIUS: 3,
});

function passable(world, x, y) {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return false;
  const k = KIND_OF[world.type[(y + 1) * world.stride + x + 1]];
  return k === NONE || k === GAS;
}

const idxOf = (world, x, y) => (y + 1) * world.stride + x + 1;

// Çarpmada iniş hücresi: kendisi, sonra üst, sol, sağ, alt komşu (köşegen yok), sonra sütunda yukarı; yoksa -1.
function findFreeCross(world, x, y) {
  if (passable(world, x, y)) return idxOf(world, x, y);
  if (passable(world, x, y - 1)) return idxOf(world, x, y - 1);
  if (passable(world, x - 1, y)) return idxOf(world, x - 1, y);
  if (passable(world, x + 1, y)) return idxOf(world, x + 1, y);
  if (passable(world, x, y + 1)) return idxOf(world, x, y + 1);
  // Dört komşu da doluysa (yığının içine düşen parçacık): aynı sütunda yukarı doğru ilk boş hücre.
  // Yalnız sütunda kalınır ve katı (STATIC) hücrede durulur; yana sızma ve duvar aşma yok.
  for (let dy = 2; dy <= DEBRIS.SETTLE_RADIUS * 4; dy++) {
    if (passable(world, x, y - dy)) return idxOf(world, x, y - dy);
    if (y - dy < 0 || KIND_OF[world.type[idxOf(world, x, y - dy)]] === STATIC) break;
  }
  return -1;
}

// Ömür sonu: (x, y) çevresinde Chebyshev halkalarıyla (yukarıdan aşağı, soldan sağa) ilk geçilebilir hücre; yoksa -1.
function findFree(world, x, y, radius) {
  for (let r = 0; r <= radius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx !== -r && dx !== r && dy !== -r && dy !== r) continue;
        if (passable(world, x + dx, y + dy)) return (y + dy + 1) * world.stride + x + dx + 1;
      }
    }
  }
  return -1;
}

export class DebrisPool {
  constructor(capacity = DEBRIS.CAPACITY) {
    this.capacity = capacity;
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.type = new Uint8Array(capacity);
    this.variant = new Uint8Array(capacity);
    this.life = new Uint16Array(capacity);
    this.age = new Uint16Array(capacity);
    this.temp = new Float32Array(capacity);
    this.count = 0;
    this.lost = 0;
  }

  clear() {
    this.count = 0;
    this.lost = 0;
  }

  copyFrom(o) {
    for (const k of ['x', 'y', 'vx', 'vy', 'type', 'variant', 'life', 'age', 'temp']) this[k].set(o[k]);
    this.count = o.count;
    this.lost = o.lost;
  }

  // Dünya dikey aynalanınca: hücre [y, y+1) ↦ [H−1−y, H−y) olduğundan nokta y ↦ H − y.
  flip(height) {
    for (let k = 0; k < this.count; k++) {
      this.y[k] = height - this.y[k];
      this.vy[k] = -this.vy[k];
    }
  }

  // i hücresini ızgaradan alıp `type` türünde parçacık yapar (hücrenin tonu, ömrü ve sıcaklığı taşınır).
  launch(world, i, type, vx, vy) {
    if (this.count >= this.capacity) return false;
    const k = this.count++;
    const stride = world.stride;
    this.x[k] = (i % stride) - 1 + 0.5;
    this.y[k] = Math.floor(i / stride) - 1 + 0.5;
    const v = Math.sqrt(vx * vx + vy * vy);
    const sc = v > DEBRIS.V_MAX ? DEBRIS.V_MAX / v : 1;
    this.vx[k] = vx * sc;
    this.vy[k] = vy * sc;
    this.type[k] = type;
    this.variant[k] = world.variant[i];
    this.life[k] = world.life[i];
    this.temp[k] = world.temp[i];
    this.age[k] = 0;
    world.set(i, MAT.EMPTY, 0, 0, 0, world.temp[i]);
    return true;
  }

  _remove(k) {
    const last = --this.count;
    if (k === last) return;
    this.x[k] = this.x[last];
    this.y[k] = this.y[last];
    this.vx[k] = this.vx[last];
    this.vy[k] = this.vy[last];
    this.type[k] = this.type[last];
    this.variant[k] = this.variant[last];
    this.life[k] = this.life[last];
    this.age[k] = this.age[last];
    this.temp[k] = this.temp[last];
  }

  _land(world, k, i) {
    if (i < 0) return false;
    world.set(i, this.type[k], this.variant[k], this.life[k], 0, this.temp[k]);
    this._remove(k);
    return true;
  }

  // Bir parçacığı bir tick ilerletir; uçmaya devam ediyorsa true (yerleştiyse ya da kaybolduysa false).
  _advance(world, k) {
    let vx = this.vx[k] * DEBRIS.DRAG;
    let vy = (this.vy[k] + DEBRIS.GRAVITY) * DEBRIS.DRAG;
    const v = Math.sqrt(vx * vx + vy * vy);
    if (v > DEBRIS.V_MAX) {
      vx *= DEBRIS.V_MAX / v;
      vy *= DEBRIS.V_MAX / v;
    }
    const x = this.x[k];
    const y = this.y[k];
    let ix = Math.floor(x);
    let iy = Math.floor(y);
    const stepX = vx > 0 ? 1 : vx < 0 ? -1 : 0;
    const stepY = vy > 0 ? 1 : vy < 0 ? -1 : 0;
    const ax = vx < 0 ? -vx : vx;
    const ay = vy < 0 ? -vy : vy;
    let tMaxX = stepX === 0 ? Infinity : (stepX > 0 ? ix + 1 - x : x - ix) / ax;
    let tMaxY = stepY === 0 ? Infinity : (stepY > 0 ? iy + 1 - y : y - iy) / ay;
    const tDX = stepX === 0 ? Infinity : 1 / ax;
    const tDY = stepY === 0 ? Infinity : 1 / ay;
    let hit = false;
    while (tMaxX <= 1 || tMaxY <= 1) {
      let nx = ix;
      let ny = iy;
      if (tMaxX < tMaxY) {
        nx += stepX;
        tMaxX += tDX;
      } else {
        ny += stepY;
        tMaxY += tDY;
      }
      if (!passable(world, nx, ny)) {
        hit = true;
        break;
      }
      ix = nx;
      iy = ny;
    }
    this.age[k]++;
    if (hit) {
      if (this._land(world, k, findFreeCross(world, ix, iy))) return false;
      this.x[k] = ix + 0.5;
      this.y[k] = iy + 0.5;
      this.vx[k] = 0;
      this.vy[k] = 0;
    } else {
      this.x[k] = x + vx;
      this.y[k] = y + vy;
      this.vx[k] = vx;
      this.vy[k] = vy;
    }
    if (this.age[k] >= DEBRIS.LIFE) {
      if (!this._land(world, k, findFree(world, ix, iy, DEBRIS.SETTLE_RADIUS))) {
        this.lost++;
        this._remove(k);
      }
      return false;
    }
    return true;
  }

  // Geçiş 6. Yerleşen parçacığın yerine geçen son eleman aynı indekste işlenir.
  step(world) {
    let k = 0;
    while (k < this.count) if (this._advance(world, k)) k++;
  }
}

// Physics engine public API. DOM'a dokunmaz; tarayıcıda ve Node'da aynı çalışır.
// Zamanlama: fixed timestep (ADR-006). Tick sırası: iki geçiş + stamp (ADR-007).
import { World } from './world.js';
import { Rng } from './rng.js';
import { MAT, KIND, MATERIALS } from './materials.js';
import { stepPowder } from './kernels.js';

export const SPEEDS = Object.freeze([0.5, 1, 2, 4]);

const BASE_TPS = 60;
const MAX_FRAME_MS = 100; // uzun duraklamalardan sonra devasa catch-up yok
const MAX_TICKS_PER_FRAME = 8;
// Accumulator "ms × TPS" biriminde tutulur: 1000 birim = 1 tick.
// Böylece 50 ms @ 60 TPS gibi değerler kayan nokta hatası olmadan tam sayı çıkar.
const TICK_UNIT = 1000;

const { KIND: KIND_OF } = MATERIALS;
const EMPTY = MAT.EMPTY;

const defaultNow = () => performance.now();

// Kozmetik ton: sim RNG'sini tüketmez, böylece boyama/palet fiziği etkilemez (ADR-008).
function cosmeticVariant(i, salt) {
  let h = Math.imul(i ^ Math.imul(salt, 0x9e3779b1), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) & 255;
}

export class Simulation {
  constructor({ width, height, seed = 'strata', debug = false, now = defaultNow } = {}) {
    this.world = new World(width, height); // engine-içi; uygulama katmanı kullanmaz
    this.seed = String(seed);
    this.rng = new Rng(this.seed, 'sim');
    this.debug = debug;
    this.tick = 0;
    this.speed = 1;
    this.paused = false;
    this.version = 0;
    this.physicsMs = 0;
    this._acc = 0;
    this._now = now;

    const sim = this;
    const w = this.world;
    this.view = Object.freeze({
      width,
      height,
      stride: w.stride,
      type: w.type,
      variant: w.variant,
      life: w.life,
      flags: w.flags,
      get tick() {
        return sim.tick;
      },
      get version() {
        return sim.version;
      },
    });
  }

  get isPaused() {
    return this.paused;
  }

  play() {
    this.paused = false;
  }

  pause() {
    this.paused = true;
  }

  setSpeed(multiplier) {
    if (!SPEEDS.includes(multiplier)) throw new RangeError(`Desteklenmeyen hız: ${multiplier}`);
    this.speed = multiplier;
  }

  resetTiming() {
    this._acc = 0;
  }

  // Tam olarak bir tick; pause durumundan bağımsız.
  step() {
    const start = this._now();
    this._tickOnce();
    this.physicsMs = this._now() - start;
  }

  // Fixed timestep: geçen gerçek süreye göre 0..MAX_TICKS_PER_FRAME tick çalıştırır.
  update(dtMs, budgetMs = Infinity) {
    if (this.paused) return 0;
    // NaN/undefined/negatif dt accumulator'ı zehirlemesin (NaN kalıcı olarak fiziği durdururdu).
    const dt = dtMs > 0 ? Math.min(dtMs, MAX_FRAME_MS) : 0;
    this._acc += dt * BASE_TPS * this.speed;

    const start = this._now();
    let ticks = 0;
    while (this._acc >= TICK_UNIT) {
      this._tickOnce();
      this._acc -= TICK_UNIT;
      ticks++;
      if (ticks >= MAX_TICKS_PER_FRAME || this._now() - start >= budgetMs) {
        this._acc %= TICK_UNIT; // yetişilemeyen tick borcu silinir (spiral of death yok)
        break;
      }
    }
    if (ticks > 0) this.physicsMs = this._now() - start;
    return ticks;
  }

  _tickOnce() {
    const w = this.world;
    w.beginTick();
    const { type, stamp, stride, width, height } = w;
    const clock = w.clock;
    const rng = this.rng;
    const parity = this.tick & 1;

    // Geçiş 1 — aşağıdan yukarı: tozlar (Phase 2: sıvılar, reaktif statikler).
    for (let y = height - 1; y >= 0; y--) {
      const rowStart = (y + 1) * stride + 1;
      const leftToRight = ((y ^ parity) & 1) === 0; // tick XOR satır paritesi
      for (let n = 0; n < width; n++) {
        const i = leftToRight ? rowStart + n : rowStart + width - 1 - n;
        const t = type[i];
        if (t === EMPTY || stamp[i] === clock) continue;
        if (KIND_OF[t] === KIND.POWDER) stepPowder(w, rng, i, t);
      }
    }
    // Geçiş 2 — yukarıdan aşağı: gazlar (Phase 2).

    this.tick++;
    this.version++;
    if (this.debug) this._assertInvariants();
  }

  _assertInvariants() {
    const problems = this.world.checkInvariants();
    if (problems.length > 0) {
      throw new Error(`Dünya değişmezi bozuldu (tick ${this.tick}): ${problems.slice(0, 5).join('; ')}`);
    }
  }

  // Tek hücre yazma (test, sahne ve basit araçlar için). Dünya dışı ve iç materyaller reddedilir.
  setCell(x, y, material) {
    const w = this.world;
    if (!w.inBounds(x, y)) return false;
    const def = MATERIALS.defs[material];
    if (!def || def.internal) return false;
    const i = w.index(x, y);
    w.set(i, material, cosmeticVariant(i, this.version), 0, 0);
    this.version++;
    return true;
  }

  getCell(x, y) {
    const w = this.world;
    if (!w.inBounds(x, y)) return null;
    const i = w.index(x, y);
    return { material: w.type[i], life: w.life[i], variant: w.variant[i] };
  }

  clear() {
    this.world.clear();
    this.version++;
  }

  getStats() {
    const w = this.world;
    return {
      tick: this.tick,
      particles: w.width * w.height - w.counts[EMPTY],
      activeCells: w.moves,
      width: w.width,
      height: w.height,
      speed: this.speed,
      paused: this.paused,
      physicsMs: this.physicsMs,
      seed: this.seed,
    };
  }
}

// Physics engine public API. DOM'a dokunmaz; tarayıcıda ve Node'da aynı çalışır.
// Zamanlama: fixed timestep (ADR-006). Tick sırası: iki geçiş + stamp (ADR-007).
import { World } from './world.js';
import { Rng, hashSeed } from './rng.js';
import { MAT, KIND, MATERIALS, spawnTemp } from './materials.js';
import { stepPowder, stepLiquid, stepGas } from './kernels.js';
import { react, createReactionState, beginReactionTick, initialLife, isMover, SOURCE_INFINITE, CLONER_LEARNED } from './reactions.js';
import { footprint, lineCells, SPRAY_DENSITY } from './brush.js';

export const SPEEDS = Object.freeze([0.5, 1, 2, 4]);

const BASE_TPS = 60;
const MAX_FRAME_MS = 100; // uzun duraklamalardan sonra devasa catch-up yok
const MAX_TICKS_PER_FRAME = 8;
// Accumulator "ms × TPS" biriminde tutulur: 1000 birim = 1 tick.
// Böylece 50 ms @ 60 TPS gibi değerler kayan nokta hatası olmadan tam sayı çıkar.
const TICK_UNIT = 1000;

const { KIND: KIND_OF, REACTIVE, COOLS } = MATERIALS;
const EMPTY = MAT.EMPTY;
const POWDER = KIND.POWDER;
const LIQUID = KIND.LIQUID;
const GAS = KIND.GAS;

const defaultNow = () => performance.now();

// Spawn hash'i: kozmetik ton (düşük 8 bit) ve sıvı akış yönü bit'i (bit 8).
// Sim RNG'sini tüketmez; böylece boyama ve palet fizik dizisini değiştirmez (ADR-008).
// Yön bit'i spawn'da hep aynı olsaydı kalıcı bir sol/sağ bias oluşurdu.
function spawnHash(i, salt) {
  let h = Math.imul(i ^ Math.imul(salt, 0x9e3779b1), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

export class Simulation {
  constructor({ width, height, seed = 'strata', debug = false, now = defaultNow } = {}) {
    this.world = new World(width, height); // engine-içi; uygulama katmanı kullanmaz
    this.seed = String(seed);
    this.rng = new Rng(this.seed, 'sim');
    this.inputRng = new Rng(this.seed, 'input'); // spray; fizik dizisini etkilemez
    this._seedSalt = hashSeed(this.seed)[0]; // spawn hash'i için seed'e bağlı tuz
    this.debug = debug;
    this.tick = 0;
    this.speed = 1;
    this.paused = false;
    this.version = 0;
    this.physicsMs = 0;
    this._acc = 0;
    this._now = now;
    this._reactions = createReactionState();
    this._gasRows = new Uint8Array(height); // geçiş 2'de taranacak satırlar

    this._hold = null; // basılı tutma: { x, y, brush } — tick başına yeniden uygulanır
    this._strokeDirty = false;
    // Undo: iki önceden ayrılmış snapshot (ADR-010). Biri undo noktası, diğeri bekleyen stroke.
    this._snapshots = [];
    this._undo = null;
    this._pending = null;

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
      // Sıcaklık tamponu her tick yer değiştirir: düz alan değil getter.
      get temp() {
        return w.temp;
      },
      get ambient() {
        return w.ambient;
      },
      counts: w.counts, // materyal başına hücre sayısı (salt-okunur; ör. renderer animasyon kararı)
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
    const { type, stamp, life, stride, width, height } = w;
    const clock = w.clock;
    const rng = this.rng;
    const parity = this.tick & 1;
    const rs = this._reactions;
    beginReactionTick(rs);

    // Geçiş 1 — aşağıdan yukarı: reaktif hücreler (statikler dahil), tozlar ve sıvılar.
    // Gaz görülen satırlar işaretlenir; geçiş 2 yalnızca onları tarar. Bu geçişte yeri
    // değişen ya da oluşan gazlar zaten damgalıdır (bu tick işlenmeleri gerekmez).
    const gasRows = this._gasRows;
    for (let y = height - 1; y >= 0; y--) {
      const leftToRight = ((y ^ parity) & 1) === 0; // tick XOR satır paritesi
      const dir = leftToRight ? 1 : -1;
      let i = (y + 1) * stride + (leftToRight ? 1 : width);
      for (let n = 0; n < width; n++, i += dir) {
        const t = type[i];
        if (t === EMPTY || stamp[i] === clock) continue;
        const kind = KIND_OF[t];
        if (kind === GAS) {
          gasRows[y] = 1; // gazlar geçiş 2'de
          continue;
        }
        if (COOLS[t] !== 0 && life[i] !== 0) life[i]--; // ısınan kum soğur (satır içi)
        if (REACTIVE[t] !== 0 && react(w, rng, i, t, rs)) continue;
        if (kind === POWDER) stepPowder(w, rng, i, t);
        else if (kind === LIQUID) stepLiquid(w, rng, i, t);
      }
    }

    // Geçiş 2 — yukarıdan aşağı: gazlar (yalnızca gaz bulunan satırlar).
    for (let y = 0; y < height; y++) {
      if (gasRows[y] === 0) continue;
      gasRows[y] = 0;
      const leftToRight = ((y ^ parity) & 1) === 0;
      const dir = leftToRight ? 1 : -1;
      let i = (y + 1) * stride + (leftToRight ? 1 : width);
      for (let n = 0; n < width; n++, i += dir) {
        const t = type[i];
        if (t === EMPTY || stamp[i] === clock) continue;
        if (KIND_OF[t] !== GAS) continue;
        if (REACTIVE[t] !== 0 && react(w, rng, i, t, rs)) continue;
        stepGas(w, rng, i, t);
      }
    }

    // Basılı tutma tick sonunda uygulanır: kaynak hücre bu tick boşaldıysa hemen yeniden dolar
    // (kesintisiz akış); yeni hücreler bir sonraki tick hareket eder.
    if (this._hold) {
      const h = this._hold;
      this.paintLine(h.x, h.y, h.x, h.y, h.brush);
    }

    this.tick++;
    this.version++;
    if (this.debug) this._assertInvariants();
  }

  // Spawn hash tuzu: (tick, seed). Çağrı geçmişinden (version) bağımsız olduğu için
  // aynı seed + aynı tick'te aynı hücre her zaman aynı ton/yön/ömrü alır (sahne determinizmi).
  _spawnSalt() {
    return Math.imul(this.tick + 1, 0x9e3779b1) ^ this._seedSalt;
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
    const h = spawnHash(i, this._spawnSalt());
    w.set(i, material, h & 255, initialLife(material, h >>> 9), (h >>> 8) & 1, spawnTemp(material, w.ambient));
    this.version++;
    return true;
  }

  // Çoğaltıcı/yutucu ayarı (sahneler, testler): öğrenilecek materyal ve bütçe (Infinity = sınırsız).
  // Kaynak olmayan hücre, hareketsiz materyal ya da geçersiz bütçe reddedilir; undo noktası oluşturmaz.
  configureSource(x, y, { learn, budget } = {}) {
    const w = this.world;
    if (!w.inBounds(x, y)) return false;
    const i = w.index(x, y);
    const t = w.type[i];
    if (t !== MAT.CLONER && t !== MAT.SINK) return false;
    if (learn !== undefined && (t !== MAT.CLONER || !isMover(learn))) return false;
    let b;
    if (budget !== undefined) {
      b = budget === Infinity ? SOURCE_INFINITE : budget;
      if (!Number.isInteger(b) || b < 0 || b > SOURCE_INFINITE) return false;
    }
    if (learn !== undefined) {
      w.variant[i] = learn;
      w.flags[i] |= CLONER_LEARNED;
    }
    if (b !== undefined) w.life[i] = b;
    this.version++;
    return true;
  }

  getCell(x, y) {
    const w = this.world;
    if (!w.inBounds(x, y)) return null;
    const i = w.index(x, y);
    return { material: w.type[i], life: w.life[i], variant: w.variant[i], temp: w.temp[i] };
  }

  clear() {
    // Clear da geri alınabilir: mevcut dünya undo noktası olur.
    const snap = this._spareSnapshot();
    this._capture(snap);
    this._undo = snap;
    this.world.clear();
    this.version++;
  }

  // Dünyayı baş aşağı çevirir (kum saati). Clear gibi geri alınabilir.
  flipVertical() {
    const snap = this._spareSnapshot();
    this._capture(snap);
    this._undo = snap;
    this.world.flipVertical();
    this.version++;
  }

  // Sahne yükleme: dünya temizlenir, seed'e bağlı RNG stream'leri yeniden kurulur,
  // tick/undo/hold sıfırlanır ve sahne kendi 'scene' stream'iyle üretilir.
  // Sahne nesnesi dışarıdan verilir ({ id, generate(sim, rng) }); engine sahne kaydını bilmez.
  // Aynı (sahne, seed, W, H) her zaman aynı başlangıcı üretir.
  loadScene(scene, seed = this.seed) {
    this.seed = String(seed);
    this.rng = new Rng(this.seed, 'sim');
    this.inputRng = new Rng(this.seed, 'input');
    this._seedSalt = hashSeed(this.seed)[0];
    this.world.clear();
    this.tick = 0;
    this._acc = 0;
    this._hold = null;
    this._undo = null;
    this._pending = null;
    this._strokeDirty = false;
    scene.generate(this, new Rng(this.seed, 'scene'));
    this._undo = null; // sahne üretimi geri alınabilir bir işlem değildir
    this.version++;
  }

  // ---- Boyama (fırça) ----

  paintAt(x, y, brush) {
    return this.paintLine(x, y, x, y, brush);
  }

  // Fırçayı (x0,y0)→(x1,y1) çizgisi boyunca boşluksuz uygular; boyanan hücre sayısını döner.
  // brush = { material, size, shape: 'circle'|'square'|'spray', replace }
  // Varsayılan: yalnızca boş ve gaz hücrelere yazar; replace tümüne; EMPTY (silgi) her şeyi siler.
  paintLine(x0, y0, x1, y1, brush) {
    const material = brush.material;
    const def = MATERIALS.defs[material];
    if (!def || def.internal) return 0;
    if (![x0, y0, x1, y1].every(Number.isFinite)) return 0;
    const fp = footprint(brush.shape, brush.size);
    const spray = brush.shape === 'spray';
    const replace = Boolean(brush.replace);
    let painted = 0;
    lineCells(Math.floor(x0), Math.floor(y0), Math.floor(x1), Math.floor(y1), (cx, cy) => {
      for (let k = 0; k < fp.length; k += 2) {
        painted += this._paintCell(cx + fp[k], cy + fp[k + 1], material, replace, spray);
      }
    });
    if (painted > 0) {
      this.version++;
      this._strokeDirty = true;
    }
    return painted;
  }

  _paintCell(x, y, material, replace, spray) {
    const w = this.world;
    if (!w.inBounds(x, y)) return 0;
    if (spray && !this.inputRng.chance(SPRAY_DENSITY)) return 0;
    const i = w.index(x, y);
    const current = w.type[i];
    if (material === EMPTY) {
      if (current === EMPTY) return 0;
      w.set(i, EMPTY, 0, 0, 0, w.ambient);
      return 1;
    }
    if (current === material) return 0;
    if (!replace && current !== EMPTY && KIND_OF[current] !== GAS) return 0;
    const h = spawnHash(i, this._spawnSalt());
    w.set(i, material, h & 255, initialLife(material, h >>> 9), (h >>> 8) & 1, spawnTemp(material, w.ambient));
    return 1;
  }

  setHold(x, y, brush) {
    this._hold = { x, y, brush: { ...brush } };
  }

  releaseHold() {
    this._hold = null;
  }

  // ---- Undo (tek seviye, snapshot) ----

  get canUndo() {
    return this._undo !== null;
  }

  beginStroke() {
    const snap = this._spareSnapshot();
    this._capture(snap);
    this._pending = snap;
    this._strokeDirty = false;
  }

  // Yalnızca gerçekten bir şey değiştiren stroke undo noktası olur.
  endStroke() {
    if (this._pending && this._strokeDirty) this._undo = this._pending;
    this._pending = null;
    this._strokeDirty = false;
  }

  undo() {
    const snap = this._undo;
    if (!snap) return false;
    const w = this.world;
    w.type.set(snap.type);
    w.variant.set(snap.variant);
    w.life.set(snap.life);
    w.flags.set(snap.flags);
    w.temp.set(snap.temp);
    w.counts.set(snap.counts);
    this.rng.setState(snap.rng);
    this.tick = snap.tick;
    this._undo = null;
    this.version++;
    return true;
  }

  // Undo noktası olmayan tampon (gerekirse bir kez ayrılır; sonra hep yeniden kullanılır).
  _spareSnapshot() {
    // Undo noktası ve (çizim sürerken) bekleyen stroke snapshot'ı korunur.
    for (const snap of this._snapshots) if (snap !== this._undo && snap !== this._pending) return snap;
    const size = this.world.size;
    const snap = {
      type: new Uint8Array(size),
      variant: new Uint8Array(size),
      life: new Uint16Array(size),
      flags: new Uint8Array(size),
      temp: new Float32Array(size),
      counts: new Uint32Array(256),
      rng: new Uint32Array(4),
      tick: 0,
    };
    this._snapshots.push(snap);
    return snap;
  }

  _capture(snap) {
    const w = this.world;
    snap.type.set(w.type);
    snap.variant.set(w.variant);
    snap.life.set(w.life);
    snap.flags.set(w.flags);
    snap.temp.set(w.temp);
    snap.counts.set(w.counts);
    snap.rng.set(this.rng.getState());
    snap.tick = this.tick;
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

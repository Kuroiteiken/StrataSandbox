// Seed'li, hızlı PRNG. Engine içinde Math.random kullanılmaz (ADR-008).
// - hashSeed: string seed → 4×u32 (cyrb128)
// - Rng: sfc32; her kullanım alanı (scene/sim/input) ayrı stream alır.

const TWO_POW_32 = 4294967296;

export function hashSeed(str) {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

export class Rng {
  constructor(seed, stream = '') {
    const [a, b, c, d] = hashSeed(`${seed}#${stream}`);
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    // sfc32'nin ilk çıktıları seed'e fazla bağlıdır; ısınma turu.
    for (let i = 0; i < 12; i++) this.nextU32();
  }

  // [0, 2^32) aralığında tam sayı.
  nextU32() {
    let { a, b, c, d } = this;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    return t >>> 0;
  }

  // [0, 1) aralığında ondalık.
  next() {
    return this.nextU32() / TWO_POW_32;
  }

  // [0, n) aralığında tam sayı.
  int(n) {
    return Math.floor(this.next() * n);
  }

  // 0 ya da 1.
  bit() {
    return this.nextU32() >>> 31;
  }

  // p olasılıkla true.
  chance(p) {
    return this.nextU32() < p * TWO_POW_32;
  }

  getState() {
    return Uint32Array.of(this.a, this.b, this.c, this.d);
  }

  setState(state) {
    this.a = state[0] | 0;
    this.b = state[1] | 0;
    this.c = state[2] | 0;
    this.d = state[3] | 0;
  }
}

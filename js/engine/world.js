// Dünya durumu: hücre başına paralel typed array'ler (SoA).
// Boyut (W+2)×(H+2): 1 hücrelik görünmez WALL çerçevesi hot loop'ta bounds
// check'i gereksiz kılar. Tüm yazmalar bu sınıftaki primitive'lerden geçer
// (ileride active-chunk işaretlemesi için tek nokta — ADR-005).
import { MAT, MATERIALS } from './materials.js';

const STAMP_MAX = 65535;

export class World {
  constructor(width, height) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
      throw new RangeError(`Geçersiz dünya boyutu: ${width}×${height}`);
    }
    this.width = width;
    this.height = height;
    this.stride = width + 2;
    this.size = (width + 2) * (height + 2);

    this.type = new Uint8Array(this.size);
    this.variant = new Uint8Array(this.size);
    this.life = new Uint16Array(this.size);
    this.flags = new Uint8Array(this.size);
    this.stamp = new Uint16Array(this.size);
    this.counts = new Uint32Array(256);

    this.clock = 1; // güncel update stamp değeri
    this.moves = 0; // bu tick'teki yer değiştirme sayısı (istatistik)
    this.clear();
  }

  index(x, y) {
    return (y + 1) * this.stride + (x + 1);
  }

  // Kesirli koordinat kabul edilmez: typed array yazımı sessizce yok sayılır ama
  // sayaçlar güncellenirdi (counts tutarsızlığı).
  inBounds(x, y) {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  // Yeni tick: saati ilerlet; taşarsa stamp'leri sıfırla ki eski değerler çakışmasın.
  beginTick() {
    if (this.clock >= STAMP_MAX) {
      this.stamp.fill(0);
      this.clock = 1;
    } else {
      this.clock++;
    }
    this.moves = 0;
  }

  set(i, type, variant, life, flags) {
    this.counts[this.type[i]]--;
    this.counts[type]++;
    this.type[i] = type;
    this.variant[i] = variant;
    this.life[i] = life;
    this.flags[i] = flags;
    this.stamp[i] = this.clock;
  }

  // Materyal değiştirir; parçacığın kozmetik tonu (variant) korunur.
  transform(i, type, life) {
    this.counts[this.type[i]]--;
    this.counts[type]++;
    this.type[i] = type;
    this.life[i] = life;
    this.flags[i] = 0;
    this.stamp[i] = this.clock;
  }

  swap(a, b) {
    const { type, variant, life, flags, stamp } = this;
    let t = type[a];
    type[a] = type[b];
    type[b] = t;
    t = variant[a];
    variant[a] = variant[b];
    variant[b] = t;
    t = life[a];
    life[a] = life[b];
    life[b] = t;
    t = flags[a];
    flags[a] = flags[b];
    flags[b] = t;
    stamp[a] = this.clock;
    stamp[b] = this.clock;
    this.moves++;
  }

  clear() {
    const { width, height, stride } = this;
    this.type.fill(MAT.EMPTY);
    this.variant.fill(0);
    this.life.fill(0);
    this.flags.fill(0);
    this.stamp.fill(0);
    for (let x = 0; x < stride; x++) {
      this.type[x] = MAT.WALL;
      this.type[(height + 1) * stride + x] = MAT.WALL;
    }
    for (let y = 1; y <= height; y++) {
      this.type[y * stride] = MAT.WALL;
      this.type[y * stride + width + 1] = MAT.WALL;
    }
    this.counts.fill(0);
    this.counts[MAT.EMPTY] = width * height;
    this.counts[MAT.WALL] = this.size - width * height;
  }

  // Debug/test için değişmezler: kenar bütünlüğü, tanımlı tipler, sayaç tutarlılığı.
  checkInvariants() {
    const problems = [];
    const { width, height, stride, type } = this;
    const actual = new Uint32Array(256);
    for (let i = 0; i < this.size; i++) {
      const t = type[i];
      actual[t]++;
      if (!MATERIALS.defs[t]) problems.push(`tanımsız materyal ${t} @${i}`);
      const x = i % stride;
      const y = (i - x) / stride;
      const border = x === 0 || y === 0 || x === width + 1 || y === height + 1;
      if (border !== (t === MAT.WALL)) problems.push(`kenar bütünlüğü bozuk @${i} (tip ${t})`);
    }
    for (let t = 0; t < 256; t++) {
      if (actual[t] !== this.counts[t]) problems.push(`sayaç tutarsız: tip ${t} sayaç=${this.counts[t]} gerçek=${actual[t]}`);
    }
    return problems;
  }
}

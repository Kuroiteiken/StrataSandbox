// Dünya durumu: hücre başına paralel typed array'ler (SoA).
// Boyut (W+2)×(H+2): 1 hücrelik görünmez WALL çerçevesi hot loop'ta bounds
// check'i gereksiz kılar. Tüm yazmalar bu sınıftaki primitive'lerden geçer
// (ileride active-chunk işaretlemesi için tek nokta — ADR-005).
import { MAT, MATERIALS } from './materials.js';
import { DEFAULT_AMBIENT, TEMP_MIN, TEMP_MAX } from './climate.js';

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
    this.temp = new Float32Array(this.size); // °C; hava dahil her hücre (ADR-014)
    this.tempNext = new Float32Array(this.size); // difüzyon hedef tamponu (heat.js)
    this.ambient = DEFAULT_AMBIENT; // bu tick'in ortam sıcaklığı (Simulation yazar)

    // 8 komşu için index farkları (reaksiyon örneklemesi): üst sıra, yanlar, alt sıra.
    const st = this.stride;
    this.neighborOffsets = Int32Array.of(-st - 1, -st, -st + 1, -1, 1, st - 1, st, st + 1);

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

  // temp verilmezse ortam sıcaklığı yazılır (çağıranlar doğuş sıcaklığını spawnTemp ile verir).
  set(i, type, variant, life, flags, temp = this.ambient) {
    this.counts[this.type[i]]--;
    this.counts[type]++;
    this.type[i] = type;
    this.variant[i] = variant;
    this.life[i] = life;
    this.flags[i] = flags;
    this.temp[i] = temp;
    this.stamp[i] = this.clock;
  }

  // Materyal değiştirir. Kozmetik ton ve sıvı akış yönü bit'i (bit0) korunur;
  // diğer flag bitleri materyale özgü olduğundan temizlenir.
  transform(i, type, life) {
    this.counts[this.type[i]]--;
    this.counts[type]++;
    this.type[i] = type;
    this.life[i] = life;
    this.flags[i] &= 1;
    this.stamp[i] = this.clock;
  }

  swap(a, b) {
    const { type, variant, life, flags, temp, stamp } = this;
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
    t = temp[a]; // ısı maddeyle birlikte taşınır
    temp[a] = temp[b];
    temp[b] = t;
    stamp[a] = this.clock;
    stamp[b] = this.clock;
    this.moves++;
  }

  // Dünyayı dikey aynalar: iç satır y ↔ H−1−y (kenar çerçevesi yerinde kalır). Sayaçlar değişmez.
  // Damgalar aynalanmaz: çevirme tick'ler arasında yapılır ve bir sonraki tick yeni saatle başlar.
  flipVertical() {
    const { width, height, stride } = this;
    const arrays = [this.type, this.variant, this.life, this.flags, this.temp];
    for (let top = 1, bottom = height; top < bottom; top++, bottom--) {
      const a = top * stride + 1;
      const b = bottom * stride + 1;
      for (const arr of arrays) {
        for (let k = 0; k < width; k++) {
          const t = arr[a + k];
          arr[a + k] = arr[b + k];
          arr[b + k] = t;
        }
      }
    }
  }

  clear() {
    const { width, height, stride } = this;
    this.type.fill(MAT.EMPTY);
    this.variant.fill(0);
    this.life.fill(0);
    this.flags.fill(0);
    this.temp.fill(this.ambient);
    this.tempNext.fill(this.ambient);
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

  // Difüzyon tamponlarını yer değiştirir (heat.js); world.temp her zaman güncel alandır.
  swapTempBuffers() {
    const t = this.temp;
    this.temp = this.tempNext;
    this.tempNext = t;
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
      const T = this.temp[i];
      if (!(T >= TEMP_MIN && T <= TEMP_MAX)) problems.push(`sıcaklık geçersiz @${i}: ${T}`);
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

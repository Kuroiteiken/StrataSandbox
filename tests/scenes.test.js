import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { SOURCE_DOWNWARD } from '../js/engine/reactions.js';
import { SCENES, getScene, DEFAULT_SCENE_ID } from '../js/scenes/index.js';
import { valueNoise, fillPolygon, frame } from '../js/scenes/tools.js';
import { countMaterial, runTicks, cellType } from './helpers.js';

const SIZES = [[320, 180], [400, 225], [120, 166], [64, 48]];

// Yalnızca materyal yerleşiminin özeti (kozmetik ton hariç).
function typeHash(sim) {
  const { type } = sim.view;
  let h = 0x811c9dc5;
  for (let i = 0; i < type.length; i++) {
    h ^= type[i];
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function load(id, seed, w = 320, h = 180) {
  const sim = new Simulation({ width: w, height: h, debug: true });
  sim.loadScene(getScene(id), seed);
  return sim;
}

const present = (sim, ...mats) => mats.every((m) => countMaterial(sim, m) > 0);

test('varsayılan sahne Volcano; sahne kaydı Volcano, Hourglass, Oasis, Chaos Lab, Benchmark ve Boş içerir', () => {
  assert.equal(DEFAULT_SCENE_ID, 'volcano');
  const ids = SCENES.map((s) => s.id);
  for (const id of ['volcano', 'hourglass', 'oasis', 'glacier', 'foundry', 'cave', 'chaos', 'benchmark', 'empty']) assert.ok(ids.includes(id), id);
  assert.equal(getScene('benchmark').hidden, true, 'benchmark yalnızca debug seçicide');
});

for (const scene of SCENES) {
  test(`${scene.id}: farklı grid boyutlarında hatasız üretilir ve dünya değişmezleri korunur`, () => {
    for (const [w, h] of SIZES) {
      const sim = load(scene.id, 'sizes', w, h);
      assert.deepEqual(sim.world.checkInvariants(), [], `${w}×${h}`);
      sim.step(); // debug değişmezleri
    }
  });

  test(`${scene.id}: aynı (seed, W, H) aynı başlangıcı üretir`, () => {
    assert.equal(typeHash(load(scene.id, 'same')), typeHash(load(scene.id, 'same')));
  });
}

test('Volcano taş, lav, kum, su, bitki ve odun içerir', () => {
  for (const [w, h] of SIZES) {
    assert.ok(present(load('volcano', 'v', w, h), MAT.STONE, MAT.LAVA, MAT.SAND, MAT.WATER, MAT.PLANT, MAT.WOOD), `${w}×${h}`);
  }
});

test('Volcano lavı yalnızca sağ yarıktan taşar; sol taraftaki göle ulaşmaz', () => {
  for (const [w, h] of [[320, 180], [124, 142], [165, 318], [280, 207], [100, 300], [64, 48], [400, 225]]) {
    for (const seed of ['l1', 'l2', 'l3', 'readme']) {
      const sim = load('volcano', seed, w, h);
      runTicks(sim, 600);
      let leftLava = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < Math.floor(w * 0.22); x++) if (cellType(sim, x, y) === MAT.LAVA) leftLava++;
      assert.equal(leftLava, 0, `${w}×${h} seed ${seed}: sol bölgede ${leftLava} lav hücresi`);
    }
  }
});

test('Volcano ve Oasis seed ile değişir', () => {
  assert.notEqual(typeHash(load('volcano', 'a')), typeHash(load('volcano', 'b')));
  assert.notEqual(typeHash(load('oasis', 'a')), typeHash(load('oasis', 'b')));
});

const HG_SIZES = [[200, 220], [201, 221], [320, 180], [400, 225], [64, 48], [400, 120], [120, 300]];

function sandHalves(sim) {
  const { width, height } = sim.view;
  let top = 0;
  let bottom = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cellType(sim, x, y) !== MAT.SAND) continue;
      if (y < height / 2) top++;
      else bottom++;
    }
  }
  return { top, bottom };
}

// Boğaz tüpü: iki hücre (cx, cx+1), orta satırlar (hourglass.js ile aynı formül).
function neckHasSand(sim) {
  const { width: W, height: H } = sim.view;
  const cx = Math.floor((W - 2) / 2);
  const midRow = Math.floor((H - 1) / 2);
  const neckStart = H % 2 === 1 ? midRow - 1 : midRow;
  for (let y = neckStart; y <= H - 1 - neckStart; y++) for (const x of [cx, cx + 1]) if (cellType(sim, x, y) === MAT.SAND) return true;
  return false;
}

// Boğazdaki taneler gerçekten akıyor mu: ardışık örneklerde boğaz hücrelerinin (tür, ton) imzası
// değişmeli. Tıkanmış boğaz kum dolu olsa da imzası sabit kalır.
function neckSignature(sim) {
  const { width: W, height: H } = sim.view;
  const cx = Math.floor((W - 2) / 2);
  const midRow = Math.floor((H - 1) / 2);
  const neckStart = H % 2 === 1 ? midRow - 1 : midRow;
  let s = '';
  for (let y = neckStart - 2; y <= H + 1 - neckStart; y++) for (const x of [cx, cx + 1]) { const c = sim.getCell(x, y); s += `${c.material}:${c.variant},`; }
  return s;
}

function flowRatio(sim, ticks) {
  let moving = 0;
  let samples = 0;
  let prev = neckSignature(sim);
  for (let t = 0; t < ticks; t += 20) {
    runTicks(sim, 20);
    const sig = neckSignature(sim);
    samples++;
    if (neckHasSand(sim) && sig !== prev) moving++;
    prev = sig;
  }
  return moving / samples;
}

test('Kum saati: kum dışındaki şekil (kaynaklar dahil) orta satıra göre tam simetrik, başta tüm kum üstte', () => {
  const norm = (m) => (m === MAT.SAND ? MAT.EMPTY : m);
  for (const [w, h] of HG_SIZES) {
    const sim = load('hourglass', 'hg', w, h);
    assert.ok(present(sim, MAT.GLASS, MAT.WOOD, MAT.SAND, MAT.CLONER, MAT.SINK), `${w}×${h}`);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        assert.equal(norm(cellType(sim, x, y)), norm(cellType(sim, x, h - 1 - y)), `${w}×${h} (${x},${y})`);
      }
    }
    assert.equal(sandHalves(sim).bottom, 0, `${w}×${h}: başta alt hazne boş`);
  }
});

// hourglass.js ile aynı kapak geometrisi: haznenin ilk satırı (kapağın altı).
function hgGlassTop(H) {
  const capH = Math.max(2, Math.min(3, Math.round(H * 0.015)));
  return Math.max(1, Math.round(H * 0.05)) + capH;
}

test('Kum saati: kapaklarda aynı çoğaltıcı sırası; yutucular dipte değil, alt haznenin üst kısmında akışın iki yanındaki raflarda', () => {
  for (const [w, h] of [[320, 180], [400, 225], [64, 48], [120, 300]]) {
    const sim = load('hourglass', 'hg', w, h);
    const cx = Math.floor((w - 2) / 2);
    const midRow = Math.floor((h - 1) / 2);
    const neckStart = h % 2 === 1 ? midRow - 1 : midRow;
    const glassTop = hgGlassTop(h);
    const lowerTop = h - 1 - neckStart; // alt haznenin boğaz tarafı
    const L = neckStart - glassTop;
    const count = { [MAT.CLONER]: [0, 0], [MAT.SINK]: [0, 0] };
    const sinkSides = new Set();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const m = cellType(sim, x, y);
        if (m !== MAT.CLONER && m !== MAT.SINK) continue;
        const lower = y > midRow;
        count[m][lower ? 1 : 0]++;
        const c = sim.getCell(x, y);
        const at = `${w}×${h} (${x},${y})`;
        assert.equal(c.life, 65535, `${at}: sınırsız`);
        assert.ok((sim.world.flags[sim.world.index(x, y)] & SOURCE_DOWNWARD) !== 0, `${at}: aşağı yönlü`);
        if (m === MAT.CLONER) {
          assert.equal(c.variant, MAT.SAND);
          assert.ok(y === glassTop || y === h - 1 - glassTop, `${at}: çoğaltıcı kapakta`);
          continue;
        }
        assert.ok(y !== glassTop && y !== h - 1 - glassTop, `${at}: yutucu kapakta olmamalı`);
        assert.ok(x < cx - 1 || x > cx + 2, `${at}: yutucu akış sütununda olmamalı`);
        // Alt haznede yutucu cam rafın üstünde, üstü açık; aynası üstte cam tavanın altında.
        assert.equal(cellType(sim, x, lower ? y + 1 : y - 1), MAT.GLASS, `${at}: raf/tavan`);
        if (lower) {
          assert.ok(y - lowerTop <= 0.6 * L, `${at}: yutucu alt haznenin üst kısmında (boğazdan ${y - lowerTop} / ${L})`);
          sinkSides.add(x < cx ? 'sol' : 'sağ');
        }
      }
    }
    for (const m of [MAT.CLONER, MAT.SINK]) {
      assert.ok(count[m][0] >= 4, `${w}×${h}: yarı başına en az 4 (${m})`);
      assert.equal(count[m][0], count[m][1], `${w}×${h}: iki yarı aynı (${m})`);
    }
    assert.equal(sinkSides.size, 2, `${w}×${h}: akışın iki yanında`);
  }
});

test('Kum saati sürekli akar: üst hazne dolu kalır, alt hazne raflara kadar dolar ve orada kalır, boğaz tıkanmaz', () => {
  const sim = load('hourglass', 'hg', 400, 225);
  const initialTop = sandHalves(sim).top;
  runTicks(sim, 4500); // alt hazne ~3000 tick'te raf seviyesine ulaşır
  const before = sandHalves(sim).bottom;
  const ratio = flowRatio(sim, 3000);
  assert.ok(ratio >= 0.8, `boğazda akan kum oranı ${ratio.toFixed(2)}`);
  const { top, bottom } = sandHalves(sim);
  assert.ok(top >= initialTop * 0.9, `üst ${top} / başlangıç ${initialTop}`);
  assert.ok(bottom >= initialTop * 0.8, `alt hazne dolmalı: ${bottom}`);
  assert.ok(Math.abs(bottom - before) <= initialTop * 0.02, `alt hazne sabit kalmalı (yutucular fazlayı alır): ${before} → ${bottom}`);
});

test('Kum saati çevrilince (F) de sürekli akar; geri çevirince yine akar', () => {
  const sim = load('hourglass', 'hg', 400, 225);
  runTicks(sim, 3000);
  const initial = sandHalves(sim).top + sandHalves(sim).bottom;
  for (const round of [1, 2]) {
    sim.flipVertical();
    runTicks(sim, 3000);
    const ratio = flowRatio(sim, 3000);
    assert.ok(ratio >= 0.8, `çevirme ${round}: boğazda akan kum oranı ${ratio.toFixed(2)}`);
    const { top, bottom } = sandHalves(sim);
    assert.ok(top >= initial * 0.35, `çevirme ${round}: üst ${top} / toplam ${initial}`);
    assert.ok(bottom >= initial * 0.35, `çevirme ${round}: alt ${bottom} / toplam ${initial}`);
  }
});

test('Kum saati uç en-boy oranlarında da akar', () => {
  for (const [w, h] of [[64, 48], [400, 120], [120, 300]]) {
    const sim = load('hourglass', 'hg', w, h);
    runTicks(sim, 200);
    let seen = false;
    for (let t = 0; t < 200 && !seen; t += 10) {
      runTicks(sim, 10);
      seen = neckHasSand(sim);
    }
    assert.ok(seen, `${w}×${h}`);
  }
});

test('Oasis kumul, su, taş, bitki ve odun (palmiye) içerir', () => {
  for (const [w, h] of SIZES) {
    assert.ok(present(load('oasis', 'o', w, h), MAT.SAND, MAT.WATER, MAT.STONE, MAT.PLANT, MAT.WOOD), `${w}×${h}`);
  }
});

test('Chaos Lab en az 4 farklı materyal içerir, doluluk %40\'ı geçmez ve seed ile değişir', () => {
  for (const seed of ['c1', 'c2', 'c3', 'c4']) {
    const sim = load('chaos', seed);
    const mats = [MAT.SAND, MAT.WATER, MAT.OIL, MAT.LAVA, MAT.WOOD, MAT.PLANT, MAT.STONE, MAT.GLASS, MAT.STEAM].filter((m) => countMaterial(sim, m) > 0);
    assert.ok(mats.length >= 4, `seed ${seed}: ${mats.length} materyal`);
    const fill = sim.getStats().particles / (sim.view.width * sim.view.height);
    assert.ok(fill <= 0.4, `seed ${seed}: doluluk ${fill.toFixed(2)}`);
  }
  assert.notEqual(typeHash(load('chaos', 'c1')), typeHash(load('chaos', 'c2')));
});

test('Benchmark seed\'den bağımsız sabit yerleşim üretir ve yük materyallerini içerir', () => {
  assert.equal(typeHash(load('benchmark', 'x')), typeHash(load('benchmark', 'y')));
  const sim = load('benchmark', 'x', 400, 225);
  assert.ok(present(sim, MAT.SAND, MAT.WATER, MAT.LAVA, MAT.FIRE, MAT.STEAM, MAT.PLANT, MAT.WOOD));
  assert.ok(sim.getStats().particles > 400 * 225 * 0.25, 'benchmark yeterince yüklü olmalı');
});

test('Boş sahne boştur', () => {
  assert.equal(load('empty', 'e').getStats().particles, 0);
});

// Kaba duvar saati sınırı: yavaş CI runner'larında kırılmaması için geniş tutulur.
test('sahne üretimi büyük gridde de hızlıdır (< 250 ms)', () => {
  for (const scene of SCENES) {
    const sim = new Simulation({ width: 400, height: 225 });
    const t0 = performance.now();
    sim.loadScene(scene, 'perf');
    const ms = performance.now() - t0;
    assert.ok(ms < 250, `${scene.id}: ${ms.toFixed(1)} ms`);
  }
});

// ---- Yardımcılar ----

test('valueNoise deterministik, [0,1] aralığında ve pürüzsüz', () => {
  const a = valueNoise(300, 'seed', 'layer', 8);
  assert.deepEqual([...a], [...valueNoise(300, 'seed', 'layer', 8)]);
  for (let i = 0; i < a.length; i++) {
    assert.ok(a[i] >= 0 && a[i] <= 1);
    if (i > 0) assert.ok(Math.abs(a[i] - a[i - 1]) < 0.08);
  }
});

test('fillPolygon üçgenin içini doldurur, dışını doldurmaz', () => {
  const sim = new Simulation({ width: 20, height: 20 });
  fillPolygon(sim, [[2, 18], [10, 2], [18, 18]], MAT.STONE);
  assert.equal(cellType(sim, 10, 12), MAT.STONE);
  assert.equal(cellType(sim, 2, 2), MAT.EMPTY);
  assert.equal(cellType(sim, 18, 5), MAT.EMPTY);
});

test('her sahnenin ortam sıcaklığı −40..60 aralığında; Vaha ılık', () => {
  for (const s of SCENES) assert.ok(Number.isFinite(s.ambient) && s.ambient >= -40 && s.ambient <= 60, s.id);
  assert.equal(getScene('oasis').ambient, 30);
});

test('sahne sırası seçicide doğru', () => {
  assert.deepEqual(SCENES.filter((s) => !s.hidden).map((s) => s.id), ['volcano', 'hourglass', 'oasis', 'glacier', 'foundry', 'cave', 'chaos', 'empty']);
});

test('Buzul: kar, buz, su, metal, magma ve taş içerir; gölün üstü buz, altı ılık su', () => {
  for (const [w, h] of SIZES) {
    const sim = load('glacier', 'g', w, h);
    assert.ok(present(sim, MAT.SNOW, MAT.ICE, MAT.WATER, MAT.METAL, MAT.MAGMA, MAT.STONE), `${w}×${h}`);
    assert.equal(sim.ambient, -15);
  }
  const sim = load('glacier', 'g', 320, 180);
  const x = Math.round(0.49 * 319);
  let firstLake = -1;
  for (let y = 0; y < 180; y++) {
    const m = cellType(sim, x, y);
    if (m === MAT.ICE || m === MAT.WATER) {
      firstLake = y;
      break;
    }
  }
  assert.equal(cellType(sim, x, firstLake), MAT.ICE, 'göl yüzeyi buz');
  let water = null;
  for (let y = firstLake; y < 180; y++) {
    if (cellType(sim, x, y) === MAT.WATER) {
      water = sim.getCell(x, y);
      break;
    }
  }
  assert.ok(water && water.temp > 0, 'buzun altında 0 °C üstü su');
});

test('Dökümhane: erimiş metal kalıplara akar ve katılaşır', () => {
  const sim = load('foundry', 'f', 320, 180);
  assert.ok(present(sim, MAT.MOLTEN_METAL, MAT.METAL, MAT.MAGMA, MAT.WATER, MAT.STONE));
  const molten0 = countMaterial(sim, MAT.MOLTEN_METAL);
  const metal0 = countMaterial(sim, MAT.METAL);
  runTicks(sim, 4000);
  assert.ok(countMaterial(sim, MAT.MOLTEN_METAL) < molten0 * 0.5, 'erimiş metal azalmalı');
  assert.ok(countMaterial(sim, MAT.METAL) > metal0 + molten0 * 0.3, 'metal artmalı');
  assert.deepEqual(sim.world.checkInvariants(), []);
});

test('Dökümhane: yarıktan kalıplara ısıtılmış eğimli oluk iner; metalin en az üçte biri oluktan kalıplara dökülür', () => {
  for (const [w, h] of [[320, 180], [400, 225], [120, 133], [100, 300]]) {
    const sim = load('foundry', 'f', w, h);
    let potR = 0; // potanın iç sağ sütunu (erimiş metalin en sağı); sağ duvarın dışı potR + 2
    let molten0 = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (cellType(sim, x, y) !== MAT.MOLTEN_METAL) continue;
        molten0++;
        if (x < w / 2) potR = Math.max(potR, x);
      }
    }
    // Oluk: duvarın hemen sağındaki en az 6 sütunda, altında magma damarı olan ≥ 1300 °C taş taban; sağa iner.
    let prevY = -1;
    for (let x = potR + 3; x < potR + 9; x++) {
      let y = -1;
      for (let yy = 0; yy < h - 2 && y < 0; yy++) {
        if (cellType(sim, x, yy) === MAT.STONE && sim.getCell(x, yy).temp >= 1300 && cellType(sim, x, yy + 2) === MAT.MAGMA) y = yy;
      }
      assert.ok(y >= 0, `${w}×${h}: ${x}. sütunda ısıtılmış oluk yok`);
      assert.ok(prevY < 0 || (y >= prevY && y <= prevY + 1), `${w}×${h}: oluk sağa doğru inmeli (${prevY} → ${y})`);
      prevY = y;
    }
    const poured = () => {
      let n = 0;
      for (let y = 0; y < h; y++) for (let x = potR + 3; x < w; x++) { const m = cellType(sim, x, y); if (m === MAT.MOLTEN_METAL || m === MAT.METAL) n++; }
      return n;
    };
    const p0 = poured();
    runTicks(sim, 4000);
    assert.ok(poured() - p0 >= molten0 / 3, `${w}×${h}: dökülen ${poured() - p0} / ${molten0}`);
  }
});

test('Mağara: göl ve lav cebi arasındaki duvar kalır, göl suyu cebe sızmaz; ısınan göl kenarından buhar yükselir', () => {
  const sim = load('cave', 'c', 320, 180);
  assert.ok(present(sim, MAT.WATER, MAT.LAVA, MAT.MAGMA, MAT.WOOD, MAT.OIL, MAT.SAND, MAT.STONE));
  // cave.js ile aynı geometri: lav cebinin merkez satırında cebin solundaki taş duvar.
  const { W, X, Y, S } = frame(sim);
  const lx = X(0.58);
  const lr = Math.max(3, S(0.11));
  const pr = Math.max(2, S(0.04));
  const pxc = Math.min(W - 2 - pr, lx + lr + 3 + pr);
  const pyc = Y(0.72) + Math.round(lr / 3);
  const wall = [];
  for (let x = pxc - pr - 1; x > lx && cellType(sim, x, pyc) === MAT.STONE; x--) wall.push(x);
  assert.ok(wall.length >= 2, `duvar ${wall.length} hücre`);
  const inPocket = (x, y) => (x - pxc) * (x - pxc) + (y - pyc) * (y - pyc) <= pr * pr;
  let steamAt = -1;
  for (let k = 0; k < 4000; k++) {
    sim.step();
    if (steamAt < 0 && countMaterial(sim, MAT.STEAM) > 0) steamAt = k;
  }
  assert.ok(steamAt >= 0, 'kaplıca buharı oluşmadı');
  assert.ok(countMaterial(sim, MAT.MAGMA) > 0);
  for (const x of wall) assert.equal(cellType(sim, x, pyc), MAT.STONE, `duvar (${x},${pyc}) yerinde kalmalı`);
  for (let y = pyc - pr; y <= pyc + pr; y++) {
    for (let x = pxc - pr; x <= pxc + pr; x++) if (inPocket(x, y)) assert.notEqual(cellType(sim, x, y), MAT.WATER, `cepte su (${x},${y})`);
  }
});

test('Volkan: magma kaynağı yerinde kalır ve magma odasındaki lav uzun süre sıvı kalır', () => {
  const sim = load('volcano', 'v', 320, 180);
  const magma = countMaterial(sim, MAT.MAGMA);
  assert.ok(magma > 0);
  runTicks(sim, 3000);
  assert.equal(countMaterial(sim, MAT.MAGMA), magma);
  assert.ok(countMaterial(sim, MAT.LAVA) > 0, 'lav tamamen katılaşmamalı');
});

test('Volkan: yarıktaki çoğaltıcı lavı öğrenir ve akan lavın yerini doldurarak bütçesini harcar', () => {
  const sim = load('volcano', 'v', 320, 180);
  const cloners = [];
  for (let y = 0; y < 180; y++) for (let x = 0; x < 320; x++) if (cellType(sim, x, y) === MAT.CLONER) cloners.push([x, y]);
  assert.equal(cloners.length, 2);
  const budget = () => cloners.reduce((sum, [x, y]) => sum + sim.getCell(x, y).life, 0);
  const start = budget();
  runTicks(sim, 3000);
  for (const [x, y] of cloners) assert.equal(sim.getCell(x, y).variant, MAT.LAVA, 'lavı öğrenmeli');
  assert.ok(budget() < start, 'kopya üretmeli');
});

test('Volkan: lav sağ yamaçtan ağaçlara ulaşır ve en az bir ağacı tutuşturur', () => {
  for (const [w, h, seed] of [[320, 180, 'v'], [400, 225, 'readme'], [320, 180, 'l1'], [280, 207, 'l2'], [120, 133, 'v'], [100, 180, 'readme'], [100, 300, 'readme'], [64, 48, 'l2']]) {
    const sim = load('volcano', seed, w, h);
    const trunks = [];
    for (let y = 0; y < h; y++) for (let x = Math.floor(w * 0.7); x < w; x++) if (cellType(sim, x, y) === MAT.WOOD) trunks.push([x, y]);
    assert.ok(trunks.length > 0, `${w}×${h} ${seed}: ağaç yok`);
    // Ağacı damarın ısısı değil lav tutuşturmalı: damar ağaçtan uzakta biter ve tutuşmaya kadar ağacın
    // (gövde ya da taç) bir hücresinin 4 hücre yakınına lav gelmiş olmalı (lav değdiği ya da ısıttığı
    // kum/cam üzerinden tutuşturur).
    const tree = [...trunks];
    for (let y = 0; y < h; y++) for (let x = Math.floor(w * 0.7); x < w; x++) if (cellType(sim, x, y) === MAT.PLANT) tree.push([x, y]);
    const near = (mat, r) => tree.some(([tx, ty]) => {
      for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++) if (cellType(sim, x, y) === mat) return true;
      return false;
    });
    assert.ok(!near(MAT.MAGMA, 4), `${w}×${h} ${seed}: magma damarı ağaca 4 hücreden yakın`);
    const lavaTouches = () => near(MAT.LAVA, 4);
    let lavaNear = false;
    let burnedAt = -1;
    for (let t = 0; t < 6000 && burnedAt < 0; t += 5) {
      runTicks(sim, 5);
      if (!lavaNear) lavaNear = lavaTouches();
      if (tree.some(([x, y]) => { const m = cellType(sim, x, y); return m !== MAT.WOOD && m !== MAT.PLANT; })) burnedAt = t + 5;
    }
    assert.ok(burnedAt > 0, `${w}×${h} ${seed}: 6000 tick içinde hiçbir ağaç tutuşmadı`);
    assert.ok(lavaNear, `${w}×${h} ${seed}: ağaç lav ulaşmadan tutuştu (t=${burnedAt})`);
  }
});

test('Volkan: yarık yamaca açılır, lav sağ yamaçtan aşağı akar', () => {
  const sim = load('volcano', 'readme', 320, 180);
  let riftY = -1;
  for (let y = 0; y < 180 && riftY < 0; y++) for (let x = 0; x < 320; x++) if (cellType(sim, x, y) === MAT.CLONER) riftY = y;
  let lowestRightLava = 0;
  for (let t = 0; t < 1500; t += 20) {
    runTicks(sim, 20);
    for (let y = 0; y < 180; y++) for (let x = Math.floor(320 * 0.62); x < 320; x++) if (cellType(sim, x, y) === MAT.LAVA && y > lowestRightLava) lowestRightLava = y;
  }
  // Soğuk yamaçta kabuk bağlayarak ilerleyen bir lav dili: yarığın en az 12 satır altına iner.
  assert.ok(lowestRightLava >= riftY + 12, `yarık ${riftY}, sağ yamaçtaki en alçak lav ${lowestRightLava}`);
});

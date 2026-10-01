# Basınç ve Patlama (0.11.0) Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Hedef:** Strata Sandbox'a şunları eklemek:

- patlama olay kuyruğu ve patlamanın uygulanması (dayanıklılığa göre kırılma, enkaz, ısı, ateş, duman);
- savrulan parçacık havuzu (yay çizerek uçan, duvardan sızmayan, ızgaraya geri inen hücreler);
- kapalı bölge basıncı ve ani buharlaşma (buhar patlaması);
- yeni malzemeler: Barut, Moloz, Metan, Duman, Dinamit, Fitil (ve iç durumlar Yanan metan, Yanan fitil);
- Patlat aracı, parlama ve tuval sarsıntısı;
- patlayan volkan, yeni Maden ocağı ve Gayzer sahneleri, patlatılabilir Mağara.

**Mimari:**

- **Yeni motor modülleri:**
  - `js/engine/explosions.js`: patlama olay kuyruğu, 8×8 birleştirme ızgarası, `applyExplosion`;
  - `js/engine/debris.js`: `DebrisPool`;
  - `js/engine/pressure.js`: kapalı bölge taraması, `flags` bit4, ani buharlaşma.
- **Tick sırası:**
  - 1 toz/sıvı/reaktif, 2 gaz, 3 ısı (bunlar mevcut);
  - 4 basınç;
  - 5 patlamalar;
  - 6 parçacıklar;
  - en son basılı tutma.
- **Olay erişimi:** reaksiyonlar ve ısı geçişi olayları `world.blast` ve `world.flash` üzerinden yazar. `Simulation` bu durum nesnelerini dünyaya bağlar.
- **Çizim:** render katmanı havuzu ve patlama halka tamponunu `sim.view` üzerinden yalnızca okur.

**Teknoloji:**

- Vanilla JS ES modülleri, Canvas 2D
- Node 22 `node --test`
- 0 bağımlılık
- GitHub Pages; Actions akışı `docs/**` değişikliklerini yok sayar

**Spec:** `docs/superpowers/specs/2026-10-01-basinc-patlama-design.md` (bu plan onu uygular; ikisini birlikte okuyun).

## Global Constraints

- Runtime bağımlılığı yok. Testler `npm test` ile çalışır (`node --test "tests/**/*.test.js"` + `tools/check-paths.js`).
- `js/engine/` DOM'a dokunmaz ve `Math.random` kullanmaz; `tests/engine-purity.test.js` bunu tarar.
- `heat.js`, `climate.js`, `explosions.js`, `debris.js` ve `pressure.js` içinde `Math.sin`, `Math.cos`, `Math.exp` ve `Math.pow` kullanılmaz (determinizm; `Math.sqrt` serbest).
- Aynı seed ve aynı girdi aynı dünyayı üretir. Test hash'ine (`tests/helpers.js` → `hashView`) parçacık havuzu da girer (Görev 2).
- Kullanıcı eylemleri (boyama, Patlat aracı) sim RNG'sini tüketmez; Patlat aracı `inputRng` kullanır (ADR-008).
- Hot loop'ta tahsis yok: kuyruk, ızgara, havuz ve basınç tamponları önceden ayrılır.
- Dosya adları küçük harflidir; import'larda `.js` uzantısı ve relative path kullanılır.
- Arayüz metinleri ve kod yorumları Türkçe, tanımlayıcılar İngilizce.
- "Dune Engine", "055" ve "055-falling-sand" adları hiçbir yerde kullanılmaz.
- **Performans:** 400×225 benchmark sahnesinde (`node tools/bench.js`) medyan tick süresi en fazla **0,5 ms** artar (patlama olmayan sahne). Başlangıç değeri Görev 1'in ilk adımında ölçülüp ledger'a yazılır (son kayıt: 0.10.1 yaması 1,36 ms).
- **Her görevin sonunda:**
  - `npm test` tamamen yeşil olmalı.
  - `CHANGELOG.md` → `[Unreleased]` güncellenir.
  - `docs/DEVELOPMENT.md` → Phase 14'teki ilgili madde `[x]` olur (yalnızca testler geçtiyse).
  - `main`'e commit edilir ve sormadan push edilir. Commit mesajı Türkçe, attribution satırı yok.
- **Materyal belgesi:** `docs/MATERIALS.md` tüm materyalleri ve etkileşimleri belgeler. Materyal ya da etkileşim ekleyen veya değiştiren her görev ilgili bölümü güncel sayılarla yazar ve aynı commit'e ekler. `tests/docs-materials.test.js` her materyal anahtarının belgede geçtiğini doğrular.
- **Uygulama içi Yenilikler:** `js/app/releases.js` → `UNRELEASED.items` (sürüm 0.11.0), kullanıcıya görünen her değişiklikte kısa bir Türkçe maddeyle aynı commit'te güncellenir. Görev 14'te maddeler `RELEASES`'e 0.11.0 olarak taşınır.
- Dokunma hedefleri ≥ 44 px (`pointer: coarse`). Yeni kontroller ARIA etiketli olur.
- Kimlikler: `GUNPOWDER` 23, `RUBBLE` 24, `METHANE` 25, `BURNING_METHANE` 26, `SMOKE` 27, `DYNAMITE` 28, `FUSE` 29, `BURNING_FUSE` 30.
- `flags` bitleri:
  - bit0 sıvı yönü, bit1 çoğaltıcı öğrendi, bit2 kaynak aşağı yönlü, bit3 faz yönü (mevcut);
  - **bit4 kapalı bölgede** (Görev 6), **bit5 gaz salan magma** (Görev 10).

### Spec'ten bilinçli sapmalar (plan sırasında)

| Konu | Spec | Plan | Gerekçe |
|---|---|---|---|
| Patlama hücre sırası | merkezden dışa halka sırası | sınır kutusunda satır sırası | İkisi de deterministik; satır sırası tahsis gerektirmez. Sonuç yalnız sınırlara (4000 hücre) takılınca değişir. |
| Birleştirme eşiği | — | `MERGE_MIN` = 2 | Tek barut tanesi (G = 1) patlama olayı üretmez, yalnız sıcak boşluğa döner ve parlar. Seyrek metan da bu yüzden yalnız yanar. |
| Ani buharlaşma penceresi | sayaç her tick yarıya iner | `FLASH_DECAY` 0,75 | Lava değen suyun dönüşümleri ~40 tick'e yayılır; 0,5'te eşik hiç aşılmıyordu (hesap: blok başına ~1 dönüşüm/tick → kararlı sayaç 4). |
| Volkanik gaz | magmaya değen her lav | yalnız `flags` bit5'li magma (`sim.configureMagma`) | Mağara lav cebi ve diğer sahnelerdeki magma kendiliğinden patlamasın; volkan odası açıkça işaretlenir. |
| Patlat aracı gücü | G = boyut² | G = min(400, boyut²) | Spec §4.1'deki üst sınırla aynı. Fırça en fazla 16 olduğundan pratikte G ≤ 256. |
| Fitil dayanıklılığı | 1 (tetiklenir) | 4 | Patlamada katı önce dayanıklılığa bakar: 1'de fitil hiç tutuşmadan küle dönüyordu. 4'te 1 ≤ s < 4 tutuşturur, s ≥ 4 parçalar. |
| Parçacık inişi | son boş hücre, doluysa en yakın | çarpmada kendi hücresi ve 4 komşu; yarıçap 3 yalnız ömür sonunda | Köşegen komşuya inmek ince çapraz duvarın ötesine geçiriyordu. |

## Review Focus

Normal testlerin kaçırabileceği ama kullanıcıyı en çok etkileyecek beş durum. Her biri sahibi olan görevde bir testle sabitlenir:

1. **Büyük barut yığını:** 500+ barut hücresi aynı anda tutuşunca sınırlar korunmalı (tick başına ≤ 16 patlama, ≤ 4000 hücre). Güç kaybolmamalı, sonraki tick'lere yayılmalı ve yığın tamamen tükenmeli. → Görev 3, "500 barut sınırlar içinde tükenir".
2. **Uçuşta geri alma ve çevirme:** parçacıklar havadayken geri alma havuzu da geri getirmeli. Çevirme parçacıkları aynalamalı. Kütle ve değişmezler bozulmamalı. → Görev 2, "uçuştayken geri alma ve çevirme".
3. **Kapalı odada süren yangın:** basınç patlaması tekrara binmemeli. Kırılamayan tavan (metal) sessiz kalmalı; taş oda en fazla birkaç kez patlamalı. → Görev 6, "kapalı odada yangın basınç spam'i yapmaz".
4. **Mevcut sahnelerde istenmeyen patlama:** Buzul, Mağara, Vaha ve Kum saati 3000 tick'te hiç basınç ya da buhar patlaması yapmamalı. Dökümhane'de su teknesindeki buhar patlaması kalıp duvarlarını kırmamalı. → Görev 7, "mevcut sahnelerde istenmeyen patlama yok".
5. **Kum saatinde Patlat:** kaynaklar dayanıklılığa göre kırılmalı (çoğaltıcı ve yutucu 12). Sahne ve değişmezler bozulmamalı, kırılan cam kuma dönüp akmalı. → Görev 9, "kum saatinde Patlat değişmezleri bozmaz".

## Dosya haritası

| Dosya | Sorumluluk | Görev |
|---|---|---|
| `js/engine/materials.js` | `strength`, `debris`, `explosive` alanları ve tabloları; yeni materyaller | 1, 3, 4, 5 |
| `js/engine/explosions.js` (yeni) | Patlama kuyruğu, birleştirme ızgarası, `applyExplosion`, `detonate` | 1, 3, 5 |
| `js/engine/debris.js` (yeni) | `DebrisPool`: fırlatma, DDA hareket, iniş, yerleşme | 2 |
| `js/engine/pressure.js` (yeni) | Kapalı bölge taraması, bit4, basınç patlaması, ani buharlaşma | 6, 7 |
| `js/engine/reactions.js` | Patlayıcı tutuşturma, fitil, metan, duman, volkanik gaz, `emitSteam` kancası | 3, 4, 5, 7, 10 |
| `js/engine/heat.js` | Patlayıcıların sıcaklıkla tetiklenmesi | 3 |
| `js/engine/simulation.js` | Geçiş 4–6, `blastAt`, `configureMagma`, snapshot/çevirme/temizle, istatistikler, görünüm | 1, 2, 6, 7, 10 |
| `js/render/effects.js` (yeni) | Parlama ve sarsıntı hesapları (saf fonksiyonlar) | 8 |
| `js/render/pixels.js`, `renderer.js`, `palette.js` | Parçacık çizimi, parlama, sarsıntı | 8 |
| `js/app/catalog.js`, `pointer.js`, `app.js`, `main.js`, `index.html` | Yeni girişler, Patlat aracı, debug paneli, yardım | 1, 3, 4, 5, 9 |
| `js/scenes/volcano.js`, `quarry.js` (yeni), `geyser.js` (yeni), `cave.js`, `index.js` | Sahneler | 10–13 |
| `tests/*.test.js` | Her görevin testleri | hepsi |
| `docs/MATERIALS.md`, `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, `README.md`, `CHANGELOG.md`, `docs/DEVELOPMENT.md`, `js/app/releases.js` | Dokümanlar ve sürüm notları | hepsi, 14 |

---

### Task 1 (Görev 1): Patlama çekirdeği, dayanıklılık ve Moloz

**Files:**
- Modify: `js/engine/materials.js` (yeni alanlar, tablolar, `RUBBLE`, mevcut statiklere `strength`/`debris`)
- Create: `js/engine/explosions.js`
- Modify: `js/engine/simulation.js` (geçiş 5, `blastAt`, snapshot, çevirme, temizle, istatistik, `view.blasts`)
- Modify: `js/app/catalog.js` (Moloz girişi, `o`)
- Test: `tests/explosions.test.js` (yeni), `tests/materials.test.js`
- Docs: `docs/MATERIALS.md`, `docs/DECISIONS.md` (ADR-017), `docs/DEVELOPMENT.md` (Phase 14), `CHANGELOG.md`, `js/app/releases.js`

**Interfaces:**
- Consumes: `MATERIALS` tabloları (`KIND`, `FLAMMABILITY`, `BURNS_INTO`, `LIFE_MIN`, `LIFE_SPAN`, `SPAWN_TEMP`), `TEMP_MAX` (`climate.js`), `World` (`set`, `transform`, `index`, `stride`, `temp`).
- Produces:
  - `MAT.RUBBLE = 24`; `MATERIALS.STRENGTH` (Float32Array, `Infinity` = kırılmaz), `MATERIALS.DEBRIS_OF` (Uint8Array), `MATERIALS.EXPLOSIVE_POWER` (Float32Array), `MATERIALS.EXPLODE_AT` (Float32Array, varsayılan `Infinity`), `MATERIALS.EXPLOSIVE_IGNITE` (Uint8Array, 0..255).
  - `explosions.js`: `BLAST` (sabitler), `BLAST_KIND = { TOOL: 1, EXPLOSIVE: 2, PRESSURE: 3, STEAM: 4 }`, `radiusOf(G) → number`, `intensityAt(G, d) → number`, `createBlastState(width, height) → state`, `resetBlastState(state)`, `copyBlastState(dst, src)`, `flipBlastState(state)`, `addBlastPower(state, x, y, G)`, `requestExplosion(state, x, y, G, kind) → boolean`, `applyExplosion(world, rng, state, pool, cx, cy, G, kind)`, `stepExplosions(world, rng, state, pool)`.
  - `pool` parametresi `null` ya da `launch(world, i, type, vx, vy) → boolean` metodu olan bir nesnedir (Görev 2'de `DebrisPool`). `null` iken savrulacak hücre yerinde kalır, kırılan katı yerinde enkazına döner.
  - `Simulation`: `blastAt(x, y, size) → boolean`; `_blast` durumu; `world.blast` (= `_blast`); `getStats().blastsThisTick`, `getStats().blastTotals` (Uint32 kopyası: indeks = `BLAST_KIND`); `view.blasts` = `{ x, y, power, serial, get latest() }`.

- [ ] **Step 1: Başlangıç benchmark'ını ölç ve kaydet**

Run: `node tools/bench.js`
Expected: tablo basılır. 400×225 satırının medyanını ledger'a `Baseline: 400×225 medyan <değer> ms` olarak yaz (Görev 14 bununla karşılaştırır).

- [ ] **Step 2: Materyal tablosu için başarısız testleri yaz**

`tests/materials.test.js` sonuna ekle:

```js
test('dayanıklılık ve enkaz tabloları: statiklerin hepsinde açık değer; kenar ve magma kırılmaz', () => {
  const { STRENGTH, DEBRIS_OF, KIND: KIND_OF } = MATERIALS;
  assert.equal(STRENGTH[MAT.WALL], Infinity);
  assert.equal(STRENGTH[MAT.MAGMA], Infinity);
  assert.equal(STRENGTH[MAT.STONE], 8);
  assert.equal(STRENGTH[MAT.GLASS], 2);
  assert.equal(STRENGTH[MAT.ICE], 2);
  assert.equal(STRENGTH[MAT.WOOD], 4);
  assert.equal(STRENGTH[MAT.PLANT], 1);
  assert.equal(STRENGTH[MAT.METAL], 20);
  assert.equal(STRENGTH[MAT.CLONER], 12);
  assert.equal(STRENGTH[MAT.SINK], 12);
  assert.equal(DEBRIS_OF[MAT.STONE], MAT.RUBBLE);
  assert.equal(DEBRIS_OF[MAT.GLASS], MAT.SAND);
  assert.equal(DEBRIS_OF[MAT.ICE], MAT.SNOW);
  assert.equal(DEBRIS_OF[MAT.WOOD], MAT.ASH);
  assert.equal(DEBRIS_OF[MAT.METAL], MAT.METAL);
  assert.equal(DEBRIS_OF[MAT.SAND], MAT.SAND, 'varsayılan: kendisi');
  for (const def of MATERIALS.list) {
    if (def.kind === KIND.STATIC) assert.ok(def.strength !== undefined, `${def.key}: statik materyalin dayanıklılığı açıkça verilmeli`);
    else assert.equal(STRENGTH[def.id], 0, `${def.key}: hareketli materyal kırılmaz, savrulur`);
  }
  assert.equal(KIND_OF[MAT.RUBBLE], KIND.POWDER);
});

test('Moloz: kumdan ağır toz, lavın üstünde yüzer, taş gibi ısınır ve 1500 °C\'de lava döner', () => {
  const r = MATERIALS.byKey.RUBBLE;
  assert.equal(r.id, MAT.RUBBLE);
  assert.ok(r.density > MATERIALS.byKey.SAND.density && r.density < MATERIALS.byKey.LAVA.density);
  assert.equal(MATERIALS.UP_AT[MAT.RUBBLE], 1500);
  assert.equal(MATERIALS.UP_INTO[MAT.RUBBLE], MAT.LAVA);
  assert.equal(MATERIALS.CONDUCT[MAT.RUBBLE], MATERIALS.CONDUCT[MAT.STONE]);
});

test('derleyici: dayanıklılığı olmayan statik ve tanımsız enkaz hedefi reddedilir', () => {
  const base = MATERIAL_DEFS.filter((d) => d.id <= 1);
  assert.throws(() => compileMaterials([...base, { id: 40, key: 'X', name: 'X', kind: KIND.STATIC, density: 255, color: '#000' }]), /dayanıklılık/);
  assert.throws(() => compileMaterials([...base, { id: 40, key: 'X', name: 'X', kind: KIND.STATIC, density: 255, color: '#000', strength: 1, debris: 99 }]), /enkaz/);
  assert.throws(() => compileMaterials([...base, { id: 40, key: 'X', name: 'X', kind: KIND.POWDER, density: 9, color: '#000', explosive: { power: -1, at: 100 } }]), /patlayıcı/);
});
```

`tests/materials.test.js` başındaki import satırına `MATERIAL_DEFS`, `compileMaterials` ve `KIND` yoksa ekle:

```js
import { MAT, KIND, MATERIALS, MATERIAL_DEFS, compileMaterials } from '../js/engine/materials.js';
```

- [ ] **Step 3: Testlerin başarısız olduğunu gör**

Run: `node --test tests/materials.test.js`
Expected: FAIL. `STRENGTH` tanımsız (`Cannot read properties of undefined`) ve `RUBBLE` yok.

- [ ] **Step 4: `materials.js`'i genişlet**

`MAT` nesnesine `MAGMA: 20,` satırından sonra ekle:

```js
  // Basınç ve patlama (0.11.0)
  RUBBLE: 24, // kırılan taş
```

Alan açıklamalarına (`// Faz ve sıcaklık kuralları` bloğundan sonra) ekle:

```js
// Patlama alanları (ADR-017; explosions.js uygular):
//   strength:  patlamaya dayanıklılık (statiklerde zorunlu; Infinity = kırılmaz). Patlama şiddeti
//              s ≥ strength olan katı enkazına döner ve savrulur. Hareketli materyaller 0'dır (savrulur).
//   debris:    kırılınca dönüştüğü materyal (varsayılan kendisi)
//   explosive: { power, at, ignite } — tetiklenince birleştirme ızgarasına yazılan güç, sıcaklıkla
//              tetiklenme eşiği °C ve ateş/lav temasında tetiklenme olasılığı (0..1)
```

Mevcut tanımlara alanları ekle (yalnız gösterilen alanlar değişir; diğerleri aynen kalır):

```js
  { id: MAT.WALL, /* … */ internal: true, conduct: 0.01, capacity: 1, strength: Infinity },
  { id: MAT.STONE, /* … */ strength: 8, debris: MAT.RUBBLE, phase: { up: { at: 1500, into: MAT.LAVA, latent: 800 } } },
  { id: MAT.WOOD, /* … */ ignitesAt: 300, strength: 4, debris: MAT.ASH },
  { id: MAT.GLASS, /* … */ conduct: 0.05, capacity: 3, strength: 2, debris: MAT.SAND },
  // PLANT: … ignitesAt: 250, strength: 1, debris: MAT.ASH
  // BURNING_WOOD: … strength: 4, debris: MAT.ASH
  // BURNING_PLANT: … strength: 1, debris: MAT.ASH
  // CLONER, SINK: … strength: 12, debris: MAT.RUBBLE
  // ICE: … strength: 2, debris: MAT.SNOW
  // METAL: … strength: 20
  // MAGMA: … strength: Infinity
```

`MAGMA` tanımından sonra `RUBBLE` tanımını ekle:

```js
  {
    id: MAT.RUBBLE, key: 'RUBBLE', name: 'Rubble', kind: KIND.POWDER, density: 26, color: '#5a5550',
    conduct: 0.06, capacity: 4, phase: { up: { at: 1500, into: MAT.LAVA, latent: 800 } },
  },
```

`compileMaterials` içinde tablo bildirimlerine ekle:

```js
  const STRENGTH = new Float32Array(256);
  const DEBRIS_OF = new Uint8Array(256);
  const EXPLOSIVE_POWER = new Float32Array(256);
  const EXPLODE_AT = new Float32Array(256).fill(Infinity);
  const EXPLOSIVE_IGNITE = new Uint8Array(256);
  const debrisTargets = []; // [anahtar, hedef] — tüm tanımlardan sonra doğrulanır
```

Döngüde (`if (def.kind === KIND.GAS) gasIds.push(def.id);` satırından önce):

```js
    if (def.kind === KIND.STATIC) {
      if (!(def.strength >= 0)) throw new RangeError(`Statik materyalin dayanıklılık değeri (strength ≥ 0) olmalı (${def.key})`);
      STRENGTH[def.id] = def.strength;
    } else if (def.strength !== undefined && def.strength !== 0) {
      throw new RangeError(`Yalnız statik materyalin dayanıklılık değeri olur (${def.key})`);
    }
    DEBRIS_OF[def.id] = def.debris ?? def.id;
    if (def.debris !== undefined) debrisTargets.push([def.key, def.debris]);
    if (def.explosive) {
      const { power, at = Infinity, ignite = 1 } = def.explosive;
      if (!(power > 0) || !(at > -Infinity) || !(ignite >= 0 && ignite <= 1)) throw new RangeError(`Geçersiz patlayıcı tanımı (${def.key})`);
      EXPLOSIVE_POWER[def.id] = power;
      EXPLODE_AT[def.id] = at;
      EXPLOSIVE_IGNITE[def.id] = toByte(ignite);
    }
```

`phaseTargets` doğrulamasından sonra:

```js
  for (const [key, into] of debrisTargets) {
    if (!byId[into]) throw new Error(`Enkaz hedef materyali tanımsız: ${into} (${key})`);
  }
```

Dönen nesneye `STRENGTH, DEBRIS_OF, EXPLOSIVE_POWER, EXPLODE_AT, EXPLOSIVE_IGNITE,` ekle.

- [ ] **Step 5: Materyal testlerinin geçtiğini gör**

Run: `node --test tests/materials.test.js`
Expected: PASS.

- [ ] **Step 6: Patlama çekirdeği için başarısız testleri yaz**

`tests/explosions.test.js` oluştur:

```js
// Patlama çekirdeği (ADR-017): yarıçap ve şiddet, dayanıklılık, enkaz, ısı, tutuşma, ateş, kuyruk ve sınırlar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { BLAST, BLAST_KIND, radiusOf, intensityAt, requestExplosion, addBlastPower } from '../js/engine/explosions.js';
import { countMaterial, cellType, hashView, runTicks } from './helpers.js';

const T = (sim, x, y) => sim.getCell(x, y).temp;

test('yarıçap ve şiddet: r = min(20, 1 + 1,5·√G), s = 2·√G·(1 − d/r)', () => {
  assert.equal(radiusOf(1), 2.5);
  assert.equal(radiusOf(36), 10);
  assert.equal(radiusOf(10000), BLAST.R_MAX);
  assert.equal(intensityAt(36, 0), 12);
  assert.equal(intensityAt(36, 5), 6);
  assert.equal(intensityAt(36, 10), 0);
});

test('dayanıklılık: aynı patlamada yakın taş kırılır, uzak taş kalır; cam uzakta da kırılır; metal ve kenar dayanır', () => {
  const sim = new Simulation({ width: 41, height: 21 });
  // Patlama (20, 10), boyut 6 → G 36: r 10, merkezde s 12.
  sim.setCell(23, 10, MAT.STONE); // d 3 → s 8,4 ≥ 8: kırılır
  sim.setCell(25, 10, MAT.STONE); // d 5 → s 6: kalır
  sim.setCell(12, 10, MAT.GLASS); // d 8 → s 2,4 ≥ 2: kırılır
  sim.setCell(21, 10, MAT.METAL); // d 1 → s 10,8 < 20: kalır
  assert.equal(sim.blastAt(20, 10, 6), true);
  assert.equal(cellType(sim, 23, 10), MAT.RUBBLE, 'taş → moloz (havuz yokken yerinde)');
  assert.equal(cellType(sim, 25, 10), MAT.STONE);
  assert.equal(cellType(sim, 12, 10), MAT.SAND, 'cam → kum');
  assert.equal(cellType(sim, 21, 10), MAT.METAL);
  assert.deepEqual(sim.world.checkInvariants(), []);
});

test('enkaz eşlemesi: buz → kar, odun → kül; magma kırılmaz', () => {
  const sim = new Simulation({ width: 21, height: 11 });
  sim.setCell(10, 4, MAT.ICE);
  sim.setCell(11, 5, MAT.WOOD);
  sim.world.set(sim.world.index(9, 5), MAT.MAGMA, 0, 0, 0, 1200);
  sim.blastAt(10, 5, 6);
  assert.equal(cellType(sim, 10, 4), MAT.SNOW);
  assert.equal(cellType(sim, 11, 5), MAT.ASH);
  assert.equal(cellType(sim, 9, 5), MAT.MAGMA);
});

test('ısı: merkez +600 °C, yarıçapın yarısında +300 °C; uzaktaki yanıcı tutuşur', () => {
  const sim = new Simulation({ width: 41, height: 21 });
  sim.setCell(20, 10, MAT.STONE);
  sim.setCell(28, 10, MAT.WOOD); // d 8 → s 2,4: kırılmaz (4) ama tutuşur (≥ 1)
  const t0 = T(sim, 20, 10);
  sim.blastAt(20, 10, 6);
  assert.ok(Math.abs(T(sim, 20, 10) - (t0 + 600)) < 1e-3 || cellType(sim, 20, 10) === MAT.RUBBLE);
  assert.equal(cellType(sim, 28, 10), MAT.BURNING_WOOD);
  assert.ok(T(sim, 25, 10) > 290, 'd 5: +300 °C civarı');
});

test('merkezdeki boş hücrelerin bir kısmı ateş olur; araç patlaması duraklatılmışken de hemen uygulanır', () => {
  const sim = new Simulation({ width: 41, height: 21 });
  sim.pause();
  assert.equal(countMaterial(sim, MAT.FIRE), 0);
  sim.blastAt(20, 10, 6);
  assert.ok(countMaterial(sim, MAT.FIRE) > 10, `ateş ${countMaterial(sim, MAT.FIRE)}`);
  assert.equal(sim.getStats().blastTotals[BLAST_KIND.TOOL], 1);
});

test('araç patlaması bir stroke: geri alınır', () => {
  const sim = new Simulation({ width: 41, height: 21 });
  for (let x = 15; x <= 25; x++) sim.setCell(x, 12, MAT.STONE);
  const before = hashView(sim);
  sim.beginStroke();
  sim.blastAt(20, 10, 6);
  sim.endStroke();
  assert.notEqual(hashView(sim), before);
  assert.equal(sim.undo(), true);
  assert.equal(hashView(sim), before);
});

test('kuyruk sınırı: tick başına en fazla 16 patlama; kalanlar sonraki tick\'lere kalır, hiçbiri kaybolmaz', () => {
  const sim = new Simulation({ width: 120, height: 60 });
  for (let k = 0; k < 40; k++) requestExplosion(sim._blast, 2 + (k % 20) * 6, 5 + Math.floor(k / 20) * 30, 4, BLAST_KIND.TOOL);
  sim.step();
  assert.equal(sim.getStats().blastsThisTick, BLAST.MAX_PER_TICK);
  runTicks(sim, 3);
  assert.equal(sim.getStats().blastTotals[BLAST_KIND.TOOL], 40);
});

test('birleştirme: aynı 8×8 blokta biriken güç tek patlama olur; MERGE_MIN altı patlama üretmez', () => {
  const sim = new Simulation({ width: 40, height: 40 });
  for (let k = 0; k < 10; k++) addBlastPower(sim._blast, 9 + (k % 3), 9 + Math.floor(k / 3) % 3, 0.5);
  addBlastPower(sim._blast, 30, 30, 1); // tek başına 1 < MERGE_MIN
  sim.step();
  assert.equal(sim.getStats().blastTotals[BLAST_KIND.EXPLOSIVE], 1);
  assert.equal(sim.view.blasts.power[(sim.view.blasts.latest - 1) % BLAST.RING], 5);
});

test('çevirme bekleyen patlamayı aynalar; temizle ve sahne yükleme kuyruğu boşaltır', () => {
  const sim = new Simulation({ width: 30, height: 30 });
  requestExplosion(sim._blast, 10, 3, 4, BLAST_KIND.TOOL);
  sim.flipVertical();
  sim.step();
  const h = (sim.view.blasts.latest - 1) % BLAST.RING;
  assert.equal(sim.view.blasts.y[h], 26);
  requestExplosion(sim._blast, 10, 3, 4, BLAST_KIND.TOOL);
  sim.clear();
  sim.step();
  assert.equal(sim.getStats().blastTotals[BLAST_KIND.TOOL], 1);
});

test('kenar hücreleri patlamada değişmez; sonlu olmayan güç reddedilir', () => {
  const sim = new Simulation({ width: 12, height: 12, debug: true });
  sim.blastAt(0, 0, 16);
  sim.step();
  assert.deepEqual(sim.world.checkInvariants(), []);
  assert.equal(requestExplosion(sim._blast, 5, 5, NaN, BLAST_KIND.TOOL), false);
  assert.equal(requestExplosion(sim._blast, 5, 5, Infinity, BLAST_KIND.TOOL), false);
  assert.equal(requestExplosion(sim._blast, -1, 5, 4, BLAST_KIND.TOOL), false);
  assert.equal(sim.blastAt(99, 5, 4), false);
});

test('patlamalar deterministiktir', () => {
  const run = () => {
    const sim = new Simulation({ width: 60, height: 40, seed: 'det-blast' });
    for (let x = 10; x < 50; x++) for (let y = 25; y < 35; y++) sim.setCell(x, y, x % 3 ? MAT.STONE : MAT.SAND);
    requestExplosion(sim._blast, 30, 25, 50, BLAST_KIND.TOOL);
    runTicks(sim, 60);
    return hashView(sim);
  };
  assert.equal(run(), run());
});
```

- [ ] **Step 7: Testlerin başarısız olduğunu gör**

Run: `node --test tests/explosions.test.js`
Expected: FAIL. `Cannot find module '../js/engine/explosions.js'`.

- [ ] **Step 8: `explosions.js`'i yaz**

```js
// Patlamalar (ADR-017): olay kuyruğu, 8×8 birleştirme ızgarası ve patlamanın uygulanması (tick geçiş 5).
// - requestExplosion: kuyruğa bir patlama ekler (araç, basınç, buhar). Kuyruk doluysa güç birleştirme
//   ızgarasına düşer, kaybolmaz.
// - addBlastPower: patlayıcıların gücü hücrenin 8×8 bloğunda toplanır; geçiş 5'in başında blok başına tek
//   olaya dönüşür (MERGE_MIN altı söner). Patlama sırasında tetiklenen patlayıcılar ızgaraya yazılır ve bir
//   sonraki tick patlar: zincir tick tick ilerler.
// - applyExplosion: yarıçap r = min(R_MAX, 1 + 1,5·√G), şiddet s = 2·√G·(1 − d/r). Katı s ≥ dayanıklılıksa
//   enkazına döner ve savrulur; toz ve sıvı savrulur; yanıcı tutuşur; her hücre ısınır; merkezde ateş çıkar.
// Yalnız aritmetik (Math.sqrt) ve verilen RNG; durum önceden ayrılır, hot loop'ta tahsis yok.
import { MAT, KIND, MATERIALS } from './materials.js';
import { TEMP_MAX } from './climate.js';

const { KIND: KIND_OF, STRENGTH, DEBRIS_OF, FLAMMABILITY, BURNS_INTO, LIFE_MIN, LIFE_SPAN, SPAWN_TEMP } = MATERIALS;
const EMPTY = MAT.EMPTY;
const FIRE = MAT.FIRE;
const U32 = 4294967296;

export const BLAST = Object.freeze({
  R_MAX: 20, // yarıçap üst sınırı
  HEAT_MAX: 600, // merkezdeki ısınma (°C), kenara doğru doğrusal azalır
  MAX_PER_TICK: 16, // tick başına işlenen patlama
  MAX_CELLS_PER_TICK: 4000, // tick başına patlamalarda etkilenen hücre
  QUEUE_CAPACITY: 64,
  MERGE_BLOCK: 8, // birleştirme ızgarası blok kenarı (hücre)
  MERGE_MIN: 2, // bir bloğun patlama olayına dönüşmesi için en az güç
  CHAIN_MIN: 0.5, // patlayıcıyı tetikleyen en az şiddet (Görev 3)
  FIRE_CHANCE: 0.5, // d < r/2 boş hücrenin ateşe dönme olasılığı
  LAUNCH_K: 0.75, // savrulma hızı = LAUNCH_K · s (havuz V_MAX ile kırpar)
  UP_BIAS: 0.35, // savrulma yönüne eklenen yukarı eğilim
  RING: 8, // view.blasts halka tamponu (parlama ve sarsıntı)
});

export const BLAST_KIND = Object.freeze({ TOOL: 1, EXPLOSIVE: 2, PRESSURE: 3, STEAM: 4 });

export const radiusOf = (G) => Math.min(BLAST.R_MAX, 1 + 1.5 * Math.sqrt(G));

export function intensityAt(G, d) {
  const r = radiusOf(G);
  return d >= r ? 0 : 2 * Math.sqrt(G) * (1 - d / r);
}

export function createBlastState(width, height) {
  const B = BLAST.MERGE_BLOCK;
  const bw = Math.ceil(width / B);
  const bh = Math.ceil(height / B);
  const n = bw * bh;
  const q = BLAST.QUEUE_CAPACITY;
  const ring = BLAST.RING;
  return {
    width,
    height,
    bw,
    bh,
    power: new Float32Array(n),
    sx: new Float32Array(n),
    sy: new Float32Array(n),
    active: new Int32Array(n),
    isActive: new Uint8Array(n),
    activeCount: 0,
    qx: new Float32Array(q),
    qy: new Float32Array(q),
    qp: new Float32Array(q),
    qk: new Uint8Array(q),
    qCount: 0,
    blastsThisTick: 0,
    cellsThisTick: 0,
    totals: new Uint32Array(8), // BLAST_KIND başına toplam (istatistik ve testler)
    ringX: new Float32Array(ring),
    ringY: new Float32Array(ring),
    ringP: new Float32Array(ring),
    ringSerial: new Uint32Array(ring),
    serial: 0, // kaydedilen patlama sayısı; renderer yeni patlamaları bununla tanır
  };
}

export function resetBlastState(s) {
  s.power.fill(0);
  s.sx.fill(0);
  s.sy.fill(0);
  s.isActive.fill(0);
  s.activeCount = 0;
  s.qCount = 0;
  s.blastsThisTick = 0;
  s.cellsThisTick = 0;
}

// Undo snapshot'ı için. Halka tamponu görseldir, kopyalanmaz (geri alma parlamayı yeniden oynatmaz).
export function copyBlastState(dst, src) {
  for (const k of ['power', 'sx', 'sy', 'active', 'isActive', 'qx', 'qy', 'qp', 'qk', 'totals']) dst[k].set(src[k]);
  dst.activeCount = src.activeCount;
  dst.qCount = src.qCount;
}

function pushEvent(s, x, y, G, kind) {
  const k = s.qCount++;
  s.qx[k] = x;
  s.qy[k] = y;
  s.qp[k] = G;
  s.qk[k] = kind;
}

function clearBlock(s, b) {
  s.power[b] = 0;
  s.sx[b] = 0;
  s.sy[b] = 0;
  s.isActive[b] = 0;
}

// Dünya çevrilince: eşiği geçen bekleyen bloklar kuyruğa alınır, kuyruktaki her olayın y'si aynalanır.
export function flipBlastState(s) {
  for (let k = 0; k < s.activeCount; k++) {
    const b = s.active[k];
    const p = s.power[b];
    if (p >= BLAST.MERGE_MIN && s.qCount < BLAST.QUEUE_CAPACITY) pushEvent(s, s.sx[b] / p, s.sy[b] / p, p, BLAST_KIND.EXPLOSIVE);
    clearBlock(s, b);
  }
  s.activeCount = 0;
  for (let k = 0; k < s.qCount; k++) s.qy[k] = s.height - 1 - s.qy[k];
}

export function addBlastPower(s, x, y, G) {
  const B = BLAST.MERGE_BLOCK;
  const b = Math.floor(y / B) * s.bw + Math.floor(x / B);
  if (s.isActive[b] === 0) {
    s.isActive[b] = 1;
    s.active[s.activeCount++] = b;
  }
  s.power[b] += G;
  s.sx[b] += G * x;
  s.sy[b] += G * y;
}

// Kuyruğa patlama ekler; geçersiz istek reddedilir. Kuyruk doluysa güç birleştirme ızgarasına düşer.
export function requestExplosion(s, x, y, G, kind) {
  if (!(G > 0) || !Number.isFinite(G) || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (x < 0 || y < 0 || x >= s.width || y >= s.height) return false;
  if (s.qCount < BLAST.QUEUE_CAPACITY) pushEvent(s, x, y, G, kind);
  else addBlastPower(s, x, y, G);
  return true;
}

// Birleştirme ızgarası → kuyruk. Kuyruk doluysa blok bekler (sonraki tick).
function flushMerge(s) {
  let keep = 0;
  for (let k = 0; k < s.activeCount; k++) {
    const b = s.active[k];
    const p = s.power[b];
    if (p >= BLAST.MERGE_MIN) {
      if (s.qCount >= BLAST.QUEUE_CAPACITY) {
        s.active[keep++] = b;
        continue;
      }
      pushEvent(s, s.sx[b] / p, s.sy[b] / p, p, BLAST_KIND.EXPLOSIVE);
    }
    clearBlock(s, b);
  }
  s.activeCount = keep;
}

const chance = (rng, p) => rng.nextU32() < p * U32;

function lifeOf(rng, t) {
  const span = LIFE_SPAN[t];
  return LIFE_MIN[t] + (span === 0 ? 0 : rng.nextU32() % (span + 1));
}

// Savurma yönü: merkezden dışa + yukarı eğilim, büyüklük LAUNCH_K · s. Havuz yoksa false.
function launch(world, pool, i, type, dx, dy, d, s) {
  if (pool === null) return false;
  let ux = 0;
  let uy = -1;
  if (d > 0) {
    ux = dx / d;
    uy = dy / d;
  }
  uy -= BLAST.UP_BIAS;
  const n = Math.sqrt(ux * ux + uy * uy) || 1;
  const v = BLAST.LAUNCH_K * s;
  return pool.launch(world, i, type, (ux / n) * v, (uy / n) * v);
}

// Patlamayı hemen uygular (geçiş 5 ve Patlat aracı). pool: null ya da { launch(world, i, type, vx, vy) }.
export function applyExplosion(world, rng, s, pool, cx, cy, G, kind) {
  const r = radiusOf(G);
  const s0 = 2 * Math.sqrt(G);
  const R = Math.ceil(r);
  const ix = Math.round(cx);
  const iy = Math.round(cy);
  const x0 = Math.max(0, ix - R);
  const x1 = Math.min(world.width - 1, ix + R);
  const y0 = Math.max(0, iy - R);
  const y1 = Math.min(world.height - 1, iy + R);
  const { type, temp, stride } = world;
  const r2 = r * r;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r2) continue;
      const i = (y + 1) * stride + x + 1;
      const t = type[i];
      if (STRENGTH[t] === Infinity) continue; // kenar ve magma
      const d = Math.sqrt(d2);
      const f = 1 - d / r;
      const sv = s0 * f;
      s.cellsThisTick++;
      const heated = temp[i] + BLAST.HEAT_MAX * f;
      temp[i] = heated > TEMP_MAX ? TEMP_MAX : heated;
      const k = KIND_OF[t];
      if (k === KIND.NONE) {
        if (d < r * 0.5 && chance(rng, BLAST.FIRE_CHANCE)) {
          world.set(i, FIRE, rng.nextU32() & 255, lifeOf(rng, FIRE), 0, Math.max(temp[i], SPAWN_TEMP[FIRE]));
        }
        continue;
      }
      if (k === KIND.GAS) continue;
      if (k === KIND.STATIC) {
        if (sv >= STRENGTH[t]) {
          const into = DEBRIS_OF[t];
          if (!launch(world, pool, i, into, dx, dy, d, sv)) world.transform(i, into, 0);
        } else if (FLAMMABILITY[t] !== 0 && sv >= 1) {
          world.transform(i, BURNS_INTO[t], lifeOf(rng, BURNS_INTO[t]));
        }
        continue;
      }
      // Toz ve sıvı: yanıcıysa önce tutuşur, sonra savrulur (havuz doluysa yerinde kalır).
      if (FLAMMABILITY[t] !== 0 && sv >= 1) world.transform(i, BURNS_INTO[t], lifeOf(rng, BURNS_INTO[t]));
      launch(world, pool, i, type[i], dx, dy, d, sv);
    }
  }
  s.blastsThisTick++;
  s.totals[kind]++;
  const h = s.serial % BLAST.RING;
  s.ringX[h] = cx;
  s.ringY[h] = cy;
  s.ringP[h] = G;
  s.serial++;
  s.ringSerial[h] = s.serial;
}

// Geçiş 5: birleştirme ızgarası kuyruğa, sonra sınırlar içinde kuyruk işlenir; kalan sonraki tick'e kalır.
export function stepExplosions(world, rng, s, pool) {
  flushMerge(s);
  s.blastsThisTick = 0;
  s.cellsThisTick = 0;
  let k = 0;
  for (; k < s.qCount; k++) {
    if (s.blastsThisTick >= BLAST.MAX_PER_TICK) break;
    // Hücre sınırı: tahmini disk alanı sığmıyorsa sonraki tick'e kalır (tick'in ilk patlaması her zaman işlenir).
    const r = radiusOf(s.qp[k]);
    if (s.blastsThisTick > 0 && s.cellsThisTick + Math.ceil(3.2 * r * r) > BLAST.MAX_CELLS_PER_TICK) break;
    applyExplosion(world, rng, s, pool, s.qx[k], s.qy[k], s.qp[k], s.qk[k]);
  }
  let n = 0;
  for (; k < s.qCount; k++, n++) {
    s.qx[n] = s.qx[k];
    s.qy[n] = s.qy[k];
    s.qp[n] = s.qp[k];
    s.qk[n] = s.qk[k];
  }
  s.qCount = n;
}
```

- [ ] **Step 9: `simulation.js`'e bağla**

İmportlara ekle:

```js
import { createBlastState, resetBlastState, copyBlastState, flipBlastState, stepExplosions, applyExplosion, BLAST_KIND } from './explosions.js';
import { clampBrushSize } from './brush.js';
```

(`brush.js` importu zaten varsa `clampBrushSize`'ı mevcut satıra ekle.) Dosya başına sabit:

```js
// Patlat aracı: G = min(BLAST_TOOL_MAX, boyut²).
export const BLAST_TOOL_MAX = 400;
```

Constructor'da `this._heat = …` satırından sonra:

```js
    this._blast = createBlastState(width, height); // geçiş 5 (patlamalar)
    this._debris = null; // savrulan parçacık havuzu (Görev 2)
    this.world.blast = this._blast; // reaksiyonlar ve ısı geçişi patlayıcıları buraya yazar
```

`this.view` nesnesine (`counts` satırından sonra):

```js
      blasts: Object.freeze({
        x: this._blast.ringX,
        y: this._blast.ringY,
        power: this._blast.ringP,
        serial: this._blast.ringSerial,
        get latest() {
          return sim._blast.serial;
        },
      }),
```

`_tickOnce`'ta `stepHeat(w, rng, this._heat);` satırından sonra:

```js
    // Geçiş 5 — patlamalar (explosions.js): birleştirme ızgarası ve kuyruk.
    stepExplosions(w, rng, this._blast, this._debris);
```

`clear()` ve `loadScene()` içinde `this.world.clear();` satırından sonra `resetBlastState(this._blast);` ekle. `flipVertical()` içinde `this.world.flipVertical();` satırından sonra `flipBlastState(this._blast);` ekle.

Yeni metot (`configureSource` metodundan sonra):

```js
  // Patlat aracı: tıklanan hücrede G = min(BLAST_TOOL_MAX, boyut²) patlama. Duraklatılmışken de hemen
  // uygulanır; inputRng kullanır (fizik dizisini değiştirmez). Stroke içindeyse geri alınabilir.
  blastAt(x, y, size) {
    const w = this.world;
    if (!w.inBounds(x, y)) return false;
    const s = clampBrushSize(size);
    applyExplosion(w, this.inputRng, this._blast, this._debris, x, y, Math.min(BLAST_TOOL_MAX, s * s), BLAST_KIND.TOOL);
    this._strokeDirty = true;
    this.version++;
    return true;
  }
```

`_spareSnapshot()` içinde snapshot nesnesine `blast: createBlastState(this.world.width, this.world.height),` ekle. `_capture()` sonuna `copyBlastState(snap.blast, this._blast);` ekle. `undo()` içinde `w.counts.set(snap.counts);` satırından sonra `copyBlastState(this._blast, snap.blast);` ekle.

`getStats()` dönüşüne ekle:

```js
      blastsThisTick: this._blast.blastsThisTick,
      blastTotals: Uint32Array.from(this._blast.totals),
```

- [ ] **Step 10: Moloz seçici girişi**

`js/app/catalog.js` `PICKER` dizisine, `SNOW` girişinden sonra:

```js
  { key: 'RUBBLE', mat: MAT.RUBBLE, label: 'Moloz', shortcut: 'o', category: 'powder' },
```

`index.html` kısayol yardımına (`B K M E` satırından sonra) ekle:

```html
        <tr><th scope="row"><kbd>O</kbd></th><td>Moloz</td></tr>
```

- [ ] **Step 11: Testlerin geçtiğini gör**

Run: `node --test tests/explosions.test.js tests/materials.test.js tests/app-modules.test.js`
Expected: PASS. `app-modules` seçici sayısını sabitliyorsa yeni girişi testte güncelle.

- [ ] **Step 12: Tüm testler**

Run: `npm test`
Expected: `# fail 0`. `tests/docs-materials.test.js` RUBBLE için başarısız olursa Step 13'te belgeyi ekle ve yeniden çalıştır.

- [ ] **Step 13: Dokümanlar**

- `docs/MATERIALS.md`:
  - yeni "§5 Basınç ve patlama (0.11.0)" bölümü açılır; mevcut "Materyal ekleme kontrol listesi" §6 olur;
  - §5.1 Patlama: formüller, kurallar, sınırlar;
  - §5.2 Dayanıklılık ve enkaz: spec §3.3 tablosu;
  - §5.3 Moloz;
  - Moloz §2'deki materyal tablosuna eklenir.
- `docs/DECISIONS.md` → **ADR-017 — Patlamalar: olay kuyruğu, birleştirme ızgarası, dayanıklılık**. Bağlam, karar (spec §2.3–2.4), alternatifler (tam hız alanı, anlık itme) ve sonuç yazılır. Savrulan parçacık kısmı Görev 2'de eklenir.
- `docs/DEVELOPMENT.md` → "Phase 14 — Basınç ve patlama (0.11.0)" başlığı ve 14 madde (bu planın görevleri), bu görevin maddesi `[x]`.
- `CHANGELOG.md` → `[Unreleased]` → `### Added`: patlama çekirdeği, dayanıklılık, Moloz.
- `js/app/releases.js` → `UNRELEASED.items`: `'Moloz (O): patlamada kırılan taşın tozu; kumdan ağır, lavın üstünde yüzer.'`

- [ ] **Step 14: Commit ve push**

```bash
git add js/engine/materials.js js/engine/explosions.js js/engine/simulation.js js/app/catalog.js index.html tests/explosions.test.js tests/materials.test.js tests/app-modules.test.js docs/MATERIALS.md docs/DECISIONS.md docs/DEVELOPMENT.md CHANGELOG.md js/app/releases.js
git commit -m "Patlama çekirdeği: kuyruk, birleştirme ızgarası, dayanıklılığa göre kırılma ve Moloz"
git push origin main
```

---

### Task 2 (Görev 2): Savrulan parçacık havuzu

**Files:**
- Create: `js/engine/debris.js`
- Modify: `js/engine/simulation.js` (havuz, geçiş 6, snapshot, çevirme, temizle, istatistik, değişmezler, `view.debris`)
- Modify: `tests/helpers.js` (`hashView` havuzu da karıştırır)
- Test: `tests/debris.test.js` (yeni)
- Docs: `docs/MATERIALS.md` §5.4, `docs/DECISIONS.md` ADR-017 (parçacıklar), `CHANGELOG.md`, `js/app/releases.js`

**Interfaces:**
- Consumes: `applyExplosion(world, rng, state, pool, …)` (Görev 1) — `pool.launch(world, i, type, vx, vy)` çağırır.
- Produces:
  - `debris.js`: `DEBRIS` sabitleri; `class DebrisPool` (`capacity`, `count`, `lost`, alanlar `x, y, vx, vy` (Float32Array), `type, variant` (Uint8Array), `life, age` (Uint16Array), `temp` (Float32Array)); metotlar `launch(world, i, type, vx, vy) → boolean`, `step(world)`, `clear()`, `copyFrom(other)`, `flip(height)`.
  - `Simulation._debris` (`DebrisPool`), `view.debris` = `{ get count(), x, y, type, variant, temp }`, `getStats().particles` havuzu içerir, `getStats().debris` (= havuz sayısı), `getStats().debrisLost`.

- [ ] **Step 1: Başarısız testleri yaz**

`tests/debris.test.js` oluştur:

```js
// Savrulan parçacıklar (ADR-017): fırlatma, DDA hareket, duvardan sızmama, iniş, kütle, geri alma ve çevirme.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { DebrisPool, DEBRIS } from '../js/engine/debris.js';
import { requestExplosion, BLAST_KIND } from '../js/engine/explosions.js';
import { countMaterial, cellType, hashView, runTicks } from './helpers.js';

const total = (sim, mat) => {
  let n = countMaterial(sim, mat);
  const d = sim.view.debris;
  for (let k = 0; k < d.count; k++) if (d.type[k] === mat) n++;
  return n;
};

// Moloz kullanılır: fazı 1500 °C'de olduğundan patlama ısısıyla (en fazla +600 °C) dönüşmez; kum merkezde cama dönebilirdi.
test('patlama molozu savurur: parçacıklar uçar, sonra iner; moloz korunur, kayıp yok', () => {
  const sim = new Simulation({ width: 80, height: 50, debug: true });
  for (let x = 30; x < 50; x++) for (let y = 40; y < 50; y++) sim.setCell(x, y, MAT.RUBBLE);
  const rubble0 = countMaterial(sim, MAT.RUBBLE);
  sim.blastAt(40, 39, 8);
  assert.ok(sim.view.debris.count > 20, `uçan ${sim.view.debris.count}`);
  assert.equal(total(sim, MAT.RUBBLE), rubble0, 'fırlatma anında kütle korunur');
  runTicks(sim, 400);
  assert.equal(sim.view.debris.count, 0, 'hepsi iner');
  assert.equal(countMaterial(sim, MAT.RUBBLE), rubble0);
  assert.equal(sim.getStats().debrisLost, 0);
});

test('parçacık 1 hücrelik duvardan ve çapraz merdivenden sızmaz', () => {
  const sim = new Simulation({ width: 60, height: 40 });
  for (let y = 0; y < 40; y++) sim.setCell(30, y, MAT.STONE); // dikey duvar
  for (let k = 0; k < 15; k++) sim.setCell(40 + k, 25 - k, MAT.STONE); // çapraz merdiven (köşeden değen)
  const pool = sim._debris;
  const w = sim.world;
  for (let k = 0; k < 200; k++) {
    const i = w.index(10 + (k % 10), 5 + Math.floor(k / 10));
    w.set(i, MAT.SAND, 0, 0, 0, 20);
    pool.launch(w, i, MAT.SAND, 6, -1 + (k % 7) * 0.3);
  }
  runTicks(sim, 300);
  for (let y = 0; y < 40; y++) for (let x = 31; x < 60; x++) assert.notEqual(cellType(sim, x, y), MAT.SAND, `duvarın ötesinde kum (${x},${y})`);
  // Merdivene alttan sol-yukarı doğru atılanlar merdivenin üstüne geçmemeli.
  const sim2 = new Simulation({ width: 40, height: 40 });
  for (let k = 0; k < 30; k++) sim2.setCell(5 + k, 34 - k, MAT.STONE);
  const w2 = sim2.world;
  for (let k = 0; k < 100; k++) {
    const i = w2.index(30 + (k % 5), 35 + Math.floor(k / 25));
    w2.set(i, MAT.SAND, 0, 0, 0, 20);
    sim2._debris.launch(w2, i, MAT.SAND, -4, -4);
  }
  runTicks(sim2, 300);
  for (let k = 0; k < 30; k++) for (let y = 0; y < 34 - k; y++) assert.notEqual(cellType(sim2, 5 + k, y), MAT.SAND, `merdivenin üstünde kum (${5 + k},${y})`);
});

test('aynı hücreye inmek isteyen parçacıklar başka hücrelere iner (kütle korunur)', () => {
  const sim = new Simulation({ width: 20, height: 20 });
  const w = sim.world;
  for (let k = 0; k < 30; k++) {
    const i = w.index(10, 2 + (k % 10));
    if (w.type[i] === MAT.EMPTY) w.set(i, MAT.SAND, 0, 0, 0, 20);
    sim._debris.launch(w, i, MAT.SAND, 0, 3);
  }
  const launched = sim.view.debris.count;
  runTicks(sim, 200);
  assert.equal(countMaterial(sim, MAT.SAND), launched);
  assert.equal(sim.getStats().debrisLost, 0);
});

test('uçuştayken geri alma havuzu da geri getirir; çevirme parçacıkları aynalar (Review Focus 2)', () => {
  const sim = new Simulation({ width: 60, height: 40, debug: true });
  for (let x = 20; x < 40; x++) for (let y = 34; y < 40; y++) sim.setCell(x, y, MAT.SAND);
  sim.blastAt(30, 33, 6);
  runTicks(sim, 3);
  const flying = sim.view.debris.count;
  assert.ok(flying > 0);
  const h0 = hashView(sim);
  sim.beginStroke();
  sim.paintAt(5, 5, { material: MAT.STONE, size: 1, shape: 'square' });
  sim.endStroke();
  runTicks(sim, 5);
  sim.undo();
  assert.equal(sim.view.debris.count, flying);
  assert.equal(hashView(sim), h0);
  const y0 = sim.view.debris.y[0];
  const vy0 = sim._debris.vy[0];
  sim.flipVertical();
  assert.equal(sim.view.debris.y[0], 40 - y0);
  assert.equal(sim._debris.vy[0], -vy0);
  runTicks(sim, 300);
  assert.deepEqual(sim.world.checkInvariants(), []);
});

test('temizle ve sahne yükleme havuzu boşaltır; istatistikteki parçacık sayısı havuzu içerir', () => {
  const sim = new Simulation({ width: 40, height: 30 });
  for (let x = 10; x < 30; x++) sim.setCell(x, 29, MAT.SAND);
  const p0 = sim.getStats().particles;
  sim.blastAt(20, 28, 5);
  // Savrulan kum havuzda sayılır; patlama ayrıca ateş ve duman üretir, sayı azalmaz.
  assert.ok(sim.getStats().debris > 0);
  assert.ok(sim.getStats().particles >= p0, `parçacık ${sim.getStats().particles} < ${p0}`);
  sim.clear();
  assert.equal(sim.view.debris.count, 0);
});

test('havuz doluysa hücre yerinde kalır; kapasite aşılmaz', () => {
  const pool = new DebrisPool(4);
  const sim = new Simulation({ width: 10, height: 10 });
  const w = sim.world;
  let ok = 0;
  for (let k = 0; k < 6; k++) {
    const i = w.index(k, 9);
    w.set(i, MAT.SAND, 0, 0, 0, 20);
    if (pool.launch(w, i, MAT.SAND, 1, -2)) ok++;
  }
  assert.equal(ok, 4);
  assert.equal(pool.count, 4);
  assert.equal(countMaterial(sim, MAT.SAND), 2);
  assert.equal(DEBRIS.CAPACITY, 2000);
});

test('parçacıklı patlamalar deterministiktir', () => {
  const run = () => {
    const sim = new Simulation({ width: 80, height: 50, seed: 'det-debris' });
    for (let x = 20; x < 60; x++) for (let y = 35; y < 50; y++) sim.setCell(x, y, (x + y) % 3 ? MAT.SAND : MAT.WATER);
    requestExplosion(sim._blast, 40, 35, 60, BLAST_KIND.TOOL);
    runTicks(sim, 120);
    return hashView(sim);
  };
  assert.equal(run(), run());
});
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `node --test tests/debris.test.js`
Expected: FAIL. `Cannot find module '../js/engine/debris.js'`.

- [ ] **Step 3: `debris.js`'i yaz**

```js
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

// Çarpmada iniş hücresi: kendisi, sonra üst, sol, sağ, alt komşu (köşegen yok); yoksa -1.
function findFreeCross(world, x, y) {
  if (passable(world, x, y)) return idxOf(world, x, y);
  if (passable(world, x, y - 1)) return idxOf(world, x, y - 1);
  if (passable(world, x - 1, y)) return idxOf(world, x - 1, y);
  if (passable(world, x + 1, y)) return idxOf(world, x + 1, y);
  if (passable(world, x, y + 1)) return idxOf(world, x, y + 1);
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
```

- [ ] **Step 4: `simulation.js`'e bağla**

```js
import { DebrisPool } from './debris.js';
```

Constructor'da `this._debris = null;` satırını şununla değiştir:

```js
    this._debris = new DebrisPool(); // savrulan parçacıklar (geçiş 6)
```

`view`'a:

```js
      debris: Object.freeze({
        get count() {
          return sim._debris.count;
        },
        x: this._debris.x,
        y: this._debris.y,
        type: this._debris.type,
        variant: this._debris.variant,
        temp: this._debris.temp,
      }),
```

(Bu blok `this._debris` atandıktan sonra kurulan `this.view` içinde olmalı; constructor'daki sıra buna uygundur.)

`_tickOnce`'ta `stepExplosions(...)` satırından sonra:

```js
    // Geçiş 6 — savrulan parçacıklar (debris.js).
    this._debris.step(w);
```

`clear()` ve `loadScene()` içinde `resetBlastState(...)` satırından sonra `this._debris.clear();`. `flipVertical()` içinde `flipBlastState(...)` satırından sonra `this._debris.flip(this.world.height);`.

Snapshot nesnesine `debris: new DebrisPool(),`; `_capture()` sonuna `snap.debris.copyFrom(this._debris);`; `undo()` içinde `copyBlastState(...)` satırından sonra `this._debris.copyFrom(snap.debris);`.

`getStats()`'ta `particles` satırını şununla değiştir ve yeni alanları ekle:

```js
      particles: w.width * w.height - w.counts[EMPTY] + this._debris.count,
      debris: this._debris.count,
      debrisLost: this._debris.lost,
```

`_assertInvariants()` içinde dünyadan gelen `problems` dizisine havuz denetimini ekle:

```js
    const d = this._debris;
    for (let k = 0; k < d.count; k++) {
      const t = d.type[k];
      if (!(d.x[k] >= 0 && d.x[k] <= this.world.width && d.y[k] >= 0 && d.y[k] <= this.world.height)) problems.push(`parçacık dünya dışında #${k}`);
      if (t === MAT.EMPTY || t === MAT.WALL || !MATERIALS.defs[t]) problems.push(`parçacık türü geçersiz #${k}: ${t}`);
    }
```

(`const problems = this.world.checkInvariants();` satırını `const problems = this.world.checkInvariants();` olarak bırak; denetim satırları ondan hemen sonra gelir.)

- [ ] **Step 5: `hashView` havuzu da karıştırsın**

`tests/helpers.js` → `hashView` içinde `return h >>> 0;` satırından önce:

```js
  const d = sim.view.debris;
  if (d) {
    mix(d.count);
    mix(d.count >>> 8);
    const fx = new Uint32Array(d.x.buffer, d.x.byteOffset, d.count);
    const fy = new Uint32Array(d.y.buffer, d.y.byteOffset, d.count);
    for (let k = 0; k < d.count; k++) {
      mix(d.type[k]);
      mix(fx[k]);
      mix(fx[k] >>> 16);
      mix(fy[k]);
      mix(fy[k] >>> 16);
    }
  }
```

- [ ] **Step 6: Testlerin geçtiğini gör**

Run: `node --test tests/debris.test.js tests/explosions.test.js`
Expected: PASS. "dayanıklılık" testinde kırılan taş artık savrulur: `cellType(23,10)` boşalır. Görev 1 testinin bu satırını şöyle güncelle: kırılan hücre boş ya da moloz, havuzda moloz var.

```js
  assert.ok(cellType(sim, 23, 10) !== MAT.STONE, 'taş kırıldı');
  const d = sim.view.debris;
  let rubble = 0;
  for (let k = 0; k < d.count; k++) if (d.type[k] === MAT.RUBBLE) rubble++;
  assert.ok(rubble > 0, 'moloz savruldu');
```

Cam ve buz, odun için de aynı şekilde: hücrede ya da havuzda enkaz türü. "Enkaz eşlemesi" testini havuzdaki türleri sayacak biçimde güncelle (`d.type` içinde `MAT.SNOW` ve `MAT.ASH` bulunmalı).

- [ ] **Step 7: Tüm testler**

Run: `npm test`
Expected: `# fail 0`.

- [ ] **Step 8: Dokümanlar, commit, push**

- `docs/MATERIALS.md` §5.4: "Savrulan parçacıklar" (spec §2.5).
- `docs/DECISIONS.md`: ADR-017'ye parçacık havuzu ve DDA kısmı.
- `CHANGELOG.md` → `[Unreleased]` → `### Added`.
- `js/app/releases.js`: `'Patlamalar maddeyi savurur: parçalar yay çizip uçar, çarptığı yere düşer.'`

```bash
git add js/engine/debris.js js/engine/simulation.js tests/debris.test.js tests/explosions.test.js tests/helpers.js docs/MATERIALS.md docs/DECISIONS.md docs/DEVELOPMENT.md CHANGELOG.md js/app/releases.js
git commit -m "Savrulan parçacık havuzu: DDA hareket, duvardan sızmayan iniş, geri alma ve çevirme"
git push origin main
```

---
### Task 3 (Görev 3): Barut ve Dinamit; tutuşma, kıvılcım ve zincir

**Files:**
- Modify: `js/engine/materials.js` (`GUNPOWDER`, `DYNAMITE`)
- Modify: `js/engine/explosions.js` (`detonate`, zincir, kıvılcım)
- Modify: `js/engine/reactions.js` (`ignite` patlayıcıyı tetikler)
- Modify: `js/engine/heat.js` (sıcaklıkla tetiklenme, aday penceresi)
- Modify: `js/app/catalog.js`, `index.html` (Barut `r`, Dinamit `d`)
- Test: `tests/explosives.test.js` (yeni)
- Docs: `docs/MATERIALS.md` §5.5, `CHANGELOG.md`, `js/app/releases.js`

**Interfaces:**
- Consumes: `addBlastPower`, `BLAST`, `applyExplosion` (Görev 1); `world.blast` (Görev 1, `Simulation` bağlar); `MATERIALS.EXPLOSIVE_POWER`, `EXPLODE_AT`, `EXPLOSIVE_IGNITE` (Görev 1).
- Produces:
  - `MAT.GUNPOWDER = 23`, `MAT.DYNAMITE = 28`;
  - `explosions.js`: `detonate(world, i) → boolean` (patlayıcı değilse false; gücü `world.blast`'a yazar, hücreyi en az `BLAST.DETONATE_TEMP` sıcaklıkta boşluğa çevirir);
  - `BLAST.DETONATE_TEMP = 800`, `BLAST.SPARK_CAPACITY = 64`.
  - **Kıvılcım:** birleştirme eşiğinin altındaki blok (`MERGE_MIN` > güç > 0) patlama olayı üretmez; blok merkezinin 3×3 çevresindeki patlayıcıları tetikler. Bunlar sonraki tick'te patlar. Tek tanenin zinciri böyle başlar.

- [ ] **Step 1: Başarısız testleri yaz**

`tests/explosives.test.js` oluştur:

```js
// Barut ve Dinamit: ateş, lav ve sıcaklıkla tetiklenme; zincir; büyük yığında sınırlar (Review Focus 1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT, MATERIALS } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { BLAST, BLAST_KIND } from '../js/engine/explosions.js';
import { countMaterial, runTicks } from './helpers.js';

const explosive = (sim) => sim.getStats().blastTotals[BLAST_KIND.EXPLOSIVE];

function fill(sim, x0, y0, x1, y1, mat) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) sim.setCell(x, y, mat);
}

test('barut ateşle patlar: yığın tükenir, yakındaki cam kırılır', () => {
  const sim = new Simulation({ width: 60, height: 40, seed: 'gp', debug: true });
  fill(sim, 27, 34, 32, 39, MAT.GUNPOWDER);
  fill(sim, 36, 30, 36, 39, MAT.GLASS);
  const glass0 = countMaterial(sim, MAT.GLASS);
  sim.setCell(26, 39, MAT.FIRE);
  runTicks(sim, 150);
  assert.equal(countMaterial(sim, MAT.GUNPOWDER), 0);
  assert.ok(explosive(sim) >= 1);
  assert.ok(countMaterial(sim, MAT.GLASS) < glass0, 'cam kırılmalı');
});

test('barut lava değince patlar; ≥ 200 °C\'de kendiliğinden patlar', () => {
  const lava = new Simulation({ width: 30, height: 30, seed: 'gp-lava' });
  fill(lava, 5, 25, 25, 29, MAT.LAVA);
  fill(lava, 13, 20, 16, 22, MAT.GUNPOWDER);
  runTicks(lava, 200);
  assert.ok(explosive(lava) >= 1);
  const hot = new Simulation({ width: 20, height: 20, seed: 'gp-hot' });
  fill(hot, 8, 15, 11, 19, MAT.GUNPOWDER);
  hot.setTemp(9, 17, 400);
  runTicks(hot, 200);
  assert.equal(countMaterial(hot, MAT.GUNPOWDER), 0);
});

test('büyük yığın daha büyük patlar: kırılan taş sayısı yığınla artar', () => {
  const broken = (n) => {
    const sim = new Simulation({ width: 80, height: 60, seed: 'gp-size' });
    fill(sim, 0, 0, 79, 59, MAT.STONE);
    fill(sim, 40 - n / 2, 30 - n / 2, 40 + n / 2 - 1, 30 + n / 2 - 1, MAT.GUNPOWDER);
    const stone0 = countMaterial(sim, MAT.STONE);
    sim.setTemp(40, 30, 400);
    runTicks(sim, 400);
    return stone0 - countMaterial(sim, MAT.STONE);
  };
  const small = broken(4);
  const big = broken(12);
  assert.ok(big > small * 2, `küçük ${small}, büyük ${big}`);
});

test('zincir tick tick ilerler: 60 hücrelik barut hattı tek tick\'te bitmez ama sonuna kadar tükenir', () => {
  const sim = new Simulation({ width: 70, height: 20, seed: 'gp-line' });
  fill(sim, 0, 11, 69, 19, MAT.STONE);
  fill(sim, 2, 10, 61, 10, MAT.GUNPOWDER);
  sim.setTemp(2, 10, 400);
  const left = [];
  for (let t = 0; t < 300; t++) {
    sim.step();
    left.push(countMaterial(sim, MAT.GUNPOWDER));
  }
  const firstDrop = left.findIndex((n) => n < 60);
  assert.ok(firstDrop >= 0, 'tutuşmalı');
  assert.ok(left[firstDrop] > 0, 'hepsi aynı tick\'te bitmemeli');
  const done = left.indexOf(0);
  assert.ok(done > firstDrop + 2, `zincir birkaç tick sürmeli (başlangıç ${firstDrop}, bitiş ${done})`);
});

test('500 barut aynı anda tutuşunca tick sınırları korunur ve yığın tükenir (Review Focus 1)', () => {
  const sim = new Simulation({ width: 100, height: 60, seed: 'gp-500', debug: true });
  fill(sim, 30, 35, 54, 54, MAT.GUNPOWDER); // 25 × 20 = 500
  for (let y = 35; y <= 54; y++) for (let x = 30; x <= 54; x++) sim.setTemp(x, y, 300);
  for (let t = 0; t < 400; t++) {
    sim.step();
    const s = sim.getStats();
    assert.ok(s.blastsThisTick <= BLAST.MAX_PER_TICK, `tick ${t}: ${s.blastsThisTick} patlama`);
    assert.ok(sim._blast.cellsThisTick <= BLAST.MAX_CELLS_PER_TICK, `tick ${t}: ${sim._blast.cellsThisTick} hücre`);
  }
  assert.equal(countMaterial(sim, MAT.GUNPOWDER), 0);
  assert.ok(explosive(sim) >= 3);
  runTicks(sim, 400);
  assert.equal(sim.getStats().debrisLost, 0);
});

test('dinamit: ≥ 150 °C ile ve yakındaki patlamayla tetiklenir; tek hücre bile patlar', () => {
  const heat = new Simulation({ width: 30, height: 30, seed: 'dyn' });
  heat.setCell(15, 29, MAT.DYNAMITE);
  heat.setTemp(15, 29, 200);
  runTicks(heat, 150);
  assert.equal(countMaterial(heat, MAT.DYNAMITE), 0);
  assert.equal(explosive(heat), 1, 'güç 8 ≥ MERGE_MIN: tek hücre patlama olayı üretir');
  const chain = new Simulation({ width: 40, height: 30, seed: 'dyn2' });
  chain.setCell(28, 15, MAT.DYNAMITE);
  chain.blastAt(22, 15, 6); // d 6 → s 4,8 ≥ 0,5
  chain.step();
  assert.equal(countMaterial(chain, MAT.DYNAMITE), 0);
  chain.step();
  assert.ok(explosive(chain) >= 1);
});

test('tablolar: barut toz ve suya batar; dinamit katı, patlayıcı gücü 8', () => {
  assert.equal(MATERIALS.EXPLOSIVE_POWER[MAT.GUNPOWDER], 1);
  assert.equal(MATERIALS.EXPLODE_AT[MAT.GUNPOWDER], 200);
  assert.equal(MATERIALS.EXPLOSIVE_POWER[MAT.DYNAMITE], 8);
  assert.equal(MATERIALS.EXPLODE_AT[MAT.DYNAMITE], 150);
  assert.ok(MATERIALS.byKey.GUNPOWDER.density > MATERIALS.byKey.WATER.density);
});
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `node --test tests/explosives.test.js`
Expected: FAIL. `MAT.GUNPOWDER` tanımsız olduğu için `setCell` yanlış materyal yazar ve sayımlar tutmaz.

- [ ] **Step 3: Materyaller**

`MAT`'a `GUNPOWDER: 23,` ve `DYNAMITE: 28,` ekle (`RUBBLE: 24` satırının çevresine; numara sırası önemli değil). `MATERIAL_DEFS`'e:

```js
  {
    id: MAT.GUNPOWDER, key: 'GUNPOWDER', name: 'Gunpowder', kind: KIND.POWDER, density: 14, color: '#3a3634',
    conduct: 0.03, capacity: 2, explosive: { power: 1, at: 200, ignite: 1 },
  },
  {
    id: MAT.DYNAMITE, key: 'DYNAMITE', name: 'Dynamite', kind: KIND.STATIC, density: 255, color: '#b8322a',
    conduct: 0.03, capacity: 3, strength: 3, explosive: { power: 8, at: 150, ignite: 0.5 },
  },
```

- [ ] **Step 4: `detonate`, zincir ve kıvılcım**

`explosions.js`:

- `BLAST`'a `DETONATE_TEMP: 800,` (tetiklenen hücrenin en az sıcaklığı) ve `SPARK_CAPACITY: 64,` ekle.
- `MATERIALS` destructuring'ine `EXPLOSIVE_POWER` ekle.
- `createBlastState` dönüşüne `sparkX: new Int32Array(BLAST.SPARK_CAPACITY), sparkY: new Int32Array(BLAST.SPARK_CAPACITY), sparkCount: 0,` ekle.

Yeni fonksiyon (`requestExplosion`'dan sonra):

```js
// Patlayıcı hücreyi tetikler: gücü 8×8 bloğuna yazılır, hücre en az DETONATE_TEMP sıcaklıkta boşluğa döner.
// world.blast yoksa (yalın World testleri) yalnız hücre boşalır.
export function detonate(world, i) {
  const G = EXPLOSIVE_POWER[world.type[i]];
  if (G === 0) return false;
  const stride = world.stride;
  if (world.blast) addBlastPower(world.blast, (i % stride) - 1, Math.floor(i / stride) - 1, G);
  const T = world.temp[i];
  world.set(i, EMPTY, 0, 0, 0, T > BLAST.DETONATE_TEMP ? T : BLAST.DETONATE_TEMP);
  return true;
}
```

`flushMerge` imzasını `flushMerge(world, s)` yap. Eşik altı blokları kıvılcım olarak topla, döngüden sonra işle:

```js
function flushMerge(world, s) {
  let keep = 0;
  s.sparkCount = 0;
  for (let k = 0; k < s.activeCount; k++) {
    const b = s.active[k];
    const p = s.power[b];
    if (p >= BLAST.MERGE_MIN) {
      if (s.qCount >= BLAST.QUEUE_CAPACITY) {
        s.active[keep++] = b;
        continue;
      }
      pushEvent(s, s.sx[b] / p, s.sy[b] / p, p, BLAST_KIND.EXPLOSIVE);
    } else if (p > 0 && s.sparkCount < BLAST.SPARK_CAPACITY) {
      s.sparkX[s.sparkCount] = Math.round(s.sx[b] / p);
      s.sparkY[s.sparkCount] = Math.round(s.sy[b] / p);
      s.sparkCount++;
    }
    clearBlock(s, b);
  }
  s.activeCount = keep;
  // Kıvılcım: eşik altı bloğun merkezindeki 3×3'teki patlayıcılar tetiklenir (ızgaraya, sonraki tick).
  for (let n = 0; n < s.sparkCount; n++) {
    const cx = s.sparkX[n];
    const cy = s.sparkY[n];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= world.width || y >= world.height) continue;
        detonate(world, (y + 1) * world.stride + x + 1);
      }
    }
  }
}
```

`stepExplosions` içinde `flushMerge(s)` çağrısını `flushMerge(world, s)` yap.

`applyExplosion` içinde, sıcaklık yazıldıktan hemen sonra (`const k = KIND_OF[t];` satırından önce):

```js
      if (EXPLOSIVE_POWER[t] !== 0) {
        if (sv >= BLAST.CHAIN_MIN) detonate(world, i); // zincir: ızgaraya, sonraki tick
        continue;
      }
```

- [ ] **Step 5: Tutuşma ve sıcaklıkla tetiklenme**

`reactions.js`:

```js
import { detonate } from './explosions.js';
```

`MATERIALS` destructuring'ine `EXPLOSIVE_POWER, EXPLOSIVE_IGNITE` ekle. `ignite`'ı şöyle değiştir:

```js
function ignite(world, rng, j, nt) {
  if (EXPLOSIVE_POWER[nt] !== 0) {
    if (roll(rng, EXPLOSIVE_IGNITE[nt])) detonate(world, j); // ateş, yanan madde ve lav patlayıcıyı tetikler
    return;
  }
  const flammability = FLAMMABILITY[nt];
  if (flammability !== 0 && roll(rng, flammability)) become(world, rng, j, BURNS_INTO[nt]);
}
```

`heat.js`:

```js
import { detonate } from './explosions.js';
```

`MATERIALS` destructuring'ine `EXPLODE_AT` ekle. Aday penceresi satırını şöyle değiştir:

```js
  CAND_HI[t] = Math.min(UP_AT[t] + 1e-3, IGNITE_AT[t], EVAP_AT[t], EXPLODE_AT[t]);
```

`applyThermalRules` içinde `if (T >= IGNITE_AT[t]) {` satırından hemen önce:

```js
      if (T >= EXPLODE_AT[t]) {
        if (rng.nextU32() < ignite) detonate(world, i); // patlayıcı: tutuşma olasılığıyla tetiklenir
        continue;
      }
```

- [ ] **Step 6: Seçici ve yardım**

`catalog.js` `PICKER`'a:

```js
  { key: 'GUNPOWDER', mat: MAT.GUNPOWDER, label: 'Barut', shortcut: 'r', category: 'powder' },
  { key: 'DYNAMITE', mat: MAT.DYNAMITE, label: 'Dinamit', shortcut: 'd', category: 'solid' },
```

`index.html` kısayol tablosuna (Moloz satırının yerine):

```html
        <tr><th scope="row"><kbd>R</kbd> <kbd>O</kbd> <kbd>D</kbd></th><td>Barut, Moloz, Dinamit</td></tr>
```

- [ ] **Step 7: Testlerin geçtiğini gör**

Run: `node --test tests/explosives.test.js tests/explosions.test.js tests/heat.test.js tests/reactions.test.js`
Expected: PASS.

- [ ] **Step 8: Tüm testler, dokümanlar, commit, push**

Run: `npm test` → `# fail 0`.

Dokümanlar:
- `docs/MATERIALS.md`: §2 tablosuna Barut ve Dinamit; §5.5 "Patlayıcılar" (güç, eşik, tutuşma, kıvılcım ve zincir).
- `CHANGELOG.md` → `### Added`.
- `js/app/releases.js`:
  - `'Barut (R): ateş, lav ya da 200 °C ile patlar; yığın büyüdükçe patlama büyür.'`
  - `'Dinamit (D): barutun güçlü, katı hâli; ısıyla ya da yakındaki patlamayla tetiklenir.'`

```bash
git add js/engine/materials.js js/engine/explosions.js js/engine/reactions.js js/engine/heat.js js/app/catalog.js index.html tests/explosives.test.js docs/MATERIALS.md docs/DEVELOPMENT.md CHANGELOG.md js/app/releases.js
git commit -m "Barut ve Dinamit: ateş, lav ve sıcaklıkla tetiklenme, kıvılcım ve zincirleme patlama"
git push origin main
```

---

### Task 4 (Görev 4): Fitil

**Files:**
- Modify: `js/engine/materials.js` (`FUSE`, `BURNING_FUSE`)
- Modify: `js/engine/reactions.js` (`reactBurningFuse`)
- Modify: `js/app/catalog.js`, `index.html` (Fitil `i`; `EXTRA_LABELS` Yanan fitil)
- Test: `tests/fuse.test.js` (yeni)
- Docs: `docs/MATERIALS.md`, `CHANGELOG.md`, `js/app/releases.js`

**Interfaces:**
- Consumes: `detonate(world, i)` (Görev 3), `emitSteam`, `become`, `initialLife`, `RATES` ve `state.fireBudget` (mevcut).
- Produces: `MAT.FUSE = 29`, `MAT.BURNING_FUSE = 30`. Yanan fitil ömrü bitince küle döner, 8 komşudaki fitili tutuşturur ve patlayıcıyı tetikler.

- [ ] **Step 1: Başarısız testleri yaz**

`tests/fuse.test.js`:

```js
// Fitil: ateşi ~10 hücre/s taşır, sonundaki dinamiti patlatır; su söndürür.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { BLAST_KIND } from '../js/engine/explosions.js';
import { countMaterial, cellType, runTicks } from './helpers.js';

function line(sim, x0, x1, y, mat) {
  for (let x = x0; x <= x1; x++) sim.setCell(x, y, mat);
}

test('fitil ateşi saniyede ~10 hücre taşır ve sonundaki dinamiti patlatır', () => {
  const sim = new Simulation({ width: 80, height: 20, seed: 'fuse' });
  line(sim, 0, 79, 15, MAT.STONE);
  line(sim, 2, 61, 14, MAT.FUSE); // 60 hücre
  sim.setCell(62, 14, MAT.DYNAMITE);
  sim.setTemp(2, 14, 300);
  let boomAt = -1;
  for (let t = 0; t < 700 && boomAt < 0; t++) {
    sim.step();
    if (sim.getStats().blastTotals[BLAST_KIND.EXPLOSIVE] > 0) boomAt = t;
  }
  // 60 hücre × ~6 tick ≈ 360 tick (+ ısıyla ilk tutuşma ~16 tick); ±%30.
  assert.ok(boomAt >= 250 && boomAt <= 480, `patlama ${boomAt}. tick'te`);
  assert.equal(countMaterial(sim, MAT.FUSE), 0);
});

test('yanan fitil ateşle ve ısıyla tutuşur, yanarken kıvılcım çıkarır, sonunda küle döner', () => {
  const sim = new Simulation({ width: 30, height: 10, seed: 'fuse2' });
  line(sim, 0, 29, 8, MAT.STONE);
  line(sim, 5, 20, 7, MAT.FUSE);
  sim.setCell(4, 7, MAT.FIRE);
  let sparks = 0;
  for (let t = 0; t < 200; t++) {
    sim.step();
    if (countMaterial(sim, MAT.BURNING_FUSE) > 0 && countMaterial(sim, MAT.FIRE) > 0) sparks++;
  }
  assert.equal(countMaterial(sim, MAT.FUSE), 0);
  assert.ok(sparks > 0, 'kıvılcım');
  assert.ok(countMaterial(sim, MAT.ASH) > 0);
});

test('su fitili söndürür: ıslak bölümden sonrası yanmaz, dinamit patlamaz', () => {
  const sim = new Simulation({ width: 60, height: 20, seed: 'fuse-wet' });
  line(sim, 0, 59, 15, MAT.STONE);
  line(sim, 2, 49, 14, MAT.FUSE);
  sim.setCell(50, 14, MAT.DYNAMITE);
  for (const y of [12, 13]) {
    sim.setCell(19, y, MAT.STONE); // su teknesinin iki sıra duvarı
    sim.setCell(32, y, MAT.STONE);
  }
  for (let x = 20; x <= 31; x++) for (const y of [12, 13]) sim.setCell(x, y, MAT.WATER); // fitilin üstünde su
  sim.setTemp(2, 14, 300);
  runTicks(sim, 800);
  assert.equal(sim.getStats().blastTotals[BLAST_KIND.EXPLOSIVE], 0);
  assert.equal(cellType(sim, 45, 14), MAT.FUSE, 'ıslak bölümden sonrası sağlam');
});
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `node --test tests/fuse.test.js`
Expected: FAIL. `MAT.FUSE` tanımsız.

- [ ] **Step 3: Materyaller**

`MAT`'a `FUSE: 29,` ve `BURNING_FUSE: 30,` ekle. Tanımlar:

```js
  {
    id: MAT.FUSE, key: 'FUSE', name: 'Fuse', kind: KIND.STATIC, density: 255, color: '#c9b58a',
    flammable: 1, burnsInto: MAT.BURNING_FUSE, ignitesAt: 200, conduct: 0.02, capacity: 2, strength: 4, debris: MAT.ASH,
  },
  {
    id: MAT.BURNING_FUSE, key: 'BURNING_FUSE', name: 'Burning Fuse', kind: KIND.STATIC, density: 255, color: '#ff9a3a',
    hidden: true, reactive: true, life: [5, 7], temp: 600, source: 600, conduct: 0.04, capacity: 2, strength: 4, debris: MAT.ASH,
    burn: { emit: 0.1, douse: 0.8, ash: 1, extinguishTo: MAT.FUSE },
  },
```

- [ ] **Step 4: `reactBurningFuse`**

`reactions.js` (`reactBurning`'den sonra):

```js
// Yanan fitil: ömrü bitince küle döner, 8 komşusundaki fitili tutuşturur ve patlayıcıyı tetikler (ateş
// ~6 tick'te bir hücre ilerler: 1× hızda ~10 hücre/s). Yanarken ara sıra üstüne kıvılcım çıkarır; suyla söner.
function reactBurningFuse(world, rng, i, state) {
  const life = world.life;
  if (life[i] <= 1) {
    const off = world.neighborOffsets;
    for (let k = 0; k < 8; k++) {
      const j = i + off[k];
      const nt = world.type[j];
      if (nt === MAT.FUSE) become(world, rng, j, MAT.BURNING_FUSE);
      else if (EXPLOSIVE_POWER[nt] !== 0) detonate(world, j);
    }
    world.transform(i, ASH, 0);
    return true;
  }
  life[i]--;
  if (state.fireBudget > 0 && roll(rng, EMIT[MAT.BURNING_FUSE])) {
    const j = i - world.stride + ((rng.nextU32() % 3) - 1);
    if (world.type[j] === EMPTY) {
      world.set(j, FIRE, rng.nextU32() & 255, initialLife(FIRE, rng.nextU32()), 0, spawnTemp(FIRE, world.ambient));
      state.fireBudget--;
    }
  }
  const j = sampleNeighbor(world, rng, i);
  if (world.type[j] === WATER && roll(rng, DOUSE[MAT.BURNING_FUSE])) {
    emitSteam(world, j);
    world.transform(i, MAT.FUSE, 0);
    if (world.temp[i] > STEAM_TEMP) world.temp[i] = STEAM_TEMP;
    return true;
  }
  return false;
}
```

`react` switch'ine:

```js
    case MAT.BURNING_FUSE:
      return reactBurningFuse(world, rng, i, state);
```

- [ ] **Step 5: Seçici, etiket, yardım**

`catalog.js` `PICKER`'a `{ key: 'FUSE', mat: MAT.FUSE, label: 'Fitil', shortcut: 'i', category: 'solid' },`. `EXTRA_LABELS`'a `[MAT.BURNING_FUSE]: 'Yanan fitil',`. `index.html` yardım satırı `R O D` → `R O D I`, açıklama "Barut, Moloz, Dinamit, Fitil".

- [ ] **Step 6: Testlerin geçtiğini gör, tüm testler**

Run: `node --test tests/fuse.test.js` → PASS. Run: `npm test` → `# fail 0`.

- [ ] **Step 7: Dokümanlar, commit, push**

- `docs/MATERIALS.md`: Fitil ve Yanan fitil; hız, kıvılcım, su.
- `CHANGELOG.md`.
- `js/app/releases.js`: `'Fitil (I): ateşi saniyede ~10 hücre taşır, sonundaki barutu ya da dinamiti tetikler; su söndürür.'`

```bash
git add js/engine/materials.js js/engine/reactions.js js/app/catalog.js index.html tests/fuse.test.js docs/MATERIALS.md docs/DEVELOPMENT.md CHANGELOG.md js/app/releases.js
git commit -m "Fitil: ateşi taşıyan, patlayıcıyı tetikleyen, suyla sönen hat"
git push origin main
```

---

### Task 5 (Görev 5): Metan, Yanan metan, Duman; yangın ve patlama dumanı

**Files:**
- Modify: `js/engine/materials.js` (`METHANE`, `BURNING_METHANE`, `SMOKE`, `CLOSED_BIT`)
- Modify: `js/engine/reactions.js` (`reactBurningMethane`, `reactSmoke`, ateş ve yanma dumanı, bütçe)
- Modify: `js/engine/explosions.js` (gaz yanıcıları tutuşur, halka dumanı)
- Modify: `js/app/catalog.js`, `index.html` (Metan `n`, Duman `u`)
- Test: `tests/gases.test.js` (yeni)
- Docs: `docs/MATERIALS.md`, `CHANGELOG.md`, `js/app/releases.js`

**Interfaces:**
- Consumes: `addBlastPower` (Görev 1), `world.blast`, `state` (reaksiyon bütçeleri).
- Produces:
  - `MAT.METHANE = 25`, `MAT.BURNING_METHANE = 26`, `MAT.SMOKE = 27`;
  - `materials.js`: `export const CLOSED_BIT = 16` (flags bit4; Görev 6 yazar, duman okur);
  - `reactions.js`: `METHANE_POWER = 0.5` (dışa aktarılır), `RATES.fireSmoke`, `RATES.burnSmoke`, `RATES.maxSmokePerTick = 60`, `state.smokeBudget`;
  - `BLAST.SMOKE_CHANCE = 0.25`.

- [ ] **Step 1: Başarısız testleri yaz**

`tests/gases.test.js`:

```js
// Metan (yoğun cep patlar, seyrek yalnız yanar), Duman (açık havada söner), yangın ve patlama dumanı.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT, MATERIALS } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { BLAST_KIND } from '../js/engine/explosions.js';
import { RATES } from '../js/engine/reactions.js';
import { countMaterial, runTicks } from './helpers.js';

const explosive = (sim) => sim.getStats().blastTotals[BLAST_KIND.EXPLOSIVE];

function cavity(sim, x0, y0, x1, y1) {
  for (let y = 0; y < sim.view.height; y++) for (let x = 0; x < sim.view.width; x++) sim.setCell(x, y, MAT.STONE);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) sim.world.set(sim.world.index(x, y), MAT.EMPTY, 0, 0, 0, 20);
}

test('yoğun metan cebi tutuşunca patlar', () => {
  const sim = new Simulation({ width: 60, height: 40, seed: 'ch4' });
  cavity(sim, 20, 15, 39, 24);
  for (let y = 15; y <= 24; y++) for (let x = 20; x <= 39; x++) sim.setCell(x, y, MAT.METHANE);
  sim.setTemp(30, 20, 700);
  runTicks(sim, 150);
  assert.equal(countMaterial(sim, MAT.METHANE), 0);
  assert.ok(explosive(sim) >= 1);
});

test('seyrek metan yalnız yanar, patlamaz', () => {
  const sim = new Simulation({ width: 60, height: 40, seed: 'ch4-thin' });
  for (let x = 4; x < 56; x += 4) sim.setCell(x, 30, MAT.METHANE);
  for (let x = 4; x < 56; x += 4) sim.setTemp(x, 30, 700);
  let burned = 0;
  for (let t = 0; t < 100; t++) {
    sim.step();
    burned += countMaterial(sim, MAT.BURNING_METHANE);
  }
  assert.ok(burned > 0, 'yanmalı');
  assert.equal(explosive(sim), 0);
});

test('metan havadan hafiftir, yükselir; patlamada tutuşur', () => {
  assert.ok(MATERIALS.byKey.METHANE.density < MATERIALS.byKey.EMPTY.density);
  const sim = new Simulation({ width: 40, height: 30, seed: 'ch4-blast' });
  for (let x = 15; x < 25; x++) sim.setCell(x, 10, MAT.METHANE);
  sim.blastAt(20, 14, 4);
  assert.ok(countMaterial(sim, MAT.BURNING_METHANE) > 0);
});

test('duman açık havada söner; yangın tick başına sınırlı duman çıkarır', () => {
  const sim = new Simulation({ width: 40, height: 40, seed: 'smoke' });
  for (let x = 10; x < 30; x++) sim.setCell(x, 5, MAT.SMOKE);
  runTicks(sim, 700);
  assert.equal(countMaterial(sim, MAT.SMOKE), 0);
  const fire = new Simulation({ width: 60, height: 40, seed: 'smoke-fire' });
  for (let x = 10; x < 50; x++) for (let y = 30; y < 40; y++) fire.setCell(x, y, MAT.WOOD);
  fire.setCell(30, 29, MAT.FIRE);
  let seen = 0;
  let prev = 0;
  for (let t = 0; t < 600; t++) {
    fire.step();
    const n = countMaterial(fire, MAT.SMOKE);
    assert.ok(n - prev <= RATES.maxSmokePerTick, `tick ${t}: ${n - prev} yeni duman`);
    prev = n;
    seen = Math.max(seen, n);
  }
  assert.ok(seen > 0, 'yangın duman çıkarmalı');
});

test('patlama halkasında duman çıkar', () => {
  const sim = new Simulation({ width: 60, height: 40, seed: 'smoke-blast' });
  sim.blastAt(30, 20, 8);
  assert.ok(countMaterial(sim, MAT.SMOKE) > 0);
});
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `node --test tests/gases.test.js`
Expected: FAIL. `MAT.METHANE` tanımsız; `RATES.maxSmokePerTick` tanımsız.

- [ ] **Step 3: Materyaller ve `CLOSED_BIT`**

`materials.js` → `MAT`'a `METHANE: 25,`, `BURNING_METHANE: 26,`, `SMOKE: 27,`. Dosya sonuna:

```js
// flags bit4: hücre kapalı bir gaz bölgesinde (pressure.js her taramada yazar; duman yalnız açık bölgede söner).
export const CLOSED_BIT = 16;
```

Tanımlar:

```js
  {
    id: MAT.METHANE, key: 'METHANE', name: 'Methane', kind: KIND.GAS, density: 3, color: '#c9d98a', drift: 0.2,
    flammable: 1, burnsInto: MAT.BURNING_METHANE, ignitesAt: 540, conduct: 0.02, capacity: 1,
  },
  {
    id: MAT.BURNING_METHANE, key: 'BURNING_METHANE', name: 'Burning Methane', kind: KIND.GAS, density: 3, color: '#ffb04a',
    hidden: true, reactive: true, drift: 0.3, life: [3, 6], temp: 1200, source: 1200, conduct: 0.05, capacity: 1,
  },
  {
    id: MAT.SMOKE, key: 'SMOKE', name: 'Smoke', kind: KIND.GAS, density: 4, color: '#6b6763', drift: 0.5, rise: 0.6,
    reactive: true, life: [200, 500], conduct: 0.02, capacity: 1,
  },
```

- [ ] **Step 4: Reaksiyonlar**

`reactions.js`:

- import: `import { MAT, KIND, MATERIALS, spawnTemp, CLOSED_BIT } from './materials.js';` ve `import { detonate, addBlastPower } from './explosions.js';`
- `RATES`'e:

```js
  fireSmoke: p(0.15), // sönen ateşin dumana dönme olasılığı
  burnSmoke: p(0.1), // yanan maddenin alev üretirken duman çıkarma olasılığı
  maxSmokePerTick: 60, // yangınların tick başına en fazla dumanı (dünya genelinde)
```

- `createReactionState` dönüşüne `smokeBudget: 0`; `beginReactionTick`'e `state.smokeBudget = RATES.maxSmokePerTick;`.
- Sabitler:

```js
export const METHANE_POWER = 0.5; // yanan metan hücresinin tick başına birleştirme ızgarasına yazdığı güç
const SMOKE_TEMP = 300; // yangın dumanının doğuş sıcaklığı (°C)
```

- `reactFire(world, rng, i)` imzasını `reactFire(world, rng, i, state)` yap. Ömür sonu dalını değiştir:

```js
  if (life[i] <= 1) {
    if (state.smokeBudget > 0 && roll(rng, RATES.fireSmoke)) {
      world.transform(i, MAT.SMOKE, initialLife(MAT.SMOKE, rng.nextU32())); // sıcaklık korunur
      state.smokeBudget--;
    } else vanish(world, i);
    return true;
  }
```

  `react` switch'inde `case FIRE: return reactFire(world, rng, i, state);`.
- `reactBurning` içinde ateş üretimi bloğundan hemen sonra:

```js
  if (state.smokeBudget > 0 && roll(rng, RATES.burnSmoke)) {
    const j = i - world.stride + ((rng.nextU32() % 3) - 1);
    if (world.type[j] === EMPTY) {
      world.set(j, MAT.SMOKE, rng.nextU32() & 255, initialLife(MAT.SMOKE, rng.nextU32()), 0, Math.max(world.temp[j], SMOKE_TEMP));
      state.smokeBudget--;
    }
  }
```

- Yeni fonksiyonlar:

```js
// Yanan metan: alev cephesi her tick 8 komşudaki metanı tutuşturur, bir komşudaki yanıcıyı tutuşturabilir ve
// birleştirme ızgarasına METHANE_POWER yazar (yoğun cep blokta eşiği aşıp patlar; seyrek metan yalnız yanar).
function reactBurningMethane(world, rng, i) {
  const life = world.life;
  if (life[i] <= 1) {
    vanish(world, i);
    return true;
  }
  life[i]--;
  const off = world.neighborOffsets;
  for (let k = 0; k < 8; k++) {
    const j = i + off[k];
    if (world.type[j] === MAT.METHANE) {
      world.transform(j, MAT.BURNING_METHANE, initialLife(MAT.BURNING_METHANE, rng.nextU32()));
      world.temp[j] = spawnTemp(MAT.BURNING_METHANE, 0);
    }
  }
  const j = sampleNeighbor(world, rng, i);
  ignite(world, rng, j, world.type[j]);
  if (world.blast) {
    const stride = world.stride;
    addBlastPower(world.blast, (i % stride) - 1, Math.floor(i / stride) - 1, METHANE_POWER);
  }
  return false;
}

// Duman: yalnız açık bölgede söner (kapalı bölgede birikir; CLOSED_BIT'i basınç geçişi yazar).
function reactSmoke(world, i) {
  if ((world.flags[i] & CLOSED_BIT) !== 0) return false;
  const life = world.life;
  if (life[i] <= 1) {
    vanish(world, i);
    return true;
  }
  life[i]--;
  return false;
}
```

  `react` switch'ine:

```js
    case MAT.BURNING_METHANE:
      return reactBurningMethane(world, rng, i);
    case MAT.SMOKE:
      return reactSmoke(world, i);
```

- [ ] **Step 5: Patlamada gaz yanıcıları ve halka dumanı**

`explosions.js` → `BLAST`'a `SMOKE_CHANCE: 0.25,` ekle. `applyExplosion`'da boş hücre dalını ve gaz dalını şöyle değiştir:

```js
      if (k === KIND.NONE) {
        if (d < r * 0.5) {
          if (chance(rng, BLAST.FIRE_CHANCE)) world.set(i, FIRE, rng.nextU32() & 255, lifeOf(rng, FIRE), 0, Math.max(temp[i], SPAWN_TEMP[FIRE]));
        } else if (chance(rng, BLAST.SMOKE_CHANCE)) {
          world.set(i, MAT.SMOKE, rng.nextU32() & 255, lifeOf(rng, MAT.SMOKE), 0, temp[i]);
        }
        continue;
      }
      if (k === KIND.GAS) {
        if (FLAMMABILITY[t] !== 0 && sv >= BLAST.CHAIN_MIN) world.transform(i, BURNS_INTO[t], lifeOf(rng, BURNS_INTO[t]));
        continue;
      }
```

- [ ] **Step 6: Seçici, etiket, yardım**

`catalog.js` `PICKER`'a:

```js
  { key: 'METHANE', mat: MAT.METHANE, label: 'Metan', shortcut: 'n', category: 'gas' },
  { key: 'SMOKE', mat: MAT.SMOKE, label: 'Duman', shortcut: 'u', category: 'gas' },
```

`EXTRA_LABELS`'a `[MAT.BURNING_METHANE]: 'Yanan metan',`. `index.html`'e `<tr><th scope="row"><kbd>N</kbd> <kbd>U</kbd></th><td>Metan, Duman</td></tr>`.

- [ ] **Step 7: Testlerin geçtiğini gör, tüm testler**

Run: `node --test tests/gases.test.js tests/reactions.test.js tests/explosions.test.js` → PASS. Run: `npm test` → `# fail 0`. Ateş dumanı mevcut bir reaksiyon testinde gaz sayımını değiştirirse (ör. "kaynaksız ateş temizlenir"), testi DUMAN'ı da hesaba katacak biçimde güncelle; davranış değişikliğini ledger'a `Ruling:` olarak yaz.

- [ ] **Step 8: Dokümanlar, commit, push**

- `docs/MATERIALS.md`: Metan, Yanan metan, Duman (§2 ve §5.6 "Gazlar ve duman"). §3'teki ateş ve yanma satırlarına duman notu.
- `CHANGELOG.md`.
- `js/app/releases.js`:
  - `'Metan (N): havadan hafif, yanıcı gaz; yoğun cep tutuşunca patlar.'`
  - `'Duman (U): yangınlardan ve patlamalardan çıkar, açık havada dağılır.'`

```bash
git add js/engine/materials.js js/engine/reactions.js js/engine/explosions.js js/app/catalog.js index.html tests/gases.test.js tests/reactions.test.js docs/MATERIALS.md docs/DEVELOPMENT.md CHANGELOG.md js/app/releases.js
git commit -m "Metan, yanan metan ve Duman; yangın ve patlama dumanı"
git push origin main
```

---

### Task 6 (Görev 6): Kapalı bölge basıncı

**Files:**
- Create: `js/engine/pressure.js`
- Modify: `js/engine/simulation.js` (geçiş 4, `getStats().pressure`, geri almada zorunlu tarama)
- Modify: `js/main.js`, `index.html` (debug: kapalı bölge ve en yüksek basınç)
- Test: `tests/pressure.test.js` (yeni)
- Docs: `docs/MATERIALS.md` §5.7, `docs/DECISIONS.md` ADR-018, `docs/ARCHITECTURE.md`, `CHANGELOG.md`, `js/app/releases.js`

**Interfaces:**
- Consumes: `requestExplosion`, `BLAST_KIND.PRESSURE` (Görev 1); `CLOSED_BIT` (Görev 5); `MATERIALS.STRENGTH`, `KIND`, `GAS_IDS`.
- Produces:
  - `pressure.js`: `PRESSURE` sabitleri, `createPressureState(width, height) → state`, `resetPressureState(state)`, `stepPressure(world, state, blast, tick)`;
  - `state` alanları `regions`, `closed`, `maxP` (son tarama), `forceScan` (boolean);
  - `Simulation._pressure`, `getStats().pressure = { regions, closed, maxP }`.

- [ ] **Step 1: Başarısız testleri yaz**

`tests/pressure.test.js`:

```js
// Kapalı bölge basıncı (ADR-018): tarama, bit4, P formülü, katı tavan şartı, en zayıf tavan hücresinden patlama.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT, CLOSED_BIT } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { BLAST, BLAST_KIND } from '../js/engine/explosions.js';
import { countMaterial, runTicks, hashView } from './helpers.js';

const pressureBlasts = (sim) => sim.getStats().blastTotals[BLAST_KIND.PRESSURE];

// İç boşluk (x0..x1, y0..y1); duvarlar 1 hücre `wall`, kapak `lid` (null = açık üst).
function box(sim, x0, y0, x1, y1, wall, lid = wall) {
  for (let y = y0 - 1; y <= y1 + 1; y++) {
    sim.setCell(x0 - 1, y, wall);
    sim.setCell(x1 + 1, y, wall);
  }
  for (let x = x0 - 1; x <= x1 + 1; x++) sim.setCell(x, y1 + 1, wall);
  if (lid !== null) for (let x = x0 - 1; x <= x1 + 1; x++) sim.setCell(x, y0 - 1, lid);
}

// Kutunun su satırlarını (y0..y1) her tick 150 °C'de tutar (dış ısıtıcı); ilk basınç patlamasının tick'i ya da -1.
function boilUntilBurst(sim, x0, x1, y0, y1, ticks) {
  for (let t = 0; t < ticks; t++) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (sim.getCell(x, y).material === MAT.WATER) sim.setTemp(x, y, 150);
    sim.step();
    if (pressureBlasts(sim) > 0) return t;
  }
  return -1;
}

// İç 4 × 3: üst satır hava, alt iki satır su. Küçük hacim cam (2), taş (8) ve metal (20) eşiklerini ayırır:
// cam hacim ~6'da, taş ~8'de patlar; metal tamamen buharla (hacim 12, P ≈ 10) bile G ≈ 56 < 100 kalır.
function jar(wall, lid = wall) {
  const sim = new Simulation({ width: 30, height: 30, seed: `jar-${wall}-${lid}` });
  box(sim, 13, 21, 16, 23, wall, lid);
  for (let y = 22; y <= 23; y++) for (let x = 13; x <= 16; x++) sim.setCell(x, y, MAT.WATER);
  return sim;
}

test('oda sıcaklığındaki kapalı kutu patlamaz; iç hücreler bit4 alır, açık hava almaz', () => {
  const sim = new Simulation({ width: 40, height: 30 });
  box(sim, 10, 10, 20, 18, MAT.STONE);
  runTicks(sim, 100);
  assert.equal(pressureBlasts(sim), 0);
  assert.ok((sim.world.flags[sim.world.index(15, 14)] & CLOSED_BIT) !== 0);
  assert.equal(sim.world.flags[sim.world.index(30, 5)] & CLOSED_BIT, 0);
  assert.ok(sim.getStats().pressure.closed >= 1);
});

test('kapalı cam kavanozda kaynayan su kavanozu patlatır; aynı kavanoz açıkken patlamaz', () => {
  const closed = jar(MAT.GLASS);
  const t = boilUntilBurst(closed, 13, 16, 22, 23, 2000);
  assert.ok(t >= 0, 'kapalı kavanoz patlamalı');
  const open = new Simulation({ width: 30, height: 30, seed: 'jar-open' });
  box(open, 13, 21, 16, 23, MAT.GLASS, null);
  for (let y = 22; y <= 23; y++) for (let x = 13; x <= 16; x++) open.setCell(x, y, MAT.WATER);
  assert.equal(boilUntilBurst(open, 13, 16, 22, 23, 2000), -1);
});

test('taş kutu camdan çok daha fazla basınç ister; küçük metal kutu dayanır', () => {
  const glassT = boilUntilBurst(jar(MAT.GLASS), 13, 16, 22, 23, 3000);
  const stoneT = boilUntilBurst(jar(MAT.STONE), 13, 16, 22, 23, 3000);
  const metalT = boilUntilBurst(jar(MAT.METAL), 13, 16, 22, 23, 3000);
  assert.ok(glassT >= 0);
  assert.ok(stoneT === -1 || stoneT > glassT, `cam ${glassT}, taş ${stoneT}`);
  assert.equal(metalT, -1, 'metal kutu dayanmalı');
});

test('sıvı tavanlı bölge basınçlı sayılmaz (gaz sıvının içinden kabarcıkla çıkar)', () => {
  const sim = new Simulation({ width: 30, height: 30 });
  box(sim, 10, 10, 19, 19, MAT.STONE);
  for (let y = 10; y <= 13; y++) for (let x = 10; x <= 19; x++) sim.setCell(x, y, MAT.WATER);
  for (let y = 14; y <= 19; y++) for (let x = 10; x <= 19; x++) {
    sim.setCell(x, y, MAT.STEAM);
    sim.setTemp(x, y, 400);
  }
  sim.step();
  assert.equal(pressureBlasts(sim), 0);
});

test('patlama tavanın en zayıf, en üstteki hücresinden olur', () => {
  const sim = new Simulation({ width: 30, height: 30 });
  box(sim, 10, 10, 19, 15, MAT.STONE);
  sim.setCell(16, 9, MAT.GLASS); // kapakta cam
  sim.setCell(20, 14, MAT.GLASS); // yan duvarda cam: tavan değil
  for (let y = 10; y <= 15; y++) for (let x = 10; x <= 19; x++) {
    sim.setCell(x, y, MAT.STEAM);
    sim.setTemp(x, y, 300);
  }
  sim.step();
  assert.equal(pressureBlasts(sim), 1);
  const h = (sim.view.blasts.latest - 1) % BLAST.RING;
  assert.equal(sim.view.blasts.x[h], 16);
  assert.equal(sim.view.blasts.y[h], 9);
});

test('duman kapalı bölgede birikir, açık havada söner', () => {
  const sim = new Simulation({ width: 40, height: 30 });
  box(sim, 5, 10, 14, 18, MAT.STONE);
  for (let x = 6; x <= 13; x++) {
    sim.setCell(x, 12, MAT.SMOKE);
    sim.setCell(x + 20, 12, MAT.SMOKE);
  }
  runTicks(sim, 700);
  assert.equal(countMaterial(sim, MAT.SMOKE), 8, 'yalnız kapalıdakiler kalır');
});

test('kapalı odada süren yangın basınç patlaması spam\'i yapmaz (Review Focus 3)', () => {
  for (const [wall, max] of [[MAT.METAL, 0], [MAT.STONE, 3]]) {
    const sim = new Simulation({ width: 50, height: 30, seed: `room-${wall}` });
    box(sim, 10, 8, 39, 20, wall);
    for (let y = 17; y <= 20; y++) for (let x = 15; x <= 34; x++) sim.setCell(x, y, MAT.WOOD);
    sim.setCell(24, 16, MAT.FIRE);
    runTicks(sim, 3000);
    assert.ok(pressureBlasts(sim) <= max, `${wall}: ${pressureBlasts(sim)} basınç patlaması`);
  }
});

test('basınç taraması deterministiktir ve geri almadan sonra yeniden yapılır', () => {
  const run = () => {
    const sim = jar(MAT.GLASS);
    boilUntilBurst(sim, 13, 16, 22, 23, 600);
    runTicks(sim, 100);
    return hashView(sim);
  };
  assert.equal(run(), run());
});
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `node --test tests/pressure.test.js`
Expected: FAIL. `getStats().pressure` tanımsız, basınç patlaması yok.

- [ ] **Step 3: `pressure.js`'i yaz**

```js
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
  POWER_K: 0.5, // basınç → patlama gücü
  G_MAX: 400,
  W_STEAM: 8, // buharın basınç ağırlığı (suyun genleşmesi)
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
export function stepPressure(world, s, blast, tick) {
  if (s.forceScan || tick % PRESSURE.PERIOD === 0) {
    s.forceScan = false;
    scanRegions(world, s, blast);
  }
}
```

- [ ] **Step 4: `simulation.js`'e bağla**

```js
import { createPressureState, resetPressureState, stepPressure } from './pressure.js';
```

Constructor'da `this._blast = …` satırından sonra `this._pressure = createPressureState(width, height); // geçiş 4 (basınç)`.

`_tickOnce`'ta `stepExplosions(...)` satırından **önce**:

```js
    // Geçiş 4 — basınç (pressure.js): kapalı bölgeler; patlama istekleri geçiş 5'te işlenir.
    stepPressure(w, this._pressure, this._blast, this.tick);
```

`clear()`, `loadScene()` ve `undo()` içinde `resetPressureState(this._pressure);` (geri almada hemen yeniden tarama). `getStats()`'a:

```js
      pressure: { regions: this._pressure.regions, closed: this._pressure.closed, maxP: this._pressure.maxP },
```

- [ ] **Step 5: Debug paneli**

`index.html` debug listesine `<div><dt>Basınç</dt><dd data-stat="pressure">–</dd></div>` ve `<div><dt>Patlama</dt><dd data-stat="blasts">–</dd></div>` ekle. `js/main.js` debug bloğuna:

```js
    values.pressure = `${s.pressure.closed} kapalı · P ${s.pressure.maxP.toFixed(2)}`;
    values.blasts = `${s.blastsThisTick} · parça ${s.debris}`;
```

- [ ] **Step 6: Testlerin geçtiğini gör**

Run: `node --test tests/pressure.test.js tests/gases.test.js tests/explosions.test.js`
Expected: PASS. "taş kutu" testi zamanlamaya duyarlıdır. Cam patlamıyorsa önce `P_BURST` ve `POWER_K`'yı spec §2.9'daki sırayla ayarla, ölçümü ve kararı ledger'a yaz. Testin anlamı değişmez: cam önce, metal hiç.

- [ ] **Step 7: Tüm testler ve performans**

Run: `npm test` → `# fail 0`. Run: `node tools/bench.js` → 400×225 medyanı Görev 1 başlangıcının en fazla +0,25 ms üstünde olmalı. Aşarsa `PERIOD`'u 8 yap ve ölçümü ledger'a yaz.

- [ ] **Step 8: Dokümanlar, commit, push**

- `docs/MATERIALS.md` §5.7 "Kapalı bölge basıncı" (spec §2.6); `flags` bit4 açıklaması.
- `docs/DECISIONS.md` → **ADR-018 — Kapalı bölge basıncı**. Alternatifler: hücre başına basınç alanı, yalnız olay tabanlı. Ölçüm (spike + bu görevin bench sonucu).
- `docs/ARCHITECTURE.md`: tick sırası geçiş 4–6 ve yeni modüller.
- `CHANGELOG.md`.
- `js/app/releases.js`: `'Dar alanda basınç: kapalı bir kapta biriken buhar ya da sıcak gaz en zayıf noktasından patlar; cam kolay, taş zor, metal neredeyse hiç.'`

```bash
git add js/engine/pressure.js js/engine/simulation.js js/main.js index.html tests/pressure.test.js docs/MATERIALS.md docs/DECISIONS.md docs/ARCHITECTURE.md docs/DEVELOPMENT.md CHANGELOG.md js/app/releases.js
git commit -m "Kapalı bölge basıncı: tarama, bit4, katı tavan şartı ve en zayıf noktadan patlama"
git push origin main
```

---

### Task 7 (Görev 7): Ani buharlaşma (buhar patlaması)

**Files:**
- Modify: `js/engine/pressure.js` (ani buharlaşma blokları)
- Modify: `js/engine/reactions.js` (`emitSteam` → `noteSteam`)
- Modify: `js/engine/simulation.js` (`world.flash`, snapshot, çevirme/temizle)
- Test: `tests/flash.test.js` (yeni)
- Docs: `docs/MATERIALS.md` §5.8, `CHANGELOG.md`, `js/app/releases.js`

**Interfaces:**
- Consumes: `requestExplosion`, `BLAST_KIND.STEAM` (Görev 1), `stepPressure` (Görev 6).
- Produces:
  - `pressure.js`: `PRESSURE.FLASH_BLOCK = 8`, `FLASH_DECAY = 0.75`, `FLASH_MIN = 6`, `FLASH_POWER = 1`;
  - `createFlashState(width, height) → flash`, `resetFlashState(flash)`, `copyFlashState(dst, src)`, `noteSteam(flash, x, y)`;
  - `stepPressure(world, s, blast, tick, flash)` (yeni 5. parametre; her tick ani buharlaşmayı değerlendirir);
  - `Simulation._flash`, `world.flash`.

- [ ] **Step 1: Başarısız testleri yaz**

`tests/flash.test.js`:

```js
// Ani buharlaşma: lava/erimiş metale su patlar; ağır ağır kaynayan tencere patlamaz; mevcut sahnelerde
// istenmeyen patlama yok (Review Focus 4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { BLAST_KIND } from '../js/engine/explosions.js';
import { getScene } from '../js/scenes/index.js';
import { countMaterial, runTicks } from './helpers.js';

const steamBlasts = (sim) => sim.getStats().blastTotals[BLAST_KIND.STEAM];

function fill(sim, x0, y0, x1, y1, mat) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) sim.setCell(x, y, mat);
}

test('lava dökülen su buhar patlaması yapar', () => {
  const sim = new Simulation({ width: 60, height: 40, seed: 'flash' });
  fill(sim, 10, 30, 49, 39, MAT.LAVA);
  fill(sim, 20, 22, 39, 27, MAT.WATER);
  runTicks(sim, 300);
  assert.ok(steamBlasts(sim) >= 1);
});

test('erimiş metale dökülen su da patlar', () => {
  const sim = new Simulation({ width: 60, height: 40, seed: 'flash-metal' });
  fill(sim, 10, 34, 49, 39, MAT.MOLTEN_METAL);
  fill(sim, 20, 26, 39, 31, MAT.WATER);
  runTicks(sim, 300);
  assert.ok(steamBlasts(sim) >= 1);
});

test('ağır ağır ısınan tencere 2000 tick boyunca patlamaz', () => {
  const sim = new Simulation({ width: 40, height: 30, seed: 'pot' });
  fill(sim, 12, 26, 27, 26, MAT.STONE); // taban
  fill(sim, 12, 18, 12, 25, MAT.STONE);
  fill(sim, 27, 18, 27, 25, MAT.STONE);
  fill(sim, 13, 20, 26, 25, MAT.WATER);
  fill(sim, 12, 27, 27, 29, MAT.WOOD);
  sim.setCell(11, 29, MAT.FIRE);
  runTicks(sim, 2000);
  assert.equal(steamBlasts(sim), 0);
});

test('mevcut sahnelerde istenmeyen basınç ya da buhar patlaması yok (Review Focus 4)', () => {
  for (const id of ['glacier', 'cave', 'oasis', 'hourglass']) {
    const sim = new Simulation({ width: 200, height: 120, seed: 'rf4' });
    sim.loadScene(getScene(id), 'rf4');
    runTicks(sim, 3000);
    const t = sim.getStats().blastTotals;
    assert.equal(t[BLAST_KIND.STEAM] + t[BLAST_KIND.PRESSURE], 0, `${id}: istenmeyen patlama`);
  }
  const foundry = new Simulation({ width: 200, height: 120, seed: 'rf4' });
  foundry.loadScene(getScene('foundry'), 'rf4');
  const stone0 = countMaterial(foundry, MAT.STONE);
  runTicks(foundry, 4000);
  assert.ok(countMaterial(foundry, MAT.STONE) >= stone0 * 0.99, 'dökümhane kalıpları kırılmaz');
});
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `node --test tests/flash.test.js`
Expected: FAIL. İlk iki test, buhar patlaması olmadığı için düşer.

- [ ] **Step 3: `pressure.js` — ani buharlaşma**

`PRESSURE`'a:

```js
  FLASH_BLOCK: 8, // ani buharlaşma blok kenarı (hücre)
  FLASH_DECAY: 0.75, // blok sayacının tick başına çarpanı (kısa pencere)
  FLASH_MIN: 6, // patlama eşiği (yarılanan sayaç)
  FLASH_POWER: 1, // dönüşüm başına güç
```

Ekle:

```js
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

// emitSteam her dönüşümü buraya yazar.
export function noteSteam(f, x, y) {
  const B = PRESSURE.FLASH_BLOCK;
  const b = Math.floor(y / B) * f.bw + Math.floor(x / B);
  if (f.isActive[b] === 0) {
    f.isActive[b] = 1;
    f.active[f.activeCount++] = b;
  }
  f.count[b] += 1;
  f.sx[b] += x;
  f.sy[b] += y;
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
```

`stepPressure` imzasını `stepPressure(world, s, blast, tick, flash = null)` yap. Gövdenin sonuna `if (flash) stepFlash(flash, blast);` ekle.

- [ ] **Step 4: `emitSteam` kancası**

`reactions.js`:

```js
import { noteSteam } from './pressure.js';
```

```js
export function emitSteam(world, i) {
  world.transform(i, STEAM, 0);
  world.temp[i] = STEAM_TEMP;
  if (world.flash) {
    const stride = world.stride;
    noteSteam(world.flash, (i % stride) - 1, Math.floor(i / stride) - 1); // ani buharlaşma (pressure.js)
  }
}
```

Yorumdaki "Alt proje 2: basınç kaynağı buraya bağlanacak" cümlesini "Ani buharlaşma sayacı (pressure.js) buradan beslenir." ile değiştir.

> Döngüsel import kontrolü: `pressure.js` → `explosions.js` → `materials.js`, `climate.js`. `reactions.js` → `pressure.js` ve `explosions.js`. `heat.js` → `reactions.js` ve `explosions.js`. Çevrim yok.

- [ ] **Step 5: `simulation.js`**

```js
import { createPressureState, resetPressureState, stepPressure, createFlashState, resetFlashState, copyFlashState } from './pressure.js';
```

Constructor: `this._flash = createFlashState(width, height); this.world.flash = this._flash;`. Geçiş 4 çağrısı: `stepPressure(w, this._pressure, this._blast, this.tick, this._flash);`. `clear()`, `loadScene()` ve `flipVertical()` içinde `resetFlashState(this._flash);`. Snapshot nesnesine `flash: createFlashState(this.world.width, this.world.height),`; `_capture()` sonuna `copyFlashState(snap.flash, this._flash);`; `undo()` içinde `copyFlashState(this._flash, snap.flash);`.

- [ ] **Step 6: Testlerin geçtiğini gör**

Run: `node --test tests/flash.test.js tests/pressure.test.js tests/thermal.test.js tests/reactions.test.js`
Expected: PASS.

Ayar sırası (gerekirse; her değişikliği ölçümüyle ledger'a yaz):
1. Lav testi düşerse `FLASH_DECAY` 0,8 → 0,85.
2. Tencere testi düşerse `FLASH_MIN` 6 → 8.
3. Review Focus 4'te Buzul ya da Mağara patlıyorsa önce hangi blokta olduğunu yazdır, sonra eşiği yükselt.

- [ ] **Step 7: Tüm testler, dokümanlar, commit, push**

Run: `npm test` → `# fail 0`.

Dokümanlar:
- `docs/MATERIALS.md` §5.8 "Ani buharlaşma"; su ve lav satırlarına not.
- `CHANGELOG.md`.
- `js/app/releases.js`: `'Buhar patlaması: lava ya da erimiş metale su dökülünce su bir anda buharlaşıp patlar.'`

```bash
git add js/engine/pressure.js js/engine/reactions.js js/engine/simulation.js tests/flash.test.js docs/MATERIALS.md docs/DEVELOPMENT.md CHANGELOG.md js/app/releases.js
git commit -m "Ani buharlaşma: lava ya da erimiş metale değen suyun buhar patlaması"
git push origin main
```

---
### Task 8 (Görev 8): Görseller — parçacık çizimi, parlama, sarsıntı

**Files:**
- Create: `js/render/effects.js`
- Modify: `js/render/pixels.js` (`drawDebris`, `drawDebrisThermal`)
- Modify: `js/render/renderer.js` (parçacıklar, parlama, sarsıntı)
- Test: `tests/effects.test.js` (yeni), `tests/render-pixels.test.js`, `tests/renderer.test.js`
- Docs: `CHANGELOG.md`, `js/app/releases.js`

**Interfaces:**
- Consumes: `view.debris` (Görev 2), `view.blasts` (Görev 1), `radiusOf` (Görev 1).
- Produces:
  - `effects.js`: `EFFECTS` sabitleri, `forEachNewBlast(blasts, lastSerial, fn) → latestSerial`, `shakeAmplitude(G) → px`, `flashAlpha(age, reducedMotion) → 0..1`, `shakeOffset(frame, amp, left, out) → out`;
  - `pixels.js`: `drawDebris(view, out, pal, ramps, glow) → hotCount`, `drawDebrisThermal(view, out, ramps)`;
  - `Renderer`: `_shakeLeft`, `_shakeAmp`, parlama listesi.

- [ ] **Step 1: Başarısız testleri yaz**

`tests/effects.test.js`:

```js
// Patlama görsel efektleri (saf hesaplar): yeni patlamaları bulma, parlama solması, sarsıntı genliği ve ofseti.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EFFECTS, forEachNewBlast, shakeAmplitude, flashAlpha, shakeOffset } from '../js/render/effects.js';

function ring(entries) {
  const n = 8;
  const b = { x: new Float32Array(n), y: new Float32Array(n), power: new Float32Array(n), serial: new Uint32Array(n), latest: 0 };
  for (const [x, y, p] of entries) {
    const h = b.latest % n;
    b.x[h] = x;
    b.y[h] = y;
    b.power[h] = p;
    b.latest++;
    b.serial[h] = b.latest;
  }
  return b;
}

test('forEachNewBlast yalnız yeni patlamaları sırayla verir; halka taşınca eskileri atlar', () => {
  const b = ring([[1, 1, 4], [2, 2, 9], [3, 3, 16]]);
  const seen = [];
  const last = forEachNewBlast(b, 1, (x, y, p) => seen.push([x, y, p]));
  assert.deepEqual(seen, [[2, 2, 9], [3, 3, 16]]);
  assert.equal(last, 3);
  const many = ring(Array.from({ length: 12 }, (_, k) => [k, k, k + 1]));
  const got = [];
  forEachNewBlast(many, 0, (x) => got.push(x));
  assert.deepEqual(got, [4, 5, 6, 7, 8, 9, 10, 11], 'halkada kalan son 8');
});

test('sarsıntı yalnız büyük patlamada; genlik √G ile artar ve üst sınırlı', () => {
  assert.equal(shakeAmplitude(EFFECTS.SHAKE_MIN - 1), 0);
  assert.ok(shakeAmplitude(100) > shakeAmplitude(64));
  assert.equal(shakeAmplitude(1e6), EFFECTS.SHAKE_MAX);
});

test('parlama FLASH_FRAMES karede söner; azaltılmış harekette yarı yoğunluk', () => {
  assert.equal(flashAlpha(0, false), 1);
  assert.equal(flashAlpha(0, true), 0.5);
  assert.equal(flashAlpha(EFFECTS.FLASH_FRAMES, false), 0);
  assert.ok(flashAlpha(2, false) > flashAlpha(4, false));
});

test('sarsıntı ofseti sınırlı, kalan kareyle söner, kare sıfırken 0', () => {
  const o = { x: 0, y: 0 };
  for (let f = 0; f < 50; f++) {
    shakeOffset(f, 6, EFFECTS.SHAKE_FRAMES, o);
    assert.ok(Math.abs(o.x) <= 6 && Math.abs(o.y) <= 6);
  }
  shakeOffset(3, 6, 0, o);
  assert.deepEqual(o, { x: 0, y: 0 });
});
```

`tests/render-pixels.test.js` sonuna:

```js
test('savrulan parçacıklar ızgaranın üstüne çizilir; sıcak parçacık akkor ve ışır', async () => {
  const { drawDebris } = await import('../js/render/pixels.js');
  const sim = new Simulation({ width: 10, height: 10 });
  const w = sim.world;
  const i = w.index(4, 4);
  w.set(i, MAT.SAND, 0, 0, 0, 900);
  sim._debris.launch(w, i, MAT.SAND, 0, 0);
  const out = new Uint32Array(100);
  const glow = new Uint32Array(100);
  const hot = drawDebris(sim.view, out, pal, ramps, glow);
  assert.equal(hot, 1);
  assert.notEqual(out[4 * 10 + 4], 0);
  assert.ok(glow[4 * 10 + 4] >>> 24 > 0);
});
```

(Dosyadaki `pal` ve `ramps` değişkenleri dosyanın başında tanımlıdır.)

Aynı dosyaya duman ve metan saydamlığı:

```js
test('duman yarı saydamdır ve ömrü azaldıkça soluklaşır; metan çok saydamdır', () => {
  const sim = new Simulation({ width: 4, height: 3 });
  sim.setCell(0, 0, MAT.SMOKE);
  sim.setCell(1, 0, MAT.SMOKE);
  sim.setCell(2, 0, MAT.METHANE);
  sim.world.life[sim.world.index(0, 0)] = 500;
  sim.world.life[sim.world.index(1, 0)] = 20;
  const out = render(sim);
  const alpha = (v) => v >>> 24;
  assert.ok(alpha(out[0]) < 255 && alpha(out[0]) > alpha(out[1]), 'taze duman yaşlıdan opak');
  assert.ok(alpha(out[2]) <= 100);
});
```

`tests/renderer.test.js`: sahte context'e `createRadialGradient() { return { addColorStop() {} }; }`, `arc() {}` ve `translate() {}` ekle; `save/restore` zaten var. Yeni test:

```js
test('büyük patlama sarsıntı başlatır; azaltılmış harekette sarsıntı yok', () => {
  const sim = new Simulation({ width: 40, height: 30 });
  sim.blastAt(20, 15, 10); // G 100 ≥ SHAKE_MIN
  const { renderer } = setup({ quality: 'high' });
  renderer.render(sim.view);
  assert.ok(renderer._shakeLeft > 0);
  const { renderer: calm } = setup({ quality: 'high' });
  calm.setReducedMotion(true);
  calm.render(sim.view);
  assert.equal(calm._shakeLeft, 0);
});
```

(`setup` bu dosyadaki mevcut yardımcıdır: sahte canvas, `Renderer`, kalite ve `resize`.)

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `node --test tests/effects.test.js tests/render-pixels.test.js tests/renderer.test.js`
Expected: FAIL. `effects.js` ve `drawDebris` yok.

- [ ] **Step 3: `effects.js`**

```js
// Patlama görsel efektleri (saf hesaplar; DOM'suz, Node'da test edilir). Renderer kullanır.
// - Parlama: her yeni patlama için yarıçapla orantılı, FLASH_FRAMES karede sönen ışık lekesi.
// - Sarsıntı: G ≥ SHAKE_MIN patlamada genlik SHAKE_K·√G (en fazla SHAKE_MAX px), SHAKE_FRAMES karede söner.
export const EFFECTS = Object.freeze({ FLASH_FRAMES: 6, SHAKE_MIN: 64, SHAKE_FRAMES: 12, SHAKE_MAX: 6, SHAKE_K: 0.4 });

// view.blasts halka tamponunda lastSerial'dan sonraki patlamalar için fn(x, y, power); en son sırayı döner.
export function forEachNewBlast(blasts, lastSerial, fn) {
  const latest = blasts.latest;
  const ring = blasts.serial.length;
  for (let s = Math.max(lastSerial, latest - ring) + 1; s <= latest; s++) {
    const h = (s - 1) % ring;
    if (blasts.serial[h] === s) fn(blasts.x[h], blasts.y[h], blasts.power[h]);
  }
  return latest;
}

export const shakeAmplitude = (G) => (G < EFFECTS.SHAKE_MIN ? 0 : Math.min(EFFECTS.SHAKE_MAX, EFFECTS.SHAKE_K * Math.sqrt(G)));

export function flashAlpha(age, reducedMotion) {
  if (age < 0 || age >= EFFECTS.FLASH_FRAMES) return 0;
  const a = 1 - age / EFFECTS.FLASH_FRAMES;
  return reducedMotion ? a * 0.5 : a;
}

// Karenin sarsıntı ofseti: kareye bağlı deterministik gürültü, genlik kalan kare sayısıyla doğrusal söner.
export function shakeOffset(frame, amp, left, out) {
  if (!(amp > 0) || !(left > 0)) {
    out.x = 0;
    out.y = 0;
    return out;
  }
  const f = (amp * Math.min(left, EFFECTS.SHAKE_FRAMES)) / EFFECTS.SHAKE_FRAMES;
  let h = Math.imul(frame + 1, 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  out.x = ((h & 255) / 127.5 - 1) * f;
  out.y = (((h >>> 8) & 255) / 127.5 - 1) * f;
  return out;
}
```

- [ ] **Step 4: `palette.js` ve `pixels.js`**

`palette.js`:
- `DYN`'e `SMOKE: 7, HAZE: 8` ekle;
- tabloya `DYNAMIC[MAT.SMOKE] = DYN.SMOKE;` ve `DYNAMIC[MAT.METHANE] = DYN.HAZE;` ekle.

`pixels.js` → `fillPixels` switch'ine, `default`'tan önce:

```js
        case DYN.SMOKE: {
          // Duman yarı saydam; ömrü azaldıkça soluklaşır (alfa 70..190).
          const f = life[i] / MAX_LIFE[t];
          out[o] = withAlpha(pal[t * SHADES + (variant[i] & SHADE_MASK)], (70 + 120 * (f > 1 ? 1 : f)) | 0, littleEndian);
          break;
        }
        case DYN.HAZE:
          out[o] = withAlpha(pal[t * SHADES + (variant[i] & SHADE_MASK)], 80, littleEndian); // metan: çok saydam
          break;
```

(`littleEndian` fonksiyonun başında `ramps`'ten alınır; yoksa destructuring'e ekle.)

`pixels.js` dosya sonuna:

```js
// Savrulan parçacıklar (ızgaradan sonra çizilir): malzeme rengi; ≥ INC_START °C akkor ve ışıma. Dönüş: akkor sayısı.
export function drawDebris(view, out, pal, ramps, glow = null) {
  const d = view.debris;
  if (!d || d.count === 0) return 0;
  const { width, height } = view;
  const { incandescent, littleEndian } = ramps;
  let hot = 0;
  for (let k = 0; k < d.count; k++) {
    const x = Math.floor(d.x[k]);
    const y = Math.floor(d.y[k]);
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const o = y * width + x;
    let c = pal[d.type[k] * SHADES + (d.variant[k] & SHADE_MASK)];
    const T = d.temp[k];
    if (T >= INC_START) {
      hot++;
      const f = T >= INC_FULL ? 1 : (T - INC_START) / (INC_FULL - INC_START);
      const h = incandescent[clampRamp((((T > INC_MAX ? INC_MAX : T) - INC_START) * RAMP_MAX) / (INC_MAX - INC_START))];
      c = mixPacked(c, h, f);
      if (glow) glow[o] = withAlpha(h, (f * 150) | 0, littleEndian);
    }
    out[o] = c;
  }
  return hot;
}

// Termal görünümde parçacıklar sıcaklık rampasıyla.
export function drawDebrisThermal(view, out, ramps) {
  const d = view.debris;
  if (!d || d.count === 0) return;
  const { width, height } = view;
  for (let k = 0; k < d.count; k++) {
    const x = Math.floor(d.x[k]);
    const y = Math.floor(d.y[k]);
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const T = d.temp[k];
    const idx = T <= -40 ? 0 : T >= 1200 ? 1240 : Math.round(T) + 40;
    out[y * width + x] = ramps.thermal[THERMAL_LUT[idx]];
  }
}
```

- [ ] **Step 5: `renderer.js`**

İmportlar:

```js
import { fillPixels, fillThermal, drawDebris, drawDebrisThermal } from './pixels.js';
import { EFFECTS, forEachNewBlast, shakeAmplitude, flashAlpha, shakeOffset } from './effects.js';
import { radiusOf } from '../engine/explosions.js';
```

Constructor sonuna:

```js
    this._lastBlast = 0; // view.blasts'ta görülen son patlama sırası
    this._flashX = new Float32Array(8);
    this._flashY = new Float32Array(8);
    this._flashR = new Float32Array(8);
    this._flashStart = new Int32Array(8).fill(-1000);
    this._flashHead = 0;
    this._shakeAmp = 0;
    this._shakeLeft = 0;
    this._shake = { x: 0, y: 0 };
```

`_refresh` içinde termal dalda `fillThermal(...)` satırından sonra `drawDebrisThermal(view, this.pixels, this.ramps);`. Normal dalda `this._hotCells = fillPixels(...)` satırından sonra:

```js
    this._hotCells += drawDebris(view, this.pixels, this.palette, this.ramps, wantGlow ? this.glowPixels : null);
```

Yeni metot:

```js
  // Yeni patlamalar: parlama kaydı ve (azaltılmış hareket kapalıysa) sarsıntı.
  _collectBlasts(view) {
    if (!view.blasts) return;
    this._lastBlast = forEachNewBlast(view.blasts, this._lastBlast, (x, y, G) => {
      const h = this._flashHead++ % 8;
      this._flashX[h] = x;
      this._flashY[h] = y;
      this._flashR[h] = radiusOf(G);
      this._flashStart[h] = this.frame;
      const amp = this.reducedMotion ? 0 : shakeAmplitude(G);
      if (amp > 0) {
        this._shakeAmp = Math.max(this._shakeLeft > 0 ? this._shakeAmp : 0, amp);
        this._shakeLeft = EFFECTS.SHAKE_FRAMES;
      }
    });
  }

  _drawFlashes(ctx, ox, oy, cw, ch) {
    if (this.quality === 'low' || this.viewMode === 'thermal' || typeof ctx.createRadialGradient !== 'function') return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let h = 0; h < 8; h++) {
      const a = flashAlpha(this.frame - this._flashStart[h], this.reducedMotion);
      if (a <= 0) continue;
      const cx = ox + (this._flashX[h] + 0.5) * cw;
      const cy = oy + (this._flashY[h] + 0.5) * ch;
      const rad = Math.max(cw, this._flashR[h] * cw * 1.4);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, `rgba(255, 250, 225, ${a})`);
      g.addColorStop(0.4, `rgba(255, 190, 80, ${a * 0.5})`);
      g.addColorStop(1, 'rgba(255, 120, 20, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.restore();
  }
```

`render(view)` içinde `this._ensureLayout();` satırından sonra `this._collectBlasts(view);`. Çizim bloğunu sarsıntı ofsetiyle değiştir:

```js
    if (l.drawW > 0 && l.drawH > 0) {
      const s = shakeOffset(this.frame, this._shakeAmp * this.dpr, this.reducedMotion ? 0 : this._shakeLeft, this._shake);
      if (this._shakeLeft > 0) this._shakeLeft--;
      const ox = Math.round(l.offsetX + s.x);
      const oy = Math.round(l.offsetY + s.y);
      this._ensureBackground(view);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.background, ox, oy, l.drawW, l.drawH);
      ctx.imageSmoothingEnabled = false; // canvas resize bu ayarı sıfırlar; her karede set edilir
      ctx.drawImage(this.buffer, ox, oy, l.drawW, l.drawH);
      if (this._glowReady) this._drawGlow(ctx, ox, oy, l.drawW, l.drawH);
      this._drawFlashes(ctx, ox, oy, l.drawW / this.gridW, l.drawH / this.gridH);
      if (this.preview.visible) this._drawPreview();
    }
```

`capture()` sarsıntı ve parlama kullanmaz (mevcut hâliyle kalır).

- [ ] **Step 6: Testlerin geçtiğini gör, tüm testler**

Run: `node --test tests/effects.test.js tests/render-pixels.test.js tests/renderer.test.js` → PASS. Run: `npm test` → `# fail 0`.

- [ ] **Step 7: Tarayıcı kontrolü**

`node tools/serve.js 8080` açıkken `http://localhost:8080/?debug=1` adresinde konsolda:

```js
const { sim } = window.__strata;
sim.blastAt(Math.floor(sim.view.width / 2), Math.floor(sim.view.height * 0.6), 10);
```

Beklenen:
- parlama, ışıyan parçacıklar ve kısa sarsıntı görünür;
- konsol temiz;
- azaltılmış hareket emülasyonunda sarsıntı yoktur.

Playwright kullanılamıyorsa bu adımı ledger'a "manuel kontrol bekliyor" olarak yaz ve devam et.

- [ ] **Step 8: Dokümanlar, commit, push**

- `CHANGELOG.md`.
- `js/app/releases.js`: `'Patlama görselleri: parlama, akkor savrulan parçalar ve büyük patlamalarda kısa sarsıntı (azaltılmış harekette kapalı).'`
- `docs/ARCHITECTURE.md` render katmanları listesine parçacıklar ve parlama.

```bash
git add js/render/effects.js js/render/pixels.js js/render/renderer.js tests/effects.test.js tests/render-pixels.test.js tests/renderer.test.js docs/ARCHITECTURE.md docs/DEVELOPMENT.md CHANGELOG.md js/app/releases.js
git commit -m "Patlama görselleri: parçacık çizimi, parlama ve tuval sarsıntısı"
git push origin main
```

---

### Task 9 (Görev 9): Patlat aracı ve arayüz

**Files:**
- Modify: `js/app/catalog.js` (`BLAST` aracı, `p`)
- Modify: `js/app/pointer.js` (Patlat: tek tık tek patlama)
- Modify: `js/app/controls.js` (`paintSwatch` Patlat deseni)
- Modify: `index.html` (yardım satırı)
- Test: `tests/pointer.test.js`, `tests/app-modules.test.js`, `tests/scenes.test.js` (Review Focus 5)
- Docs: `README.md` (kısayollar), `CHANGELOG.md`, `js/app/releases.js`

**Interfaces:**
- Consumes: `sim.blastAt(x, y, size)` (Görev 1), `app.brush()` → `{ material, tool, size, shape, replace }` (mevcut).
- Produces: `PICKER` girişi `{ key: 'BLAST', mat: null, tool: 'blast', label: 'Patlat', shortcut: 'p', category: 'tool' }`. `pointer.js`'te `tool === 'blast'` iken pointerdown'da stroke başlar ve `blastAt` çağrılır; sürükleme ve basılı tutma tekrarlamaz.

- [ ] **Step 1: Başarısız testleri yaz**

`tests/pointer.test.js` sonuna (dosyadaki `fakeCanvas`, `fakeRenderer`, `ev`, `W`, `H` yardımcılarıyla):

```js
test('Patlat: tek tık tek patlama; sürükleme ve basılı tutma tekrarlamaz; stroke geri alınır', () => {
  const sim = new Simulation({ width: W, height: H });
  for (let x = 0; x < W; x++) sim.setCell(x, H - 1, MAT.STONE);
  const canvas = fakeCanvas();
  attachPointer(canvas, { renderer: fakeRenderer, sim, getBrush: () => ({ material: 0, tool: 'blast', size: 4, shape: 'circle', replace: false }) });
  canvas.handlers.pointerdown(ev(20, H - 3));
  const total = () => sim.getStats().blastTotals[1];
  assert.equal(total(), 1);
  canvas.handlers.pointermove(ev(25, H - 3, { buttons: 1 }));
  runTicks(sim, 5);
  assert.equal(total(), 1, 'sürükleme ve tick yeni patlama yapmaz');
  canvas.handlers.pointerup(ev(25, H - 3));
  assert.equal(sim.canUndo, true);
});
```

`tests/app-modules.test.js` (ya da catalog testlerinin bulunduğu dosya) içine:

```js
test('Patlat aracı Araç sekmesinde, kısayolu P', async () => {
  const { pickerByShortcut, pickerByKey } = await import('../js/app/catalog.js');
  const p = pickerByShortcut('p');
  assert.equal(p.key, 'BLAST');
  assert.equal(p.tool, 'blast');
  assert.equal(p.category, 'tool');
  for (const [k, key] of [['r', 'GUNPOWDER'], ['o', 'RUBBLE'], ['n', 'METHANE'], ['u', 'SMOKE'], ['d', 'DYNAMITE'], ['i', 'FUSE']]) assert.equal(pickerByShortcut(k)?.key, key, k);
  assert.ok(pickerByKey('BLAST'));
});
```

`tests/scenes.test.js` sonuna (Review Focus 5):

```js
test('kum saatinde Patlat değişmezleri bozmaz; kaynaklar dayanıklılığa göre kırılır, kırılan cam kuma döner', () => {
  const sim = load('hourglass', 'hg', 200, 220);
  const H = 220;
  const cx = 99;
  const sources0 = countMaterial(sim, MAT.CLONER) + countMaterial(sim, MAT.SINK);
  sim.blastAt(cx, Math.floor(H / 2), 8); // boğazın yanı: cam kırılır
  sim.blastAt(cx, hgGlassTop(H), 16); // üst kapak: çoğaltıcılar
  runTicks(sim, 400);
  assert.deepEqual(sim.world.checkInvariants(), []);
  assert.ok(countMaterial(sim, MAT.CLONER) + countMaterial(sim, MAT.SINK) < sources0, 'bazı kaynaklar kırılmalı');
  assert.equal(sim.getStats().debrisLost, 0);
});
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `node --test tests/pointer.test.js tests/app-modules.test.js tests/scenes.test.js`
Expected: FAIL. Patlat girişi yok; pointer boyamaya çalışır.

- [ ] **Step 3: Katalog ve desen**

`catalog.js` `PICKER`'a (`COOL`'dan sonra):

```js
  { key: 'BLAST', mat: null, tool: 'blast', label: 'Patlat', shortcut: 'p', category: 'tool' },
```

`controls.js` → `paintSwatch` araç dalını değiştir:

```js
    if (pick.tool === 'blast') {
      const dx = x - (SWATCH - 1) / 2; // araç: merkezden dışa beyaz-sarı-kırmızı patlama
      const dy = y - (SWATCH - 1) / 2;
      const u = Math.min(1, Math.sqrt(dx * dx + dy * dy) / (SWATCH / 2));
      px[k] = packRGBA(255, Math.round(240 - 170 * u), Math.round(200 - 190 * u), 255);
    } else if (pick.tool) {
```

(mevcut `if (pick.tool) {` satırı `else if (pick.tool) {` olur; gövdesi aynı kalır.)

- [ ] **Step 4: Pointer**

`pointer.js` → `pointerdown`'da `sim.beginStroke();` satırından itibaren:

```js
      sim.beginStroke();
      if (brush.tool === 'blast') {
        sim.blastAt(cell.x, cell.y, brush.size); // tek tık tek patlama; basılı tutma yok
      } else {
        sim.paintAt(cell.x, cell.y, brush);
        sim.setHold(cell.x, cell.y, brush);
      }
      onCursor(cell, e.pointerType);
```

`pointermove`'da `if (e.buttons === 0) { … }` bloğundan sonra:

```js
      if (active.brush.tool === 'blast') {
        onCursor(toCell(e, true), e.pointerType);
        return;
      }
```

- [ ] **Step 5: Yardım ve README**

`index.html` → `<tr><th scope="row"><kbd>P</kbd></th><td>Patlat (tıklanan yerde fırça boyutuna göre patlama; geri alınabilir)</td></tr>`. `README.md` kısayol tablosuna R, O, N, U, D, I, P satırları; "Özellikler"e patlama ve basınç maddesi.

- [ ] **Step 6: Testlerin geçtiğini gör, tüm testler**

Run: `node --test tests/pointer.test.js tests/app-modules.test.js tests/scenes.test.js` → PASS. Run: `npm test` → `# fail 0`.

- [ ] **Step 7: Dokümanlar, commit, push**

- `CHANGELOG.md`.
- `js/app/releases.js`: `'Patlat aracı (P): tıklanan yerde fırça boyutuna göre patlama; tek tık tek patlama, geri alınabilir.'`

```bash
git add js/app/catalog.js js/app/pointer.js js/app/controls.js index.html README.md tests/pointer.test.js tests/app-modules.test.js tests/scenes.test.js docs/DEVELOPMENT.md CHANGELOG.md js/app/releases.js
git commit -m "Patlat aracı: tek tık tek patlama, seçici deseni ve kısayollar"
git push origin main
```

---

### Task 10 (Görev 10): Volkanik gaz ve patlayan volkan

**Files:**
- Modify: `js/engine/simulation.js` (`configureMagma`)
- Modify: `js/engine/reactions.js` (`reactLava` volkanik gaz, `RATES.degas`, `state.degasBudget`, `DEGAS_BIT`)
- Modify: `js/scenes/volcano.js` (tıkaç, cep, yarığın yeri, gaz salan magma, çoğaltıcı bütçesi)
- Test: `tests/sources.test.js` ya da `tests/gases.test.js` (volkanik gaz), `tests/scenes.test.js` (volkan)
- Docs: `docs/MATERIALS.md`, `CHANGELOG.md`, `js/app/releases.js`, spec §6.1 uygulama notu

**Interfaces:**
- Consumes: `SMOKE`, `CLOSED_BIT` (Görev 5), basınç geçişi (Görev 6), ani buharlaşma (Görev 7), `configureSource` (mevcut).
- Produces:
  - `reactions.js`: `export const DEGAS_BIT = 32` (flags bit5: gaz salan magma), `RATES.degasU32` (tick başına olasılık × 2³²), `RATES.maxDegasPerTick = 8`, `state.degasBudget`;
  - `Simulation.configureMagma(x, y, { degas }) → boolean` (yalnız MAGMA hücresinde; `degas` mantıksal; undo noktası oluşturmaz).

- [ ] **Step 1: Başarısız testleri yaz**

`tests/gases.test.js` sonuna:

```js
test('gaz salan magmaya değen lav yavaşça sıcak dumana döner; işaretsiz magma gaz salmaz', async () => {
  const { DEGAS_BIT } = await import('../js/engine/reactions.js');
  const run = (degas) => {
    const sim = new Simulation({ width: 30, height: 30, seed: 'degas' });
    for (let y = 10; y < 30; y++) for (let x = 5; x < 25; x++) sim.setCell(x, y, MAT.LAVA);
    for (let y = 22; y < 28; y++) for (let x = 8; x < 22; x++) {
      sim.world.set(sim.world.index(x, y), MAT.MAGMA, 0, 0, 0, 1200);
      if (degas) assert.equal(sim.configureMagma(x, y, { degas: true }), true);
    }
    let smoke = 0;
    for (let t = 0; t < 6000; t++) {
      sim.step();
      smoke = Math.max(smoke, countMaterial(sim, MAT.SMOKE));
    }
    return { sim, smoke };
  };
  const on = run(true);
  assert.ok(on.smoke > 0, 'gaz salmalı');
  assert.equal(run(false).smoke, 0);
  assert.equal(on.sim.configureMagma(0, 0, { degas: true }), false, 'magma değil');
  assert.ok(DEGAS_BIT === 32);
});
```

`tests/scenes.test.js` sonuna:

```js
test('Volkan kendiliğinden patlar: 30 000 tick içinde en az 3 basınç patlaması, ilki 1–4 dakikada', () => {
  const sim = load('volcano', 'readme', 240, 150);
  let first = -1;
  for (let t = 0; t < 30000; t++) {
    sim.step();
    if (first < 0 && sim.getStats().blastTotals[BLAST_KIND.PRESSURE] > 0) first = t;
  }
  assert.ok(first >= 3600 && first <= 14400, `ilk patlama ${first}. tick`);
  assert.ok(sim.getStats().blastTotals[BLAST_KIND.PRESSURE] >= 3, `${sim.getStats().blastTotals[BLAST_KIND.PRESSURE]} patlama`);
  assert.deepEqual(sim.world.checkInvariants(), []);
});

test('Volkan tetikle hemen patlar: kratere bol su ya da barut', () => {
  for (const mat of [MAT.WATER, MAT.GUNPOWDER]) {
    const sim = load('volcano', 'readme', 240, 150);
    runTicks(sim, 600);
    const before = sim.getStats().blastTotals;
    const sum = (t) => t[BLAST_KIND.PRESSURE] + t[BLAST_KIND.STEAM] + t[BLAST_KIND.EXPLOSIVE];
    const crater = craterCell(sim); // tıkacın ortası (aşağıdaki yardımcı)
    for (let y = crater.y - 8; y < crater.y - 1; y++) for (let x = crater.x - 5; x <= crater.x + 5; x++) if (sim.getCell(x, y)?.material === MAT.EMPTY) sim.setCell(x, y, mat);
    runTicks(sim, 300);
    assert.ok(sum(sim.getStats().blastTotals) > sum(before), `${mat}: tetik patlaması olmadı`);
  }
});
```

Aynı dosyada yardımcı (testlerden önce):

```js
// Volkan tıkacı: ortadaki üçte birlik bantta, yukarıdan ilk dolu hücresi taş olan ve hemen altı gaz cebi
// (boş ya da duman) olan sütunun o taş hücresi.
function craterCell(sim) {
  const { width: W, height: H } = sim.view;
  for (let x = Math.floor(W / 3); x < Math.floor((2 * W) / 3); x++) {
    for (let y = 0; y < H - 1; y++) {
      const m = sim.getCell(x, y).material;
      if (m === MAT.EMPTY || m === MAT.SMOKE) continue;
      const below = sim.getCell(x, y + 1).material;
      if (m === MAT.STONE && (below === MAT.EMPTY || below === MAT.SMOKE)) return { x, y };
      break;
    }
  }
  return { x: Math.floor(W / 2), y: Math.floor(H * 0.3) };
}
```

(İlk satırdaki `BLAST_KIND` importunu dosyaya ekle: `import { BLAST_KIND } from '../js/engine/explosions.js';`.) "Volcano lavı yalnızca sağ yarıktan taşar" testi 600 tick çalışır ve ilk patlama ≥ 3600 tick olduğu için olduğu gibi kalır.

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `node --test --test-name-pattern="gaz salan|Volkan" tests/gases.test.js tests/scenes.test.js`
Expected: FAIL. `configureMagma` yok, volkanda basınç patlaması yok.

- [ ] **Step 3: Volkanik gaz**

`reactions.js`:

```js
// flags bit5: gaz salan magma (sahneler `sim.configureMagma` ile işaretler). Ona değen lav tick başına
// RATES.degasU32/2³² olasılıkla sıcak dumana döner (volkanik gaz); lav sıcaklığı korunur.
export const DEGAS_BIT = 32;
```

`RATES`'e:

```js
  degasU32: Math.floor(4294967296 / 10000), // magmaya değen lavın tick başına gaz olma olasılığı (× 2³²)
  maxDegasPerTick: 8,
```

`createReactionState` → `degasBudget: 0`; `beginReactionTick` → `state.degasBudget = RATES.maxDegasPerTick;`. `reactLava(world, rng, i)` → `reactLava(world, rng, i, state)`:

```js
function reactLava(world, rng, i, state) {
  const j = sampleNeighbor(world, rng, i);
  const nt = world.type[j];
  if (nt === MAT.MAGMA && (world.flags[j] & DEGAS_BIT) !== 0 && state.degasBudget > 0 && rng.nextU32() < RATES.degasU32) {
    world.transform(i, MAT.SMOKE, initialLife(MAT.SMOKE, rng.nextU32())); // kabarcık lavın içinden yükselir
    state.degasBudget--;
    return true;
  }
  ignite(world, rng, j, nt);
  return false;
}
```

`react` switch'inde `case LAVA: return reactLava(world, rng, i, state);`.

`simulation.js` (`configureSource`'tan sonra):

```js
  // Magma ayarı (sahneler, testler): degas = gaz salan magma (flags bit5). Magma olmayan hücre reddedilir.
  configureMagma(x, y, { degas } = {}) {
    const w = this.world;
    if (!w.inBounds(x, y)) return false;
    const i = w.index(x, y);
    if (w.type[i] !== MAT.MAGMA || typeof degas !== 'boolean') return false;
    if (degas) w.flags[i] |= DEGAS_BIT;
    else w.flags[i] &= ~DEGAS_BIT;
    this.version++;
    return true;
  }
```

(`DEGAS_BIT`'i `reactions.js` importuna ekle.)

- [ ] **Step 4: Volkan sahnesi**

`js/scenes/volcano.js`:

- Yeni sabitler:

```js
const VOLCANO_CLONER_BUDGET = 3000; // yarık çoğaltıcıları (patlama döngüsü boyunca lav akışı sürsün)
const POCKET_ROWS = 1; // tıkacın altındaki ilk gaz cebi satırı
```

- **Krater çanağı oyulduktan sonra (tıkaç ve cep):** platonun üst satırı (`plateauY`) çanağın üstünde zaten taştır. `fillColumns` taşı `round(top[x])`'ten başlatır, çanak `plateauY + 1`'den oyulur. Bu satır tıkaçtır. Çanağın en üst `POCKET_ROWS` satırı boş cep olur:

```js
  // Tıkaç ve gaz cebi: platonun üst satırı çanağın taş kabuğudur; altındaki POCKET_ROWS satır boş cep olur.
  // Magmanın saldığı volkanik gaz kabarcık olarak bacadan yükselip cepte birikir; basınç kabuğu kıracak
  // kadar yükselince patlar (spec §6.1).
  for (let x = cxi - craterW; x <= cxi + craterW; x++) {
    for (let r = 0; r < POCKET_ROWS; r++) {
      const y = plateauY + 1 + r;
      if (sim.getCell(x, y)?.material === MAT.LAVA) sim.world.set(sim.world.index(x, y), MAT.EMPTY, 0, 0, 0, 900);
    }
  }
```

- **Yarık cebin altından:** yarık satırları `plateauY + 1/2` yerine `riftY = plateauY + craterD + 1` ve `riftY + 1` olur. Yarık bacanın sağ kenarından başlar:

```js
  const riftY = plateauY + craterD + 1; // yarık çanağın (ve cebin) altından bacadan ayrılır
  let riftEnd = cxi;
  for (let x = cxi + vent + 1; x < W - 1; x++) {
    sim.setCell(x, riftY, MAT.LAVA);
    sim.setCell(x, riftY + 1, MAT.LAVA);
    riftEnd = x;
    if (x >= cxi + craterW + 4 && top[x + 1] > riftY + 1) break;
  }
  for (let x = cxi + vent + 1; x <= riftEnd - 2; x++) if (isStone(x, riftY + 2)) sim.setCell(x, riftY + 2, MAT.MAGMA);
  for (const dx of [Math.max(2, vent + 1), Math.max(3, vent + 2)]) {
    sim.setCell(cxi + dx, riftY + 1, MAT.CLONER);
    sim.configureSource(cxi + dx, riftY + 1, { budget: VOLCANO_CLONER_BUDGET });
  }
```

  Eski yarık, yarık damarı ve çoğaltıcı döngülerinin yerine bunlar gelir.
- **Yamaç damarının başlangıç satırı:** `x > riftEnd ? riftY : riftY + 2`.
- **Oda magmasının işaretlenmesi:** magma diski çizildikten sonra:

```js
  const mr = Math.max(1, Math.floor(chamberR / 3));
  const my = chamberY + Math.max(1, Math.floor(chamberR / 2));
  for (let y = my - mr; y <= my + mr; y++) for (let x = cxi - mr; x <= cxi + mr; x++) {
    if (sim.getCell(x, y)?.material === MAT.MAGMA) sim.configureMagma(x, y, { degas: true });
  }
```

- Dosya başı yorumuna patlama döngüsünü ekle.

- [ ] **Step 5: Ölçüm ve ayar**

Run: `node --test --test-name-pattern="Volkan|Volcano" tests/scenes.test.js`

İlk patlama zamanı aralık dışındaysa sırasıyla şunları ayarla (her değişikliği ölçümüyle ledger'a `Ruling:` olarak yaz):
1. `RATES.degasU32`: erken patlıyorsa küçült, geç patlıyorsa büyüt.
2. `POCKET_ROWS`.
3. Tıkaç kalınlığı (gerekirse kabuğun üstüne bir sıra daha taş).

Sonraki patlamalar için kabuk yeniden oluşmalı: açık kalan krater lavı soğuyup taşlaşır, altında yeni cep birikir. Oluşmuyorsa (krater hep açık kalıyor, 30 000 tick'te < 3 patlama) yarığı bir satır yukarı al ki baca lav seviyesi kraterin hemen altında dursun.

Yarık akışı cebi açık havaya bağlıyorsa (cep hiç kapalı sayılmıyor, `stats.pressure.closed` cebi içermiyor) yarığı bir satır daha aşağı al. Ağaç testleri ve "yalnız sağ yarıktan" testi geçmeye devam etmeli.

- [ ] **Step 6: Tüm testler**

Run: `npm test` → `# fail 0`.

- [ ] **Step 7: Tarayıcı ve ekran görüntüsü kontrolü**

`?scene=volcano` adresinde 4× hızda 2–3 dakika izle. Beklenen:
- kraterden duman tüter;
- tıkaç patlar, lav ve taş savrulur;
- yarıktan akan lav ağaçlara ulaşır.

Kratere su dökünce buhar patlaması olmalı. Playwright yoksa ledger'a "manuel kontrol bekliyor" yaz.

- [ ] **Step 8: Dokümanlar, commit, push**

- `docs/MATERIALS.md`:
  - Magma satırına gaz salan magma (`configureMagma`, bit5);
  - §5.9 "Volkanik gaz ve volkan döngüsü";
  - §4.5'teki volkan kullanım maddesini yeni yarık yerine göre güncelle.
- Spec §6.1'e uygulama notu: tıkaç, cep ve yarık satırları; ölçülen ilk patlama zamanı.
- `CHANGELOG.md`.
- `js/app/releases.js`: `'Volkan patlar: magma odası gaz biriktirir, birkaç dakikada bir tıkacı patlatır; kratere su ya da barut atınca hemen patlar.'`

```bash
git add js/engine/simulation.js js/engine/reactions.js js/scenes/volcano.js tests/gases.test.js tests/scenes.test.js docs/MATERIALS.md docs/superpowers/specs/2026-10-01-basinc-patlama-design.md docs/DEVELOPMENT.md CHANGELOG.md js/app/releases.js
git commit -m "Volkanik gaz ve patlayan volkan: gaz salan magma, tıkaç ve basınçlı cep"
git push origin main
```

---
### Task 11 (Görev 11): Maden ocağı sahnesi

**Files:**
- Create: `js/scenes/quarry.js`
- Modify: `js/scenes/index.js` (kayıt, sıra)
- Test: `tests/scenes.test.js`
- Docs: `docs/MATERIALS.md` (sahne kullanımları), `README.md` (sahne listesi), `CHANGELOG.md`, `js/app/releases.js`

**Interfaces:**
- Consumes: `frame`, `valueNoise`, `rect`, `disk` (`scenes/tools.js`); `GUNPOWDER`, `DYNAMITE`, `FUSE`, `METHANE`, `RUBBLE`, `METAL`, `WOOD`.
- Produces: `quarry(sim, rng)`; sahne kaydı `{ id: 'quarry', name: 'Maden ocağı', ambient: 15, generate: quarry, hint }`.

- [ ] **Step 1: Başarısız testleri yaz**

`tests/scenes.test.js`:
- Seçici sırası testindeki listeyi `['volcano', 'hourglass', 'oasis', 'glacier', 'foundry', 'cave', 'quarry', 'geyser', 'chaos', 'empty']` yap. `geyser` Görev 12'de gelir. Bu görevde liste `quarry`'yi içerir, `geyser` Görev 12'de eklenir.
- Kayıt testindeki id listesine `'quarry'` ekle.
- Yeni test:

```js
test('Maden ocağı: taş, cevher, delikler (barut, dinamit, fitil), metan cebi, destekler; fitil tutuşunca dinamit taşı molozlaştırır', () => {
  const sim = load('quarry', 'q', 320, 180);
  assert.ok(present(sim, MAT.STONE, MAT.METAL, MAT.GUNPOWDER, MAT.DYNAMITE, MAT.FUSE, MAT.METHANE, MAT.WOOD, MAT.RUBBLE));
  // Yüzeydeki fitil ucunu bul: üstü boş olan en üstteki fitil hücresi.
  let tip = null;
  for (let y = 0; y < 180 && !tip; y++) for (let x = 0; x < 320 && !tip; x++) {
    if (cellType(sim, x, y) === MAT.FUSE && cellType(sim, x, y - 1) === MAT.EMPTY) tip = { x, y };
  }
  assert.ok(tip, 'fitil ucu');
  const dyn0 = countMaterial(sim, MAT.DYNAMITE);
  const rubble0 = countMaterial(sim, MAT.RUBBLE);
  sim.setTemp(tip.x, tip.y, 300);
  runTicks(sim, 1500);
  assert.ok(sim.getStats().blastTotals[BLAST_KIND.EXPLOSIVE] >= 1);
  assert.ok(countMaterial(sim, MAT.DYNAMITE) < dyn0);
  runTicks(sim, 400);
  assert.ok(countMaterial(sim, MAT.RUBBLE) > rubble0, 'taş molozlaşmalı');
  assert.equal(sim.getStats().debrisLost, 0);
});
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `node --test tests/scenes.test.js`
Expected: FAIL. `quarry` sahnesi yok; `getScene('quarry')` varsayılan volkanı döndürür ve `present` düşer.

- [ ] **Step 3: `quarry.js`**

```js
// Maden ocağı: taş zemin ve basamaklı ocak çukuru, üstte ince kum örtü, taşın içinde metal cevher damarları ve
// moloz mercekleri, kapalı metan cepleri. Basamaklarda ve tabanda yüzeyden inen patlatma delikleri: dipte dinamit,
// üstünde barut, yüzeye kadar fitil (fitil ucu yüzeyde yana uzanır). Tabanda odun destekler ve moloz yığını.
// Fitili tutuşturmak kullanıcıya kalır. Ortam 15 °C (index.js).
import { MAT } from '../engine/materials.js';
import { frame, valueNoise, rect, disk } from './tools.js';

const BENCHES = 3; // ocak basamağı sayısı

// Disk tamamen taşın içindeyse (kenarıyla birlikte) çizer; dışarı taşacaksa çizmez.
function sealedDisk(sim, cx, cy, r, mat) {
  const R = Math.ceil(r) + 1;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    if (dx * dx + dy * dy > (R + 0.5) * (R + 0.5)) continue;
    if (sim.getCell(cx + dx, cy + dy)?.material !== MAT.STONE) return false;
  }
  disk(sim, cx, cy, r, mat);
  return true;
}

export function quarry(sim, rng) {
  const { W, H, X, Y, S } = frame(sim);
  const noise = valueNoise(W, sim.seed, 'quarry-surface', 7);
  const pitL = X(0.28);
  const pitR = X(0.74);
  const pitFloor = Y(0.6);
  const bench = Math.max(3, S(0.06));
  const surface = new Int32Array(W);
  for (let x = 0; x < W; x++) {
    let s = Math.round(H * 0.3 + (noise[x] - 0.5) * H * 0.05);
    if (x >= pitL && x <= pitR) {
      const step = Math.min(BENCHES, Math.floor(Math.min(x - pitL, pitR - x) / bench) + 1);
      s = Math.round(s + ((pitFloor - s) * step) / BENCHES);
    }
    surface[x] = Math.min(H - 2, s);
  }
  for (let x = 0; x < W; x++) rect(sim, x, surface[x], x, H - 1, MAT.STONE);
  // Ocak dışında ince kum örtü (taşın üstünde durur).
  for (let x = 0; x < W; x++) if (x < pitL - 1 || x > pitR + 1) rect(sim, x, surface[x] - 2, x, surface[x] - 1, MAT.SAND);

  // Cevher damarları ve moloz mercekleri: taşın içinde, açığa çıkmadan.
  for (let k = 0; k < 4; k++) {
    const x = X(0.1 + rng.next() * 0.8);
    const y = Math.min(H - 4, surface[Math.max(0, Math.min(W - 1, x))] + 4 + Math.floor(rng.next() * Math.max(3, S(0.15))));
    sealedDisk(sim, x, y, Math.max(1, S(0.02)), k % 2 === 0 ? MAT.METAL : MAT.RUBBLE);
  }
  // Kapalı metan cepleri (ocak tabanının altında).
  for (let k = 0; k < 2; k++) {
    const x = X(0.4 + k * 0.2);
    sealedDisk(sim, x, Math.min(H - 5, pitFloor + Math.max(5, S(0.1))), Math.max(2, S(0.03)), MAT.METHANE);
  }

  // Patlatma delikleri: her basamakta ve tabanda bir delik. Dipte 2 dinamit, üstünde 3 barut, yüzeye kadar fitil;
  // fitil yüzeyde 3 hücre yana uzanır (uç).
  const depth = Math.max(8, S(0.12));
  const holes = [pitL + Math.floor(bench / 2), pitL + bench + Math.floor(bench / 2), Math.floor((pitL + pitR) / 2), pitR - bench - Math.floor(bench / 2)];
  for (const hx of holes) {
    const top = surface[hx];
    const bottom = Math.min(H - 2, top + depth);
    for (let y = top; y <= bottom; y++) {
      const fromBottom = bottom - y;
      sim.setCell(hx, y, fromBottom < 2 ? MAT.DYNAMITE : fromBottom < 5 ? MAT.GUNPOWDER : MAT.FUSE);
    }
    for (let dx = 1; dx <= 3; dx++) if (surface[hx + dx] === top) sim.setCell(hx + dx, top - 1, MAT.FUSE);
    sim.setCell(hx, top - 1, MAT.FUSE);
  }

  // Odun destekler ve moloz yığını (ocak tabanında).
  const floorL = pitL + BENCHES * bench;
  const floorR = pitR - BENCHES * bench;
  if (floorR - floorL > 8) {
    const postH = Math.max(3, Math.floor(bench * 1.5));
    for (const px of [floorL + 2, floorR - 2]) rect(sim, px, pitFloor - postH, px, pitFloor - 1, MAT.WOOD);
    rect(sim, floorL + 2, pitFloor - postH - 1, floorR - 2, pitFloor - postH - 1, MAT.WOOD);
    const pile = Math.max(2, Math.floor((floorR - floorL) / 6));
    for (let k = 0; k < pile; k++) rect(sim, floorR - 4 - pile + k, pitFloor - 1 - k, floorR - 4 + pile - k, pitFloor - 1 - k, MAT.RUBBLE);
  }
}
```

- [ ] **Step 4: Kayıt**

`js/scenes/index.js`: `import { quarry } from './quarry.js';`. `cave` girişinden sonra:

```js
  { id: 'quarry', name: 'Maden ocağı', ambient: 15, generate: quarry, hint: 'Fitilin ucunu Ateş ya da Isıt ile tutuştur; dinamit taşı molozlaştırır.' },
```

- [ ] **Step 5: Testlerin geçtiğini gör, tüm testler**

Run: `node --test tests/scenes.test.js` → PASS. Sahne her grid boyutunda ve determinizm testlerinde otomatik sınanır. Küçük gridlerde (64×48) delik ya da destek sığmıyorsa üretim yine hatasız olmalı; `present` testi yalnız 320×180'dedir. Run: `npm test` → `# fail 0`.

- [ ] **Step 6: Dokümanlar, commit, push**

- `README.md` sahne listesi.
- `docs/MATERIALS.md`: patlayıcıların sahne kullanımları.
- `CHANGELOG.md`.
- `js/app/releases.js`: `'Yeni sahne: Maden ocağı — basamaklı ocak, patlatma delikleri, fitiller, metan cepleri.'`

```bash
git add js/scenes/quarry.js js/scenes/index.js tests/scenes.test.js README.md docs/MATERIALS.md docs/DEVELOPMENT.md CHANGELOG.md js/app/releases.js
git commit -m "Yeni sahne: Maden ocağı"
git push origin main
```

---

### Task 12 (Görev 12): Gayzer sahnesi

**Files:**
- Create: `js/scenes/geyser.js`
- Modify: `js/scenes/index.js`
- Test: `tests/scenes.test.js`
- Docs: `README.md`, `CHANGELOG.md`, `js/app/releases.js`, spec §6.3 uygulama notu

**Interfaces:**
- Consumes: ani buharlaşma (Görev 7), `configureSource` (sınırsız su çoğaltıcısı), `rect` ve `frame`.
- Produces: `geyser(sim)`; kayıt `{ id: 'geyser', name: 'Gayzer', ambient: 10, generate: geyser, hint }`.

- [ ] **Step 1: Başarısız testleri yaz**

Seçici sırası listesine `'geyser'`'i `'quarry'`'den sonra ekle. Kayıt testine `'geyser'`. Yeni test:

```js
test('Gayzer düzenli fışkırır: 20 000 tick içinde en az 3 buhar patlaması ve yüzeyin üstüne çıkan su', () => {
  const sim = load('geyser', 'g', 240, 150);
  const ground = Math.round(0.5 * 149);
  let above = 0;
  let last = -100000;
  let spaced = 0;
  for (let t = 0; t < 20000; t++) {
    const before = sim.getStats().blastTotals[BLAST_KIND.STEAM];
    sim.step();
    if (sim.getStats().blastTotals[BLAST_KIND.STEAM] > before) {
      if (t - last > 600) spaced++; // aynı fışkırmanın parçalarını ayrı saymamak için ≥ 10 s ara
      last = t;
    }
    const d = sim.view.debris;
    for (let k = 0; k < d.count; k++) if (d.type[k] === MAT.WATER && d.y[k] < ground - 3) above++;
  }
  assert.ok(spaced >= 3, `${spaced} ayrı fışkırma`);
  assert.ok(above > 0, 'su yüzeyin üstüne fışkırmalı');
  assert.deepEqual(sim.world.checkInvariants(), []);
});
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `node --test --test-name-pattern="Gayzer" tests/scenes.test.js`
Expected: FAIL. Sahne yok.

- [ ] **Step 3: `geyser.js`**

```js
// Gayzer: taş zemin; yüzeyin altında küçük bir su odası, odadan yüzeye dar (2 hücre) baca, yüzeyde sığ havuz
// ve cam teraslar. Oda tabanının altında magma yatağı, bacanın iki yanında (1 sıra taş arayla) magma damarları:
// baca suyu boydan boya ısınır ve topluca kaynama noktasına gelir; ani buharlaşma patlaması (pressure.js) suyu
// bacadan fışkırtır. Odayı soldaki göl besler (kanal odaya yukarıdan girer); gölün dibindeki sınırsız su
// çoğaltıcısı göl düzeyini korur. Ortam 10 °C (index.js). Spec §6.3.
import { MAT } from '../engine/materials.js';
import { frame, rect } from './tools.js';

export function geyser(sim) {
  const { W, H, X, Y, S } = frame(sim);
  const ground = Y(0.5);
  rect(sim, 0, ground, W - 1, H - 1, MAT.STONE);

  const cx = X(0.58); // baca: cx, cx + 1
  const ventBottom = Math.min(H - 12, ground + Math.max(8, Y(0.12)));
  const cw = Math.max(4, X(0.06)); // oda yarı genişliği
  const ch = Math.max(4, Y(0.08));
  const roomTop = ventBottom;
  const roomBottom = Math.min(H - 6, roomTop + ch);
  // Oda ve baca (su dolu).
  rect(sim, cx - cw, roomTop, cx + 1 + cw, roomBottom, MAT.WATER);
  rect(sim, cx, ground, cx + 1, roomTop - 1, MAT.WATER);
  // Magma: oda tabanının 1 sıra altında yatak; bacanın iki yanında, 1 sıra taş arayla damarlar.
  rect(sim, cx - cw, roomBottom + 2, cx + 1 + cw, Math.min(H - 1, roomBottom + 2 + Math.max(2, S(0.03))), MAT.MAGMA);
  rect(sim, cx - 2, ground + 3, cx - 2, roomTop - 2, MAT.MAGMA);
  rect(sim, cx + 3, ground + 3, cx + 3, roomTop - 2, MAT.MAGMA);

  // Yüzey havuzu ve cam teraslar.
  const pw = Math.max(4, X(0.06));
  rect(sim, cx - pw, ground, cx + 1 + pw, ground + 1, MAT.WATER);
  rect(sim, cx - pw - 1, ground - 1, cx - pw - 1, ground + 1, MAT.GLASS);
  rect(sim, cx + 2 + pw, ground - 1, cx + 2 + pw, ground + 1, MAT.GLASS);
  for (let k = 1; k <= 2; k++) {
    rect(sim, cx - pw - 1 - 3 * k, ground - 1, cx - pw - 3 * k + 1, ground - 1, MAT.GLASS);
    rect(sim, cx + 2 + pw + 3 * k - 1, ground - 1, cx + 2 + pw + 3 * k + 1, ground - 1, MAT.GLASS);
  }

  // Besleyen göl (solda) ve kanal: göl dibinden aşağı, sonra odanın sol üst köşesine.
  const lakeL = X(0.06);
  const lakeR = X(0.26);
  const lakeBottom = ground + Math.max(3, S(0.05));
  rect(sim, lakeL, ground, lakeR, lakeBottom, MAT.WATER);
  rect(sim, lakeR, lakeBottom, lakeR, roomTop, MAT.WATER);
  rect(sim, lakeR, roomTop, cx - cw - 1, roomTop, MAT.WATER);
  sim.setCell(lakeL - 1, lakeBottom, MAT.CLONER);
  sim.configureSource(lakeL - 1, lakeBottom, { learn: MAT.WATER, budget: Infinity });
}
```

- [ ] **Step 4: Kayıt**

`index.js`: `import { geyser } from './geyser.js';`; `quarry`'den sonra:

```js
  { id: 'geyser', name: 'Gayzer', ambient: 10, generate: geyser, hint: 'Magma bacadaki suyu ısıtıyor; gayzer düzenli aralıklarla fışkırır.' },
```

- [ ] **Step 5: Ölçüm ve ayar**

Run: `node --test --test-name-pattern="Gayzer" tests/scenes.test.js`

Fışkırma yoksa ya da düzensizse sırasıyla dene (her biri ölçümüyle ledger'a `Ruling:`):
1. Baca derinliği (`ventBottom`).
2. Magma damarlarının uzunluğu.
3. Oda boyutu.
4. Pressure'da `FLASH_MIN` (yalnız Review Focus 4 testleri geçmeye devam ediyorsa).

Döngü yine tutmazsa **yedek plan**: gizli `GEYSER_HEATER` (kimlik 31) statik materyali.
- `reactive: true`, `life: [PERIOD, PERIOD]`;
- `react`'ta her tick `life--`. `life < PULSE` iken hücre sıcaklığı 1400 °C'ye yazılır, `life === 0` olunca `life = PERIOD` olur (PERIOD 2400, PULSE 120);
- oda tabanındaki magma yatağının yerine konur.

Yedek kullanılırsa spec §6.3'e ve ledger'a yazılır, `docs/MATERIALS.md`'ye eklenir.

- [ ] **Step 6: Tüm testler, dokümanlar, commit, push**

Run: `npm test` → `# fail 0`.

Dokümanlar:
- `README.md` sahne listesi.
- Spec §6.3 uygulama notu (ölçülen fışkırma aralığı).
- `CHANGELOG.md`.
- `js/app/releases.js`: `'Yeni sahne: Gayzer — magmanın ısıttığı su bacadan düzenli aralıklarla fışkırır.'`

```bash
git add js/scenes/geyser.js js/scenes/index.js tests/scenes.test.js README.md docs/superpowers/specs/2026-10-01-basinc-patlama-design.md docs/DEVELOPMENT.md CHANGELOG.md js/app/releases.js
git commit -m "Yeni sahne: Gayzer"
git push origin main
```

---

### Task 13 (Görev 13): Patlatılabilir Mağara

**Files:**
- Modify: `js/scenes/cave.js` (metan cepleri, barut fıçısı)
- Test: `tests/scenes.test.js`
- Docs: `CHANGELOG.md`, `js/app/releases.js`

**Interfaces:**
- Consumes: `METHANE`, `GUNPOWDER`, `WOOD`; mevcut `cave.js` değişkenleri (`center`, `half`, `X`, `Y`, `S`).
- Produces: mağarada iki kapalı metan cebi ve tünel tabanında barut fıçısı. Mevcut göl, lav cebi ve yağ cebi aynen kalır.

- [ ] **Step 1: Başarısız testleri yaz**

```js
test('Mağara patlatılabilir: kapalı metan cepleri ve barut fıçısı; fıçı tutuşunca patlar, duvar testleri bozulmaz', () => {
  const sim = load('cave', 'c', 320, 180);
  assert.ok(present(sim, MAT.METHANE, MAT.GUNPOWDER));
  let gp = null;
  for (let y = 0; y < 180 && !gp; y++) for (let x = 0; x < 320 && !gp; x++) if (cellType(sim, x, y) === MAT.GUNPOWDER) gp = { x, y };
  sim.setTemp(gp.x, gp.y, 300);
  runTicks(sim, 200);
  assert.ok(sim.getStats().blastTotals[BLAST_KIND.EXPLOSIVE] >= 1);
  assert.deepEqual(sim.world.checkInvariants(), []);
});
```

Mevcut "Mağara: göl ve lav cebi arasındaki duvar kalır …" testi değişmeden geçmeli.

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `node --test --test-name-pattern="Mağara" tests/scenes.test.js`
Expected: FAIL (metan ve barut yok).

- [ ] **Step 3: `cave.js`**

Dosya başı yorumuna "Alt proje 2: iki kapalı metan cebi ve tünel tabanında barut fıçısı (patlatma ve kazı)." ekle; `disk` zaten import edilir. Fonksiyonun sonuna:

```js
  // Kapalı metan cepleri: taşın içinde, kenarıyla birlikte tamamen taşa gömülü olanlar çizilir.
  const mr = Math.max(2, S(0.025));
  for (const [fx, fy] of [[0.2, 0.75], [0.82, 0.22], [0.5, 0.15]]) {
    const mx = X(fx);
    const my = Y(fy);
    let sealed = true;
    for (let dy = -mr - 1; dy <= mr + 1 && sealed; dy++) for (let dx = -mr - 1; dx <= mr + 1 && sealed; dx++) {
      if (sim.getCell(mx + dx, my + dy)?.material !== MAT.STONE) sealed = false;
    }
    if (sealed) disk(sim, mx, my, mr, MAT.METHANE);
  }
  // Barut fıçısı: ana tünel tabanında, odun çerçeve (iki yan ve kapak) içinde 3×2 barut.
  const bx = X(0.45);
  const floorY = center[bx] + half[bx];
  if (sim.getCell(bx, floorY + 1)?.material === MAT.STONE) {
    rect(sim, bx - 2, floorY - 3, bx + 2, floorY - 3, MAT.WOOD);
    rect(sim, bx - 2, floorY - 2, bx - 2, floorY, MAT.WOOD);
    rect(sim, bx + 2, floorY - 2, bx + 2, floorY, MAT.WOOD);
    rect(sim, bx - 1, floorY - 1, bx + 1, floorY, MAT.GUNPOWDER);
  }
```

(`floorY` tünelin en alt boş satırıdır; tünel `center ± half` aralığında oyulur. Fıçı bu satıra oturur. Seed'e göre metan ceplerinin hiçbiri kapalı yer bulamazsa: `fy` değerlerine 0,9 ve 0,05 ekle, ya da sabit noktaları ilk kapalı taş bulunana kadar aşağı kaydır. Test 320×180'de en az bir cebi bekler.)

- [ ] **Step 4: Testlerin geçtiğini gör, tüm testler**

Run: `node --test tests/scenes.test.js` → PASS. Run: `npm test` → `# fail 0`.

- [ ] **Step 5: Dokümanlar, commit, push**

- `CHANGELOG.md`.
- `js/app/releases.js`: `'Mağara patlatılabilir: kapalı metan cepleri ve tünelde bir barut fıçısı.'`

```bash
git add js/scenes/cave.js tests/scenes.test.js docs/DEVELOPMENT.md CHANGELOG.md js/app/releases.js
git commit -m "Mağara: metan cepleri ve barut fıçısı"
git push origin main
```

---

### Task 14 (Görev 14): Performans, dokümanlar, ekran görüntüleri, 0.11.0 sürümü

**Files:**
- Modify: `tests/climate.test.js` (yeni modüller de sin/cos/exp/pow kullanmaz)
- Modify: `docs/DEVELOPMENT.md`, `docs/DECISIONS.md` (ADR-007 eki), `docs/ARCHITECTURE.md`, `docs/MATERIALS.md`, `README.md`, spec (§2.9 son değerler)
- Modify: `CHANGELOG.md`, `js/app/releases.js`, `package.json`, `js/config.js`
- Create: `docs/screenshots/strata-quarry.png`, `docs/screenshots/strata-geyser.png` (volkan görüntüsünü yenile)

**Interfaces:**
- Consumes: tüm görevler.
- Produces: sürüm 0.11.0; `RELEASES[0].version === '0.11.0'`; `UNRELEASED.version === '0.12.0'` ve maddeleri boş.

- [ ] **Step 1: Saflık testini genişlet (önce kırmızı değil, koruma)**

`tests/climate.test.js` → dosya listesini `['heat.js', 'climate.js', 'explosions.js', 'debris.js', 'pressure.js']` yap. Test adını "ısı, iklim, patlama, parçacık ve basınç kodu Math.sin/cos/exp/pow kullanmaz" olarak güncelle.

Run: `node --test tests/climate.test.js` → PASS. Düşerse ilgili modülde `Math.pow`'u çarpmayla değiştir.

- [ ] **Step 2: Performans**

Run: `node tools/bench.js`. 400×225 medyanı Görev 1'deki başlangıçla karşılaştır; artış ≤ +0,5 ms olmalı. Ayrıca patlama tepesini ölç: benchmark sahnesinde 64 hücrelik bir barut bloğu tutuşturulduğunda en yüksek tick süresi. Bu bir kerelik bir betikle (`tools/` altına değil, scratchpad'e) ölçülür ve DEVELOPMENT.md'ye yazılır.

Aşarsa sırasıyla:
1. `PRESSURE.PERIOD` 4 → 8.
2. Basınç taramasında yalnız kapalı bölge hücrelerine bit4 yazma.
3. `DEBRIS.CAPACITY` 2000 → 1500.

Her adım ölçümüyle ledger'a `Ruling:` olarak yazılır.

- [ ] **Step 3: Dokümanlar**

- `docs/DEVELOPMENT.md`:
  - Phase 14 "tamamlandı";
  - benchmark tablosuna Görev 14 satırı (ortalama ve patlama tepesi);
  - 0.11.0 manuel kontrol listesi: Patlat aracı, barut, fitil, metan, volkan patlaması, gayzer, maden ocağı, mobil (360 px), azaltılmış hareket.
- `docs/DECISIONS.md`: ADR-007'ye geçiş 4–6 eki; ADR-017 ve ADR-018'in son ölçümleri.
- `docs/ARCHITECTURE.md`: modül listesi, tick sırası, `world.blast` ve `world.flash`, `flags` bit tablosu (bit4, bit5), görünüm alanları (`debris`, `blasts`).
- `docs/MATERIALS.md`: durum etiketleri ("Mevcut (0.11.0)"), §5 son sayılar (ayarlanan sabitler).
- `README.md`:
  - durum v0.11.0;
  - materyaller, kısayollar ve sahneler;
  - ekran görüntüleri tablosuna Maden ocağı ve Gayzer;
  - bilinen sınırlamalar: hidrolik basınç yok (U borusu seviyelenmez), yapı statiği yok (desteği kırılan tavan çökmez), basınç yalnız katı tavan altında birikir;
  - yol haritasında alt proje 2 "tamamlandı".
- Spec §2.9 tablosuna "Uygulanan son değerler (0.11.0)" sütunu.

- [ ] **Step 4: Ekran görüntüleri**

Sunucu açıkken (`node tools/serve.js 8080`) Playwright ile:
- 1060×680 görünümde `?debug=1&scene=quarry&seed=readme` ve `scene=geyser`: tuval öğesi görüntüsü, fitil tutuşmuş ya da fışkırma anında, sim duraklatılmış;
- 1440×860 görünümde volkan: patlama anı.

Dosyalar `docs/screenshots/strata-quarry.png`, `strata-geyser.png`, `strata-volcano.png`. Playwright bağlanamıyorsa ledger'a "ekran görüntüsü bekliyor" yaz ve README'de yeni satırları ekleme (eski görüntüler kalır).

- [ ] **Step 5: Sürüm**

- `js/app/releases.js`: `UNRELEASED.items` → `RELEASES` başına `{ version: '0.11.0', date: '<bugün YYYY-MM-DD>', items: [...] }`; `UNRELEASED = { version: '0.12.0', items: [] }`.
- `package.json` `"version": "0.11.0"`; `js/config.js` `APP_VERSION = '0.11.0'`.
- `CHANGELOG.md`: `## [Unreleased]` boş kalır, altına `## [0.11.0] - <bugün>` gelir: özet paragrafı (alt proje 2/4) ve `### Performance` maddesi (ölçüm).

Run: `node --test tests/releases.test.js` → PASS.

- [ ] **Step 6: Tüm testler ve tarayıcı kontrolü**

Run: `npm test` → `# fail 0`.

Tarayıcıda 10 görünür sahnenin her biri 300 tick çalıştırılır; değişmez hatası yok, konsol temiz. Rozet v0.11.0 ve Yenilikler'de 0.11.0, 0.10.1, 0.10.0, 0.9.0 görünür.

- [ ] **Step 7: Commit, push, CI**

```bash
git add -A js tests docs CHANGELOG.md README.md package.json index.html css
git commit -m "0.11.0: basınç ve patlama; dokümanlar, ekran görüntüleri ve sürüm"
git push origin main
gh run list --limit 1
```

Expected: CI `success`.

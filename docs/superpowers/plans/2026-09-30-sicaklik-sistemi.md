# Sıcaklık Sistemi (0.10.0) Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Hedef:** Strata Sandbox'a şunları eklemek:

- tam çözünürlüklü sıcaklık alanı: ısı iletimi, ortam sıcaklığı, gün/gece döngüsü
- gizli ısılı faz geçişleri
- yeni materyaller: Buz, Kar, Metal, Erimiş metal, Magma ve Çoğaltıcı
- tüm materyaller ve etkileşimleri için `docs/MATERIALS.md` belgesi
- ısı görselleri ve termal görünüm
- Isıt ve Soğut fırçaları
- sekmeli materyal seçici
- sürüm rozeti ve Yenilikler diyaloğu
- ters çevirme ve kum saati yenilemesi
- yeni sahneler: Buzul, Dökümhane, Mağara

**Mimari:**

- **Sıcaklık alanı:** `world.temp` (`Float32Array`, °C). Hareket eden parçacıkla birlikte taşınır.
- **Tick sırası:** geçiş 1 ve 2 (hareket, reaksiyon) değişmez. Ardından yeni `heat.js` geçiş 3 olarak çalışır. Bu geçiş şunları yapar:
  - çift tamponlu (Jacobi) difüzyon
  - havanın ortama yaklaşması
  - ısı kaynakları
  - uyuyan satırları atlama
  - faz, tutuşma ve buharlaşma kuralları
- **Materyal davranışı:** materyal tablosundaki termal alanlarla tanımlanır. Mevcut `life` sayacı hileleri (kum ısısı, lav soğuması, buhar zamanlayıcısı) sıcaklık alanına taşınır.
- **Render ve arayüz:** alanı yalnızca okur.

**Teknoloji:**

- Vanilla JS ES modülleri, Canvas 2D
- Node 22 `node --test`
- 0 bağımlılık
- GitHub Pages; Actions akışı `docs/**` değişikliklerini yok sayar

**Spec:** `docs/superpowers/specs/2026-09-30-sicaklik-sistemi-design.md` (bu plan onu uygular; ikisini birlikte okuyun).

## Global Constraints

- Runtime bağımlılığı yok. Testler `npm test` ile çalışır (`node --test "tests/**/*.test.js"` + `tools/check-paths.js`).
- `js/engine/` DOM'a dokunmaz ve `Math.random` kullanmaz; `tests/engine-purity.test.js` bunu tarar.
- `heat.js` ve `climate.js` içinde `Math.sin`, `Math.exp` ve `Math.pow` kullanılmaz (determinizm).
- Aynı seed ve aynı girdi aynı dünyayı üretir. Test hash'ine (`tests/helpers.js` → `hashView`) sıcaklık da girer.
- Dosya adları küçük harflidir; import'larda `.js` uzantısı ve relative path kullanılır.
- Arayüz metinleri ve kod yorumları Türkçe, tanımlayıcılar İngilizce.
- "Dune Engine", "055" ve "055-falling-sand" adları hiçbir yerde kullanılmaz.
- **Performans:** 400×225 gridde medyan tick süresi en fazla **0,6 ms** artar. Başlangıç değeri: `node tools/bench.js` medyanı **0,858 ms** (2026-09-30, bu makine).
- **Her görevin sonunda:**
  - `npm test` tamamen yeşil olmalı.
  - `CHANGELOG.md` → `[Unreleased]` güncellenir.
  - `docs/DEVELOPMENT.md` → Phase 13'teki ilgili madde `[x]` olur (yalnızca testler geçtiyse).
  - `main`'e commit edilir ve sormadan push edilir. Commit mesajı Türkçe, attribution satırı yok.
- Dokunma hedefleri ≥ 44 px (`pointer: coarse`). Yeni kontroller ARIA etiketli olur.
- **Materyal belgesi** (kullanıcı isteği): `docs/MATERIALS.md` tüm materyalleri ve etkileşimleri (eski ve yeni) belgeler.
  - Materyal ya da etkileşim ekleyen veya değiştiren her görev (5, 7, 8, 10, 12, 13) ilgili bölümü güncel sayılarla yeniden yazar.
  - Uygulanan maddelerin durumu "Planlandı" → "Mevcut" olur.
  - `docs/MATERIALS.md` o görevin commit'ine eklenir.
  - `tests/docs-materials.test.js` (Görev 1) her materyal anahtarının belgede geçtiğini doğrular.

### Spec'ten bilinçli sayısal sapmalar

Spec §2.8 ve §3.2'deki değerler "testlerle ayarlanır" diye verilmişti. Aşağıdakiler plan sırasında yapılan ısı akışı hesaplarıyla değiştirildi; Görev 14 spec tablosunu buna göre günceller.

| Değer | Spec | Plan | Gerekçe |
|---|---|---|---|
| Hava iletkenliği `K_AIR` | 0,02 | 0,01 | Lav üstündeki kum ve kabuk dengesi. 0,02'de kum hiç cam olmuyordu. |
| Kum → Cam | 1000 °C, gizli ısı 450 | 700 °C, gizli ısı 300 | Havada yüzen kumun lavla denge sıcaklığı ~900 °C. Lav kabuk bağlamadan önce cam oluşabilmeli. |
| Kum `conduct` | 0,03 | 0,04 | Aynı gerekçe. |
| Taş → Lav | 1250 °C | 1500 °C | Dökümhane potası 1450 °C'lik erimiş metal taşır; pota erimemeli. |
| Buhar → Su gizli ısısı | 300 | 600 | Eski 240–480 tick'lik buhar ömrüne yakın. Su altındaki kabarcık testi ve yağmur için gerekli. |
| Metal | K 0,24, C 1 | K 1,6, C 8 (K/C 0,2) | Isı iletim menzili K / havaya kaybın karekökü kadardır. K 0,24'te bu yaklaşık 4 hücre ediyordu ve çubuk ısıyı uca taşıyamıyordu. Yeni değerlerle yaklaşık 10 hücre. |
| Erimiş metal | 1500 °C, K 0,24, C 1, gizli ısı 150 | 1450 °C, K 0,8, C 4, gizli ısı 400 | C 1 ile metal, taş oluğa değer değmez donuyordu. |

## Review Focus

Spec'in ima ettiği ama normal testlerin kaçırabileceği, kullanıcıyı en çok etkileyecek beş durum. Her biri sahibi olan görevde bir testle sabitlenir.

0. **Çoğaltıcı taşması:** çoğaltıcı yalnızca bitişik boş hücrelere yazmalı. Volkanda krater ağzını aşıp sol yamaca lav taşırmamalı. → Görev 13, mevcut "Volcano lavı yalnızca sağ yarıktan taşar" testi çoğaltıcılı sahnede de geçmeli.
1. **Uzun Isıt/Soğut:** fırça uzun süre basılı tutulunca sıcaklık [−100, 2500] dışına çıkmamalı ve dünya değişmezleri bozulmamalı. → Görev 10, "uzun basılı tutma sınırları aşmaz".
2. **Sıcaklık undo'su:** yalnızca sıcaklığı değiştiren bir Isıt stroke'u da geri alınabilmeli; undo sıcaklıkları geri getirmeli. → Görev 10, "ısıt stroke'u geri alınır".
3. **Ortam kaydırıcısı:** sürüklenirken sahne yeniden üretilmemeli, undo noktası oluşmamalı, materyaller anında değişmemeli. → Görev 5 (sim) ve Görev 11 (app), "ortam ayarı dünyayı anında değiştirmez".
4. **Uç en-boy oranları:** kum saati 64×48, 400×120 ve 120×300 gridlerde dünyaya sığmalı, simetrik kalmalı ve kum akmalı. → Görev 3, simetri ve akış testleri.
5. **Eski tercih kaydı:** 0.9.0'dan kalan localStorage kaydı (yeni alanlar yok) sorunsuz yüklenmeli ve varsayılanlarla tamamlanmalı. → Görev 1 ve Görev 11, "0.9.0 tercih kaydı".

Ek (Görev 2): bir çizim sürerken çevirmek, çizimin undo noktasını bozmamalı.

## Dosya haritası

| Dosya | Sorumluluk | Görev |
|---|---|---|
| `js/config.js` | `APP_VERSION` | 1, 13 |
| `js/app/releases.js` (yeni) | Kullanıcıya dönük sürüm notları | 1, 13 |
| `js/engine/world.js` | `temp`/`tempNext`, `flipVertical`, `swapTempBuffers`, değişmezler | 2, 4 |
| `js/engine/climate.js` (yeni) | Ortam sabitleri, kırpma, gün/gece dalgası | 4, 9 |
| `js/engine/heat.js` (yeni) | Geçiş 3: difüzyon, hava, kaynak, uyku, faz/tutuşma/buharlaşma | 5, 7 |
| `js/engine/materials.js` | Termal tanım alanları ve tabloları, yeni materyaller | 4, 5, 7, 8 |
| `js/engine/reactions.js` | Sayaç hilelerinin kaldırılması, `emitSteam`, bitki sıcaklık şartı, çoğaltıcı | 4, 7, 12 |
| `docs/MATERIALS.md` | Tüm materyaller ve etkileşimler (eski ve yeni) | 1, 5, 7, 8, 10, 12, 13, 14 |
| `js/engine/simulation.js` | Isı geçişi entegrasyonu, ortam API'si, `setTemp`, `flipVertical`, araçlar | 2, 4, 5, 7, 9, 10 |
| `js/render/palette.js`, `pixels.js`, `renderer.js`, `background.js` | Akkorluk, lav, soğuk su, termal görünüm, gökyüzü | 6, 9 |
| `js/app/catalog.js` | Kategoriler, yeni girişler, araçlar | 8, 10, 11 |
| `js/app/app.js`, `controls.js`, `keyboard.js`, `pointer.js`, `stats.js`, `storage.js`, `main.js` | Arayüz | 1, 2, 10, 11 |
| `index.html`, `css/controls.css`, `css/layout.css` | Rozet, diyaloglar, sekmeler, Ortam bölümü | 1, 2, 11 |
| `js/scenes/*.js` | Kum saati, Buzul, Dökümhane, Mağara, volkan magması, `ambient` | 3, 9, 12 |
| `tests/*.test.js` | Her görevin testleri | hepsi |

---

### Task 1 (Görev 1): Sürüm rozeti ve Yenilikler diyaloğu

**Files:**
- Modify: `js/config.js` (APP_VERSION)
- Create: `js/app/releases.js`
- Modify: `js/app/storage.js` (`seenVersion`)
- Modify: `js/app/app.js` (`whatsNew` eylemi, `seenVersion` durumu)
- Modify: `js/app/controls.js` (rozet, liste, "yeni" işareti)
- Modify: `index.html` (rozet ve diyalog), `css/controls.css`
- Create: `tests/releases.test.js`, `tests/docs-materials.test.js`
- Modify: `tests/app-modules.test.js`, `tests/app.test.js`
- Modify: `docs/DEVELOPMENT.md` (Phase 13 bölümü), `CHANGELOG.md`
- Mevcut: `docs/MATERIALS.md` (planlama sırasında yazıldı; bu görevde yalnızca testle bağlanır)

**Interfaces:**
- Produces:
  - `APP_VERSION: string` (`js/config.js`)
  - `RELEASES: ReadonlyArray<{version: string, date: string, items: string[]}>` ve `WHATS_NEW_COUNT = 3` (`js/app/releases.js`)
  - `actions.whatsNew()`
  - `prefs.seenVersion: string`

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/releases.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { APP_VERSION } from '../js/config.js';
import { RELEASES } from '../js/app/releases.js';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const versionKey = (v) => v.split('.').map(Number).reduce((a, n) => a * 1000 + n, 0);

test('sürüm tek kaynaktan: config, package.json, CHANGELOG ve Yenilikler aynı sürümü gösterir', () => {
  assert.equal(JSON.parse(read('package.json')).version, APP_VERSION);
  const latest = /^## \[(\d+\.\d+\.\d+)\]/m.exec(read('CHANGELOG.md'));
  assert.ok(latest, 'CHANGELOG.md içinde yayınlanmış sürüm başlığı yok');
  assert.equal(latest[1], APP_VERSION);
  assert.equal(RELEASES[0].version, APP_VERSION);
});

test('Yenilikler yeniden eskiye sıralı; her kaydın tarihi ve en az bir maddesi var', () => {
  for (let k = 1; k < RELEASES.length; k++) assert.ok(versionKey(RELEASES[k - 1].version) > versionKey(RELEASES[k].version));
  for (const r of RELEASES) {
    assert.match(r.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(r.items.length > 0 && r.items.every((s) => typeof s === 'string' && s.length > 0));
  }
});
```

`tests/docs-materials.test.js`:

```js
// Kullanıcı isteği: tüm materyaller ve etkileşimleri (eski ve yeni) docs/MATERIALS.md'de belgeli kalsın.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MATERIALS } from '../js/engine/materials.js';

test('docs/MATERIALS.md tanımlı her materyal anahtarını içerir', () => {
  const doc = fs.readFileSync(new URL('../docs/MATERIALS.md', import.meta.url), 'utf8');
  for (const def of MATERIALS.list) assert.ok(doc.includes(`\`${def.key}\``), `${def.key} docs/MATERIALS.md'de belgelenmemiş`);
});
```

Bu test yazıldığı anda geçer, çünkü belge mevcut ve planlanan tüm anahtarları içeriyor. Amacı, ileride belgesiz bir materyal eklenmesini engellemektir.

`tests/app-modules.test.js` dosyasına, storage bölümünün altına ekle:

```js
test('seenVersion yalnızca x.y.z biçimini kabul eder; 0.9.0 tercih kaydı sorunsuz yüklenir', () => {
  assert.equal(sanitizePrefs({ seenVersion: '0.9.0' }).seenVersion, '0.9.0');
  assert.equal(sanitizePrefs({ seenVersion: '<b>' }).seenVersion, DEFAULT_PREFS.seenVersion);
  // 0.9.0'ın kaydettiği alanlar (yeni alanlar yok):
  const old = { material: 'LAVA', brushSize: 6, brushShape: 'circle', speed: 1, quality: 'auto', seed: 'strata', scene: 'volcano' };
  const p = loadPrefs(memoryStorage({ k: JSON.stringify(old) }), 'k');
  assert.equal(p.material, 'LAVA');
  assert.equal(p.seenVersion, DEFAULT_PREFS.seenVersion);
});
```

`tests/app.test.js` içindeki `fakeDoc()` fonksiyonunu değiştir. Böylece `whats-new-dialog` de bulunur:

```js
function fakeDoc() {
  const announcer = { textContent: '' };
  const makeDialog = () => ({
    open: false,
    showModal() {
      this.open = true;
    },
  });
  const dialog = makeDialog();
  const whatsNew = makeDialog();
  return {
    announcer,
    dialog,
    whatsNew,
    getElementById: (id) => ({ announcer, 'help-dialog': dialog, 'whats-new-dialog': whatsNew })[id] ?? null,
  };
}
```

Aynı dosyanın sonuna ekle. Import satırına `import { APP_VERSION } from '../js/config.js';` ekle.

```js
test('Yenilikler diyaloğu açılınca görülen sürüm güncellenir ve kaydedilir', async () => {
  const { app, doc, storage } = setup({ seenVersion: '' });
  app.actions.whatsNew();
  assert.equal(doc.whatsNew.open, true);
  assert.equal(app.state.seenVersion, APP_VERSION);
  await new Promise((r) => setTimeout(r, 350)); // PERSIST_DELAY_MS
  assert.equal(JSON.parse(storage.data['fsbox.prefs.v1']).seenVersion, APP_VERSION);
});
```

- [ ] **Adım 2: Testlerin başarısız olduğunu gör**

Çalıştır: `node --test tests/releases.test.js tests/app-modules.test.js tests/app.test.js`
Beklenen: FAIL (`APP_VERSION` export edilmiyor, `releases.js` yok, `seenVersion` tanımsız).

- [ ] **Adım 3: Uygula**

`js/config.js` dosyasında `APP_SLUG` satırının altına:

```js
// Uygulama sürümü: package.json ve CHANGELOG.md ile aynı olmalı (tests/releases.test.js).
export const APP_VERSION = '0.9.0';
```

`js/app/releases.js`:

```js
// Kullanıcıya dönük sürüm notları ("Yenilikler" diyaloğu). Geliştirici ayrıntıları CHANGELOG.md'de.
// En yeni sürüm en üstte; RELEASES[0].version her zaman APP_VERSION'a eşittir (tests/releases.test.js).
export const RELEASES = Object.freeze([
  {
    version: '0.9.0',
    date: '2026-09-30',
    items: [
      'Kum, su, taş, ateş, odun, buhar, yağ, lav, bitki ve cam; hepsi gerçek hücre fiziğiyle.',
      'Volkan, Kum saati, Vaha ve Kaos Lab sahneleri; aynı seed aynı sahneyi üretir.',
      'Fırça boyutu ve şekli, basılı tutarak akıtma, sağ tıkla silme ve Geri al.',
      'Dokunmatik ekran desteği, klavye kısayolları ve görsel kalite ayarı.',
    ],
  },
]);

// Diyalogda gösterilen en fazla sürüm sayısı.
export const WHATS_NEW_COUNT = 3;
```

`js/app/storage.js`:

- `DEFAULT_PREFS` nesnesine `seenVersion: '',` ekle.
- `sanitizePrefs` dönüşüne şunu ekle:

```js
    seenVersion: typeof r.seenVersion === 'string' && /^\d+\.\d+\.\d+$/.test(r.seenVersion) ? r.seenVersion : d.seenVersion,
```

`js/app/app.js`:

- Import satırını `import { APP_SLUG, APP_VERSION, STORAGE_KEY } from '../config.js';` yap.
- `state` nesnesine `seenVersion: prefs.seenVersion,` ekle.
- `persist` içindeki destructuring ve `savePrefs` nesnesine `seenVersion` ekle:

```js
      const { material, brushSize, brushShape, speed, quality, seed, scene, seenVersion } = state;
      savePrefs({ material, brushSize, brushShape, speed, quality, seed, scene, seenVersion }, storage, STORAGE_KEY);
```

`actions` içine, `help()`'in altına:

```js
    whatsNew() {
      const dialog = doc.getElementById('whats-new-dialog');
      if (dialog && !dialog.open) dialog.showModal();
      state.seenVersion = APP_VERSION;
      persist();
      sync();
    },
```

`index.html`:

- Başlıktaki `h1` satırını şununla değiştir:

```html
        <h1 class="app-title"><span data-app-name>Strata Sandbox</span></h1>
        <button type="button" class="version-badge" id="btn-whats-new" aria-haspopup="dialog" title="Yenilikler">v–</button>
```

- `help-dialog` kapanışının (`</dialog>`) altına:

```html
  <dialog class="dialog" id="whats-new-dialog" aria-labelledby="whats-new-title">
    <h2 class="section-title" id="whats-new-title">Yenilikler</h2>
    <div class="releases" id="whats-new-list"></div>
    <form method="dialog" class="dialog-actions">
      <button class="btn" value="close">Kapat</button>
    </form>
  </dialog>
```

`js/app/controls.js`:

- Import'lara ekle:

```js
import { APP_VERSION } from '../config.js';
import { RELEASES, WHATS_NEW_COUNT } from './releases.js';
```

- "Diğer" bölümüne ekle:

```js
  // Sürüm rozeti ve Yenilikler listesi
  const badge = $('btn-whats-new');
  badge.textContent = `v${APP_VERSION}`;
  badge.addEventListener('click', () => actions.whatsNew());
  const releaseList = $('whats-new-list');
  for (const r of RELEASES.slice(0, WHATS_NEW_COUNT)) {
    const title = doc.createElement('h3');
    title.className = 'release-title';
    title.textContent = `v${r.version} · ${r.date}`;
    const items = doc.createElement('ul');
    items.className = 'release-items';
    for (const text of r.items) {
      const li = doc.createElement('li');
      li.textContent = text;
      items.append(li);
    }
    releaseList.append(title, items);
  }
```

- Fareyle tıklanınca odağı bırakan döngünün seçicisine başlığı da ekle: `'#panel button, #panel summary, .app-header button'`.
- `sync(state)` içine: `badge.dataset.new = String(state.seenVersion !== APP_VERSION);`

`css/controls.css` sonuna:

```css
/* Sürüm rozeti (başlık) ve Yenilikler diyaloğu */
.version-badge {
  align-self: center;
  padding: 1px var(--space-2);
  border: 1px solid var(--ink-600);
  border-radius: var(--radius-s);
  background: var(--ink-800);
  color: var(--bone-300);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  cursor: pointer;
  position: relative;
}

.version-badge:hover {
  border-color: var(--brass-600);
  color: var(--brass-400);
}

.version-badge:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

/* Görülmemiş sürüm: küçük pirinç nokta */
.version-badge[data-new="true"]::after {
  content: "";
  position: absolute;
  top: -3px;
  right: -3px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brass-400);
}

.release-title {
  margin: var(--space-3) 0 var(--space-1);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--brass-400);
}

.release-items {
  margin: 0;
  padding-left: var(--space-4);
  color: var(--bone-300);
  font-size: 13px;
  line-height: 1.5;
}

@media (pointer: coarse) {
  .version-badge {
    min-height: 32px;
  }
}
```

`docs/DEVELOPMENT.md`: roadmap'in son fazından sonra, "Manuel test checklist" başlığının üstüne ekle:

```markdown
### Phase 13 — Sıcaklık sistemi ve yeni içerik (0.10.0)

Spec: `docs/superpowers/specs/2026-09-30-sicaklik-sistemi-design.md` · Plan: `docs/superpowers/plans/2026-09-30-sicaklik-sistemi.md`

- [ ] Sürüm rozeti ve Yenilikler diyaloğu
- [ ] Ters çevirme (`flipVertical`, düğme, `F`)
- [ ] Kum saati yenilemesi
- [ ] Sıcaklık alanı veri modeli
- [ ] Isı geçişi (difüzyon, hava, kaynaklar, uyuyan satırlar)
- [ ] Isı görselleri ve termal görünüm
- [ ] Faz geçişleri ve sayaç hilelerinin taşınması
- [ ] Buz, Kar, Metal, Erimiş metal, Magma
- [ ] Gün/gece döngüsü, sahne ortamları, gökyüzü
- [ ] Isıt ve Soğut fırçaları
- [ ] Sekmeli seçici, Ortam bölümü, termal düğme, kısayollar, göstergeler
- [ ] Çoğaltıcı (`CLONER`)
- [ ] Buzul, Dökümhane ve Mağara sahneleri; volkan magması ve çoğaltıcısı
- [ ] Performans, dokümanlar, 0.10.0 sürümü
```

İlk maddeyi `[x]` yap.

`CHANGELOG.md` → `[Unreleased]` altına, `### Changed` başlığının üstüne:

```markdown
### Added

- Başlıkta sürüm rozeti. Rozete tıklanınca "Yenilikler" diyaloğu açılır ve son sürümlerin kullanıcıya dönük notlarını listeler. Görülmemiş sürümde rozette küçük bir işaret görünür.
- Sürüm tutarlılığı testi: `APP_VERSION`, `package.json`, CHANGELOG ve Yenilikler aynı sürümü göstermek zorunda.
```

- [ ] **Adım 4: Testlerin geçtiğini gör**

Çalıştır: `npm test`
Beklenen: tüm testler PASS.

- [ ] **Adım 5: Tarayıcıda kontrol et**

1. `node tools/serve.js 8080` komutunu arka planda başlat.
2. Playwright MCP ile `http://localhost:8080/` adresine git.
3. Beklenenler:
   - rozet `v0.9.0` gösteriyor ve rozette işaret var
   - tıklayınca diyalog açılıyor
   - kapatıp sayfa yenilenince işaret yok
   - konsol temiz

- [ ] **Adım 6: Commit ve push**

```powershell
git add js/config.js js/app/releases.js js/app/storage.js js/app/app.js js/app/controls.js index.html css/controls.css tests/releases.test.js tests/docs-materials.test.js tests/app-modules.test.js tests/app.test.js docs/DEVELOPMENT.md CHANGELOG.md
git commit -m "Sürüm rozeti ve Yenilikler diyaloğu"
git push -q origin main
```

---

### Task 2 (Görev 2): Ters çevirme

**Files:**
- Modify: `js/engine/world.js` (`flipVertical`)
- Modify: `js/engine/simulation.js` (`flipVertical`, `_spareSnapshot`)
- Modify: `js/app/app.js` (`flip` eylemi ve dispatch), `js/app/keyboard.js` (`F`), `js/app/controls.js` (düğme)
- Modify: `index.html` (düğme ve yardım satırı)
- Test: `tests/simulation.test.js`, `tests/app-modules.test.js`, `tests/app.test.js`

**Interfaces:**
- Produces:
  - `World#flipVertical(): void`
  - `Simulation#flipVertical(): void`, geri alınabilir
  - klavye eylemi `{ type: 'flip' }`
  - `actions.flip()`
- Görev 4, `World#flipVertical` içindeki dizi listesine `this.temp`'i ekler.

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/simulation.test.js` sonuna. Gerekirse import'ları tamamla:

```js
import { makeSim, toAscii, ascii, hashView } from './helpers.js';
```

```js
test('flipVertical dünyayı dikey aynalar; iki kez çevirmek ilk hâle döndürür', () => {
  const sim = makeSim(`
    S..
    .~.
    ..#
  `);
  const before = hashView(sim);
  sim.flipVertical();
  assert.equal(toAscii(sim), ascii(`
    ..#
    .~.
    S..
  `));
  assert.deepEqual(sim.world.checkInvariants(), []);
  sim.flipVertical();
  assert.equal(hashView(sim), before);
});

test('flipVertical geri alınabilir ve parçacık sayılarını korur', () => {
  const sim = makeSim(`
    SS.
    ...
    ~~#
  `);
  const before = hashView(sim);
  const counts = [...sim.view.counts];
  sim.flipVertical();
  assert.deepEqual([...sim.view.counts], counts);
  assert.equal(sim.canUndo, true);
  sim.undo();
  assert.equal(hashView(sim), before);
});

test('çizim sürerken çevirmek, çizimin undo noktasını bozmaz', () => {
  const sim = new Simulation({ width: 10, height: 10, debug: true });
  sim.setCell(1, 1, MAT.STONE);
  const before = hashView(sim);
  sim.beginStroke();
  sim.paintAt(5, 5, { material: MAT.STONE, size: 1, shape: 'square' });
  sim.flipVertical();
  sim.endStroke();
  assert.ok(sim.undo());
  assert.equal(hashView(sim), before, 'undo çizim öncesine dönmeli');
});
```

`tests/app-modules.test.js` → "kısayol eşlemesi planla uyumlu" testinin sonuna:

```js
  assert.deepEqual(keyToAction(key('f')), { type: 'flip' });
  assert.deepEqual(keyToAction(key('F', { shiftKey: true })), { type: 'flip' });
```

`tests/app.test.js` sonuna:

```js
test('flip eylemi dünyayı çevirir ve geri alınabilir', () => {
  const { app, sim } = setup();
  sim.setCell(0, 0, MAT.STONE);
  app.dispatch({ type: 'flip' });
  assert.equal(sim.getCell(0, sim.view.height - 1).material, MAT.STONE);
  assert.equal(sim.canUndo, true);
});
```

- [ ] **Adım 2: Başarısız olduğunu gör**

Çalıştır: `node --test tests/simulation.test.js tests/app-modules.test.js tests/app.test.js`
Beklenen: FAIL (`sim.flipVertical is not a function`, `flip` eşlemesi yok).

- [ ] **Adım 3: Uygula**

`js/engine/world.js` → `clear()` metodunun üstüne:

```js
  // Dünyayı dikey aynalar: iç satır y ↔ H−1−y (kenar çerçevesi yerinde kalır). Sayaçlar değişmez.
  // Damgalar aynalanmaz: çevirme tick'ler arasında yapılır ve bir sonraki tick yeni saatle başlar.
  flipVertical() {
    const { width, height, stride } = this;
    const arrays = [this.type, this.variant, this.life, this.flags];
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
```

`js/engine/simulation.js` → `clear()` metodunun altına:

```js
  // Dünyayı baş aşağı çevirir (kum saati). Clear gibi geri alınabilir.
  flipVertical() {
    const snap = this._spareSnapshot();
    this._capture(snap);
    this._undo = snap;
    this.world.flipVertical();
    this.version++;
  }
```

`_spareSnapshot()` içindeki seçim satırını değiştir. Çizim sürerken bekleyen snapshot'ın üzerine yazılmasın:

```js
    for (const snap of this._snapshots) if (snap !== this._undo && snap !== this._pending) return snap;
```

`js/app/keyboard.js` → `switch (k)` içine, `case 's':` bloğunun üstüne:

```js
    case 'f':
    case 'F':
      return altGr ? null : { type: 'flip' };
```

`NO_REPEAT` kümesine `'flip'` ekle.

`js/app/app.js` → `actions` içine, `clear()`'ın altına:

```js
    flip() {
      sim.flipVertical();
      announce('Dünya ters çevrildi. Geri al ile geri alınabilir.');
      sync();
    },
```

`dispatch` içine: `case 'flip': return actions.flip();`

`index.html`:

- Simülasyon bölümündeki ilk `button-row`'a, Adım düğmesinin arkasına:

```html
          <button type="button" class="btn" id="btn-flip" title="Dünyayı baş aşağı çevirir; kum saatinde kum bitince kullanın">Ters çevir <kbd>F</kbd></button>
```

- Yardım tablosuna, `.` satırının altına:

```html
        <tr><th scope="row"><kbd>F</kbd></th><td>Dünyayı ters çevir (kum saati)</td></tr>
```

`js/app/controls.js` → Simülasyon bölümüne: `$('btn-flip').addEventListener('click', () => actions.flip());`

`CHANGELOG.md` → `[Unreleased]` → `### Added` altına:

```markdown
- Ters çevirme (`F` ya da "Ters çevir" düğmesi): dünya dikey olarak aynalanır ve işlem geri alınabilir. Kum saatinde kum bitince yeniden akıtmak için kullanılır.
```

`### Fixed` başlığı yoksa ekle:

```markdown
### Fixed

- Çizim sürerken Temizle ya da ters çevirme yapılırsa, çizimin undo noktası bekleyen snapshot'ın üzerine yazılabiliyordu.
```

`docs/DEVELOPMENT.md` → Phase 13 → "Ters çevirme" maddesi `[x]`.

- [ ] **Adım 4: Testlerin geçtiğini gör**

Çalıştır: `npm test`
Beklenen: PASS.

- [ ] **Adım 5: Commit ve push**

```powershell
git add js/engine/world.js js/engine/simulation.js js/app/app.js js/app/keyboard.js js/app/controls.js index.html tests/simulation.test.js tests/app-modules.test.js tests/app.test.js CHANGELOG.md docs/DEVELOPMENT.md
git commit -m "Ters çevirme: flipVertical, F kısayolu ve düğme; bekleyen undo snapshot'ı korunur"
git push -q origin main
```

---

### Task 3 (Görev 3): Çoğaltıcı, Yutucu ve sürekli akan kum saati

> **Kapsam değişikliği (kullanıcı isteği, 2026-09-30).** Kullanıcı yutucuyu ve sınırsız kaynakları kum saati iyileştirmesine dahil etmek istedi: "kum saatinde yukarıda sınırsız çoğaltıcı, aşağıda sınırsız yutucu, sürekli devam". Bu yüzden çoğaltıcı (eski Görev 12) ve yeni yutucu bu görevde, sıcaklık alanından önce yapılır. Spec §3.4, §3.5, §7.1.

**Files:**
- Modify: `js/engine/materials.js` (`MAT.CLONER = 21`, `MAT.SINK = 22`, tanımlar)
- Modify: `js/engine/reactions.js`:
  - `SOURCE_INFINITE`, `CLONER_LEARNED`, `isMover`
  - `reactCloner`, `reactSink`
  - `RATES.maxClonesPerTick`, `RATES.maxSinksPerTick`
  - bütçeler
- Modify: `js/engine/simulation.js` (`configureSource`)
- Modify: `js/render/palette.js` (`DYN.CLONER`, `DYN.SINK`, `ramps.spent`), `js/render/pixels.js` (`mixPacked` ve iki kaynak rengi)
- Modify: `js/app/catalog.js` (Çoğaltıcı `X`, Yutucu `Y`; `category: 'solid'`), `index.html` (yardım satırları)
- Modify: `js/scenes/hourglass.js` (sürekli akış), `js/scenes/index.js` (ipucu)
- Modify: `js/app/app.js` (sahne ipucunu duyur)
- Modify: `tests/helpers.js` (`C` çoğaltıcı, `V` yutucu)
- Create: `tests/sources.test.js`
- Modify: `tests/scenes.test.js`, `tests/render-pixels.test.js`, `tests/app-modules.test.js`
- Modify: `docs/MATERIALS.md` (Çoğaltıcı ve Yutucu → Mevcut), `CHANGELOG.md`, `docs/DEVELOPMENT.md`

**Interfaces:**
- Produces:
  - `MAT.CLONER = 21`, `MAT.SINK = 22`
  - `reactions.js`: `export const SOURCE_INFINITE = 65535`, `export const CLONER_LEARNED = 2`, `export function isMover(t): boolean`
  - `Simulation#configureSource(x, y, { learn?, budget? }): boolean`
    - `budget`: 0..65535 tamsayı ya da `Infinity` (→ 65535, sınırsız)
    - `learn`: yalnızca çoğaltıcıda ve yalnızca hareketli materyal
    - Undo noktası oluşturmaz.
  - `pixels.js` içinde modül fonksiyonu `mixPacked(a, b, f)`. Görev 6 bunu kullanır, yeniden tanımlamaz.
  - Sahne kaydında `hint` alanı; `app.load()` duyurur.
- Sonraki görevlere düşen işler:
  - Görev 4: `reactCloner` kopyasını `spawnTemp(m, world.ambient)` ile, `reactSink` boşalttığı hücreyi `world.ambient` ile yazar.
  - Görev 5: CLONER/SINK termal değerleri `conduct: 0.06, capacity: 4`.

- [ ] **Adım 1: Başarısız testleri yaz**

1. `tests/helpers.js` → `CHAR_TO_MAT` sözlüğüne `C: MAT.CLONER, V: MAT.SINK,` ekle.
2. `tests/sources.test.js`:
   - çoğaltıcı üstüne dökülen kumu öğrenir ve kopyalar
   - tam olarak bütçesi kadar kopya üretir
   - sınırsız çoğaltıcı bütçe harcamaz
   - statik materyali ve kaynakları öğrenmez; öğrenmemişken üretmez
   - yutucu değen hareketli materyali bütçesi kadar yutar, statik materyale dokunmaz
   - sınırsız yutucu tükenmez
   - `configureSource` doğrulaması (kaynak olmayan hücre, hareketsiz `learn`, aralık dışı bütçe)
   - determinizm
3. `tests/render-pixels.test.js`:
   - öğrenmiş çoğaltıcı öğrendiği materyalin rengine bürünür
   - bütçesi bitmiş çoğaltıcı ve yutucu sönükleşir
4. `tests/app-modules.test.js`: kısayol eşlemesine `x: MAT.CLONER, y: MAT.SINK` eklenir.
5. `tests/scenes.test.js`: kum saati testleri (aşağıda).

Kum saati testleri:

- **Simetri:** kum, çoğaltıcı ve yutucu dışındaki şekil orta satıra göre simetriktir. Uç en-boy oranları dahil yedi boyutta kontrol edilir.
- **Kaynak konumu:** çoğaltıcı üst yarıdadır, kumu öğrenmiştir ve sınırsızdır; yutucu alt yarıda ve sınırsızdır.
- **Sürekli akış:** 400×225 gridde 3000–6000 tick arasında, 20 tick'te bir alınan örneklerin en az %80'inde boğazda kum vardır. Sonda üst hazne en az başlangıç kumunun yarısını tutar; alt hazne tıkanmaz (alt yarıdaki kum < başlangıç üst kumunun %60'ı).
- **Uç oranlar:** 64×48, 400×120 ve 120×300 gridlerde 200–400 tick arasında boğazda kum görülür.

- [ ] **Adım 2: Başarısız olduğunu gör**

Çalıştır: `node --test tests/sources.test.js tests/scenes.test.js tests/render-pixels.test.js tests/app-modules.test.js`
Beklenen: FAIL (`MAT.CLONER` tanımsız, `configureSource` yok).

- [ ] **Adım 3: Uygula**

**Motor**

- `materials.js`:

```js
  { id: MAT.CLONER, key: 'CLONER', name: 'Cloner', kind: KIND.STATIC, density: 255, color: '#6a5a86', reactive: true, life: [1000, 1000] },
  { id: MAT.SINK, key: 'SINK', name: 'Sink', kind: KIND.STATIC, density: 255, color: '#1b1626', reactive: true, life: [1000, 1000] },
```

- `reactions.js`:
  - `reactCloner`: bütçe varken öğrendiği materyali boş komşuya yazar.
  - `reactSink`: bütçe varken hareketli komşuyu boşaltır.
  - İkisi de `spend(world, i)` ile bütçeyi azaltır. Bütçe `SOURCE_INFINITE` ise azaltmaz.
  - Tick başına genel sınırlar `cloneBudget` ve `sinkBudget`, varsayılan 300.
- `simulation.js` → `configureSource`: spec §3.5'teki doğrulamayı yapar, `this.version++`.

**Render**

- `palette.js`: `DYN.CLONER = 5`, `DYN.SINK = 6`, `ramps.spent` (gri).
- `pixels.js`:
  - çoğaltıcı: öğrendiyse %50 karışım, bütçesi bittiyse %20
  - yutucu: bütçesi bitince `spent` ile %50 karışım

**Kum saati**

- Önce kum doldurulur. Ardından:
  - `glassTop` satırında en fazla 8 hücrelik sınırsız çoğaltıcı yerleştirilir (`learn: SAND`).
  - `H−1−glassTop` satırında en fazla 6 hücrelik sınırsız yutucu (ölçüm: 4 hücrede yığın büyüyüp tıkanıyor, 6 hücrede ~200 kumluk sabit yığın) yerleştirilir.
- Hücreler iç boşluğun içinde kalır: yarı genişlik ≤ A + 1.

- [ ] **Adım 4: Testleri çalıştır**

Çalıştır: `npm test`
Beklenen: PASS.

`docs-materials` testi `SINK` belgelenmeden kırmızıdır. Bunu `docs/MATERIALS.md`'yi güncelleyerek düzelt.

- [ ] **Adım 5: Tarayıcıda gözle kontrol**

`?scene=hourglass` adresini aç. Beklenenler:

- yuvarlak hazneler
- üstte mor çoğaltıcı sırası, altta koyu yutucu sırası
- kum dakikalarca durmadan akıyor
- konsol temiz

- [ ] **Adım 6: Belge, changelog, commit**

- `docs/MATERIALS.md`: Çoğaltıcı ve Yutucu → Mevcut; `SINK` satırı; sınırsız mod.
- `CHANGELOG.md`: Added (Çoğaltıcı, Yutucu, `configureSource`), Changed (kum saati sürekli akış).
- `docs/DEVELOPMENT.md`: "Kum saati yenilemesi" ve "Çoğaltıcı" maddeleri `[x]`.

```powershell
git add -A js tests index.html docs/MATERIALS.md CHANGELOG.md docs/DEVELOPMENT.md
git commit -m "Çoğaltıcı ve Yutucu; sürekli akan, simetrik kum saati"
git push -q origin main
```

---

### Task 4 (Görev 4): Sıcaklık alanı veri modeli

> Görev 3'ten: `reactCloner` ve `reactSink` içindeki `world.set` çağrılarına da sıcaklık ver. Kopya `spawnTemp(m, world.ambient)` alır, yutulan hücre `world.ambient` alır.

**Files:**
- Create: `js/engine/climate.js`
- Modify: `js/engine/world.js` (`temp`, `tempNext`, `ambient`, `set`, `swap`, `clear`, `flipVertical`, `swapTempBuffers`, `checkInvariants`)
- Modify: `js/engine/materials.js` (`temp` alanı, `SPAWN_TEMP`, `spawnTemp`)
- Modify: `js/engine/simulation.js` (boyama sıcaklığı, snapshot, `getCell`, view)
- Modify: `js/engine/reactions.js` (`vanish` sıcaklığı korur, ateş doğuş sıcaklığı)
- Modify: `tests/helpers.js` (`hashView` sıcaklığı içerir), `tools/bench.js` (`hashState`)
- Create: `tests/temperature.test.js`

**Interfaces:**
- Produces:
  - `climate.js`: `DEFAULT_AMBIENT = 20`, `AMBIENT_MIN = -40`, `AMBIENT_MAX = 60`, `TEMP_MIN = -273`, `TEMP_MAX = 5000`, `clampAmbient(c): number`
  - `World`: `temp: Float32Array`, `tempNext: Float32Array`, `ambient: number`, `set(i, type, variant, life, flags, temp = this.ambient)`, `swapTempBuffers()`
  - `materials.js`: `MATERIALS.SPAWN_TEMP` (`Float32Array`, NaN = ortam), `spawnTemp(t, ambient): number`
  - `sim.view.temp` (getter; tampon her tick yer değiştirir), `sim.view.ambient`
  - `sim.getCell()` → `{ material, life, variant, temp }`

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/temperature.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { World } from '../js/engine/world.js';
import { Simulation } from '../js/engine/simulation.js';
import { DEFAULT_AMBIENT, clampAmbient } from '../js/engine/climate.js';
import { hashView, countMaterial } from './helpers.js';

test('yeni dünyada kenar dahil her hücre ortam sıcaklığındadır', () => {
  const w = new World(8, 6);
  for (let i = 0; i < w.size; i++) assert.equal(w.temp[i], DEFAULT_AMBIENT);
});

test('swap sıcaklığı parçacıkla taşır; transform korur; set verilen ya da ortam sıcaklığını yazar', () => {
  const w = new World(4, 4);
  const a = w.index(1, 1);
  const b = w.index(1, 2);
  w.set(a, MAT.SAND, 0, 0, 0, 500);
  w.swap(a, b);
  assert.equal(w.temp[b], 500);
  assert.equal(w.temp[a], DEFAULT_AMBIENT);
  w.transform(b, MAT.GLASS, 0);
  assert.equal(w.temp[b], 500);
  w.set(a, MAT.STONE, 0, 0, 0);
  assert.equal(w.temp[a], w.ambient);
});

test('clear sıcaklığı ortam değerine döndürür', () => {
  const w = new World(4, 4);
  w.temp[w.index(2, 2)] = 900;
  w.ambient = -5;
  w.clear();
  for (let i = 0; i < w.size; i++) assert.equal(w.temp[i], -5);
});

test('flipVertical sıcaklığı da aynalar', () => {
  const w = new World(3, 4);
  w.temp[w.index(1, 0)] = 700;
  w.flipVertical();
  assert.equal(w.temp[w.index(1, 3)], 700);
  assert.equal(w.temp[w.index(1, 0)], DEFAULT_AMBIENT);
});

test('checkInvariants sonlu olmayan ya da aralık dışı sıcaklığı yakalar', () => {
  const w = new World(4, 4);
  w.temp[w.index(1, 1)] = NaN;
  assert.ok(w.checkInvariants().some((p) => p.includes('sıcaklık')));
  w.temp[w.index(1, 1)] = 99999;
  assert.ok(w.checkInvariants().some((p) => p.includes('sıcaklık')));
});

test('undo sıcaklığı da geri getirir', () => {
  const sim = new Simulation({ width: 6, height: 6 });
  sim.setCell(2, 2, MAT.STONE);
  const i = sim.world.index(2, 2);
  sim.world.temp[i] = 700;
  const before = hashView(sim);
  sim.beginStroke();
  sim.paintAt(4, 4, { material: MAT.SAND, size: 1, shape: 'square' });
  sim.world.temp[i] = 20;
  sim.endStroke();
  assert.ok(sim.undo());
  assert.equal(sim.getCell(2, 2).temp, 700);
  assert.equal(hashView(sim), before);
});

test('silgi ortam sıcaklığı yazar; getCell sıcaklığı döner', () => {
  const sim = new Simulation({ width: 4, height: 4 });
  sim.setCell(1, 1, MAT.STONE);
  sim.world.temp[sim.world.index(1, 1)] = 700;
  sim.paintAt(1, 1, { material: MAT.EMPTY, size: 1, shape: 'square' });
  assert.equal(sim.getCell(1, 1).temp, sim.world.ambient);
});

test('sönen ateş yerinde sıcak hava bırakır (vanish sıcaklığı korur)', () => {
  const sim = new Simulation({ width: 5, height: 6, seed: 'hot-air' });
  sim.setCell(2, 5, MAT.FIRE);
  sim.world.temp[sim.world.index(2, 5)] = 900;
  let hottestAir = 0;
  for (let t = 0; t < 80 && countMaterial(sim, MAT.FIRE) > 0; t++) sim.step();
  assert.equal(countMaterial(sim, MAT.FIRE), 0);
  for (let i = 0; i < sim.view.temp.length; i++) if (sim.view.type[i] === MAT.EMPTY) hottestAir = Math.max(hottestAir, sim.view.temp[i]);
  assert.ok(hottestAir > 300, `en sıcak hava ${hottestAir}`);
});

test('clampAmbient aralığa kırpar, sonlu olmayanı varsayılana çevirir', () => {
  assert.equal(clampAmbient(100), 60);
  assert.equal(clampAmbient(-100), -40);
  assert.equal(clampAmbient(NaN), DEFAULT_AMBIENT);
  assert.equal(clampAmbient(12.5), 12.5);
});
```

- [ ] **Adım 2: Başarısız olduğunu gör**

Çalıştır: `node --test tests/temperature.test.js`
Beklenen: FAIL (`climate.js` yok, `w.temp` undefined).

- [ ] **Adım 3: Uygula**

`js/engine/climate.js`:

```js
// Ortam sıcaklığı sabitleri (gün/gece döngüsü Görev 9'da eklenir).
// Saf fonksiyonlar; yalnızca aritmetik (Math.sin/exp/pow yok: tarayıcılar arası determinizm).
export const DEFAULT_AMBIENT = 20;
export const AMBIENT_MIN = -40;
export const AMBIENT_MAX = 60;
// Alanın geçerli aralığı (debug değişmezi): mutlak sıfır ile makul üst sınır.
export const TEMP_MIN = -273;
export const TEMP_MAX = 5000;

export function clampAmbient(c) {
  if (!Number.isFinite(c)) return DEFAULT_AMBIENT;
  return c < AMBIENT_MIN ? AMBIENT_MIN : c > AMBIENT_MAX ? AMBIENT_MAX : c;
}
```

`js/engine/world.js`:

- Import: `import { DEFAULT_AMBIENT, TEMP_MIN, TEMP_MAX } from './climate.js';`
- Constructor'da `this.counts` satırının altına:

```js
    this.temp = new Float32Array(this.size); // °C; hava dahil her hücre (ADR-014)
    this.tempNext = new Float32Array(this.size); // difüzyon hedef tamponu (heat.js)
    this.ambient = DEFAULT_AMBIENT; // bu tick'in ortam sıcaklığı (Simulation yazar)
```

`this.ambient`, `this.clear()` çağrısından önce atanmalı; `clear` alanı ortam sıcaklığıyla doldurur.

- `set` metodunu değiştir:

```js
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
```

- `swap` metodunda destructuring'e `temp` ekle, `flags` takasının altına:

```js
    t = temp[a];
    temp[a] = temp[b];
    temp[b] = t;
```

- `clear()` içinde `this.flags.fill(0);` satırının altına:

```js
    this.temp.fill(this.ambient);
    this.tempNext.fill(this.ambient);
```

- `flipVertical` içindeki dizi listesi: `[this.type, this.variant, this.life, this.flags, this.temp]`.
- `clear()`'ın altına:

```js
  // Difüzyon tamponlarını yer değiştirir (heat.js); world.temp her zaman güncel alandır.
  swapTempBuffers() {
    const t = this.temp;
    this.temp = this.tempNext;
    this.tempNext = t;
  }
```

- `checkInvariants` döngüsünde, tanımsız materyal kontrolünün altına:

```js
      const T = this.temp[i];
      if (!(T >= TEMP_MIN && T <= TEMP_MAX)) problems.push(`sıcaklık geçersiz @${i}: ${T}`);
```

`js/engine/materials.js`:

- `compileMaterials` içinde tablo tanımlarına: `const SPAWN_TEMP = new Float32Array(256).fill(NaN);`
- Tanım döngüsüne:

```js
    if (def.temp !== undefined && def.temp !== null) {
      if (!Number.isFinite(def.temp)) throw new RangeError(`Geçersiz doğuş sıcaklığı (${def.key})`);
      SPAWN_TEMP[def.id] = def.temp;
    }
```

- Dönüş nesnesine `SPAWN_TEMP,` ekle.
- Tanım alanları yorumuna şu satırı ekle:

```js
//   temp:      doğuş sıcaklığı °C (yoksa ortam sıcaklığı)
```

- Dosya sonuna:

```js
// Materyalin doğuş sıcaklığı; tanımsızsa (NaN) ortam sıcaklığı.
export function spawnTemp(t, ambient) {
  const s = MATERIALS.SPAWN_TEMP[t];
  return s === s ? s : ambient;
}
```

`js/engine/simulation.js`:

- Import: `import { MAT, KIND, MATERIALS, spawnTemp } from './materials.js';`
- View nesnesine şu getter'ları ekle. Tampon her tick yer değiştirdiği için düz alan olmaz:

```js
      get temp() {
        return w.temp;
      },
      get ambient() {
        return w.ambient;
      },
```

- `setCell`:

```js
    w.set(i, material, h & 255, initialLife(material, h >>> 9), (h >>> 8) & 1, spawnTemp(material, w.ambient));
```

- `_paintCell` içinde silgi: `w.set(i, EMPTY, 0, 0, 0, w.ambient);`
- Aynı fonksiyonda materyal: `w.set(i, material, h & 255, initialLife(material, h >>> 9), (h >>> 8) & 1, spawnTemp(material, w.ambient));`
- `getCell` dönüşü: `{ material: w.type[i], life: w.life[i], variant: w.variant[i], temp: w.temp[i] }`
- `_spareSnapshot` içindeki yeni snapshot nesnesine `temp: new Float32Array(size),` ekle.
- `_capture` içine: `snap.temp.set(w.temp);`
- `undo()` içine: `w.temp.set(snap.temp);`

`js/engine/reactions.js`:

- Import: `import { MAT, MATERIALS, spawnTemp } from './materials.js';`
- `vanish`:

```js
// Hücre boşalır; sıcaklığı korunur (sönen ateş geride sıcak hava bırakır).
function vanish(world, i) {
  world.set(i, EMPTY, 0, 0, 0, world.temp[i]);
}
```

- `reactBurning` içindeki ateş üretimi:

```js
      world.set(j, FIRE, rng.nextU32() & 255, initialLife(FIRE, rng.nextU32()), 0, spawnTemp(FIRE, world.ambient));
```

`tests/helpers.js` → `hashView`:

```js
// FNV-1a: dünyanın tüm hücre durumunu (tip, ton, life, flags, sıcaklık bitleri) özetler.
export function hashView(sim) {
  const { type, variant, life, flags } = sim.view;
  const temp = sim.view.temp;
  const tb = new Uint32Array(temp.buffer, temp.byteOffset, temp.length);
  let h = 0x811c9dc5;
  const mix = (v) => {
    h ^= v & 0xff;
    h = Math.imul(h, 0x01000193);
  };
  for (let i = 0; i < type.length; i++) {
    mix(type[i]);
    mix(variant[i]);
    mix(life[i]);
    mix(life[i] >>> 8);
    mix(flags[i]);
    mix(tb[i]);
    mix(tb[i] >>> 8);
    mix(tb[i] >>> 16);
    mix(tb[i] >>> 24);
  }
  return h >>> 0;
}
```

`tools/bench.js` → `hashState`:

```js
function hashState(view) {
  const tb = new Uint32Array(view.temp.buffer, view.temp.byteOffset, view.temp.length);
  let h = 0x811c9dc5;
  for (let i = 0; i < view.type.length; i++) {
    h ^= view.type[i];
    h = Math.imul(h, 0x01000193);
    h ^= view.life[i] & 0xff;
    h = Math.imul(h, 0x01000193);
    h ^= tb[i] & 0xff;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}
```

- [ ] **Adım 4: Testlerin geçtiğini gör**

Çalıştır: `npm test`
Beklenen: PASS.

"sönen ateş" testi bu görevde sıcaklığı elle 900'e ayarlar. Difüzyon henüz olmadığı için sıcaklık korunur. Görev 5 difüzyonu ekledikten sonra da test geçmelidir, çünkü hava birkaç tick'te soğumaz.

- [ ] **Adım 5: Changelog, DEVELOPMENT, commit**

`CHANGELOG.md` → `[Unreleased]` → `### Added`:

```markdown
- Sıcaklık alanı (`world.temp`, °C): her hücrenin bir sıcaklığı var; sıcaklık parçacıkla birlikte taşınıyor, undo ve ters çevirme sıcaklığı da kapsıyor. Sönen ateş geride sıcak hava bırakıyor.
```

`docs/DEVELOPMENT.md` → "Sıcaklık alanı veri modeli" `[x]`.

```powershell
git add js/engine/climate.js js/engine/world.js js/engine/materials.js js/engine/simulation.js js/engine/reactions.js tests/helpers.js tools/bench.js tests/temperature.test.js CHANGELOG.md docs/DEVELOPMENT.md
git commit -m "Sıcaklık alanı veri modeli: temp tamponları, taşıma, undo, değişmezler"
git push -q origin main
```

---

### Task 5 (Görev 5): Isı geçişi (difüzyon, hava, kaynaklar, uyuyan satırlar)

> Görev 3'ten: termal tabloya CLONER ve SINK için `conduct: 0.06, capacity: 4` ekle.

**Files:**
- Create: `js/engine/heat.js`
- Modify: `js/engine/materials.js` (`conduct`, `capacity`, `source`; mevcut materyallerin termal değerleri; kararlılık doğrulaması)
- Modify: `js/engine/simulation.js` (geçiş 3, `ambientBase`, `get ambient`, `setAmbient`, `setTemp`)
- Create: `tests/heat.test.js`
- Modify: `tests/materials.test.js`

**Interfaces:**
- Consumes: Görev 4'teki `World`, `climate.js` ve `spawnTemp`.
- Produces:
  - `heat.js`:
    - `HEAT` (dondurulmuş sabitler: `AIR_RELAX`, `SLEEP_EPS`; Görev 7 genişletir)
    - `createHeatState(height): { hot: Uint8Array, sleep: boolean }`
    - `stepHeat(world, rng, state): void`
  - `MATERIALS.CONDUCT`, `CAP`, `INV_CAP` (`Float32Array`), `SOURCE_TEMP` (`Float32Array`, kaynak değilse −∞)
  - `Simulation`: `ambientBase: number`, `get ambient(): number`, `setAmbient(c): void`, `setTemp(x, y, c): boolean`, `_heat` (iç; testler `sim._heat.sleep = false` yapabilir)

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/materials.test.js` sonuna:

```js
test('kararsız ısı iletimi (K/C > 0,25) ve 1\'den küçük ısı kapasitesi derleme hatası verir', () => {
  const base = { id: 0, key: 'EMPTY', name: 'E', kind: KIND.NONE, density: 5 };
  assert.throws(() => compileMaterials([{ ...base, conduct: 0.3, capacity: 1 }]), /K\/C/);
  assert.throws(() => compileMaterials([{ ...base, conduct: 0.1, capacity: 0.5 }]), /kapasite/);
  assert.doesNotThrow(() => compileMaterials([{ ...base, conduct: 0.25, capacity: 1 }]));
});

test('termal tablolar: lav ve ateş sıcak doğar, ateş ve yanan odun kaynaktır, taş kaynak değildir', () => {
  assert.equal(MATERIALS.SPAWN_TEMP[MAT.LAVA], 1150);
  assert.equal(MATERIALS.SOURCE_TEMP[MAT.FIRE], 900);
  assert.equal(MATERIALS.SOURCE_TEMP[MAT.BURNING_WOOD], 700);
  assert.equal(MATERIALS.SOURCE_TEMP[MAT.STONE], -Infinity);
  for (const def of MATERIALS.list) assert.ok(MATERIALS.CONDUCT[def.id] / MATERIALS.CAP[def.id] <= 0.25, def.key);
});
```

`tests/heat.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT, MATERIALS } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { HEAT } from '../js/engine/heat.js';
import { runTicks, hashView } from './helpers.js';

const T = (sim, x, y) => sim.getCell(x, y).temp;

function filled(w, h, matAt) {
  const sim = new Simulation({ width: w, height: h, seed: 'heat' });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) sim.setCell(x, y, matAt(x, y));
  return sim;
}

function energy(sim) {
  const { width, height, stride, type, temp } = sim.view;
  let e = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y + 1) * stride + x + 1;
    e += MATERIALS.CAP[type[i]] * temp[i];
  }
  return e;
}

test('havasız kapalı dünyada toplam ısı enerjisi (Σ C·T) korunur', () => {
  const sim = filled(40, 40, (x) => (x < 20 ? MAT.STONE : MAT.GLASS));
  for (let y = 18; y <= 21; y++) for (let x = 18; x <= 21; x++) sim.setTemp(x, y, 1000);
  const e0 = energy(sim);
  runTicks(sim, 60);
  assert.ok(Math.abs(energy(sim) - e0) / e0 < 1e-4, `enerji ${e0} → ${energy(sim)}`);
  assert.ok(T(sim, 22, 20) > 21, 'ısı yayılmalı');
});

test('tek sıcak nokta her yöne eşit yayılır (yön bias\'ı yok)', () => {
  const sim = filled(41, 41, () => MAT.STONE);
  sim.setTemp(20, 20, 1000);
  runTicks(sim, 40);
  for (let d = 1; d <= 6; d++) {
    const l = T(sim, 20 - d, 20);
    const r = T(sim, 20 + d, 20);
    const u = T(sim, 20, 20 - d);
    const dn = T(sim, 20, 20 + d);
    assert.ok(Math.abs(l - r) < 1e-3 && Math.abs(u - dn) < 1e-3 && Math.abs(l - u) < 1e-3, `d=${d}: ${l} ${r} ${u} ${dn}`);
  }
});

test('değerler başlangıçtaki min–max aralığında kalır (salınım yok)', () => {
  const sim = filled(20, 20, (x, y) => ((x + y) % 2 === 0 ? MAT.WATER : MAT.STONE));
  for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) if ((x * 3 + y) % 2 === 0) sim.setTemp(x, y, 1000);
  for (let k = 0; k < 20; k++) {
    sim.step();
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
      const v = T(sim, x, y);
      assert.ok(v >= 20 - 1e-3 && v <= 1000 + 1e-3, `(${x},${y})=${v}`);
    }
  }
});

test('hava ortam sıcaklığına yaklaşır; kenar çerçevesi ortam sıcaklığındadır', () => {
  const sim = new Simulation({ width: 20, height: 20 });
  sim.setTemp(10, 10, 600);
  sim.setAmbient(-10);
  runTicks(sim, 600);
  for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) assert.ok(Math.abs(T(sim, x, y) + 10) < 1, `(${x},${y})`);
  assert.equal(sim.world.temp[0], -10);
});

test('ateş ve yanan materyaller kaynak sıcaklığının altına inmez', () => {
  const sim = new Simulation({ width: 6, height: 6 });
  sim.setCell(2, 5, MAT.BURNING_WOOD);
  sim.setTemp(2, 5, 20);
  sim.step();
  assert.ok(T(sim, 2, 5) >= 700);
});

test('boyanan lav doğuş sıcaklığıyla gelir', () => {
  const sim = new Simulation({ width: 4, height: 4 });
  sim.setCell(1, 1, MAT.LAVA);
  assert.equal(T(sim, 1, 1), 1150);
});

test('uyuyan satır optimizasyonu sonucu yalnızca SLEEP_EPS mertebesinde değiştirir', () => {
  const run = (sleep) => {
    const sim = new Simulation({ width: 60, height: 40, seed: 'sleep' });
    for (let y = 30; y < 40; y++) for (let x = 0; x < 60; x++) sim.setCell(x, y, MAT.STONE);
    for (let y = 26; y < 30; y++) for (let x = 25; x < 35; x++) sim.setCell(x, y, MAT.WATER);
    for (let y = 31; y < 34; y++) for (let x = 5; x < 9; x++) sim.setTemp(x, y, 800);
    sim._heat.sleep = sleep;
    runTicks(sim, 500);
    return sim;
  };
  const a = run(true);
  const b = run(false);
  let maxDiff = 0;
  for (let i = 0; i < a.view.temp.length; i++) maxDiff = Math.max(maxDiff, Math.abs(a.view.temp[i] - b.view.temp[i]));
  assert.ok(maxDiff <= 2 * HEAT.SLEEP_EPS, `en büyük fark ${maxDiff}`);
  assert.deepEqual([...a.view.counts], [...b.view.counts]);
});

test('ortam ayarı dünyayı anında değiştirmez: undo noktası yok, materyaller aynı', () => {
  const sim = new Simulation({ width: 10, height: 10 });
  sim.setCell(3, 3, MAT.WATER);
  const types = [...sim.view.type];
  sim.setAmbient(-30);
  assert.equal(sim.canUndo, false);
  assert.deepEqual([...sim.view.type], types);
  assert.equal(sim.ambient, -30);
  sim.setAmbient(500);
  assert.equal(sim.ambient, 60, 'aralığa kırpılır');
});

test('setTemp sonlu olmayanı reddeder, aralığa kırpar, dünya dışını reddeder', () => {
  const sim = new Simulation({ width: 4, height: 4 });
  assert.equal(sim.setTemp(1, 1, NaN), false);
  assert.equal(sim.setTemp(9, 9, 100), false);
  sim.setTemp(1, 1, 1e9);
  assert.equal(T(sim, 1, 1), 5000);
});

test('ısı geçişi deterministiktir', () => {
  const run = () => {
    const sim = filled(30, 20, (x, y) => (y > 12 ? MAT.STONE : x % 5 === 0 ? MAT.WATER : MAT.EMPTY));
    sim.setTemp(15, 15, 1200);
    runTicks(sim, 200);
    return hashView(sim);
  };
  assert.equal(run(), run());
});
```

- [ ] **Adım 2: Başarısız olduğunu gör**

Çalıştır: `node --test tests/heat.test.js tests/materials.test.js`
Beklenen: FAIL (`heat.js` yok, `setTemp` ve `setAmbient` tanımsız).

- [ ] **Adım 3: Materyallere termal alanları ekle**

`js/engine/materials.js`:

- Alan yorumlarına:

```js
// Isı alanları (ADR-014):
//   conduct:   iletkenlik K (iki hücre arası k = min(K_i, K_j)); varsayılan 0,02
//   capacity:  ısı kapasitesi C (≥ 1); varsayılan 2. Kararlılık için K/C ≤ 0,25 (derlemede doğrulanır)
//   source:    sabit kaynak sıcaklığı °C (hücre bunun altına inmez: ateş, yanma, magma)
```

- `compileMaterials` başına: `const DEFAULT_CONDUCT = 0.02;` ve `const DEFAULT_CAPACITY = 2;`
- Tablolar:

```js
  const CONDUCT = new Float32Array(256);
  const CAP = new Float32Array(256);
  const INV_CAP = new Float32Array(256);
  const SOURCE_TEMP = new Float32Array(256).fill(-Infinity);
```

- Tanım döngüsüne:

```js
    const K = def.conduct ?? DEFAULT_CONDUCT;
    const C = def.capacity ?? DEFAULT_CAPACITY;
    if (!(C >= 1)) throw new RangeError(`Isı kapasitesi en az 1 olmalı (${def.key})`);
    if (!(K >= 0 && K / C <= 0.25)) throw new RangeError(`Kararsız ısı iletimi: K/C > 0,25 (${def.key})`);
    CONDUCT[def.id] = K;
    CAP[def.id] = C;
    INV_CAP[def.id] = 1 / C;
    if (def.source !== undefined) SOURCE_TEMP[def.id] = def.source;
```

- Dönüş nesnesine `CONDUCT, CAP, INV_CAP, SOURCE_TEMP,` ekle.
- `MATERIAL_DEFS` içinde mevcut kayıtlara şu alanları ekle. Diğer alanlara dokunma:

| Kayıt | Eklenecek |
|---|---|
| EMPTY | `conduct: 0.01, capacity: 1` |
| WALL | `conduct: 0.01, capacity: 1` |
| SAND | `conduct: 0.04, capacity: 3` |
| STONE | `conduct: 0.06, capacity: 4` |
| WATER | `conduct: 0.08, capacity: 4` |
| OIL | `conduct: 0.03, capacity: 3` |
| LAVA | `temp: 1150, conduct: 0.04, capacity: 4` |
| STEAM | `temp: 105, conduct: 0.02, capacity: 1` |
| FIRE | `temp: 900, source: 900, conduct: 0.05, capacity: 1` |
| WOOD | `conduct: 0.02, capacity: 3` |
| GLASS | `conduct: 0.05, capacity: 3` |
| PLANT | `conduct: 0.02, capacity: 3` |
| BURNING_WOOD, BURNING_PLANT, BURNING_OIL | `temp: 700, source: 700, conduct: 0.04, capacity: 2` |
| ASH | `conduct: 0.01, capacity: 2` |

- [ ] **Adım 4: `heat.js`'i yaz**

`js/engine/heat.js`:

```js
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

// Satır, ortamdan belirgin sapan bir hücre içeriyorsa sıcaktır (Görev 7 eşik adaylarını ekler).
function markHotRows(world, a, hot, amb) {
  const { width, height, stride } = world;
  const eps = HEAT.SLEEP_EPS;
  for (let y = 0; y < height; y++) {
    let flag = 0;
    for (let i = (y + 1) * stride + 1, end = i + width; i < end; i++) {
      const d = a[i] - amb;
      if (d > eps || d < -eps) {
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
```

- [ ] **Adım 5: Simulation'a bağla**

`js/engine/simulation.js`:

- Import'lar:

```js
import { stepHeat, createHeatState } from './heat.js';
import { DEFAULT_AMBIENT, clampAmbient, TEMP_MIN, TEMP_MAX } from './climate.js';
```

- Constructor'da `this._gasRows` satırının altına:

```js
    this._heat = createHeatState(height); // geçiş 3 (ısı) durumu
    this.ambientBase = DEFAULT_AMBIENT; // kullanıcı ayarı (undo ile geri alınmaz)
```

- `resetTiming()` metodunun altına:

```js
  // Bu tick'in ortam sıcaklığı (Görev 9: gün/gece dalgası eklenir).
  get ambient() {
    return this.ambientBase;
  }

  // Ortam sıcaklığı: hava ona yavaşça yaklaşır. Sahneyi yeniden üretmez, undo noktası oluşturmaz.
  setAmbient(c) {
    this.ambientBase = clampAmbient(c);
  }

  // Tek hücrenin sıcaklığı (sahneler, testler). Sonlu olmayan değer ve dünya dışı reddedilir.
  setTemp(x, y, c) {
    const w = this.world;
    if (!w.inBounds(x, y) || !Number.isFinite(c)) return false;
    w.temp[w.index(x, y)] = c < TEMP_MIN ? TEMP_MIN : c > TEMP_MAX ? TEMP_MAX : c;
    this.version++;
    return true;
  }
```

- `_tickOnce()` başında, `w.beginTick();` satırından önce: `w.ambient = this.ambient;`
- Geçiş 2 döngüsünün bitişinden sonra, basılı tutma bloğundan önce:

```js
    // Geçiş 3 — ısı (heat.js): difüzyon, hava, kaynaklar.
    stepHeat(w, rng, this._heat);
```

- `clear()` ve `loadScene()` içinde, `this.world.clear()` çağrısından önce: `this.world.ambient = this.ambient;`
- View'daki `ambient` getter'ını `return sim.ambient;` yap.

- [ ] **Adım 6: Testleri çalıştır ve ölç**

1. Çalıştır: `npm test`. Beklenen: PASS, eski fizik testleri dahil. Isı henüz materyalleri değiştirmediği için davranış aynı kalmalı.
2. Çalıştır: `node tools/bench.js`. 400×225 medyanını not et.
3. Hedef ≤ 0,858 + 0,6 ms. Aşılırsa `markHotRows` erken çıkışını ve `rowActive` kullanımını kontrol et.

- [ ] **Adım 7: Changelog, DEVELOPMENT, commit**

`CHANGELOG.md` → `### Added`:

```markdown
- Isı iletimi (`js/engine/heat.js`): tick'in yeni 3. geçişi. Çift tamponlu 4 komşulu difüzyon kullanır (yön bias'ı yok, enerji korunur). Hava ortam sıcaklığına yaklaşır; ateş ve yanan materyaller ısı kaynağıdır. Sakin satırlar atlanır.
- `sim.setAmbient` ve `sim.setTemp` API'leri. Ortam ayarı dünyayı anında değiştirmez, undo noktası oluşturmaz.
```

`docs/DEVELOPMENT.md`:

- "Isı geçişi" maddesi `[x]`.
- Benchmark log tablosuna bir satır: tarih, "ısı geçişi (uyku açık)", ölçülen değerler.

```powershell
git add js/engine/heat.js js/engine/materials.js js/engine/simulation.js tests/heat.test.js tests/materials.test.js CHANGELOG.md docs/DEVELOPMENT.md
git commit -m "Isı geçişi: difüzyon, hava, kaynaklar, uyuyan satırlar; setAmbient/setTemp"
git push -q origin main
```

---

### Task 6 (Görev 6): Isı görselleri ve termal görünüm

> Görev 3'ten: `mixPacked`, `DYN.CLONER` ve `DYN.SINK` zaten `pixels.js`/`palette.js` içinde; yeniden tanımlama. Aşağıdaki `fillPixels` kodunu yazarken bu iki `case` dalını koru.

**Files:**
- Modify: `js/render/palette.js` (akkorluk rampası, soğuk ton, termal rampalar ve LUT; `DYN.SAND` kaldırılır)
- Modify: `js/render/pixels.js` (akkorluk, sıcaklığa bağlı lav, soğuk su, `fillThermal`, sıcak hücre sayısı dönüşü)
- Modify: `js/render/renderer.js` (`setViewMode`, sıcak hücrelerle glow)
- Test: `tests/render-pixels.test.js`, `tests/renderer.test.js`, `tests/palette.test.js`

**Interfaces:**
- Consumes: `view.temp` (Görev 4).
- Produces:
  - `fillPixels(...)` artık akkor hücre sayısını (`number`) döner.
  - `fillThermal(view, out, ramps): void`
  - `palette.js`: `THERMAL_LUT: Uint8Array(1241)` (indeks = °C + 40), `thermalPosition(T): number`
  - `ramps.incandescent`, `ramps.coldTint`, `ramps.thermal`, `ramps.thermalAir`
  - `Renderer#setViewMode('normal' | 'thermal')`, `Renderer#viewMode`

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/render-pixels.test.js`:

- `simWith` fonksiyonuna sıcaklık parametresi ekle:

```js
function simWith(cells, w = 4, h = 3) {
  const sim = new Simulation({ width: w, height: h });
  for (const [x, y, m, life, temp] of cells) {
    sim.setCell(x, y, m);
    if (life !== undefined) sim.world.life[sim.world.index(x, y)] = life;
    if (temp !== undefined) sim.setTemp(x, y, temp);
  }
  return sim;
}
```

- "ısınan kum soğuk kumdan daha kızıldır" testini değiştir:

```js
test('ısınan kum soğuk kumdan daha kızıldır', () => {
  const sim = simWith([[0, 0, MAT.SAND, undefined, 20], [1, 0, MAT.SAND, undefined, 900]]);
  const out = render(sim);
  assert.ok(red(out[1]) - blue(out[1]) > red(out[0]) - blue(out[0]) + 20, 'ısınan kum kızarmalı');
});
```

- Yeni testler ekle. Import'a `fillThermal` ve `THERMAL_LUT` ekle:

```js
test('akkorluk: 900 °C taş kızarır ve glow verir; 20 °C taş glow vermez; dönüş akkor hücre sayısı', () => {
  const sim = simWith([[0, 0, MAT.STONE, undefined, 20], [1, 0, MAT.STONE, undefined, 900]]);
  const out = new Uint32Array(12);
  const glow = new Uint32Array(12);
  const hot = fillPixels(sim.view, out, pal, ramps, 0, true, glow);
  assert.equal(hot, 1);
  assert.equal(glow[0], 0);
  assert.ok(glow[1] >>> 24 > 0);
  assert.ok(red(out[1]) > red(out[0]) + 60);
});

// Kozmetik tonu (variant) eşitler: karşılaştırma yalnızca sıcaklığa bağlı kalsın.
const sameShade = (sim, ...cells) => {
  for (const [x, y] of cells) sim.world.variant[sim.world.index(x, y)] = 0;
  sim.version++;
};

test('lav soğudukça koyulaşır', () => {
  const sim = simWith([[0, 0, MAT.LAVA, undefined, 1150], [1, 0, MAT.LAVA, undefined, 780]]);
  sameShade(sim, [0, 0], [1, 0]);
  const out = render(sim);
  assert.ok(luma(out[0]) > luma(out[1]) + 20, `sıcak=${luma(out[0])} soğuk=${luma(out[1])}`);
});

test('donma noktasına yaklaşan su daha açık görünür', () => {
  const sim = simWith([[0, 0, MAT.WATER, undefined, 20], [1, 0, MAT.WATER, undefined, 0]]);
  sameShade(sim, [0, 0], [1, 0]);
  const out = render(sim);
  assert.ok(luma(out[1]) > luma(out[0]) + 8);
});

test('termal görünüm: sıcak hücre soğuktan kırmızı, hava madde rampasından koyu', () => {
  const sim = simWith([[0, 0, MAT.STONE, undefined, -30], [1, 0, MAT.STONE, undefined, 800]]);
  sim.setTemp(2, 0, 800); // hava
  const out = new Uint32Array(12);
  fillThermal(sim.view, out, ramps);
  assert.ok(red(out[1]) > red(out[0]) + 100, 'sıcak kırmızı');
  assert.ok(blue(out[0]) > red(out[0]), 'soğuk mavi');
  assert.ok(luma(out[1]) > luma(out[2]), 'hava daha koyu');
  assert.equal(THERMAL_LUT.length, 1241);
});
```

`tests/renderer.test.js` sonuna:

```js
test('termal görünümde glow çizilmez ve mod değişince tampon hemen yenilenir', () => {
  const { renderer } = setup({ quality: 'high' });
  const sim = new Simulation({ width: 100, height: 50 });
  sim.setCell(5, 5, MAT.FIRE);
  renderer.setViewMode('thermal');
  renderer.render(sim.view);
  assert.equal(lighterDraws, 0);
  const before = puts;
  renderer.setViewMode('normal');
  renderer.render(sim.view);
  assert.ok(puts > before);
});

test('yalnızca akkor (sıcak) taş varken de glow çizilir', () => {
  const { renderer } = setup({ quality: 'high' });
  const sim = new Simulation({ width: 100, height: 50 });
  sim.setCell(5, 5, MAT.STONE);
  sim.setTemp(5, 5, 1000);
  renderer.render(sim.view); // ilk kare akkor sayısını öğrenir
  sim.setTemp(5, 5, 1001);
  renderer.render(sim.view);
  assert.ok(lighterDraws > 0);
});
```

- [ ] **Adım 2: Başarısız olduğunu gör**

Çalıştır: `node --test tests/render-pixels.test.js tests/renderer.test.js`
Beklenen: FAIL (`fillThermal` yok, kum rengi hâlâ `life`'a bağlı).

- [ ] **Adım 3: Paleti genişlet**

`js/render/palette.js`:

- `DYN` sözlüğünden `SAND: 4` girdisini ve `DYNAMIC[MAT.SAND] = DYN.SAND;` satırını sil.
- `HEAT_RAMP_SIZE` export'unu kaldır.
- Dosya sonuna, `withAlpha`'dan önce:

```js
// Termal görünüm: °C → rampa konumu (parçalı doğrusal; soğuk tarafta daha fazla ayrıntı).
const THERMAL_STOPS = [[-40, 0], [20, 0.25], [100, 0.45], [600, 0.75], [1200, 1]];
export function thermalPosition(T) {
  if (!(T > THERMAL_STOPS[0][0])) return 0;
  for (let k = 1; k < THERMAL_STOPS.length; k++) {
    const [t1, p1] = THERMAL_STOPS[k];
    if (T <= t1) {
      const [t0, p0] = THERMAL_STOPS[k - 1];
      return p0 + ((T - t0) / (t1 - t0)) * (p1 - p0);
    }
  }
  return 1;
}

export const THERMAL_RAMP_SIZE = 256;
// Hot loop için: indeks = round(°C) + 40 (−40..1200) → rampa indeksi.
export const THERMAL_LUT = new Uint8Array(1241);
for (let k = 0; k < THERMAL_LUT.length; k++) {
  THERMAL_LUT[k] = Math.round(thermalPosition(k - 40) * (THERMAL_RAMP_SIZE - 1));
}
```

- `buildRamps` dönüşündeki `heat:` satırını kaldır. Yerine:

```js
    incandescent: g([[0, '#5a1204'], [0.35, '#b3280a'], [0.65, '#f07a1e'], [0.85, '#ffc15a'], [1, '#fff1d0']]),
    coldTint: packRGBA(196, 230, 250, 255, littleEndian),
    thermal: gradient([[0, '#2a6cd6'], [0.25, '#4a4a52'], [0.45, '#c2301c'], [0.75, '#f08a24'], [1, '#fff6e0']], THERMAL_RAMP_SIZE, littleEndian),
    thermalAir: gradient([[0, '#12305e'], [0.25, '#1a1a1f'], [0.45, '#5a160c'], [0.75, '#7a4210'], [1, '#8a8270']], THERMAL_RAMP_SIZE, littleEndian),
```

`thermal` ve `thermalAir` durakları `THERMAL_STOPS` konumlarıyla aynıdır.

- [ ] **Adım 4: Pikselleri güncelle**

`js/render/pixels.js`. Başlık yorumunu koru; import'ları ve `fillPixels`'i şöyle değiştir, `fillThermal`'i ekle:

```js
import { MATERIALS, MAT } from '../engine/materials.js';
import { SHADES, RAMP_SIZE, DYN, DYNAMIC, withAlpha, THERMAL_LUT } from './palette.js';

const { LIFE_MIN, LIFE_SPAN } = MATERIALS;
const SHADE_MASK = SHADES - 1;
const RAMP_MAX = RAMP_SIZE - 1;
const WATER = MAT.WATER;

// Akkorluk: 450 °C'de başlar, 800 °C'de tam karışım; rampa 450..1500 °C.
const INC_START = 450;
const INC_FULL = 800;
const INC_MAX = 1500;
const COLD_START = 4; // bu sıcaklığın altındaki su açık maviye kayar
// Lav rengi: 750 °C (katılaşma) koyu, 1150 °C (doğuş) parlak.
const LAVA_COLD = 750;
const LAVA_HOT = 1150;
```

`MAX_LIFE`, `flicker`, `clampRamp` aynen kalır. Ardından:

```js
// Aynı endianness'ta paketli iki rengin bayt bayt karışımı (f ∈ [0, 1]); alfa baytları 255 ise 255 kalır.
function mixPacked(a, b, f) {
  const g = 1 - f;
  return (
    (((a & 255) * g + (b & 255) * f) | 0) |
    (((((a >>> 8) & 255) * g + ((b >>> 8) & 255) * f) | 0) << 8) |
    (((((a >>> 16) & 255) * g + ((b >>> 16) & 255) * f) | 0) << 16) |
    (((((a >>> 24) & 255) * g + ((b >>> 24) & 255) * f) | 0) << 24)
  ) >>> 0;
}

// glow (isteğe bağlı): ışık yayan hücrelerin rengi, alfa = yoğunluk; diğerleri 0.
// Dönüş: akkor (≥ INC_START) hücre sayısı; renderer glow zincirini bununla da açar.
export function fillPixels(view, out, pal, ramps, frame, reducedMotion, glow = null) {
  const { type, variant, life, width, height, stride } = view;
  const temp = view.temp;
  const { fire, lava, burn, incandescent, coldTint, littleEndian } = ramps;
  let hotCells = 0;
  let o = 0;
  for (let y = 0; y < height; y++) {
    let i = (y + 1) * stride + 1;
    for (let x = 0; x < width; x++, i++, o++) {
      const t = type[i];
      if (t === 0) {
        out[o] = 0;
        if (glow) glow[o] = 0;
        continue;
      }
      let g = 0;
      switch (DYNAMIC[t]) {
        case DYN.FIRE: {
          const f = reducedMotion ? 0.5 : flicker(i, frame);
          const heatLevel = life[i] / MAX_LIFE[t];
          out[o] = fire[clampRamp(heatLevel * 46 + f * 17)];
          if (glow) g = withAlpha(out[o], (40 + heatLevel * 200) | 0, littleEndian);
          break;
        }
        case DYN.LAVA: {
          const T = temp[i];
          const heat = T >= LAVA_HOT ? 1 : T <= LAVA_COLD ? 0 : (T - LAVA_COLD) / (LAVA_HOT - LAVA_COLD);
          const phase = reducedMotion ? variant[i] & 63 : ((variant[i] & 63) + (frame >> 2) + ((x + y * 3) >> 1)) & 63;
          const tri = phase < 32 ? phase : 63 - phase; // 0..31
          out[o] = lava[clampRamp(4 + heat * 30 + tri * 0.9)];
          if (glow) g = withAlpha(out[o], (50 + heat * 90 + tri * 2) | 0, littleEndian);
          break;
        }
        case DYN.BURN: {
          const f = reducedMotion ? 0.5 : flicker(i, frame);
          const burnLevel = life[i] / MAX_LIFE[t];
          out[o] = burn[t][clampRamp(burnLevel * 52 + f * 11)];
          if (glow) g = withAlpha(out[o], (30 + burnLevel * 150) | 0, littleEndian);
          break;
        }
        default: {
          let c = pal[t * SHADES + (variant[i] & SHADE_MASK)];
          const T = temp[i];
          if (T >= INC_START) {
            hotCells++;
            const f = T >= INC_FULL ? 1 : (T - INC_START) / (INC_FULL - INC_START);
            const hot = incandescent[clampRamp((((T > INC_MAX ? INC_MAX : T) - INC_START) * RAMP_MAX) / (INC_MAX - INC_START))];
            c = mixPacked(c, hot, f);
            if (glow) g = withAlpha(hot, (f * 150) | 0, littleEndian);
          } else if (t === WATER && T < COLD_START) {
            const u = (COLD_START - (T < -1 ? -1 : T)) / (COLD_START + 1);
            c = mixPacked(c, coldTint, u * 0.35);
          }
          out[o] = c;
        }
      }
      if (glow) glow[o] = g;
    }
  }
  return hotCells;
}

// Termal görünüm: her hücre sıcaklık rampasıyla (hava daha koyu rampayla); karıştırma yok.
export function fillThermal(view, out, ramps) {
  const { type, width, height, stride } = view;
  const temp = view.temp;
  const { thermal, thermalAir } = ramps;
  let o = 0;
  for (let y = 0; y < height; y++) {
    let i = (y + 1) * stride + 1;
    for (let x = 0; x < width; x++, i++, o++) {
      const T = temp[i];
      const k = T <= -40 ? 0 : T >= 1200 ? 1240 : Math.round(T) + 40;
      out[o] = (type[i] === 0 ? thermalAir : thermal)[THERMAL_LUT[k]];
    }
  }
}
```

`pixels.js`'teki `import { RATES } from '../engine/reactions.js';` satırını ve `glassHeat` kullanımını sil.

- [ ] **Adım 5: Renderer**

`js/render/renderer.js`:

- Import: `import { fillPixels, fillThermal } from './pixels.js';`
- Constructor'a: `this.viewMode = 'normal';` ve `this._hotCells = 0;`
- `setQuality`'nin altına:

```js
  // 'normal' | 'thermal'. Termal görünümde glow yok; mod değişince tampon hemen yenilenir.
  setViewMode(mode) {
    if ((mode !== 'normal' && mode !== 'thermal') || mode === this.viewMode) return;
    this.viewMode = mode;
    this.lastVersion = -1;
  }
```

- `_isAnimated`: ilk satıra `if (this.viewMode === 'thermal') return false;` ekle.
- `_refresh(view)`:

```js
  _refresh(view) {
    if (this.viewMode === 'thermal') {
      fillThermal(view, this.pixels, this.ramps);
      this.bufferCtx.putImageData(this.image, 0, 0);
      this._glowReady = false;
      this.lastView = view;
      this.lastVersion = view.version;
      return;
    }
    const wantGlow = this.quality !== 'low' && (this._hasEmitters(view) || this._hotCells > 0);
    if (wantGlow) this._ensureGlow(view.width, view.height);
    this._hotCells = fillPixels(view, this.pixels, this.palette, this.ramps, this.frame, this.reducedMotion, wantGlow ? this.glowPixels : null);
    this.bufferCtx.putImageData(this.image, 0, 0);
    // (mevcut glow küçültme zinciri ve alan atamaları aynen)
  }
```

Mevcut glow zinciri ve `_glowReady`, `lastView`, `lastVersion` atamaları değişmeden kalır.

- [ ] **Adım 6: Testleri çalıştır**

1. Çalıştır: `npm test`. Beklenen: PASS.
2. `tests/palette.test.js` `HEAT_RAMP_SIZE` ya da `ramps.heat` kullanıyorsa o satırları `incandescent` ile güncelle.
3. Yeni bir palet testi ekle: `assert.equal(buildRamps(true).incandescent.length, RAMP_SIZE);`

- [ ] **Adım 7: Changelog, DEVELOPMENT, commit**

`CHANGELOG.md` → `### Added`:

```markdown
- Isı görselleri: 450 °C üstündeki her materyal akkorlaşır (koyu kırmızı → sarı-beyaz) ve parlar. Lav soğudukça koyulaşır; donma noktasına yaklaşan su açık maviye kayar.
- Termal görünüm (`renderer.setViewMode('thermal')`): sıcaklık rampası (−40 mavi → 1200+ beyaz). Hava ve madde ayrı tonlarda gösterilir.
```

`docs/DEVELOPMENT.md` → "Isı görselleri ve termal görünüm" `[x]`.

```powershell
git add js/render/palette.js js/render/pixels.js js/render/renderer.js tests/render-pixels.test.js tests/renderer.test.js tests/palette.test.js CHANGELOG.md docs/DEVELOPMENT.md
git commit -m "Isı görselleri: akkorluk, lav ve soğuk su tonları, termal görünüm"
git push -q origin main
```

---

### Task 7 (Görev 7): Faz geçişleri ve sayaç hilelerinin taşınması

**Files:**
- Modify: `js/engine/materials.js`:
  - `phase`, `ignitesAt` ve `evaporatesAt` alanları ile tabloları; doğrulamalar
  - `cools` ve `COOLS` kaldırılır
  - Buhar, su, lav, kum ve taş tanımları değişir
- Modify: `js/engine/heat.js` (eşik adayları, `applyThermalRules`, yeni `HEAT` sabitleri)
- Modify: `js/engine/reactions.js`:
  - `emitSteam`
  - kum ısıtma, lav soğuması ve buhar zamanlayıcısının silinmesi
  - bitkinin sıcaklık şartı
- Modify: `js/engine/simulation.js` (satır içi kum soğuması silinir)
- Test: `tests/thermal.test.js` (yeni), `tests/reactions.test.js` (geçiş), `tests/materials.test.js`

**Interfaces:**
- Consumes: `stepHeat` ve termal tablolar (Görev 5).
- Produces:
  - `MATERIALS.UP_AT`, `UP_INTO`, `UP_LATENT`, `UP_VANISH`, `DOWN_AT`, `DOWN_INTO`, `DOWN_LATENT`, `DOWN_VANISH`, `HAS_PHASE`, `IGNITE_AT`, `EVAP_AT`
  - `reactions.js`: `emitSteam(world, i): void`, `RATES.plantMinTemp`
  - `HEAT`: `PROGRESS_DECAY`, `IGNITE_CHANCE`, `EVAP_RATE`, `EVAP_MAX`
- Faz tanımı biçimi:

```js
phase: {
  up?: { at: number, into: MAT, latent: int(1..65534), vanish?: 0..1 },
  down?: { at: number, into: MAT, latent: int(1..65534), vanish?: 0..1 },
}
```

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/materials.test.js` sonuna:

```js
test('faz tanımı doğrulanır: gizli ısı aralığı, eşik sırası, hedef materyal, tutuşmada burnsInto', () => {
  const E = { id: 0, key: 'EMPTY', name: 'E', kind: KIND.NONE, density: 5 };
  const S = (phase, extra = {}) => ({ id: 1, key: 'X', name: 'X', kind: KIND.STATIC, density: 255, phase, ...extra });
  assert.throws(() => compileMaterials([E, S({ up: { at: 10, into: 0, latent: 70000 } })]), /Gizli ısı/);
  assert.throws(() => compileMaterials([E, S({ up: { at: 10, into: 0, latent: 5 }, down: { at: 20, into: 0, latent: 5 } })]), /eşik/);
  assert.throws(() => compileMaterials([E, S({ up: { at: 10, into: 99, latent: 5 } })]), /hedef/);
  assert.throws(() => compileMaterials([E, S(undefined, { ignitesAt: 300 })]), /burnsInto/);
});

test('su, buhar, lav, kum ve taş faz tablolarında', () => {
  assert.equal(MATERIALS.UP_AT[MAT.WATER], 100);
  assert.equal(MATERIALS.UP_INTO[MAT.WATER], MAT.STEAM);
  assert.equal(MATERIALS.DOWN_AT[MAT.STEAM], 95);
  assert.equal(MATERIALS.DOWN_INTO[MAT.LAVA], MAT.STONE);
  assert.equal(MATERIALS.UP_INTO[MAT.SAND], MAT.GLASS);
  assert.equal(MATERIALS.UP_AT[MAT.STONE], 1500);
  assert.equal(MATERIALS.IGNITE_AT[MAT.WOOD], 300);
  assert.equal(MATERIALS.EVAP_AT[MAT.WATER], 35);
  assert.equal(MATERIALS.UP_AT[MAT.GLASS], Infinity);
});
```

`tests/thermal.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { countMaterial, runTicks, cellType } from './helpers.js';

function fill(sim, x0, y0, x1, y1, mat) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) sim.setCell(x, y, mat);
}

// Her tick'ten önce hücreyi sabit sıcaklıkta tutar (dış ısıtıcı).
function holdTemp(sim, x, y, c, ticks, until) {
  for (let t = 0; t < ticks; t++) {
    sim.setTemp(x, y, c);
    sim.step();
    if (until && until(sim)) return t + 1;
  }
  return -1;
}

test('su 100 °C\'de hemen değil, gizli ısısı dolunca buhara döner; buhar 100 °C üstünde doğar', () => {
  const sim = new Simulation({ width: 3, height: 3, seed: 'boil' });
  sim.setCell(1, 1, MAT.WATER);
  sim.setTemp(1, 1, 150);
  sim.step();
  assert.equal(cellType(sim, 1, 1), MAT.WATER, 'ilk tick\'te buharlaşmamalı');
  const t = holdTemp(sim, 1, 1, 150, 60, (s) => countMaterial(s, MAT.STEAM) > 0);
  assert.ok(t > 0, 'buhar oluşmadı');
  let steamTemp = -Infinity;
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) if (cellType(sim, x, y) === MAT.STEAM) steamTemp = sim.getCell(x, y).temp;
  assert.ok(steamTemp >= 95, `buhar ${steamTemp} °C`);
});

test('faz ilerlemesi eşiğin gerisine dönülünce söner', () => {
  const sim = new Simulation({ width: 3, height: 3, seed: 'decay' });
  sim.setCell(1, 1, MAT.WATER);
  holdTemp(sim, 1, 1, 150, 2);
  assert.ok(sim.getCell(1, 1).life > 0);
  holdTemp(sim, 1, 1, 50, 400);
  assert.equal(sim.getCell(1, 1).life, 0);
  assert.equal(cellType(sim, 1, 1), MAT.WATER);
});

test('odun 300 °C üstünde kendiliğinden tutuşur, 250 °C\'de tutuşmaz', () => {
  const hot = new Simulation({ width: 3, height: 3, seed: 'ign' });
  hot.setCell(1, 1, MAT.WOOD);
  assert.ok(holdTemp(hot, 1, 1, 400, 300, (s) => countMaterial(s, MAT.BURNING_WOOD) > 0) > 0);
  const warm = new Simulation({ width: 3, height: 3, seed: 'ign' });
  warm.setCell(1, 1, MAT.WOOD);
  holdTemp(warm, 1, 1, 250, 500);
  assert.equal(countMaterial(warm, MAT.BURNING_WOOD), 0);
});

test('taş 1500 °C üstünde lava döner', () => {
  const sim = new Simulation({ width: 3, height: 3, seed: 'melt' });
  sim.setCell(1, 2, MAT.STONE);
  assert.ok(holdTemp(sim, 1, 2, 1700, 100, (s) => countMaterial(s, MAT.LAVA) > 0) > 0);
});

test('bitki 5 °C altında büyümez', () => {
  const sim = new Simulation({ width: 20, height: 12, seed: 'cold-grow' });
  sim.setAmbient(2);
  sim.world.ambient = 2;
  sim.world.clear();
  fill(sim, 0, 4, 19, 11, MAT.WATER);
  sim.setCell(10, 3, MAT.PLANT);
  runTicks(sim, 3000);
  assert.equal(countMaterial(sim, MAT.PLANT), 1);
});

test('sıcak ortamda açık su yavaşça buharlaşır; ılıman ortamda buharlaşmaz', () => {
  const run = (ambient) => {
    const sim = new Simulation({ width: 12, height: 8, seed: 'evap' });
    sim.setAmbient(ambient);
    sim.world.ambient = ambient;
    sim.world.clear();
    fill(sim, 0, 5, 11, 7, MAT.WATER);
    const before = countMaterial(sim, MAT.WATER);
    runTicks(sim, 20000);
    return before - countMaterial(sim, MAT.WATER);
  };
  assert.equal(run(20), 0);
  assert.ok(run(45) >= 5);
});
```

`sim.world.ambient` ve `sim.world.clear()` satırları doğuş sıcaklıklarını baştan ortama eşitler. Görev 9'da `loadScene` bunu sahne ortamıyla yapacak; bu testler o zaman da geçer.

`tests/reactions.test.js` içinde geçiş:

1. "Isınan kum lavadan uzaklaşınca soğur" testini şununla değiştir:

```js
test('ısınan kum ısı kaynağından uzaklaşınca soğur (ısı kalıcı değil)', () => {
  const sim = new Simulation({ width: 6, height: 6, seed: 'cool' });
  sim.setCell(2, 5, MAT.SAND);
  sim.setTemp(2, 5, 600);
  runTicks(sim, 3000);
  assert.ok(sim.getCell(2, 5).temp < 30);
  assert.equal(cellType(sim, 2, 5), MAT.SAND);
});
```

2. "Lava gölünün içindeki lava hava görmediği sürece sıvı kalır" testini şununla değiştir:

```js
test('lav dış yüzeyinden katılaşır; ortası en uzun süre sıvı kalır', () => {
  const sim = new Simulation({ width: 16, height: 12, seed: 'crust-pool', debug: true });
  fill(sim, 0, 4, 15, 11, MAT.STONE);
  fill(sim, 3, 4, 12, 9, MAT.LAVA); // taşa oyulmuş, üstü açık havuz
  const edge = [];
  for (let x = 3; x <= 12; x++) edge.push([x, 4], [x, 9]);
  for (let y = 5; y <= 8; y++) edge.push([3, y], [12, y]);
  const t = firstTickWhere(sim, 20000, (s) => edge.filter(([x, y]) => cellType(s, x, y) === MAT.STONE).length >= edge.length / 2);
  assert.ok(t > 0, 'kenar katılaşmadı');
  assert.equal(cellType(sim, 7, 7), MAT.LAVA, 'orta hâlâ sıvı olmalı');
});
```

3. "Kapalı kutudaki buhar zamanla yoğuşur" testinde `runTicks(sim, 1200)` değerini `runTicks(sim, 4000)` yap.
4. "Ateş suyla temas edince söner ve suyu buharlaştırır" testini şununla değiştir:

```js
test('Ateş suyla temas edince söner ve suyu buharlaştırır', () => {
  const sim = makeSim(`
    ~~~
    ~f~
    ~~~
  `, { seed: 'fw' });
  const t = firstTickWhere(sim, 60, (s) => countMaterial(s, MAT.STEAM) >= 1);
  assert.ok(t > 0, 'buhar oluşmadı');
  runTicks(sim, 60);
  assert.equal(countMaterial(sim, MAT.FIRE), 0);
});
```

5. "Boyanan ateş ve buhar spawn anında pozitif ömürle başlar" testini şununla değiştir:

```js
test('boyanan ateş pozitif ömürle, buhar kaynama noktasının üstünde başlar', () => {
  const sim = new Simulation({ width: 4, height: 4 });
  sim.setCell(1, 1, MAT.FIRE);
  sim.setCell(2, 2, MAT.STEAM);
  assert.ok(sim.getCell(1, 1).life > 0);
  assert.ok(sim.getCell(2, 2).temp >= 100);
  assert.equal(cellType(sim, 1, 1), MAT.FIRE);
});
```

- [ ] **Adım 2: Başarısız olduğunu gör**

Çalıştır: `node --test tests/thermal.test.js tests/materials.test.js tests/reactions.test.js`
Beklenen: FAIL (faz tabloları yok).

- [ ] **Adım 3: Materyal faz alanları**

`js/engine/materials.js`:

- Alan yorumlarına:

```js
// Faz ve sıcaklık kuralları (ADR-015; heat.js uygular):
//   phase:        { up?: { at, into, latent, vanish? }, down?: {...} }. Eşiği aşan hücrenin sıcaklığı
//                 eşikte sabitlenir, fazla ısı life'ta "ilerleme" olarak birikir; latent'e ulaşınca
//                 into olur (vanish olasılığıyla boşalır). life bu materyallerde yalnızca ilerlemedir.
//   ignitesAt:    bu sıcaklığın üstünde tick başına IGNITE_CHANCE ile burnsInto olur
//   evaporatesAt: bu sıcaklığın üstünde, üstü boşsa yavaşça buharlaşıp kaybolur (su)
```

- `SAND` kaydından `cools: true` alanını, `COOLS` tablosunu ve dönüşteki `COOLS`'u sil.
- Tanımları güncelle. Diğer alanlar aynen kalır:

| Kayıt | Değişiklik |
|---|---|
| SAND | `phase: { up: { at: 700, into: MAT.GLASS, latent: 300 } }` |
| STONE | `phase: { up: { at: 1500, into: MAT.LAVA, latent: 800 } }` |
| WATER | `phase: { up: { at: 100, into: MAT.STEAM, latent: 1500 } }, evaporatesAt: 35` (donma Görev 8'de) |
| OIL | `ignitesAt: 250` |
| LAVA | `phase: { down: { at: 750, into: MAT.STONE, latent: 800 } }` (`reactive: true` kalır) |
| STEAM | `life` ve `reactive` alanlarını sil; `phase: { down: { at: 95, into: MAT.WATER, latent: 600, vanish: 0.4 } }` |
| WOOD | `ignitesAt: 300` |
| PLANT | `ignitesAt: 250` |

- Tablolar:

```js
  const UP_AT = new Float32Array(256).fill(Infinity);
  const UP_INTO = new Uint8Array(256);
  const UP_LATENT = new Uint16Array(256);
  const UP_VANISH = new Uint8Array(256);
  const DOWN_AT = new Float32Array(256).fill(-Infinity);
  const DOWN_INTO = new Uint8Array(256);
  const DOWN_LATENT = new Uint16Array(256);
  const DOWN_VANISH = new Uint8Array(256);
  const HAS_PHASE = new Uint8Array(256);
  const IGNITE_AT = new Float32Array(256).fill(Infinity);
  const EVAP_AT = new Float32Array(256).fill(Infinity);
  const phaseTargets = []; // [def.key, into] — tüm tanımlar kaydedildikten sonra doğrulanır
```

- `compileMaterials`'tan önce yardımcı:

```js
function compilePhaseEdge(def, edge, name, AT, INTO, LATENT, VANISH, targets) {
  if (!edge) return;
  const { at, into, latent, vanish = 0 } = edge;
  if (!Number.isFinite(at)) throw new RangeError(`Geçersiz faz eşiği (${def.key}.${name})`);
  if (!Number.isInteger(latent) || latent < 1 || latent > 65534) throw new RangeError(`Gizli ısı 1..65534 olmalı (${def.key}.${name})`);
  if (!(vanish >= 0 && vanish <= 1)) throw new RangeError(`Geçersiz vanish (${def.key}.${name})`);
  AT[def.id] = at;
  INTO[def.id] = into;
  LATENT[def.id] = latent;
  VANISH[def.id] = toByte(vanish);
  targets.push([`${def.key}.${name}`, into]);
}
```

- Tanım döngüsüne:

```js
    if (def.phase) {
      compilePhaseEdge(def, def.phase.up, 'up', UP_AT, UP_INTO, UP_LATENT, UP_VANISH, phaseTargets);
      compilePhaseEdge(def, def.phase.down, 'down', DOWN_AT, DOWN_INTO, DOWN_LATENT, DOWN_VANISH, phaseTargets);
      if (def.phase.up && def.phase.down && !(def.phase.up.at > def.phase.down.at)) {
        throw new RangeError(`Faz eşiği sırası bozuk: up.at > down.at olmalı (${def.key})`);
      }
      HAS_PHASE[def.id] = 1;
    }
    if (def.ignitesAt !== undefined) {
      if (!def.burnsInto) throw new Error(`ignitesAt için burnsInto gerekli (${def.key})`);
      IGNITE_AT[def.id] = def.ignitesAt;
    }
    if (def.evaporatesAt !== undefined) EVAP_AT[def.id] = def.evaporatesAt;
```

- Döngüden sonra, DISPLACE derlemesinden önce:

```js
  for (const [where, into] of phaseTargets) {
    if (!byId[into]) throw new Error(`Faz hedef materyali tanımsız: ${into} (${where})`);
  }
```

- Dönüş nesnesine yeni tabloları ekle.

- [ ] **Adım 4: Isı geçişine kuralları ekle**

`js/engine/heat.js`:

- Import:

```js
import { MAT, MATERIALS } from './materials.js';
import { emitSteam, initialLife } from './reactions.js';
```

- `HEAT` nesnesi:

```js
export const HEAT = Object.freeze({
  AIR_RELAX: 0.02, // havanın tick başına ortama yaklaşma oranı
  SLEEP_EPS: 0.5, // °C; uyuyan satır toleransı
  PROGRESS_DECAY: 2, // eşiğin gerisindeki hücrede ilerlemenin tick başına sönmesi
  IGNITE_CHANCE: 1 / 16, // tutuşma sıcaklığını aşan hücrenin tick başına tutuşma olasılığı
  EVAP_RATE: 0.00002, // buharlaşma olasılığının eşiğin üstündeki her °C için eğimi
  EVAP_MAX: 0.001, // tick başına buharlaşma olasılığının üst sınırı
});
```

- Tablo destructuring'i:

```js
const {
  CONDUCT, CAP, INV_CAP, SOURCE_TEMP, HAS_PHASE, UP_AT, UP_INTO, UP_LATENT, UP_VANISH,
  DOWN_AT, DOWN_INTO, DOWN_LATENT, DOWN_VANISH, IGNITE_AT, EVAP_AT, BURNS_INTO,
} = MATERIALS;
const STEAM = MAT.STEAM;
const U32 = 4294967296;
```

- `markHotRows` iç döngüsü eşik adaylarını da işaretlesin:

```js
    for (let i = (y + 1) * stride + 1, end = i + width; i < end; i++) {
      const T = a[i];
      const d = T - amb;
      const t = type[i];
      if (d > eps || d < -eps || T > UP_AT[t] || T < DOWN_AT[t] || T >= IGNITE_AT[t] || T >= EVAP_AT[t] || (HAS_PHASE[t] !== 0 && life[i] !== 0)) {
        flag = 1;
        break;
      }
    }
```

- Fonksiyonun başına `const { width, height, stride, type, life } = world;` yaz.
- Kural fonksiyonları, `stepHeat`'ten önce:

```js
// Eşiği aşan ısıyı ilerleme sayacına ekler; latent'e ulaştıysa true.
function addProgress(life, i, energy, latent) {
  const v = life[i] + Math.round(energy);
  if (v >= latent) return true;
  life[i] = v > 65535 ? 65535 : v;
  return false;
}

function transition(world, rng, i, into, vanish) {
  if (vanish !== 0 && (rng.nextU32() & 255) < vanish) {
    world.set(i, EMPTY, 0, 0, 0, world.temp[i]);
    return;
  }
  if (into === STEAM) emitSteam(world, i);
  else world.transform(i, into, 0); // sıcaklık eşikte kalır
}

// Faz geçişleri, sıcaklıkla tutuşma, buharlaşma. Difüzyondan sonra, güncel alan üzerinde ve
// yalnızca işlenen satırlarda çalışır (tip değişikliği difüzyonun simetrisini bozmasın diye ayrı).
function applyThermalRules(world, rng, state) {
  const { width, height, stride, type, life } = world;
  const temp = world.temp;
  const ignite = (HEAT.IGNITE_CHANCE * U32) >>> 0;
  for (let y = 0; y < height; y++) {
    if (!rowActive(state, y)) continue;
    for (let i = (y + 1) * stride + 1, end = i + width; i < end; i++) {
      const t = type[i];
      if (t === EMPTY) continue;
      const T = temp[i];
      if (HAS_PHASE[t] !== 0) {
        if (T > UP_AT[t]) {
          temp[i] = UP_AT[t];
          if (addProgress(life, i, (T - UP_AT[t]) * CAP[t], UP_LATENT[t])) transition(world, rng, i, UP_INTO[t], UP_VANISH[t]);
          continue;
        }
        if (T < DOWN_AT[t]) {
          temp[i] = DOWN_AT[t];
          if (addProgress(life, i, (DOWN_AT[t] - T) * CAP[t], DOWN_LATENT[t])) transition(world, rng, i, DOWN_INTO[t], DOWN_VANISH[t]);
          continue;
        }
        if (life[i] !== 0) life[i] = life[i] > HEAT.PROGRESS_DECAY ? life[i] - HEAT.PROGRESS_DECAY : 0;
      }
      if (T >= IGNITE_AT[t]) {
        if (rng.nextU32() < ignite) {
          const into = BURNS_INTO[t];
          world.transform(i, into, initialLife(into, rng.nextU32()));
        }
        continue;
      }
      if (T >= EVAP_AT[t] && type[i - stride] === EMPTY) {
        const p = HEAT.EVAP_RATE * (T - EVAP_AT[t]);
        if (rng.nextU32() < (p < HEAT.EVAP_MAX ? p : HEAT.EVAP_MAX) * U32) world.set(i, EMPTY, 0, 0, 0, T);
      }
    }
  }
}
```

- `stepHeat` sonunda, `world.swapTempBuffers();` satırından sonra: `applyThermalRules(world, rng, state);`
- Başlık yorumuna ekle: "Faz geçişleri (gizli ısı), tutuşma ve buharlaşma difüzyondan sonra ayrı bir geçişte uygulanır."

- [ ] **Adım 5: Reaksiyonları sadeleştir**

`js/engine/reactions.js`:

- Başlık yorumunun "Sıcaklık alanı yok..." satırını şununla değiştir: "Isı alışverişi (kaynatma, kum ısıtma, lav soğuması, yoğuşma) sıcaklık alanında (heat.js); burada yalnızca temas kuralları var."
- Destructuring: `const { EMPTY, WATER, STEAM, FIRE, PLANT, ASH } = MAT;`
- `RATES`:

```js
export const RATES = Object.freeze({
  fireBoil: p(0.5), // ateş komşu suyu buharlaştırıp söner
  plantGrow: p(0.012), // bitkinin tick başına büyüme denemesi olasılığı (yavaş yayılım)
  plantMinTemp: 5, // °C; bunun altında bitki büyümez
  maxFireSpawnPerTick: 400, // yanan materyallerin tick başına üretebileceği en fazla ateş
  maxGrowthPerTick: 24, // tick başına en fazla bitki büyümesi (dünya genelinde)
});
```

- `ignite` fonksiyonunun altına:

```js
const STEAM_TEMP = spawnTemp(STEAM, 0); // 105 °C

// Tüm buhar üretimi buradan geçer (kaynama, ateş, söndürme). Buhar doğuş sıcaklığıyla başlar;
// aksi halde suyun sıcaklığını alıp hemen yoğuşurdu. Alt proje 2: basınç kaynağı buraya bağlanacak.
export function emitSteam(world, i) {
  world.transform(i, STEAM, 0);
  world.temp[i] = STEAM_TEMP;
}
```

- `reactFire`: `become(world, rng, j, STEAM);` → `emitSteam(world, j);`
- `reactSteam` ve `coolLava` fonksiyonlarını sil.
- `reactLava`:

```js
// Lav yalnızca temasla tutuşturur; kaynatma, kum ısıtma ve soğuma sıcaklık alanında.
function reactLava(world, rng, i) {
  const j = sampleNeighbor(world, rng, i);
  ignite(world, rng, j, world.type[j]);
  return false;
}
```

- `reactBurning` içindeki su söndürme: `become(world, rng, j, STEAM);` → `emitSteam(world, j);`
- `reactPlant` başı:

```js
  if (state.growthBudget <= 0 || world.temp[i] < RATES.plantMinTemp || !roll(rng, RATES.plantGrow)) return false;
```

- `react()` switch'inden `case STEAM:` satırlarını sil.
- `become` hâlâ kullanılıyorsa bırak; kullanılmıyorsa sil.

`js/engine/simulation.js`:

- `const { KIND: KIND_OF, REACTIVE } = MATERIALS;` yap.
- Geçiş 1'deki `if (COOLS[t] !== 0 && life[i] !== 0) life[i]--;` satırını sil.
- `life` destructuring'i artık gereksizse kaldır.

- [ ] **Adım 6: Testleri çalıştır ve ayarla**

Çalıştır: `npm test`
Beklenen: PASS.

Bir reaksiyon ya da akışkan testi zaman sınırı nedeniyle kalırsa, sabitleri şu sırayla ayarla:

1. İlgili faz `latent` değeri.
2. `HEAT.AIR_RELAX`.
3. Materyal `conduct` değerleri. Her değişiklikte `K/C ≤ 0,25` şartı sağlanmalı.

Test beklentilerini, onları sağlamak için değiştirme. Yalnızca spec'in izin verdiği anlam değişikliklerini yap (yukarıdaki geçiş listesi). Değiştirdiğin her sabiti plan başındaki sapma tablosuna ve CHANGELOG'a yaz.

- [ ] **Adım 7: Tarayıcıda kontrol**

`?scene=volcano` adresini aç. Beklenen:

- yarıktan akan lav yolda kabuk bağlıyor ve kızgın taş olarak kararıyor
- göle ulaşan lav suyu kaynatıyor
- buhar yükselip yoğuşuyor
- konsol temiz

- [ ] **Adım 8: Changelog, DEVELOPMENT, commit**

`CHANGELOG.md` → `### Changed`:

```markdown
- Faz geçişleri artık sıcaklık alanında ve gizli ısıyla çalışıyor:
  - su 100 °C'de kaynıyor
  - buhar 95 °C'de yoğuşuyor ve bir kısmı kayboluyor
  - lav 750 °C'de taşa dönüyor: önce dış yüzeyi, ortası en son
  - kum 700 °C'de cama dönüyor
  - taş 1500 °C'de eriyor
- Sıcak ortamda (≥ 35 °C) açık su yüzeyi yavaşça buharlaşıyor.
- Odun (300 °C), yağ ve bitki (250 °C) sıcaklıkla kendiliğinden tutuşuyor. Bitki 5 °C'nin altında büyümüyor.
- Eski `life` sayaç hileleri (kum ısısı, lav soğuma sayacı, buhar zamanlayıcısı) kaldırıldı. Temasla tutuşma ve ateşin suyu buharlaştırması korundu.
```

`docs/DEVELOPMENT.md` → "Faz geçişleri" `[x]`.

```powershell
git add js/engine/materials.js js/engine/heat.js js/engine/reactions.js js/engine/simulation.js tests/thermal.test.js tests/reactions.test.js tests/materials.test.js CHANGELOG.md docs/DEVELOPMENT.md
git commit -m "Faz geçişleri gizli ısıyla; sıcaklıkla tutuşma ve buharlaşma; sayaç hileleri kaldırıldı"
git push -q origin main
```

---

### Task 8 (Görev 8): Buz, Kar, Metal, Erimiş metal, Magma

**Files:**
- Modify: `js/engine/materials.js` (5 yeni materyal, suyun donması)
- Modify: `js/app/catalog.js` (Buz, Kar, Metal, Erimiş metal girişleri; `category` alanı; Magma etiketi)
- Modify: `tests/helpers.js` (ASCII karakterleri)
- Test: `tests/thermal.test.js`, `tests/materials.test.js`, `tests/app-modules.test.js`

**Interfaces:**
- Produces:
  - `MAT.ICE = 16`, `MAT.SNOW = 17`, `MAT.METAL = 18`, `MAT.MOLTEN_METAL = 19`, `MAT.MAGMA = 20` (hidden)
  - `PICKER` girişlerinde `category` alanı: `'powder' | 'liquid' | 'gas' | 'solid' | 'tool'`
  - ASCII: `I` buz, `*` kar, `M` metal, `m` erimiş metal, `X` magma

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/helpers.js` → `CHAR_TO_MAT` sözlüğüne:

```js
  I: MAT.ICE,
  '*': MAT.SNOW,
  M: MAT.METAL,
  m: MAT.MOLTEN_METAL,
  X: MAT.MAGMA,
```

`tests/thermal.test.js` sonuna:

```js
test('göl yüzeyden donar: soğuyan havada ilk buz en üst sırada, alt sıra en son', () => {
  const sim = new Simulation({ width: 24, height: 16, seed: 'freeze' });
  sim.setAmbient(10);
  sim.world.ambient = 10;
  sim.world.clear();
  fill(sim, 0, 8, 23, 15, MAT.STONE);
  fill(sim, 6, 8, 17, 12, MAT.WATER); // taşa oyulmuş göl, yüzey satırı 8
  sim.setAmbient(-15);
  const t = firstTick(sim, 30000, (s) => countMaterial(s, MAT.ICE) > 0);
  assert.ok(t > 0, 'buz oluşmadı');
  for (let y = 9; y <= 12; y++) for (let x = 6; x <= 17; x++) assert.notEqual(cellType(sim, x, y), MAT.ICE, `ilk buz yüzeyde olmalı (${x},${y})`);
  firstTick(sim, 60000, (s) => { for (let x = 6; x <= 17; x++) if (cellType(s, x, 8) !== MAT.ICE) return false; return true; });
  assert.ok([...Array(12).keys()].some((k) => cellType(sim, 6 + k, 12) === MAT.WATER), 'yüzey donduğunda dip hâlâ su');
});

test('ortam ısınınca buz çözülür', () => {
  const sim = new Simulation({ width: 8, height: 6, seed: 'thaw' });
  fill(sim, 2, 3, 5, 5, MAT.ICE);
  sim.setAmbient(15);
  const t = firstTick(sim, 30000, (s) => countMaterial(s, MAT.ICE) === 0);
  assert.ok(t > 0);
  assert.ok(countMaterial(sim, MAT.WATER) > 0);
});

test('lavın yanındaki buz gizli ısı nedeniyle hemen erimez ama erir', () => {
  const sim = makeSim(`
    ......
    .II...
    .IILLL
    ######
  `, { seed: 'ice-lava' });
  runTicks(sim, 5);
  assert.equal(countMaterial(sim, MAT.ICE), 4, 'ilk 5 tick\'te erimemeli');
  assert.ok(firstTick(sim, 2000, (s) => countMaterial(s, MAT.ICE) === 0) > 0);
});

test('metal ısıyı aynı boydaki taştan çok daha hızlı iletir', () => {
  const rodTemp = (mat) => {
    const sim = new Simulation({ width: 40, height: 5, seed: 'rod' });
    sim.setCell(0, 2, MAT.MAGMA);
    for (let x = 1; x < 32; x++) sim.setCell(x, 2, mat);
    runTicks(sim, 600);
    return sim.getCell(10, 2).temp;
  };
  const metal = rodTemp(MAT.METAL);
  const stone = rodTemp(MAT.STONE);
  assert.ok(metal > stone + 50, `metal=${metal.toFixed(1)} taş=${stone.toFixed(1)}`);
});

test('en iletken materyalde (metal) bile değerler başlangıç aralığında kalır', () => {
  const sim = new Simulation({ width: 12, height: 12 });
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    sim.setCell(x, y, MAT.METAL);
    sim.setTemp(x, y, (x + y) % 2 === 0 ? 1000 : 20);
  }
  for (let k = 0; k < 10; k++) {
    sim.step();
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
      const v = sim.getCell(x, y).temp;
      assert.ok(v >= 20 - 1e-3 && v <= 1000 + 1e-3, `(${x},${y})=${v}`);
    }
  }
});

test('erimiş metal soğuyunca metale, metal 1400 °C üstünde erimiş metale döner', () => {
  const sim = makeSim(`
    ......
    #mmmm#
    ######
  `, { seed: 'cast' });
  assert.ok(firstTick(sim, 5000, (s) => countMaterial(s, MAT.MOLTEN_METAL) === 0) > 0);
  assert.ok(countMaterial(sim, MAT.METAL) >= 4);
  const hot = new Simulation({ width: 3, height: 3, seed: 'remelt' });
  hot.setCell(1, 2, MAT.METAL);
  assert.ok(holdTemp(hot, 1, 2, 1600, 50, (s) => countMaterial(s, MAT.MOLTEN_METAL) > 0) > 0);
});

test('kar suyun üstünde yüzer ve ılık havada erir', () => {
  const sim = new Simulation({ width: 6, height: 8, seed: 'snow' });
  sim.setAmbient(0);
  sim.world.ambient = 0;
  sim.world.clear();
  fill(sim, 0, 5, 5, 7, MAT.WATER);
  sim.setCell(2, 0, MAT.SNOW);
  runTicks(sim, 100);
  let snowY = -1;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) if (cellType(sim, x, y) === MAT.SNOW) snowY = y;
  assert.ok(snowY >= 0 && snowY < 5, `kar suyun üstünde olmalı (y=${snowY})`);
  sim.setAmbient(12);
  assert.ok(firstTick(sim, 5000, (s) => countMaterial(s, MAT.SNOW) === 0) > 0);
});

test('0 °C ortamda buz–su sınırı titreşmez (histerezis)', () => {
  const sim = new Simulation({ width: 10, height: 6, seed: 'hyst' });
  sim.setAmbient(0);
  sim.world.ambient = 0;
  sim.world.clear();
  fill(sim, 0, 3, 9, 5, MAT.STONE);
  fill(sim, 1, 2, 4, 2, MAT.ICE);
  fill(sim, 5, 2, 8, 2, MAT.WATER);
  let changes = 0;
  let prev = [...sim.view.type];
  for (let t = 0; t < 3000; t++) {
    sim.step();
    const cur = sim.view.type;
    for (let i = 0; i < cur.length; i++) if (cur[i] !== prev[i] && (cur[i] === MAT.ICE || prev[i] === MAT.ICE)) changes++;
    prev = [...cur];
  }
  assert.ok(changes <= 8, `buz↔su geçişi ${changes}`);
});

test('magma sabit 1200 °C kaynak, statik ve seçicide yok', () => {
  const sim = new Simulation({ width: 4, height: 4 });
  sim.setCell(1, 1, MAT.MAGMA);
  runTicks(sim, 100);
  assert.equal(cellType(sim, 1, 1), MAT.MAGMA);
  assert.ok(sim.getCell(1, 1).temp >= 1200);
});
```

Dosya başındaki import'a `makeSim` ekle. Yardımcı fonksiyonları ekle:

```js
function firstTick(sim, max, pred) {
  for (let t = 0; t < max; t++) {
    sim.step();
    if (pred(sim)) return t + 1;
  }
  return -1;
}
```

`tests/app-modules.test.js` → "materyal seçici plandaki kısayol sırasını izler" testindeki beklenen eşlemeye şunları ekle: `b: MAT.ICE, k: MAT.SNOW, m: MAT.METAL, e: MAT.MOLTEN_METAL`. Teste şu satırı ekle:

```js
  for (const p of PICKER) assert.ok(['powder', 'liquid', 'gas', 'solid', 'tool'].includes(p.category), p.key);
```

- [ ] **Adım 2: Başarısız olduğunu gör**

Çalıştır: `node --test tests/thermal.test.js tests/app-modules.test.js`
Beklenen: FAIL (`MAT.ICE` tanımsız).

- [ ] **Adım 3: Materyalleri ekle**

`js/engine/materials.js`:

- `MAT` sözlüğüne, `ASH: 15`'in altına:

```js
  // Sıcaklık sistemi (0.10.0)
  ICE: 16,
  SNOW: 17,
  METAL: 18,
  MOLTEN_METAL: 19,
  MAGMA: 20, // gizli, sabit ısı kaynağı (sahneler yerleştirir)
```

- `WATER.phase` alanını genişlet: `phase: { up: { at: 100, into: MAT.STEAM, latent: 1500 }, down: { at: -1, into: MAT.ICE, latent: 300 } }`
- `MATERIAL_DEFS` sonuna:

```js
  {
    id: MAT.ICE, key: 'ICE', name: 'Ice', kind: KIND.STATIC, density: 255, color: '#bfe3f2',
    temp: -15, conduct: 0.12, capacity: 3, phase: { up: { at: 1, into: MAT.WATER, latent: 300 } },
  },
  {
    id: MAT.SNOW, key: 'SNOW', name: 'Snow', kind: KIND.POWDER, density: 8, color: '#eef3f7',
    temp: -8, conduct: 0.01, capacity: 1, phase: { up: { at: 1, into: MAT.WATER, latent: 30 } },
  },
  {
    id: MAT.METAL, key: 'METAL', name: 'Metal', kind: KIND.STATIC, density: 255, color: '#8d98a3',
    conduct: 1.6, capacity: 8, phase: { up: { at: 1400, into: MAT.MOLTEN_METAL, latent: 1200 } },
  },
  {
    id: MAT.MOLTEN_METAL, key: 'MOLTEN_METAL', name: 'Molten Metal', kind: KIND.LIQUID, density: 40, color: '#ffb347',
    dispersion: 2, spread: 0.5, drag: 0.8, temp: 1450, conduct: 0.8, capacity: 4,
    phase: { down: { at: 1300, into: MAT.METAL, latent: 400 } },
  },
  {
    id: MAT.MAGMA, key: 'MAGMA', name: 'Magma', kind: KIND.STATIC, density: 255, color: '#ff5a1a',
    hidden: true, temp: 1200, source: 1200, conduct: 0.06, capacity: 4,
  },
```

`js/app/catalog.js`:

- Mevcut her girişe `category` ekle:
  - SAND `'powder'`
  - WATER, OIL, LAVA `'liquid'`
  - FIRE, STEAM `'gas'`
  - STONE, WOOD, PLANT, GLASS `'solid'`
  - ERASER `'tool'`
- Silgi'den önce ekle:

```js
  { key: 'SNOW', mat: MAT.SNOW, label: 'Kar', shortcut: 'k', category: 'powder' },
  { key: 'MOLTEN_METAL', mat: MAT.MOLTEN_METAL, label: 'Erimiş metal', shortcut: 'e', category: 'liquid' },
  { key: 'ICE', mat: MAT.ICE, label: 'Buz', shortcut: 'b', category: 'solid' },
  { key: 'METAL', mat: MAT.METAL, label: 'Metal', shortcut: 'm', category: 'solid' },
```

- `EXTRA_LABELS` sözlüğüne `[MAT.MAGMA]: 'Magma kaynağı',` ekle.

`index.html` yardım tablosuna:

```html
        <tr><th scope="row"><kbd>B</kbd> <kbd>K</kbd> <kbd>M</kbd> <kbd>E</kbd></th><td>Buz, Kar, Metal, Erimiş metal</td></tr>
```

- [ ] **Adım 4: Testleri çalıştır ve ayarla**

Çalıştır: `npm test`
Beklenen: PASS.

"göl yüzeyden donar" testi zaman sınırına takılırsa şu sırayı izle:

1. Önce `ICE`/`WATER` gizli ısısını 300 → 200 yap.
2. Sonra `AIR_RELAX` değerine bak.

İlk buzun yüzeyde olma şartını gevşetme.

- [ ] **Adım 5: Changelog, DEVELOPMENT, commit**

`CHANGELOG.md` → `### Added`:

```markdown
- Yeni materyaller:
  - **Buz** (`B`): 1 °C'de erir. Su −1 °C'de donar ve göl yüzeyden aşağı doğru buz tutar.
  - **Kar** (`K`): hafif toz; suyun üstünde yüzer, çabuk erir.
  - **Metal** (`M`): ısıyı çok hızlı iletir, 450 °C'den sonra kızarır, 1400 °C'de erir.
  - **Erimiş metal** (`E`): lavdan ağırdır, soğuyunca metal olur.
- Gizli **Magma kaynağı**: sahnelerde kullanılan, sabit 1200 °C'lik ısı kaynağı.
```

`docs/DEVELOPMENT.md` → ilgili madde `[x]`.

```powershell
git add js/engine/materials.js js/app/catalog.js index.html tests/helpers.js tests/thermal.test.js tests/app-modules.test.js CHANGELOG.md docs/DEVELOPMENT.md
git commit -m "Buz, Kar, Metal, Erimiş metal ve Magma; su donar"
git push -q origin main
```

---

### Task 9 (Görev 9): Gün/gece döngüsü, sahne ortamları, gökyüzü

**Files:**
- Modify: `js/engine/climate.js` (`DAY_TICKS`, `DAY_AMPLITUDE`, `DAY_START`, `dayPhase`, `dayWave`, `ambientAt`, `daylight`)
- Modify: `js/engine/simulation.js` (`dayCycle`, `setDayCycle`, `dayPhase`, `ambient` dalgalı; `loadScene` sahne ortamı; view getter'ları)
- Modify: `js/scenes/index.js` (`ambient` alanları)
- Modify: `js/render/background.js` (`skyColors`, `starAlpha`, `paintBackground` daylight parametresi)
- Modify: `js/render/renderer.js` (arka plan anahtarı daylight adımıyla)
- Modify: `js/app/stats.js` (`dayLabel`, `formatClimate`)
- Create: `tests/climate.test.js`
- Modify: `tests/render-background.test.js`, `tests/scenes.test.js`, `tests/app-modules.test.js`

**Interfaces:**
- Produces:
  - `dayPhase(tick): number ∈ [0, 1)`
  - `dayWave(p): number ∈ [−1, 1]` (p = 0 gece yarısı, 0.5 öğle)
  - `ambientAt(base, tick, cycle): number`
  - `daylight(p): number ∈ [0, 1]`
  - `Simulation#dayCycle: boolean`, `Simulation#setDayCycle(on)`, `get dayPhase()`
  - `view.dayCycle`, `view.dayPhase`
  - Sahne kaydında `ambient: number`
  - `skyColors(daylight): [string, string, string]`, `starAlpha(daylight): number`
  - `paintBackground(ctx, w, h, seed, daylight = 0.5)`
  - `stats.js`: `dayLabel(p): string`, `formatClimate(cycle, phase, ambient): string`

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/climate.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DAY_TICKS, DAY_AMPLITUDE, dayPhase, dayWave, ambientAt, daylight } from '../js/engine/climate.js';
import { Simulation } from '../js/engine/simulation.js';
import { MAT } from '../js/engine/materials.js';

test('gün dalgası: gece yarısı −1, öğle +1, periyodik ve [−1, 1] içinde', () => {
  assert.equal(dayWave(0), -1);
  assert.equal(dayWave(0.5), 1);
  for (let k = 0; k <= 100; k++) {
    const v = dayWave(k / 100);
    assert.ok(v >= -1 && v <= 1);
  }
  assert.equal(dayPhase(0), dayPhase(DAY_TICKS));
});

test('dalga süreklidir: ardışık tick\'ler arasında sıçrama yok; tick 0 sabah', () => {
  for (let t = 0; t < DAY_TICKS; t += 7) {
    assert.ok(Math.abs(ambientAt(20, t + 1, true) - ambientAt(20, t, true)) < 0.02);
  }
  assert.ok(Math.abs(dayWave(dayPhase(0))) < 1e-9, 'tick 0: dalga 0');
  assert.ok(dayWave(dayPhase(60)) > 0, 'sabah ısınıyor');
});

test('ambientAt döngü kapalıyken tabana eşit, açıkken ±DAY_AMPLITUDE içinde', () => {
  assert.equal(ambientAt(-5, 1234, false), -5);
  for (let t = 0; t < DAY_TICKS; t += 100) {
    const v = ambientAt(-5, t, true);
    assert.ok(v >= -5 - DAY_AMPLITUDE - 1e-9 && v <= -5 + DAY_AMPLITUDE + 1e-9);
  }
  assert.equal(daylight(0), 0);
  assert.equal(daylight(0.5), 1);
});

test('ısı ve iklim kodu Math.sin/exp/pow kullanmaz', () => {
  for (const f of ['heat.js', 'climate.js']) {
    const code = fs.readFileSync(new URL(`../js/engine/${f}`, import.meta.url), 'utf8').replace(/\/\/[^\n]*/g, '');
    assert.equal(/Math\.(sin|cos|exp|pow)\b/.test(code), false, f);
  }
});

test('gün/gece açıkken ortam tick ile değişir; undo tick\'i ve dolayısıyla ortamı geri getirir', () => {
  const sim = new Simulation({ width: 8, height: 8 });
  sim.setAmbient(10);
  sim.setDayCycle(true);
  const a0 = sim.ambient;
  sim.beginStroke();
  sim.paintAt(1, 1, { material: MAT.STONE, size: 1, shape: 'square' });
  sim.endStroke();
  for (let t = 0; t < 1200; t++) sim.step();
  assert.notEqual(sim.ambient, a0);
  sim.undo();
  assert.equal(sim.ambient, a0);
});

test('loadScene sahnenin ortam sıcaklığını uygular ve alanı onunla başlatır', () => {
  const sim = new Simulation({ width: 8, height: 8 });
  sim.loadScene({ id: 'cold', ambient: -12, generate: () => {} }, 's');
  assert.equal(sim.ambient, -12);
  assert.equal(sim.getCell(3, 3).temp, -12);
  sim.loadScene({ id: 'default', generate: () => {} }, 's');
  assert.equal(sim.ambient, 20);
});
```

`tests/render-background.test.js` sonuna:

```js
test('gökyüzü renkleri: gündüz geceden açık, 0.5 bugünkü alacakaranlık', () => {
  const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255); };
  const night = skyColors(0);
  const day = skyColors(1);
  for (let k = 0; k < 3; k++) assert.ok(lum(day[k]) > lum(night[k]));
  assert.deepEqual(skyColors(0.5), ['#15131c', '#1d1719', '#261b15']);
  assert.equal(starAlpha(0.5), 1);
  assert.ok(starAlpha(0) > starAlpha(1));
});
```

Import: `import { ridgeProfile, skyColors, starAlpha } from '../js/render/background.js';`

`tests/scenes.test.js` sonuna:

```js
test('her sahnenin ortam sıcaklığı −40..60 aralığında; Vaha ılık', () => {
  for (const s of SCENES) assert.ok(Number.isFinite(s.ambient) && s.ambient >= -40 && s.ambient <= 60, s.id);
  assert.equal(getScene('oasis').ambient, 30);
});
```

`tests/app-modules.test.js` → stats bölümüne. Import'a `dayLabel`, `formatClimate` ekle:

```js
test('gün etiketi ve iklim satırı', () => {
  assert.equal(dayLabel(0.1), 'Gece');
  assert.equal(dayLabel(0.3), 'Sabah');
  assert.equal(dayLabel(0.5), 'Öğle');
  assert.equal(dayLabel(0.7), 'Akşam');
  assert.equal(dayLabel(0.9), 'Gece');
  assert.equal(formatClimate(true, 0.5, 27.6), 'Öğle · 28 °C');
  assert.equal(formatClimate(false, 0.5, -15), 'Sabit · -15 °C');
});
```

- [ ] **Adım 2: Başarısız olduğunu gör**

Çalıştır: `node --test tests/climate.test.js tests/render-background.test.js tests/scenes.test.js tests/app-modules.test.js`
Beklenen: FAIL.

- [ ] **Adım 3: İklim fonksiyonları**

`js/engine/climate.js` sonuna:

```js
// Gün/gece döngüsü: 1× hızda bir gün ≈ 4 dakika. Tick'ten türetilir (undo ve seed ile tutarlı).
export const DAY_TICKS = 14400;
export const DAY_AMPLITUDE = 10; // °C (gece −, öğle +)
export const DAY_START = 0.25; // tick 0 = sabah

export function dayPhase(tick) {
  const p = DAY_START + tick / DAY_TICKS;
  return p - Math.floor(p);
}

// p = 0 gece yarısı (−1), 0.5 öğle (+1). Üçgen dalga, kübik yumuşatma (tepelerde türev 0).
export function dayWave(p) {
  const tri = p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
  return tri * (1.5 - 0.5 * tri * tri);
}

export function ambientAt(base, tick, cycle) {
  return cycle ? base + DAY_AMPLITUDE * dayWave(dayPhase(tick)) : base;
}

// Gökyüzü aydınlığı: 0 gece yarısı, 1 öğle.
export function daylight(p) {
  return (dayWave(p) + 1) / 2;
}
```

- [ ] **Adım 4: Simulation**

`js/engine/simulation.js`:

- Import'u genişlet: `import { DEFAULT_AMBIENT, clampAmbient, TEMP_MIN, TEMP_MAX, ambientAt, dayPhase } from './climate.js';`
- Constructor'a: `this.dayCycle = false;`
- `get ambient()`:

```js
  // Bu tick'in ortam sıcaklığı: taban + (açıksa) gün/gece dalgası.
  get ambient() {
    return ambientAt(this.ambientBase, this.tick, this.dayCycle);
  }

  get dayPhase() {
    return dayPhase(this.tick);
  }

  setDayCycle(on) {
    this.dayCycle = Boolean(on);
  }
```

- View'a getter'lar:

```js
      get dayCycle() {
        return sim.dayCycle;
      },
      get dayPhase() {
        return sim.dayPhase;
      },
```

- `loadScene` içinde, `this.world.clear();` satırından hemen önce (Görev 5'teki `this.world.ambient = this.ambient;` satırının yerine):

```js
    this.ambientBase = clampAmbient(scene.ambient ?? DEFAULT_AMBIENT);
    this.tick = 0;
    this.world.ambient = this.ambient;
```

Aynı fonksiyonun aşağısındaki `this.tick = 0;` tekrarını sil.

- `getStats()` dönüşüne: `ambient: this.ambient, dayCycle: this.dayCycle, dayPhase: this.dayPhase,`

`js/scenes/index.js` → her kayda `ambient` ekle:

| Sahne | `ambient` |
|---|---|
| volcano | 20 |
| hourglass | 20 |
| oasis | 30 |
| chaos | 20 |
| empty | 20 |
| benchmark | 20 |

Sahne biçimi yorumunu güncelle: `{ id, name, ambient, generate(sim, rng), hidden?, hint? }`.

- [ ] **Adım 5: Gökyüzü**

`js/render/background.js`:

```js
// Gökyüzü: gece yarısı (0) → alacakaranlık (0.5, gün/gece kapalıyken sabit görünüm) → öğle (1).
const SKY_NIGHT = ['#07070c', '#0c0a10', '#130e0c'];
const SKY_DUSK = ['#15131c', '#1d1719', '#261b15'];
const SKY_DAY = ['#2c3a52', '#4a4048', '#5a3f2c'];

function mixHex(a, b, u) {
  if (u <= 0) return a;
  if (u >= 1) return b;
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) + (((pb >> s) & 255) - ((pa >> s) & 255)) * u);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

export function skyColors(daylight) {
  const d = daylight < 0 ? 0 : daylight > 1 ? 1 : daylight;
  const [from, to, u] = d < 0.5 ? [SKY_NIGHT, SKY_DUSK, d / 0.5] : [SKY_DUSK, SKY_DAY, (d - 0.5) / 0.5];
  return from.map((c, k) => mixHex(c, to[k], u));
}

// Yıldız görünürlüğü çarpanı: 0.5'te 1 (bugünkü), gece daha parlak, öğlen görünmez.
export function starAlpha(daylight) {
  const v = 2 * (1 - daylight);
  return v < 0 ? 0 : v > 1.6 ? 1.6 : v;
}
```

`paintBackground(ctx, width, height, seed, daylight = 0.5)` içinde:

- Gradyan durakları `skyColors(daylight)`'tan gelir: sırasıyla 0, 0.55, 1 konumlarına.
- Yıldız alfası `a * starAlpha(daylight)` olur. Değer 1'e kırpılır: `Math.min(1, a * starAlpha(daylight))`.

`js/render/renderer.js`:

- Import: `import { daylight } from '../engine/climate.js';`
- `_ensureBackground(view)` bir `view` parametresi alır:

```js
    const step = view?.dayCycle ? Math.round(daylight(view.dayPhase) * 32) : 16;
    const key = `${w}x${h}:${this.seed}:${step}`;
    // ...
    paintBackground(this.background.getContext('2d'), w, h, this.seed, step / 32);
```

- `render` ve `capture` içindeki çağrıları `this._ensureBackground(view)` yap.

`js/app/stats.js` sonuna:

```js
// Gün fazı (0 gece yarısı, 0.5 öğle) → Türkçe etiket.
export function dayLabel(p) {
  if (p < 0.2 || p >= 0.8) return 'Gece';
  if (p < 0.4) return 'Sabah';
  if (p < 0.6) return 'Öğle';
  return 'Akşam';
}

export function formatClimate(cycle, phase, ambient) {
  const t = `${Math.round(ambient)} °C`;
  return cycle ? `${dayLabel(phase)} · ${t}` : `Sabit · ${t}`;
}
```

- [ ] **Adım 6: Testleri çalıştır**

Çalıştır: `npm test`
Beklenen: PASS.

`app.test.js` ya da `renderer.test.js`'teki sahte renderer `setBackground` dışında bir şey istemez. `Renderer._ensureBackground(view)` yalnızca gerçek renderer'da kullanılır.

- [ ] **Adım 7: Changelog, DEVELOPMENT, commit**

`CHANGELOG.md` → `### Added`:

```markdown
- Gün/gece döngüsü (varsayılan kapalı): 1× hızda bir gün ≈ 4 dakika. Ortam sıcaklığı gece 10 °C düşer, öğlen 10 °C yükselir. Gökyüzü geceleri kararır ve yıldızlar belirginleşir.
- Sahnelerin varsayılan ortam sıcaklığı var (Vaha 30 °C, diğerleri 20 °C). Sahne yüklenince alan bu sıcaklıkla başlar.
```

`docs/DEVELOPMENT.md` → ilgili madde `[x]`.

```powershell
git add js/engine/climate.js js/engine/simulation.js js/scenes/index.js js/render/background.js js/render/renderer.js js/app/stats.js tests/climate.test.js tests/render-background.test.js tests/scenes.test.js tests/app-modules.test.js CHANGELOG.md docs/DEVELOPMENT.md
git commit -m "Gün/gece döngüsü, sahne ortam sıcaklıkları ve gökyüzü"
git push -q origin main
```

---

### Task 10 (Görev 10): Isıt ve Soğut fırçaları

**Files:**
- Modify: `js/engine/simulation.js` (`TOOL_DELTA`, `TOOL_MIN`, `TOOL_MAX`; `paintLine` araç dalı; `_heatCell`)
- Modify: `js/app/catalog.js` (HEAT, COOL)
- Modify: `js/app/app.js` (`brush()` → `tool`)
- Modify: `js/app/pointer.js` (sağ tık silgisi aracı temizler)
- Modify: `js/app/controls.js` (araç numune dokusu)
- Modify: `index.html` (yardım satırı)
- Test: `tests/paint.test.js`, `tests/pointer.test.js`, `tests/app.test.js`, `tests/app-modules.test.js`

**Interfaces:**
- Produces:
  - `brush.tool?: 'heat' | 'cool'`. Araç varsa `material` yok sayılır.
  - `export const TOOL_DELTA = 25, TOOL_MIN = -100, TOOL_MAX = 2500` (`simulation.js`)
  - `PICKER` araç girişleri: `{ key: 'HEAT', mat: null, tool: 'heat', label: 'Isıt', shortcut: 'h', category: 'tool' }` ve `{ key: 'COOL', mat: null, tool: 'cool', label: 'Soğut', shortcut: 'c', category: 'tool' }`

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/paint.test.js` sonuna. Gerekli import'lar: `Simulation`, `MAT`, `hashView` ve `simulation.js`'ten `TOOL_DELTA`, `TOOL_MAX`, `TOOL_MIN`.

```js
const HEAT = { material: MAT.EMPTY, tool: 'heat', size: 1, shape: 'square' };
const COOL = { material: MAT.EMPTY, tool: 'cool', size: 1, shape: 'square' };

test('Isıt fırçası sıcaklığı TOOL_DELTA artırır ve materyale dokunmaz', () => {
  const sim = new Simulation({ width: 6, height: 6 });
  sim.setCell(2, 2, MAT.STONE);
  const types = [...sim.view.type];
  const before = sim.getCell(2, 2).temp;
  assert.equal(sim.paintAt(2, 2, HEAT), 1);
  assert.equal(sim.getCell(2, 2).temp, before + TOOL_DELTA);
  assert.deepEqual([...sim.view.type], types);
});

test('uzun basılı tutma sınırları aşmaz ve değişmezleri bozmaz', () => {
  const sim = new Simulation({ width: 8, height: 8, debug: true });
  sim.setCell(3, 3, MAT.GLASS);
  sim.setHold(3, 3, { ...HEAT, size: 3 });
  for (let t = 0; t < 200; t++) sim.step();
  sim.releaseHold();
  let max = -Infinity;
  for (const v of sim.view.temp) max = Math.max(max, v);
  assert.ok(max <= TOOL_MAX, `en yüksek ${max}`);
  sim.setHold(3, 3, { ...COOL, size: 3 });
  for (let t = 0; t < 400; t++) sim.step();
  let min = Infinity;
  for (const v of sim.view.temp) min = Math.min(min, v);
  assert.ok(min >= TOOL_MIN, `en düşük ${min}`);
});

test('ısıt stroke\'u geri alınır; undo sıcaklıkları geri getirir', () => {
  const sim = new Simulation({ width: 6, height: 6 });
  sim.setCell(2, 2, MAT.STONE);
  const before = hashView(sim);
  sim.beginStroke();
  sim.paintAt(2, 2, { ...HEAT, size: 3 });
  sim.endStroke();
  assert.equal(sim.canUndo, true, 'yalnızca sıcaklık değişse de undo noktası oluşmalı');
  sim.undo();
  assert.equal(hashView(sim), before);
});
```

Bu testte cam seçildi, çünkü taş 1500 °C'de erir. Cam hiç erimez ve sınır testi için idealdir.

`tests/pointer.test.js` sonuna:

```js
test('ısı aracıyla da sağ tık geçici silgidir', () => {
  const { sim, fire } = setup({ material: MAT.EMPTY, tool: 'heat', size: 1, shape: 'square', replace: false });
  sim.setCell(3, 3, MAT.STONE);
  fire('pointerdown', ev(3, 3, { button: 2 }));
  fire('pointerup', ev(3, 3, { button: 2 }));
  assert.equal(cellType(sim, 3, 3), MAT.EMPTY);
});
```

`tests/app.test.js` sonuna:

```js
test('Isıt seçilince fırça aracı taşır; silgi taşımaz', () => {
  const { app } = setup();
  app.actions.setMaterial('HEAT');
  assert.equal(app.brush().tool, 'heat');
  app.actions.setMaterial('ERASER');
  assert.equal(app.brush().tool, null);
  assert.equal(app.brush().material, MAT.EMPTY);
});
```

`tests/app-modules.test.js` → kısayol eşlemesi testi. Araçlar `mat: null` taşır; testteki `byShortcut` eşlemesini şöyle kur:

```js
  const byShortcut = Object.fromEntries(PICKER.map((p) => [p.shortcut, p.tool ?? p.mat]));
```

Beklenene `h: 'heat', c: 'cool'` ekle.

- [ ] **Adım 2: Başarısız olduğunu gör**

Çalıştır: `node --test tests/paint.test.js tests/pointer.test.js tests/app.test.js tests/app-modules.test.js`
Beklenen: FAIL.

- [ ] **Adım 3: Uygula**

`js/engine/simulation.js`:

- `SPEEDS` satırının altına:

```js
// Isıt/Soğut fırçası: tick başına ve boyama başına sıcaklık değişimi ve sınırlar (°C).
export const TOOL_DELTA = 25;
export const TOOL_MIN = -100;
export const TOOL_MAX = 2500;
```

- `paintLine` başı:

```js
  paintLine(x0, y0, x1, y1, brush) {
    const delta = brush.tool === 'heat' ? TOOL_DELTA : brush.tool === 'cool' ? -TOOL_DELTA : 0;
    const material = brush.material;
    if (delta === 0) {
      const def = MATERIALS.defs[material];
      if (!def || def.internal) return 0;
    }
    if (![x0, y0, x1, y1].every(Number.isFinite)) return 0;
    const fp = footprint(brush.shape, brush.size);
    const spray = brush.shape === 'spray';
    const replace = Boolean(brush.replace);
    let painted = 0;
    lineCells(Math.floor(x0), Math.floor(y0), Math.floor(x1), Math.floor(y1), (cx, cy) => {
      for (let k = 0; k < fp.length; k += 2) {
        painted += delta !== 0
          ? this._heatCell(cx + fp[k], cy + fp[k + 1], delta, spray)
          : this._paintCell(cx + fp[k], cy + fp[k + 1], material, replace, spray);
      }
    });
    // (mevcut painted > 0 bloğu aynen)
```

- `_paintCell`'in altına:

```js
  // Isıt/Soğut: hücre sıcaklığını delta kadar değiştirir ([TOOL_MIN, TOOL_MAX]); materyale dokunmaz.
  _heatCell(x, y, delta, spray) {
    const w = this.world;
    if (!w.inBounds(x, y)) return 0;
    if (spray && !this.inputRng.chance(SPRAY_DENSITY)) return 0;
    const i = w.index(x, y);
    const T = w.temp[i];
    let v = T + delta;
    if (v > TOOL_MAX) v = T > TOOL_MAX ? T : TOOL_MAX;
    if (v < TOOL_MIN) v = T < TOOL_MIN ? T : TOOL_MIN;
    if (v === T) return 0;
    w.temp[i] = v;
    return 1;
  }
```

`v > TOOL_MAX` dalı, zaten sınırın üstünde olan bir hücreyi (ör. 5000 °C'lik kaynak) aşağı çekmez.

`js/app/catalog.js` → Silgi'nin altına:

```js
  { key: 'HEAT', mat: null, tool: 'heat', label: 'Isıt', shortcut: 'h', category: 'tool' },
  { key: 'COOL', mat: null, tool: 'cool', label: 'Soğut', shortcut: 'c', category: 'tool' },
```

- `materialLabel` içinde `PICKER.find((p) => p.mat === mat)` araçları (`mat: null`) atlar; ek değişiklik gerekmez.

`js/app/app.js` → `brush()`:

```js
    brush() {
      const pick = pickerByKey(state.material);
      return { material: pick.mat ?? 0, tool: pick.tool ?? null, size: state.brushSize, shape: state.brushShape, replace: state.replace };
    },
```

`js/app/pointer.js` → `pointerdown` içindeki fırça kurulumu:

```js
      const erase = e.button === SECONDARY;
      const brush = {
        ...base,
        material: erase ? MAT.EMPTY : base.material,
        tool: erase ? null : base.tool ?? null,
        replace: Boolean(base.replace || e.shiftKey),
      };
```

`js/app/controls.js` → `paintSwatch(canvas, mat, palette)` imzasını `paintSwatch(canvas, pick, palette)` yap. Çağrıda `p` geçir. İçerik:

```js
function paintSwatch(canvas, pick, palette) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(SWATCH, SWATCH);
  const px = new Uint32Array(img.data.buffer);
  const light = packRGBA(90, 82, 74, 255);
  const dark = packRGBA(52, 46, 40, 255);
  for (let k = 0; k < px.length; k++) {
    const x = k % SWATCH;
    const y = (k / SWATCH) | 0;
    if (pick.tool) {
      const u = y / (SWATCH - 1); // araç: dikey sıcak/soğuk gradyan
      px[k] = pick.tool === 'heat'
        ? packRGBA(255, Math.round(200 - 150 * u), Math.round(90 - 80 * u), 255)
        : packRGBA(Math.round(120 - 90 * u), Math.round(200 - 60 * u), 255, 255);
    } else if (pick.mat === MAT.EMPTY) {
      px[k] = ((x >> 1) + (y >> 1)) % 2 === 0 ? light : dark; // silgi: dama deseni
    } else {
      px[k] = palette[pick.mat * SHADES + ((k * 7) % SHADES)];
    }
  }
  ctx.putImageData(img, 0, 0);
}
```

`index.html` yardım tablosuna:

```html
        <tr><th scope="row"><kbd>H</kbd> <kbd>C</kbd></th><td>Isıt / Soğut fırçası (basılı tutunca sürer)</td></tr>
```

- [ ] **Adım 4: Testlerin geçtiğini gör**

Çalıştır: `npm test`
Beklenen: PASS.

- [ ] **Adım 5: Changelog, DEVELOPMENT, commit**

`CHANGELOG.md` → `### Added`:

```markdown
- **Isıt** (`H`) ve **Soğut** (`C`) fırçaları: materyal koymadan fırçanın altındaki hücrelerin sıcaklığını her uygulamada 25 °C değiştirir. Basılı tutunca etki sürer, sınırlar −100…2500 °C. Geri alınabilir; sağ tık yine silgidir.
```

`docs/DEVELOPMENT.md` → ilgili madde `[x]`.

```powershell
git add js/engine/simulation.js js/app/catalog.js js/app/app.js js/app/pointer.js js/app/controls.js index.html tests/paint.test.js tests/pointer.test.js tests/app.test.js tests/app-modules.test.js CHANGELOG.md docs/DEVELOPMENT.md
git commit -m "Isıt ve Soğut fırçaları"
git push -q origin main
```

---

### Task 11 (Görev 11): Sekmeli seçici, Ortam bölümü, termal düğme, kısayollar, göstergeler

**Files:**
- Modify: `js/app/catalog.js` (`CATEGORIES`, `categoryOf`)
- Modify: `js/app/app.js`:
  - durum: `tab`, `ambient`, `dayCycle`, `thermal`
  - eylemler: `setTab`, `setAmbient`, `setDayCycle`, `toggleThermal`
  - dispatch: `toggleThermal`
- Modify: `js/app/keyboard.js` (`T`)
- Modify: `js/app/controls.js` (sekmeler, Ortam bölümü, termal düğme)
- Modify: `js/app/storage.js` (`dayCycle`)
- Modify: `js/main.js` (göstergeler)
- Modify: `index.html`, `css/controls.css`, `css/layout.css`
- Test: `tests/app.test.js`, `tests/app-modules.test.js`

**Interfaces:**
- Consumes:
  - `sim.setAmbient`, `sim.ambientBase`, `sim.setDayCycle` (Görev 5 ve 9)
  - `renderer.setViewMode` (Görev 6)
  - `formatClimate` (Görev 9)
- Produces:
  - `CATEGORIES: ReadonlyArray<{ id, label }>` (sıra: Toz, Sıvı, Gaz, Katı, Araç)
  - `categoryOf(key): string`
  - `prefs.dayCycle: boolean`
  - klavye eylemi `{ type: 'toggleThermal' }`

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/app-modules.test.js`. Import'a `CATEGORIES` ve `categoryOf` ekle:

```js
test('kategoriler seçici sırasını tanımlar; her giriş bir kategoriye ait ve her kategoride en az bir giriş var', () => {
  assert.deepEqual(CATEGORIES.map((c) => c.id), ['powder', 'liquid', 'gas', 'solid', 'tool']);
  assert.deepEqual(CATEGORIES.map((c) => c.label), ['Toz', 'Sıvı', 'Gaz', 'Katı', 'Araç']);
  for (const c of CATEGORIES) assert.ok(PICKER.some((p) => p.category === c.id), c.id);
  assert.equal(categoryOf('METAL'), 'solid');
  assert.equal(categoryOf('nope'), 'powder');
});

test('T termal görünümü açıp kapatır; dayCycle tercihi boolean olarak doğrulanır', () => {
  assert.deepEqual(keyToAction(key('t')), { type: 'toggleThermal' });
  assert.equal(sanitizePrefs({ dayCycle: true }).dayCycle, true);
  assert.equal(sanitizePrefs({ dayCycle: 'yes' }).dayCycle, false);
  assert.equal(sanitizePrefs({}).dayCycle, false, '0.9.0 kaydı: alan yok → kapalı');
});
```

`tests/app.test.js`. `setup` içindeki sahte renderer'a mod kaydı ekle:

```js
  const renderer = { seeds: [], modes: [], setBackground(seed) { this.seeds.push(seed); }, setViewMode(m) { this.modes.push(m); } };
```

Sonra ekle:

```js
test('materyal seçmek sekmesini açar; setTab yalnızca geçerli kategoriyi kabul eder', () => {
  const { app } = setup();
  app.actions.setMaterial('ICE');
  assert.equal(app.state.tab, 'solid');
  app.actions.setTab('gas');
  assert.equal(app.state.tab, 'gas');
  app.actions.setTab('bogus');
  assert.equal(app.state.tab, 'gas');
});

test('ortam ayarı dünyayı anında değiştirmez ve sahne yüklenince sahnenin değerine döner', () => {
  const { app, sim } = setup({ scene: 'volcano' });
  const types = [...sim.view.type];
  app.actions.setAmbient(-25);
  assert.equal(sim.ambientBase, -25);
  assert.equal(app.state.ambient, -25);
  assert.equal(sim.canUndo, false);
  assert.deepEqual([...sim.view.type], types);
  app.actions.setScene('oasis');
  assert.equal(app.state.ambient, 30);
});

test('gün/gece tercihi simülasyona uygulanır ve kaydedilir; termal görünüm renderer\'a iletilir', async () => {
  const { app, sim, storage, renderer } = setup({ dayCycle: false });
  app.actions.setDayCycle(true);
  assert.equal(sim.dayCycle, true);
  app.dispatch({ type: 'toggleThermal' });
  assert.deepEqual(renderer.modes.at(-1), 'thermal');
  await new Promise((r) => setTimeout(r, 350));
  assert.equal(JSON.parse(storage.data['fsbox.prefs.v1']).dayCycle, true);
});
```

- [ ] **Adım 2: Başarısız olduğunu gör**

Çalıştır: `node --test tests/app.test.js tests/app-modules.test.js`
Beklenen: FAIL.

- [ ] **Adım 3: Katalog, tercih, klavye**

`js/app/catalog.js`:

```js
// Seçici sekmeleri (sıra ve Türkçe etiket).
export const CATEGORIES = Object.freeze([
  { id: 'powder', label: 'Toz' },
  { id: 'liquid', label: 'Sıvı' },
  { id: 'gas', label: 'Gaz' },
  { id: 'solid', label: 'Katı' },
  { id: 'tool', label: 'Araç' },
]);

export function categoryOf(key) {
  return pickerByKey(key)?.category ?? CATEGORIES[0].id;
}
```

`js/app/storage.js`:

- `DEFAULT_PREFS`: `dayCycle: false,`
- `sanitizePrefs`: `dayCycle: typeof r.dayCycle === 'boolean' ? r.dayCycle : d.dayCycle,`

`js/app/keyboard.js` → switch'e:

```js
    case 't':
    case 'T':
      return altGr ? null : { type: 'toggleThermal' };
```

`NO_REPEAT` kümesine `'toggleThermal'` ekle.

- [ ] **Adım 4: Uygulama durumu ve eylemler**

`js/app/app.js`:

- Import: `import { pickerByKey, CATEGORIES, categoryOf } from './catalog.js';`
- `state` nesnesine:

```js
    tab: categoryOf(prefs.material),
    ambient: 20,
    dayCycle: prefs.dayCycle,
    thermal: false,
```

- `sim.setSpeed(state.speed);` satırının altına: `sim.setDayCycle(state.dayCycle);`
- `persist` destructuring ve `savePrefs` nesnesine `dayCycle` ekle.
- `load()` içinde `sim.loadScene(...)` satırından sonra: `state.ambient = sim.ambientBase;`
- `setMaterial` içinde `state.material = key;` satırının altına: `state.tab = pick.category;`
- Yeni eylemler:

```js
    setTab(id) {
      if (!CATEGORIES.some((c) => c.id === id)) return;
      state.tab = id;
      sync();
    },
    setAmbient(c) {
      sim.setAmbient(Number(c));
      state.ambient = sim.ambientBase;
      sync();
    },
    setDayCycle(on) {
      state.dayCycle = Boolean(on);
      sim.setDayCycle(state.dayCycle);
      announce(state.dayCycle ? 'Gün/gece döngüsü açık' : 'Gün/gece döngüsü kapalı');
      persist();
      sync();
    },
    toggleThermal() {
      state.thermal = !state.thermal;
      renderer.setViewMode?.(state.thermal ? 'thermal' : 'normal');
      announce(state.thermal ? 'Termal görünüm açık' : 'Termal görünüm kapalı');
      sync();
    },
```

- `dispatch`: `case 'toggleThermal': return actions.toggleThermal();`

- [ ] **Adım 5: HTML ve CSS**

`index.html`:

- Materyal bölümündeki `specimens` div'ini şununla değiştir:

```html
        <div class="picker-tabs" id="material-tabs" role="tablist" aria-label="Materyal kategorileri"></div>
        <div id="material-panel" role="tabpanel">
          <div class="specimens" id="material-picker" role="radiogroup" aria-labelledby="h-material"></div>
        </div>
```

- Simülasyon bölümünün `</section>` kapanışından sonra:

```html
      <section class="panel-section" aria-labelledby="h-ambient">
        <h2 class="section-title" id="h-ambient">Ortam</h2>
        <label class="field" for="ambient">
          <span class="field-label">Sıcaklık <output id="ambient-out" for="ambient">20 °C</output></span>
          <input type="range" id="ambient" min="-40" max="60" step="1" value="20">
        </label>
        <label class="toggle">
          <input type="checkbox" id="day-cycle">
          <span>Gün/gece döngüsü</span>
        </label>
        <p class="hint" data-stat="climate">–</p>
        <div class="button-row">
          <button type="button" class="btn" id="btn-thermal" aria-pressed="false">Termal görünüm <kbd>T</kbd></button>
        </div>
      </section>
```

- Başlıktaki `readout` içine, Hız'ın altına:

```html
        <div><dt>Ortam</dt><dd data-stat="ambient">–</dd></div>
        <div class="pointer-fine"><dt>İmleç</dt><dd data-stat="cursor">–</dd></div>
```

- Debug panelinde Materyal satırının altına:

```html
          <div><dt>İmleç °C</dt><dd data-stat="cursorTemp">–</dd></div>
```

- Yardım tablosuna:

```html
        <tr><th scope="row"><kbd>T</kbd></th><td>Termal görünüm</td></tr>
```

`css/controls.css` sonuna:

```css
/* Materyal seçici sekmeleri */
.picker-tabs {
  display: flex;
  gap: var(--space-1);
  margin-bottom: var(--space-2);
  overflow-x: auto;
  scrollbar-width: thin;
}

.picker-tab {
  flex: 0 0 auto;
  min-height: var(--control-height);
  padding: 0 var(--space-3);
  border: 1px solid var(--ink-600);
  border-radius: var(--radius-s);
  background: var(--ink-800);
  color: var(--bone-300);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.picker-tab:hover {
  color: var(--bone-100);
}

.picker-tab[aria-selected="true"] {
  border-color: var(--brass-600);
  background: var(--ink-700);
  color: var(--brass-400);
  font-weight: 600;
}

.picker-tab:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.specimen[hidden] {
  display: none;
}
```

`css/layout.css` sonuna:

```css
/* İmleç altı bilgisi yalnızca hassas işaretçide (fare, kalem) anlamlı. */
@media (pointer: coarse) {
  .pointer-fine {
    display: none;
  }
}
```

- [ ] **Adım 6: Kontroller**

`js/app/controls.js`:

- Import: `import { PICKER, CATEGORIES } from './catalog.js';`
- Numune kartlarından önce:

```js
  // Kategori sekmeleri (ARIA tablist): ok tuşları, Home/End; seçim otomatik (roving tabindex).
  const tabList = $('material-tabs');
  const tabPanel = $('material-panel');
  const tabs = new Map();
  const tabIds = CATEGORIES.map((c) => c.id);
  for (const c of CATEGORIES) {
    const tab = doc.createElement('button');
    tab.type = 'button';
    tab.id = `tab-${c.id}`;
    tab.className = 'picker-tab';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', 'material-panel');
    tab.textContent = c.label;
    tab.addEventListener('click', () => actions.setTab(c.id));
    tab.addEventListener('keydown', (e) => {
      const at = tabIds.indexOf(c.id);
      const next = { ArrowRight: tabIds[(at + 1) % tabIds.length], ArrowLeft: tabIds[(at - 1 + tabIds.length) % tabIds.length], Home: tabIds[0], End: tabIds[tabIds.length - 1] }[e.key];
      if (!next) return;
      e.preventDefault();
      actions.setTab(next);
      tabs.get(next).focus();
    });
    tabList.append(tab);
    tabs.set(c.id, tab);
  }
```

- `cards.set(p.key, { label, input });` satırını `cards.set(p.key, { label, input, category: p.category });` yap.
- `paintSwatch(swatch, p, palette)` (Görev 10'dan).
- Ortam bölümü:

```js
  // Ortam
  const ambient = $('ambient');
  const ambientOut = $('ambient-out');
  ambient.addEventListener('input', () => actions.setAmbient(Number(ambient.value)));
  const dayCycle = $('day-cycle');
  dayCycle.addEventListener('change', () => actions.setDayCycle(dayCycle.checked));
  const thermal = $('btn-thermal');
  thermal.addEventListener('click', () => actions.toggleThermal());
```

- `sync(state)` içindeki kart döngüsü ve eklemeler:

```js
      for (const [key, { label, input, category }] of cards) {
        const selected = key === state.material;
        label.dataset.selected = String(selected);
        input.checked = selected;
        label.hidden = category !== state.tab;
      }
      for (const [id, tab] of tabs) {
        const on = id === state.tab;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
      }
      tabPanel.setAttribute('aria-labelledby', `tab-${state.tab}`);
      ambient.value = String(state.ambient);
      ambientOut.textContent = `${state.ambient} °C`;
      dayCycle.checked = state.dayCycle;
      thermal.setAttribute('aria-pressed', String(state.thermal));
```

`js/main.js`:

- Import: `import { attachStats, formatStats, createRateMeter, formatClimate } from './app/stats.js';`
- `attachStats` geri çağırmasında `values` oluştuktan sonra, `if (debug)` bloğundan önce:

```js
  values.ambient = `${Math.round(s.ambient)} °C`;
  values.climate = formatClimate(s.dayCycle, s.dayPhase, s.ambient);
  const under = cursor ? sim.getCell(cursor.x, cursor.y) : null;
  values.cursor = under ? `${materialLabel(under.material)} · ${Math.round(under.temp)} °C` : '–';
```

- `if (debug)` bloğuna: `values.cursorTemp = under ? under.temp.toFixed(1) : '–';`

- [ ] **Adım 7: Testleri çalıştır ve tarayıcıda doğrula**

1. Çalıştır: `npm test`. Beklenen: PASS.
2. Playwright MCP ile sayfayı aç ve şunları kontrol et:
   - Sekmeler görünüyor. Ok tuşları sekmeler arasında geziyor. `M` Katı sekmesine geçip Metal'i seçiyor.
   - Ortam kaydırıcısı −20'ye çekilince gölün yüzeyi zamanla donuyor.
   - Gün/gece açılınca gökyüzü değişiyor.
   - `T` termal görünümü açıp kapatıyor.
   - Başlıkta Ortam ve İmleç değerleri güncelleniyor.
   - 360 px genişlikte yatay scroll yok; mobilde sekme şeridi kayıyor.
   - Konsol temiz.
3. Ekran görüntüsü al.

- [ ] **Adım 8: Changelog, DEVELOPMENT, commit**

`CHANGELOG.md`:

`### Added`:

```markdown
- Görünür **Ortam** bölümü: sıcaklık kaydırıcısı (−40…60 °C), gün/gece döngüsü onay kutusu, anlık durum ("Öğle · 28 °C") ve termal görünüm düğmesi (`T`).
- Başlıkta Ortam değeri. Fare ve kalemde imlecin altındaki materyal ve sıcaklık ("Su · 12 °C") görünür.
```

`### Changed`:

```markdown
- Materyal seçici sekmelere ayrıldı: Toz, Sıvı, Gaz, Katı, Araç. Ok tuşlarıyla gezilir; kısayolla seçilen materyalin sekmesi açılır.
```

`docs/DEVELOPMENT.md` → ilgili madde `[x]`.

```powershell
git add js/app/catalog.js js/app/app.js js/app/keyboard.js js/app/controls.js js/app/storage.js js/main.js index.html css/controls.css css/layout.css tests/app.test.js tests/app-modules.test.js CHANGELOG.md docs/DEVELOPMENT.md
git commit -m "Sekmeli materyal seçici, Ortam bölümü, termal görünüm düğmesi ve göstergeler"
git push -q origin main
```

---

### Task 12 (Görev 12): Çoğaltıcı — Görev 3'e taşındı

Çoğaltıcı ve Yutucu kullanıcı isteğiyle Görev 3'te uygulandı. Bu görevde yalnızca şunlar yapılır:

1. Sıcaklık alanı geldikten sonra kaynakların termal davranışını doğrula:
   - kopya doğuş sıcaklığıyla doğar (ör. lav 1150 °C)
   - yutulan hücre ortam sıcaklığına döner

   Testleri `tests/sources.test.js`'e ekle.
2. `docs/MATERIALS.md`'deki kaynak bölümündeki sayıları kodla eşitle.
3. `docs/DEVELOPMENT.md` → "Çoğaltıcı" maddesi zaten `[x]` ise dokunma.

```powershell
git add tests/sources.test.js docs/MATERIALS.md CHANGELOG.md
git commit -m "Kaynakların termal davranışı testleri"
git push -q origin main
```

---

### Task 13 (Görev 13): Buzul, Dökümhane, Mağara; volkan magması ve çoğaltıcısı

**Files:**
- Create: `js/scenes/glacier.js`, `js/scenes/foundry.js`, `js/scenes/cave.js`
- Modify: `js/scenes/volcano.js` (magma), `js/scenes/index.js` (kayıtlar ve sıra)
- Test: `tests/scenes.test.js`

**Interfaces:**
- Consumes:
  - `sim.setCell`, `sim.setTemp`, `sim.getCell`
  - `tools.js` (`frame`, `valueNoise`, `rect`, `disk`, `thickLine`, `fillColumns`, `isEmpty`)
  - `MAT.ICE`, `SNOW`, `METAL`, `MOLTEN_METAL`, `MAGMA`
- Produces: sahne kayıtları:
  - `{ id: 'glacier', name: 'Buzul', ambient: -15 }`
  - `{ id: 'foundry', name: 'Dökümhane', ambient: 20 }`
  - `{ id: 'cave', name: 'Mağara', ambient: 12 }`

  Seçicideki sıra: volcano, hourglass, oasis, glacier, foundry, cave, chaos, empty, benchmark (gizli).

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/scenes.test.js`:

- İlk testteki kimlik listesine `'glacier', 'foundry', 'cave'` ekle.
- Sona ekle:

```js
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
  for (let y = firstLake; y < 180; y++) if (cellType(sim, x, y) === MAT.WATER) {
    water = sim.getCell(x, y);
    break;
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

test('Mağara: göl ve lav cebi arasındaki duvar kalır; ısınan göl kenarından buhar yükselir', () => {
  const sim = load('cave', 'c', 320, 180);
  assert.ok(present(sim, MAT.WATER, MAT.LAVA, MAT.MAGMA, MAT.WOOD, MAT.OIL, MAT.SAND, MAT.STONE));
  const t = (() => {
    for (let k = 0; k < 4000; k++) {
      sim.step();
      if (countMaterial(sim, MAT.STEAM) > 0) return k;
    }
    return -1;
  })();
  assert.ok(t >= 0, 'kaplıca buharı oluşmadı');
  assert.ok(countMaterial(sim, MAT.MAGMA) > 0);
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
  const budget = () => cloners.reduce((s, [x, y]) => s + sim.getCell(x, y).life, 0);
  const start = budget();
  runTicks(sim, 3000);
  for (const [x, y] of cloners) assert.equal(sim.getCell(x, y).variant, MAT.LAVA, 'lavı öğrenmeli');
  assert.ok(budget() < start, 'kopya üretmeli');
});
```

Mevcut "her sahne farklı grid boyutlarında hatasız üretilir" ve "aynı (seed, W, H)" döngüleri yeni sahneleri otomatik kapsar.

- [ ] **Adım 2: Başarısız olduğunu gör**

Çalıştır: `node --test tests/scenes.test.js`
Beklenen: FAIL.

- [ ] **Adım 3: Buzul**

`js/scenes/glacier.js`:

```js
// Buzul: karla kaplı taş yamaçlar, yüzeyi donmuş bir göl (üstte buz, altında +4 °C su), bir yamaçtan
// göle uzanan metal çubuk ve taşın içinde magma ısıtmalı küçük bir lav cebi (üstü taşla kapalı baca).
// Ortam −15 °C (index.js). Zamanla baca çevresindeki kar erir, metal ısıyı iletir, göl yavaşça donar.
import { MAT } from '../engine/materials.js';
import { frame, valueNoise, rect, disk, fillColumns, isEmpty } from './tools.js';

const LAKE_TEMP = 4; // göl suyu ve altındaki zemin (°C)
const ICE_TEMP = -5;

export function glacier(sim, rng) {
  const { W, H, X, Y, S } = frame(sim);
  const noise = valueNoise(W, sim.seed, 'glacier-ground', 9);
  const lakeL = X(0.3);
  const lakeR = X(0.68);
  const surface = Y(0.56);
  const depth = Math.max(4, Math.round(H * 0.2));

  // Zemin profili: solda yüksek yamaç, ortada göl çanağı, sağda daha alçak yamaç.
  const top = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    const n = (noise[x] - 0.5) * H * 0.04;
    if (x <= lakeL) {
      const u = x / Math.max(1, lakeL);
      top[x] = H * 0.3 + u * (surface - H * 0.3) + n * (1 - u);
    } else if (x >= lakeR) {
      const u = (x - lakeR) / Math.max(1, W - 1 - lakeR);
      top[x] = surface + u * (H * 0.38 - surface) + n * u;
    } else {
      const u = (x - lakeL) / Math.max(1, lakeR - lakeL);
      top[x] = surface + depth * 4 * u * (1 - u);
    }
  }
  fillColumns(sim, top, H - 1, MAT.STONE);

  // Gölün altındaki zemin ılık (jeotermal); göl: üstte buz, altında su.
  const iceRows = Math.max(2, Math.min(3, Math.round(H * 0.012)));
  const warmDepth = Math.max(2, S(0.06));
  for (let x = lakeL + 1; x < lakeR; x++) {
    const bottom = Math.round(top[x]);
    for (let y = bottom; y < Math.min(H, bottom + warmDepth); y++) sim.setTemp(x, y, LAKE_TEMP);
    for (let y = surface; y < bottom; y++) {
      const ice = y < surface + iceRows;
      sim.setCell(x, y, ice ? MAT.ICE : MAT.WATER);
      sim.setTemp(x, y, ice ? ICE_TEMP : LAKE_TEMP);
    }
    if (rng.next() < 0.3) sim.setCell(x, surface - 1, MAT.SNOW); // buzun üstünde serpinti
  }

  // Yamaçlarda kar örtüsü.
  for (let x = 0; x < W; x++) {
    if (x >= lakeL - 1 && x <= lakeR + 1) continue;
    const y = Math.round(top[x]);
    const snowDepth = 1 + (rng.next() < 0.6 ? 1 : 0) + (S(0.01) > 1 ? 1 : 0);
    for (let k = 1; k <= snowDepth; k++) if (isEmpty(sim, x, y - k)) sim.setCell(x, y - k, MAT.SNOW);
  }

  // Metal çubuk: sol yamaçtan (içine gömülü) göl yüzeyinin üstüne uzanır.
  const barY = surface - 2;
  for (let x = Math.max(0, lakeL - S(0.1)); x <= Math.min(W - 1, lakeL + S(0.12)); x++) sim.setCell(x, barY, MAT.METAL);

  // Lav cebi ve baca: sağ yamacın altında, üstü 2 hücre taşla kapalı (ısı iletimle yüzeye çıkar).
  const vx = X(0.84);
  const vr = Math.max(1, S(0.025));
  const lavaR = vr + Math.max(1, S(0.02));
  const vy = Math.min(H - 2 - lavaR, Math.round(top[vx]) + Math.max(lavaR + 3, S(0.12)));
  disk(sim, vx, vy, lavaR, MAT.LAVA);
  disk(sim, vx, vy, vr, MAT.MAGMA);
  const chimneyTop = Math.round(top[vx]) + 2;
  if (chimneyTop < vy - lavaR) rect(sim, vx, chimneyTop, vx + (W > 150 ? 1 : 0), vy - lavaR, MAT.LAVA);
}
```

- [ ] **Adım 4: Dökümhane**

`js/scenes/foundry.js`:

```js
// Dökümhane: magma üstünde taş pota ve içinde erimiş metal; potanın yarığından inen, önceden ısıtılmış
// eğimli taş oluk (ortası metal kiriş), basamaklı üç taş kalıp ve sonda su teknesi; zeminde metal külçeler.
// Metal kalıplarda soğuyup katılaşır; potada kalan metal magma üstünde kızgın ama katı kalır (1200 < 1300 °C).
import { MAT } from '../engine/materials.js';
import { frame, rect, thickLine } from './tools.js';

const CHANNEL_TEMP = 1200; // önceden ısıtılmış oluk: metal yolda donmasın (taş 1500 °C'de erir)

export function foundry(sim) {
  const { W, H, X, Y, S } = frame(sim);
  const floor = Y(0.9);
  rect(sim, 0, floor, W - 1, H - 1, MAT.STONE);

  // Pota: taş duvarlar 2 hücre; iç genişlik pw, iç yükseklik ph.
  const px0 = X(0.05);
  const pw = Math.max(4, X(0.14));
  const ptop = Y(0.2);
  const ph = Math.max(4, Y(0.2));
  const px1 = px0 + pw + 3; // sağ duvarın dış sütunu
  const pbot = ptop + ph; // tabanın ilk satırı
  rect(sim, px0, ptop, px0 + 1, pbot + 1, MAT.STONE);
  rect(sim, px1 - 1, ptop, px1, pbot + 1, MAT.STONE);
  rect(sim, px0, pbot, px1, pbot + 1, MAT.STONE);
  rect(sim, px0, pbot + 2, px1, floor - 1, MAT.STONE); // kaide
  rect(sim, px0 + 2, pbot + 2, px1 - 2, Math.min(floor - 1, pbot + 1 + Math.max(2, S(0.04))), MAT.MAGMA);
  rect(sim, px0 + 2, ptop + 1, px1 - 2, pbot - 1, MAT.MOLTEN_METAL);
  const spoutY = ptop + Math.floor(ph / 2);
  rect(sim, px1 - 1, spoutY, px1, spoutY + 1, MAT.EMPTY); // yarık

  // Oluk: yarığın altından 1:2 eğimle aşağı; ortası metal kiriş. Önceden ısıtılmış.
  const c0x = px1 + 1;
  const c0y = spoutY + 2;
  const c3x = px1 + Math.max(4, X(0.16));
  const c3y = c0y + Math.round((c3x - c0x) / 2);
  const c1x = Math.round(c0x + (c3x - c0x) / 3);
  const c2x = Math.round(c0x + (2 * (c3x - c0x)) / 3);
  const cy = (x) => c0y + Math.round((x - c0x) / 2);
  thickLine(sim, c0x, c0y, c1x, cy(c1x), MAT.STONE, 2);
  thickLine(sim, c1x, cy(c1x), c2x, cy(c2x), MAT.METAL, 2);
  thickLine(sim, c2x, cy(c2x), c3x, c3y, MAT.STONE, 2);
  for (let x = c0x - 1; x <= c3x + 1; x++) {
    for (let y = cy(Math.min(Math.max(x, c0x), c3x)) - 1; y <= cy(Math.min(Math.max(x, c0x), c3x)) + 1; y++) {
      if (sim.getCell(x, y)?.material === MAT.STONE) sim.setTemp(x, y, CHANNEL_TEMP);
    }
  }

  // Basamaklı kalıplar: her biri doldukça sağa, bir alttakine taşar (sol duvar 2 hücre yüksek).
  const mw = Math.max(5, X(0.1));
  const md = Math.max(3, S(0.05));
  let L = c3x - 2;
  let R = c3y + 3; // kalıp ağzı satırı
  for (let k = 0; k < 3; k++) {
    rect(sim, L, R - 2, L, R + md + 1, MAT.STONE); // sol duvar (yüksek)
    rect(sim, L + mw + 1, R, L + mw + 1, R + md + 1, MAT.STONE); // sağ duvar
    rect(sim, L, R + md + 1, L + mw + 1, R + md + 1, MAT.STONE); // taban
    L += mw - 1;
    R += md + 3;
  }

  // Su teknesi (son kalıbın taşma noktasının altında).
  const tw = mw + 4;
  const tTop = Math.min(R, floor - 3);
  const tBottom = Math.min(floor - 1, tTop + 3 * md);
  rect(sim, L, tTop - 2, L, tBottom, MAT.STONE);
  rect(sim, L + tw + 1, tTop, L + tw + 1, tBottom, MAT.STONE);
  rect(sim, L, tBottom, L + tw + 1, tBottom, MAT.STONE);
  if (tBottom - 1 >= tTop + 1) rect(sim, L + 1, tTop + 1, L + tw, tBottom - 1, MAT.WATER);

  // Zeminde metal külçeler.
  const ingotW = Math.max(2, S(0.03));
  for (let k = 0; k < 3; k++) {
    const x = px1 + 2 + k * (ingotW + 1);
    if (x + ingotW < c3x) rect(sim, x, floor - 2, x + ingotW - 1, floor - 1, MAT.METAL);
  }
}
```

- [ ] **Adım 5: Mağara**

`js/scenes/cave.js`:

```js
// Mağara: neredeyse tamamen taş bir dünya; value noise ile oyulmuş ana tünel ve bir oda, yüzeye açılan
// baca, en alçak odada yeraltı gölü, 2 hücrelik taş duvarın ardında magma ısıtmalı lav cebi (kaplıca
// buharı), tavandan sarkıtlar, odun maden destekleri, taşın içinde yağ cebi ve kum birikintisi.
// Alt proje 2'nin patlatma/kazı sahnesi olacak. Ortam 12 °C (index.js).
import { MAT } from '../engine/materials.js';
import { frame, valueNoise, rect, disk, thickLine } from './tools.js';

export function cave(sim, rng) {
  const { W, H, X, Y, S } = frame(sim);
  rect(sim, 0, 0, W - 1, H - 1, MAT.STONE);
  const empty = (x, y) => sim.getCell(x, y)?.material === MAT.EMPTY;

  // Ana tünel: gürültülü orta çizgi ve yükseklik.
  const mid = valueNoise(W, sim.seed, 'cave-mid', 6);
  const tall = valueNoise(W, sim.seed, 'cave-tall', 9);
  const center = new Int32Array(W);
  const half = new Int32Array(W);
  for (let x = 0; x < W; x++) {
    center[x] = Math.round(H * (0.4 + (mid[x] - 0.5) * 0.2));
    half[x] = Math.max(2, Math.round(S(0.05) + tall[x] * S(0.05)));
    rect(sim, x, center[x] - half[x], x, center[x] + half[x], MAT.EMPTY);
  }

  // Yüzeye açılan baca.
  const sx = X(0.14);
  const sw = Math.max(1, S(0.02));
  rect(sim, sx - sw, 0, sx + sw, center[sx], MAT.EMPTY);

  // Göl odası (en alçak) ve tünele bağlantısı; göl odanın alt yarısında.
  const lx = X(0.58);
  const ly = Y(0.72);
  const lr = Math.max(3, S(0.11));
  disk(sim, lx, ly, lr, MAT.EMPTY);
  thickLine(sim, lx, ly - lr, lx - Math.round(lr / 2), center[lx - Math.round(lr / 2)], MAT.EMPTY, Math.max(2, S(0.03)));
  for (let y = ly; y <= ly + lr; y++) {
    for (let x = lx - lr; x <= lx + lr; x++) if (empty(x, y) && y > center[x] + half[x]) sim.setCell(x, y, MAT.WATER);
  }

  // Lav cebi: gölün sağında, arada en az 2 hücre taş.
  const pr = Math.max(2, S(0.04));
  const pxc = Math.min(W - 2 - pr, lx + lr + 3 + pr);
  const pyc = ly + Math.round(lr / 3);
  disk(sim, pxc, pyc, pr, MAT.LAVA);
  disk(sim, pxc, pyc, Math.max(1, Math.floor(pr / 2)), MAT.MAGMA);

  // Yan oda (tünelin altında) ve tabanında kum.
  const ax = X(0.34);
  const ar = Math.max(2, S(0.07));
  const ay = center[ax] + half[ax] + Math.round(ar * 0.6);
  disk(sim, ax, ay, ar, MAT.EMPTY);
  for (let y = ay + Math.round(ar / 2); y <= ay + ar; y++) for (let x = ax - ar; x <= ax + ar; x++) if (empty(x, y)) sim.setCell(x, y, MAT.SAND);

  // Sarkıtlar (tünel tavanından).
  const step = Math.max(4, S(0.07));
  for (let x = X(0.2); x < X(0.95); x += step) {
    const len = 2 + Math.floor(rng.next() * Math.max(1, S(0.04)));
    const y0 = center[x] - half[x];
    for (let k = 0; k < len; k++) {
      const w = Math.floor((len - k - 1) / 2);
      for (let dx = -w; dx <= w; dx++) if (empty(x + dx, y0 + k)) sim.setCell(x + dx, y0 + k, MAT.STONE);
    }
  }

  // Odun maden destekleri: iki dikme ve tavan kirişi.
  const gap = Math.max(3, S(0.05));
  for (const f of [0.45, 0.8]) {
    const x0 = X(f);
    const x1 = Math.min(W - 1, x0 + gap);
    for (const x of [x0, x1]) {
      for (let y = center[x] - half[x] + 1; y <= center[x] + half[x]; y++) if (empty(x, y)) sim.setCell(x, y, MAT.WOOD);
    }
    const beamY = Math.max(center[x0] - half[x0], center[x1] - half[x1]) + 1;
    for (let x = x0; x <= x1; x++) if (empty(x, beamY)) sim.setCell(x, beamY, MAT.WOOD);
  }

  // Taşın içinde kapalı yağ cebi.
  disk(sim, X(0.3), Y(0.86), Math.max(1, S(0.03)), MAT.OIL);
}
```

- [ ] **Adım 6: Volkan magması ve kayıtlar**

`js/scenes/volcano.js` → magma odası `disk(...LAVA)` satırının altına:

```js
  // Magma kaynağı: odanın alt yarısında sabit 1200 °C (oda lavı sıvı kalır; alt proje 2'de basınç).
  disk(sim, cxi, chamberY + Math.max(1, Math.floor(chamberR / 2)), Math.max(1, Math.floor(chamberR / 3)), MAT.MAGMA);
```

Aynı dosyada, "Sağ kenardaki yarık" döngüsünün hemen altına:

```js
  // Çoğaltıcı: yarığın tabanında iki hücre. Çevresindeki lavı öğrenir; yarıktan lav aktıkça boşalan
  // bitişik hücreleri doldurur (hücre başına 1000 kopya, sonra durur). Basınç olmadığı için dolu odanın
  // dibine değil buraya konur: orada boş komşusu olmaz ve üretim yapamazdı (alt proje 2'de basınç).
  for (const dx of [Math.max(2, vent + 1), Math.max(3, vent + 2)]) sim.setCell(cxi + dx, plateauY + 2, MAT.CLONER);
```

Çoğaltıcı yalnızca bitişik hücrelere yazar. Satırı `plateauY + 2` olduğu için lav en fazla `plateauY + 1`'e, yani krater çanağının ilk satırına çıkabilir. Plato yüzeyini (`plateauY`) aşıp sol yamaca taşamaz. Mevcut "Volcano lavı yalnızca sağ yarıktan taşar" testi (7 boyut × 4 seed) bunu doğrular.

`js/scenes/index.js`:

- Import'lar:

```js
import { glacier } from './glacier.js';
import { foundry } from './foundry.js';
import { cave } from './cave.js';
```

- Oasis kaydından sonra:

```js
  { id: 'glacier', name: 'Buzul', ambient: -15, generate: glacier },
  { id: 'foundry', name: 'Dökümhane', ambient: 20, generate: foundry, hint: 'Erimiş metal kalıplara akıyor; Isıt fırçası (H) potadakini yeniden eritir.' },
  { id: 'cave', name: 'Mağara', ambient: 12, generate: cave },
```

- [ ] **Adım 7: Testleri çalıştır ve ayarla**

1. Çalıştır: `npm test`. Beklenen: PASS, üretim süresi testi (< 250 ms) dahil.
2. Dökümhane testi kalırsa şu sırayı izle:
   - Önce `CHANNEL_TEMP` değerini (≤ 1400) artır.
   - Sonra kalıp boyutlarını küçült.

   Testin eşiklerini gevşetme.
3. Mağara testinde buhar çıkmıyorsa duvar kalınlığını 2'de tut; lav cebinin yarıçapını artır.

- [ ] **Adım 8: Tarayıcıda gözle kontrol**

Her yeni sahneyi `?scene=glacier`, `?scene=foundry` ve `?scene=cave` ile aç. Her birinin ekran görüntüsünü al ve `docs/screenshots/strata-<id>.png` olarak kaydet.

Beklenenler:

- **Buzul:** göl yüzeyi buz, baca çevresinde kar zamanla eriyor.
- **Dökümhane:** metal oluktan kalıplara akıyor, kiriş kızarıyor, teknede buhar var.
- **Mağara:** gölün lav tarafı kaynıyor, buhar tünelde yükseliyor.

- [ ] **Adım 9: Changelog, DEVELOPMENT, commit**

`CHANGELOG.md` → `### Added`:

```markdown
- Yeni sahneler:
  - **Buzul** (−15 °C): karlı yamaçlar, donmuş göl ve altında ılık su, metal çubuk, magma ısıtmalı baca.
  - **Dökümhane**: potadaki erimiş metal ısıtılmış oluktan basamaklı kalıplara akıp katılaşıyor; sonda su teknesi.
  - **Mağara** (12 °C): tüneller, yeraltı gölü, lav cebinin ısıttığı kaplıca buharı, sarkıtlar, maden destekleri.
- Volkanın magma odasına sabit sıcaklıklı magma kaynağı eklendi; oda lavı artık zamanla tamamen katılaşmıyor.
- Volkanın krater yarığına iki çoğaltıcı eklendi. Volkan yaklaşık 2000 hücrelik ek lav akıtıp duruyor.
```

`docs/MATERIALS.md`: sahnelerde kullanılan kaynakları (Magma, Çoğaltıcı) ilgili satırlarda "Mevcut" olarak işaretle.

`docs/DEVELOPMENT.md` → ilgili madde `[x]`.

```powershell
git add js/scenes/glacier.js js/scenes/foundry.js js/scenes/cave.js js/scenes/volcano.js js/scenes/index.js tests/scenes.test.js docs/screenshots docs/MATERIALS.md CHANGELOG.md docs/DEVELOPMENT.md
git commit -m "Buzul, Dökümhane ve Mağara sahneleri; volkana magma kaynağı ve çoğaltıcı"
git push -q origin main
```

---

### Task 14 (Görev 14): Performans, dokümanlar, 0.10.0 sürümü

**Files:**
- Modify: `docs/DECISIONS.md` (ADR-003 notu, ADR-014, ADR-015)
- Modify: `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md`, `README.md`
- Modify: `docs/superpowers/specs/2026-09-30-sicaklik-sistemi-design.md` (§3.2 son değerler)
- Modify: `CHANGELOG.md` (`[0.10.0]`), `package.json` (0.10.0), `js/config.js` (`APP_VERSION`), `js/app/releases.js` (0.10.0 notları)

**Interfaces:**
- Consumes: tüm görevler.
- Produces: 0.10.0 sürümü. `tests/releases.test.js` sürüm senkronunu doğrular.

- [ ] **Adım 1: Performansı ölç**

1. Çalıştır: `node tools/bench.js` ve `node tools/soak.js`.
2. Beklenenler:
   - 400×225 medyan ≤ 0,858 + 0,6 = 1,46 ms
   - soak testinde bellek sabit ve değişmezler temiz
3. Hedef aşılırsa, spec §10'daki sırayla ilerle:
   1. `SLEEP_EPS` değerini ve eşik adayı taramasını ayarla.
   2. Yetmezse difüzyonu iki tick'te bir, iki kat katsayıyla çalıştır. Bu durumda `K/C ≤ 0,125` doğrulaması eklenir.

   Her denemeyi benchmark log'a yaz.

- [ ] **Adım 2: Dokümanlar**

`docs/DECISIONS.md`:

- ADR-003 başlığının altına: `- **Durum:** Yerini ADR-014 aldı (0.10.0).`
- Sona iki kayıt ekle:

```markdown
## ADR-014 — Tam çözünürlüklü sıcaklık alanı, ayrı ısı geçişi

- **Karar:** Her hücrede `Float32` sıcaklık (°C) tutulur; değer parçacıkla birlikte taşınır. Tick'in 3. geçişi (`heat.js`) şunları yapar:
  - 4 komşulu, çift tamponlu (Jacobi) difüzyon; `k = min(K_i, K_j)`
  - havanın ortama yaklaşması, kenarın ortam sıcaklığında tutulması
  - ısı kaynakları
  - uyuyan satırların atlanması
- **Neden:**
  - Buz, kar ve metal ısı iletimi gerektiriyor.
  - Çift tampon tarama yönü bias'ı üretmez; simetrik k enerjiyi korur; `K/C ≤ 0,25` kararlılığı derlemede doğrulanır.
  - Ölçüm: 400×225'te medyan tick artışı <ölçülen> ms.
- **Alternatif:** 4×4 kaba ısı ızgarası; mevcut `life` sayaçlarını genişletmek.
- **Sonuç:** Reddedildi. Kaba ızgara ince yapıları ve ısının maddeyle taşınmasını kaybeder. Sayaçlar iletimi hiç modellemez.
  - **Bilinçli yaklaşıklık:** uyuyan satırlar ±0,5 °C sapabilir.

## ADR-015 — Faz geçişlerinde gizli ısı: `life` üzerinde ilerleme sayacı

- **Karar:** Eşiği aşan hücrenin sıcaklığı eşikte sabitlenir. Fazla ısı (ΔT·C) `life`'ta birikir; materyalin gizli ısısına ulaşınca hücre dönüşür. Eşiğin gerisinde ilerleme yavaşça söner. Eşiklerde histerezis vardır (ör. donma −1 / erime +1).
- **Neden:**
  - Buz bir anda erimez, su kaynar, göl kat kat donar, lav kademeli kabuk bağlar.
  - Faz materyallerinde `life` başka bir iş için kullanılmıyor.
- **Alternatif:** Anlık eşik dönüşümü; ayrı bir entalpi alanı.
- **Sonuç:** Reddedildi.
  - Anlık dönüşüm titreşim üretir ve gerçekçi değildir.
  - Entalpi alanı ek bellek ve geçiş maliyeti getirir.
  - **Bilinen basitleştirme:** sönen ilerlemenin enerjisi geri verilmez.
```

`docs/ARCHITECTURE.md`:

- Veri modeli tablosuna `temp`/`tempNext` satırını ekle.
- Tick sırasına geçiş 3'ü ekle.
- Reaksiyon tablosundan sıcaklığa taşınan satırları çıkar; yerine bir "Termal kurallar" tablosu koy (materyal → eşik → hedef → gizli ısı).
- `climate.js` ve `heat.js` modüllerini modül listesine ekle.

`README.md`:

- Materyal listesine Buz, Kar, Metal ve Erimiş metali ekle.
- Kısayollar tablosuna `B`, `K`, `M`, `E`, `H`, `C`, `T` ve `F`'yi ekle.
- Yeni bir "Ortam ve sıcaklık" bölümü yaz:
  - kaydırıcı
  - gün/gece döngüsü
  - termal görünüm
  - Isıt ve Soğut fırçaları
- Sahne listesine Buzul, Dökümhane ve Mağarayı ekle; ekran görüntülerini bağla.
- "Bilinen sınırlamalar" bölümüne ekle: "Konveksiyon yok: sıcak hava yükselmez."

Spec §3.2 tablosunu plan başındaki sapma tablosuna göre güncelle. Ayrıca Görev 7, 8, 12 ve 13'te yapılan ek ayarlamaları yansıt.

`docs/MATERIALS.md` için son geçiş:

- Tüm "Planlandı (0.10.0)" etiketlerini "Mevcut (0.10.0)" yap.
- §3'ü ve §4.6'yı 0.10.0 davranışıyla birleştir. Eski sayaç kurallarını, sürüm notuyla birlikte "0.9.0'da böyleydi" alt başlığında koru; yeni ve eski tamamı belgeli kalsın.
- Her sayıyı kodla karşılaştır: `materials.js`, `reactions.js`, `heat.js`.

`docs/DEVELOPMENT.md`:

- Benchmark log'a son ölçümü yaz.
- Manuel test checklist'ine yeni maddeler ekle: ortam, gün/gece, termal, Isıt ve Soğut, 3 yeni sahne.
- "Performans, dokümanlar, 0.10.0 sürümü" maddesini `[x]` yap.

- [ ] **Adım 3: Sürümü yükselt**

1. `package.json` → `"version": "0.10.0"`
2. `js/config.js` → `APP_VERSION = '0.10.0'`
3. `js/app/releases.js` → dizinin başına:

```js
  {
    version: '0.10.0',
    date: '<bugünün tarihi, YYYY-MM-DD>',
    items: [
      'Sıcaklık: her hücrenin bir sıcaklığı var; ısı iletiliyor, su donuyor ve kaynıyor, lav yüzeyden kabuk bağlıyor.',
      'Ortam sıcaklığı kaydırıcısı ve isteğe bağlı gün/gece döngüsü; termal görünüm (T).',
      'Yeni materyaller: Buz, Kar, Metal ve Erimiş metal. Isıt (H) ve Soğut (C) fırçaları.',
      'Yeni sahneler: Buzul, Dökümhane ve Mağara. Kum saati yenilendi ve ters çevrilebiliyor (F).',
      'Çoğaltıcı (X): üstüne dökülen materyali 1000 kez çoğaltıp durur; volkan artık daha uzun süre lav akıtıyor.',
      'Materyal seçici sekmelere ayrıldı; başlıkta sürüm rozeti ve bu Yenilikler listesi.',
    ],
  },
```

4. `CHANGELOG.md` içinde `## [Unreleased]` başlığının altına yeni bir `## [0.10.0] - <bugünün tarihi>` başlığı aç ve Unreleased içeriğini onun altına taşı. `## [Unreleased]` boş kalır. Hedef sürüm paragrafını kaldır.

- [ ] **Adım 4: Tam test ve tarayıcı smoke testi**

1. Çalıştır: `npm test`. Beklenen: PASS, `tests/releases.test.js` sürüm senkronu dahil.
2. Playwright MCP ile her sahneyi (8 görünür sahne) sırayla aç ve her birinde 5 saniye çalıştır. Konsol temiz olmalı.
3. Rozet `v0.10.0` göstermeli ve işaretli olmalı; Yenilikler diyaloğu 0.10.0 maddelerini listelemeli.
4. 360×640 ve 1280×800 boyutlarında ekran görüntüsü al. README'deki ekran görüntülerini gerekirse yenile.

- [ ] **Adım 5: Commit, push ve CI kontrolü**

```powershell
git add -A
git status --short
git commit -m "0.10.0: sıcaklık sistemi, yeni materyaller ve sahneler; dokümanlar ve sürüm"
git push -q origin main
gh run list --limit 1
```

`git status --short` çıktısında beklenmeyen dosya olmamalı; `.claude/` zaten ignore'da.

Beklenen: CI (test ve deploy) başarılı. Başarısızsa `gh run view --log-failed` ile incele ve düzelt. `v1.0.0` etiketi kullanıcı onayı olmadan atılmaz.

---

## Self-Review notları

- **Spec kapsamı:**

| Spec bölümü | Görev |
|---|---|
| §2.1 veri | 4 |
| §2.2–2.4 geçiş ve uyku | 5 |
| §2.5–2.7 faz, tutuşma, buharlaşma, reaksiyonlar | 7 |
| §2.8 sabitler | 5, 7; sapmalar tabloda |
| §2.9 basınç bağlantısı | 7 (`emitSteam`) |
| §3 materyaller | 5, 7, 8 |
| §3.4 çoğaltıcı | 12; volkan kullanımı 13 |
| `docs/MATERIALS.md` (kullanıcı isteği) | 1 (senkron testi); 5, 7, 8, 10, 12, 13, 14 (güncelleme) |
| §4 iklim | 9 |
| §5.1 araçlar | 10 |
| §5.2 ters çevirme | 2 |
| §5.3 seçici | 8, 11 |
| §5.4 Ortam bölümü | 11 |
| §5.5 göstergeler | 11 |
| §5.6 sürüm rozeti | 1 |
| §5.7 tercihler | 1, 11 |
| §6 görseller | 6; gökyüzü 9 |
| §7 sahneler | 3, 12 |
| §8 hatalar | 4, 5, 7 |
| §9 testler | her görevde |
| §10 performans | 5, 13 |
| §11 dokümanlar | 13 |

- **Erimiş metal:** spec §6 ayrı bir rampa diyor. Plan, 1300 °C üstünde tam karışım veren genel akkorluk rampasını kullanır; görsel sonuç aynı. Görev 14 spec'i buna göre günceller.
- **Tip ve ad tutarlılığı:** aşağıdaki adlar görevler arasında aynı yazımla kullanılır:
  - `spawnTemp`, `setTemp`, `setAmbient`, `ambientBase`
  - `stepHeat`, `createHeatState`, `HEAT`
  - `emitSteam`, `TOOL_DELTA`
  - `categoryOf`, `CATEGORIES`
  - `fillThermal`, `THERMAL_LUT`, `setViewMode`
  - `dayPhase`, `dayWave`, `ambientAt`, `daylight`, `formatClimate`

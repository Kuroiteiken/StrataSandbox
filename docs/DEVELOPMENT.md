# Strata Sandbox — Geliştirme Takibi

Bu dosya projenin canlı geliştirme takibidir.

- Planın onaylı ilk hali: [PLAN.md](PLAN.md)
- Mimari: [ARCHITECTURE.md](ARCHITECTURE.md)
- Kararlar: [DECISIONS.md](DECISIONS.md)

## Kurallar

| İşaret | Anlamı |
| --- | --- |
| `[ ]` | Başlanmadı |
| `[~]` | Devam ediyor |
| `[x]` | Tamamlandı. Kod bitti ve test edildi. Test edilmeden `[x]` yapılmaz. |

- Her faz içinde test adımları bulunur. Testler sona bırakılmaz.
- Önemli her geliştirme [CHANGELOG.md](../CHANGELOG.md)'ye işlenir.
- Mimari değişirse [ARCHITECTURE.md](ARCHITECTURE.md) güncellenir. Önemli kararlar [DECISIONS.md](DECISIONS.md)'ye ADR olarak eklenir.
- Git akışı:
  - Çalışma `main` üzerinde yapılır.
  - Testler yeşilken uygun noktalarda commit ve push atılır.
  - Pages yayını GitHub Actions ile yapılır (`.github/workflows/pages.yml`).

**Komutlar:**

```text
npm test                 # tüm Node testleri (node --test)
npm run serve            # http://127.0.0.1:8080/  (sıfır bağımlılıklı yerel sunucu)
node tools/check-paths.js  # path büyük/küçük harf + root-absolute kontrolü
```

---

## Roadmap

### Phase 0 — Repository, iskelet ve dokümanlar

- [x] `git init` (`main`), `origin` = `github.com/Kuroiteiken/StrataSandbox`, uzak LICENSE (MIT) korunur
- [x] `.gitignore` (`.claude/settings.local.json`, `_site/` dahil)
- [x] `.claude/settings.json`:
  - [x] projeye özel plugin'ler, dil ve izinler
  - [x] JSON parse doğrulandı
- [x] `package.json` (`"type":"module"`, 0 dependency, `test`/`serve` script'leri)
- [x] `tools/serve.js`:
  - [x] sıfır bağımlılıklı statik sunucu
  - [x] doğru MIME tipleri, path traversal koruması, `no-store`
  - [x] test: `tests/serve.test.js`
- [x] `tools/check-paths.js`:
  - [x] import ve `src`/`href` harf büyüklüğü, eksik dosya ve root-absolute kontrolü
  - [x] test: `tests/imports.test.js`
- [x] `index.html` iskeleti (relative path'ler, module entry, canvas, panel yer tutucusu), `assets/favicon.svg`
- [x] `css/base.css` (tasarım token'ları, reset, geçici iskelet)
- [x] `js/config.js` (`APP_NAME = 'Strata Sandbox'`, `STORAGE_KEY`, sabitler), `js/main.js` (minimal)
- [x] `.github/workflows/pages.yml` (test → yalnızca uygulama dosyalarının Pages yayını)
- [x] `README.md`, `CHANGELOG.md`
- [x] `docs/PLAN.md`, `docs/DEVELOPMENT.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`
- [x] **Test:**
  - [x] `npm test` yeşil (13/13)
  - [x] Playwright MCP ile yerel sayfa: konsol hatası yok, yatay scroll yok
  - [x] İlk Pages yayını çalışıyor:
    - Actions başarılı.
    - `index.html`, `js/`, `css/` ve `assets/` 200 dönüyor; module'ler JavaScript MIME tipiyle sunuluyor.
    - `docs/` ve `tests/` yayında yok (404).

### Phase 1 — Simulation Core + görünür ilk dilim

- [x] `rng.js`: sfc32, cyrb128 seed hash, stream'ler, state kaydet/yükle
- [x] `world.js`: SoA array'ler, WALL padding, `index(x,y)`, `inBounds`
- [x] World primitive'leri: `set`, `swap`, `transform`, `clear` (tek yazma noktası) + materyal sayaçları (`counts`)
- [x] Stamp mekanizması (Uint16, taşmada fill ve 1'den başlama)
- [x] `materials.js`:
  - [x] tanım tablosu ve doğrulamalı derleyici (id aralığı, tekrar, kind)
  - [x] `DISPLACE` matrisi (Phase 1: yalnızca toz kuralları)
  - [x] ilk materyaller: EMPTY, WALL, SAND, STONE
- [x] `kernels.js`: `stepPowder`:
  - [x] aşağı ve rastgele sıralı köşegen hareket
  - [x] köşe sızıntısı kuralı
  - [x] stamp'li parçacığa girilmez (boş hücreye girmek serbest)
- [x] `simulation.js`:
  - [x] tick (geçiş 1 aşağıdan yukarı; geçiş 2 yeri hazır, gazlar Phase 2)
  - [x] tick XOR satır paritesi
  - [x] `step`, `play`/`pause`, `setSpeed`
  - [x] `update(dt, budget)`: tam sayı accumulator birimi, dt clamp, 8 tick sınırı, borç silme
  - [x] `resetTiming`, `setCell`/`getCell`, `clear`, `getStats`, `view.version`
- [x] Runtime assertion'lar (`debug: true` → her tick `checkInvariants`: kenar, tanımsız tip, sayaç tutarlılığı)
- [x] Minimal vertical slice:
  - [x] `main.js`
  - [x] `render/renderer.js` (minimal) + `render/palette.js`
  - [x] `app/loop.js`
  - [x] geçici `scenes/demo.js`
  - [x] sonuç: kum tarayıcıda düşüyor
- [x] **Test** (`npm test` → 86/86; mutasyon kontrolleriyle doğrulandı):
  - [x] RNG determinizmi, dağılım, state (`rng.test.js`)
  - [x] index ve padding (`world.test.js`)
  - [x] Sand boş alanda düşer; sütun birlikte iner; zeminde ve taşta durur (`physics.test.js`)
  - [x] Sand doğal yığın oluşturur; köşegen kayar; köşeden sızmaz
  - [x] Stamp: taşma testi; boş hücre istisnası (sütun testi). Parçacık çift hareketi Phase 2'de sıvı/gaz testiyle ele alınacak (bkz. karar notları).
  - [x] Pause'dayken `update` ilerlemez; `step` tam 1 tick çalıştırır (`simulation.test.js`)
  - [x] Hız ayarı `dt` başına doğru tick sayısını üretir (0.5×/1×/2×/4×)
  - [x] `dt` clamp, tick sınırı + borç silme, fizik bütçesi
  - [x] Kapalı kutuda kütle korunur
  - [x] Sol/sağ bias yok:
    - [x] köşegen tercih testi
    - [x] yarışan tanelerde tarama yönü testi
    - [x] dökülen yığın simetrisi
  - [x] Engine modülleri Node'da DOM'suz import edilir; `Math.random` stub'ı hiç tetiklenmez (`engine-purity.test.js`)
  - [x] 1000 tick sonunda grid hash'i tekrarlanabilir; farklı seed farklı hash üretir
  - [x] Palet paketleme ve endianness, tam sayı ölçek yerleşimi (`palette.test.js`, `render-layout.test.js`)
  - [x] Tarayıcı (Playwright MCP):
    - [x] konsol temiz
    - [x] 1× hızda 60 FPS / 60 TPS
    - [x] physics yaklaşık 0,5 ms, render yaklaşık 0,6 ms (240×135)
    - [x] 360 px'te yatay scroll yok
    - [x] resize'da grid korunuyor

### Phase 2 — Temel materyallerin hareket fiziği

- [x] `stepLiquid`:
  - [x] serbest düşüş (viskoziteden bağımsız)
  - [x] kalıcı yön bit'iyle köşegen
  - [x] dispersion taraması (yalnızca boş hücreler üzerinden, ilk dolu hücrede durur, altı açık hücrede durur)
  - [x] önü tıkanınca yön değiştirme
- [x] Water (dispersion 5), Oil (2, spread 0.6), Lava (1, spread 0.2, drag 0.9)
- [x] Toz→sıvı olasılıksal batma (`1 − drag`); sıvı–sıvı yoğunluk katmanlaşması; kum lavada batmaz
- [x] `stepGas` (ikinci geçiş, yukarıdan aşağı):
  - [x] yükselme, drift olasılığıyla köşegen, tavanda yatay kıpırdama
  - [x] Steam ve Fire hareketi
  - [x] dünyada gaz yoksa geçiş atlanır
- [x] Statikler: Stone, Wood, Glass, Plant
- [x] Yön bit'i spawn'da `spawnHash` ile dengeli tohumlanıyor (sim RNG'si tüketilmez); `transform` bit0'ı koruyor
- [~] Spawn anında materyale göre `life` başlatma → Phase 3'e taşındı (ömür ve zamanlayıcılar reaksiyonlarla birlikte anlam kazanıyor)
- [x] **Test** (`tests/fluids.test.js`, `tests/materials.test.js`; suite 120/120; mutasyonlarla doğrulandı):
  - [x] Sand su ve yağ içinden batar, lavada kalır
  - [x] Oil, Water'ın üstünde kalır (3000 tick, her sütunda)
  - [x] Steam ve Fire yükselir; gaz sütunu birlikte yükselir; su altındaki kabarcık yüzeye çıkar
  - [x] Kabarcık tick başına en fazla 1 hücre yükselir (Phase 1'den devreden çift hareket testi)
  - [x] Dam-break sonrası sütun yükseklik farkı ≤ 1
  - [x] Viskozite: su > yağ > lava; lava 40 tick'te ≤ 25 hücre
  - [x] Tek hücrelik duvardan tünel yok; çapraz köşeden sızıntı yok (sıvı ve gaz)
  - [x] Kenardaki sıvı çerçeveyi aşmaz (debug değişmezleri)
  - [x] Statikler yer değiştirmez
  - [x] Karışık kutuda her materyalin miktarı korunur
  - [x] Sağ/sol simetri:
    - [x] damla yönü dengesi (bölme duvarı)
    - [x] musluk simetrisi (birden çok seed)
  - [x] Tarayıcı (Playwright MCP): sıvılar, gazlar ve statikler görsel olarak doğru; değişmezler temiz
  - [x] Performans (Node): demo sahnesinde 240×135, yaklaşık 6,8k parçacık; medyan 0,26 ms/tick, p95 0,40 ms

### Phase 3 — Reaction System

- [x] `reactions.js`:
  - [x] tek sahip kuralı; tick başına rastgele tek komşu örneklemesi (ateş: 2)
  - [x] `become`/`vanish`/`ignite`, `initialLife`, tick başına ateş ve büyüme bütçeleri
- [x] Materyal tabloları: `REACTIVE`, `FLAMMABILITY`/`BURNS_INTO`, `LIFE_MIN`/`LIFE_SPAN`, `EMIT`/`DOUSE`/`ASH_CHANCE`/`EXTINGUISH_TO`, gaz `RISE`
- [x] Fire:
  - [x] ömür 10–26 tick
  - [x] tutuşturma
  - [x] Water → Steam ve sönme
  - [x] `rise` 0.65 (yakıtın yanında oyalanır)
- [x] BURNING_WOOD:
  - [x] yanma süresi 300–600 tick
  - [x] üstüne ateş üretme (tick başına dünya geneli 400 sınırı)
  - [x] yayılma
  - [x] suyla sönme → Wood
  - [x] sonunda %30 Ash, aksi halde boşluk
- [x] BURNING_PLANT (hızlı yanma), BURNING_OIL (akan yanan sıvı, ateşi besler)
- [x] Lava:
  - [x] Water → Steam + soğuma sayacı → Stone
  - [x] yanıcıları tutuşturma
  - [x] havayla temas edince yavaş kabuk bağlama
- [x] Sand ısınması → Glass
  - [x] lava kumu ısıtır, kum her tick 1 soğur (plandan sapma, bkz. karar notları)
- [x] Steam yoğuşma: ömür 240–480; %60 Water, aksi halde kaybolur
- [x] Plant:
  - [x] suyu tüketerek büyüme (bitki + su korunur)
  - [x] miras bütçe (12)
  - [x] tick başına en fazla 24 büyüme
- [x] Ash (hafif toz)
- [x] Spawn anında materyale göre `life` başlatma (Phase 2'den devreden)
- [x] **Test** (`tests/reactions.test.js`; suite 142/142; mutasyonlarla doğrulandı):
  - [x] Her reaksiyon izole senaryoda doğru sonucu verir:
    - [x] ateş sönmesi, odun tutuşması, tükenme, söndürme
    - [x] bitki ve yağ yangını
    - [x] lava + su, lava + odun
    - [x] kum → cam (kısa temasta cam yok), soğuma
    - [x] lava kabuğu; lava gölü sıvı kalır
  - [x] Plant büyümesi hem suyla (korunum) hem bütçeyle sınırlı; susuz büyüme yok
  - [x] Steam kapalı kutuda yoğuşur (bir kısmı su olarak döner)
  - [x] Kaynaksız Fire temizlenir
  - [x] 10k tick lava + su stabilitesi (parçacık sayısı artmaz, değişmezler temiz)
  - [x] Tek ateş tick başına en fazla 1 su buharlaştırır
  - [x] Yangın bir tick'te birden fazla sıra zincirlenmez (transform damgası)
  - [x] Reaksiyonlar deterministik
  - [x] Tarayıcı: kütük yanıp küle dönüyor, buhar yoğuşuyor, değişmezler temiz
  - [x] Performans (Node, demo): medyan 0,73 ms/tick, p95 1,15 ms

### Phase 4 — Renderer

- [ ] `palette.js`: renk rampaları → Uint32 LUT (endianness)
- [ ] `renderer.js`:
  - [ ] DPR (en fazla 2)
  - [ ] tam sayı ölçek + letterbox
  - [ ] katman birleştirme, `clientToCell`
  - [ ] açılışta grid boyutu hesaplama (hücre bütçesi)
- [ ] Dinamik renkler: fire, lava, yanma, ısınan kum
- [ ] `background.js`: gradyan, strata siluetleri, yıldızlar; cache'li
- [ ] `version` tabanlı "yalnızca değiştiyse yeniden doldur"
- [ ] **Test:**
  - [ ] LUT ve endianness
  - [ ] ölçek ve `clientToCell` matematiği
  - [ ] Renderer view'ı değiştirmez (hash)
  - [ ] MCP ekran görüntüsü, DPR 1 ve 2

### Phase 5 — Input / Brush / Undo

- [ ] `brush.js`: Circle/Square/Spray, `(dx,dy)` cache'i, kırpma, 4-connected interpolasyon
- [ ] `pointer.js`:
  - [ ] Pointer Events, capture, coalesced
  - [ ] `pointercancel` stroke'u bitirir
  - [ ] context menu kapalı, sağ tık Eraser
- [ ] Hemen uygulanan `paintLine` ve basılı tutmada `setHold`
- [ ] Replace modu (Shift + UI toggle); WALL korumalı
- [ ] Spray (`inputRng`)
- [ ] Snapshot undo; Clear geri alınabilir
- [ ] Brush preview; touch'ta gizli
- [ ] **Test:**
  - [ ] footprint
  - [ ] çizgide boşluk yok
  - [ ] undo hash eşitliği
  - [ ] allocation yok
  - [ ] replace ve WALL koruması
- [ ] **Manuel test:** mouse, touch, stylus

### Phase 6 — UI ve uygulama katmanı

- [ ] Semantik yapı, `layout.css`, `controls.css` (iskelet `base.css`'ten taşınır)
- [ ] `controls.js`:
  - [ ] material picker (numune kartları)
  - [ ] brush size ve shape
  - [ ] Play/Pause, Step, Speed, Clear
  - [ ] Scene, Seed, New Seed, Regenerate
  - [ ] Capture, Undo, Replace
- [ ] `keyboard.js`:
  - [ ] 1–0, G, Space, `.`, `[`, `]`
  - [ ] Ctrl/Cmd+Z, S, `+`/`−`, `?`
  - [ ] input'a odaklanınca kısayollar devre dışı
- [ ] `stats.js`: yaklaşık 400 ms throttle; `?debug=1` paneli
- [ ] `storage.js`: try/catch, şema doğrulama, clamp
- [ ] URL parametreleri: `?debug=1`, `?scene=`, `?seed=`; debug'da `window.__strata`
- [ ] Capture PNG
- [ ] **Test:**
  - [ ] storage stub
  - [ ] stats sıklığı
  - [ ] MCP smoke testleri
  - [ ] capture

### Phase 7 — Procedural Scenes

- [ ] `scenes/tools.js` (aritmetik value noise, şekil doldurma), `scenes/index.js`
- [ ] Volcano (default)
- [ ] Hourglass
- [ ] Oasis
- [ ] Chaos Lab
- [ ] Benchmark
- [ ] **Test:**
  - [ ] (seed, W, H) → aynı hash
  - [ ] Farklı seed → farklı hash
  - [ ] Çoklu grid boyutu
  - [ ] Hourglass akışı ve kum korunumu
  - [ ] Üretim süresi

### Phase 8 — Görsel efektler

- [ ] `glow.js`: ışık kaynağı buffer'ı, küçült-büyüt blur, `lighter`
- [ ] `ctx.filter` blur (geri okumayla doğrulanırsa, yalnızca HIGH)
- [ ] HIGH/MEDIUM/LOW + auto (histerezis)
- [ ] `prefers-reduced-motion`
- [ ] **Test:**
  - [ ] kalite başına render ms
  - [ ] auto düşürme ve geri alma
  - [ ] reduced motion
  - [ ] fizik hash'i kaliteden bağımsız

### Phase 9 — Mobil / Responsive / Accessibility

- [ ] Mobil layout
- [ ] `100dvh`, safe-area, `overscroll-behavior`
- [ ] ResizeObserver, DPR takibi
- [ ] Tablet breakpoint
- [ ] Erişilebilirlik:
  - [ ] klavye navigasyonu
  - [ ] focus
  - [ ] ARIA
  - [ ] kontrast
  - [ ] ≥ 44px dokunma hedefleri
- [ ] **Test:**
  - [ ] 360/768/1280/1920 genişliklerinde yatay scroll yok
  - [ ] resize'da state korunur
  - [ ] klavye erişimi
  - [ ] touch emülasyonu
- [ ] **Manuel test:** gerçek cihaz

### Phase 10 — Performance

- [ ] `tools/bench.js` + `npm run bench`
- [ ] Profil:
  - [ ] allocation yok
  - [ ] lokal typed array referansları
  - [ ] RNG inline
  - [ ] u32 eşikler
- [ ] Frame bütçesi, tick üst sınırı, mobil hücre bütçesi kalibrasyonu
- [ ] Active chunk kararı (ADR-005 eşikleri)
- [ ] **Test:**
  - [ ] benchmark karşılaştırması
  - [ ] chunk eklenirse fizik suite'i ve korunum

### Phase 11 — GitHub Pages

- [ ] Root-absolute URL taraması (`tools/check-paths.js`, CI'da)
- [ ] Favicon, meta, `theme-color`
- [ ] Yayındaki URL'de MCP smoke testi
- [ ] README'nin deployment bölümü

### Phase 12 — Final QA ve v1.0.0

- [ ] Tarayıcı ve cihaz manuel checklist'i
- [ ] 30 dakikalık uzun koşu
- [ ] Dokümanlar güncel
- [ ] Known Issues
- [ ] `v1.0.0` tag'i

---

## Karar notları (ruling log)

Uygulama sırasında plandan sapan ya da planın cevaplamadığı kararlar. Kalıcı olanlar DECISIONS.md'ye ADR olarak da girer.

- **2026-09-29 · Phase 0 — Pages yayını Actions workflow'u ile yapılıyor.**
  - Karar: Pages "workflow" modunda açıldığı için `main`/root yerine `pages.yml` kullanıldı.
  - Etkisi: yalnızca uygulama dosyaları yayınlanır ve testler yayını kapılar. `.nojekyll`'e gerek kalmadı.
  - Yanlışsa maliyeti: tek bir workflow dosyası.
- **2026-09-29 · Phase 0 — LICENSE uzak repodan alındı.**
  - Karar: uzak repodaki MIT lisansı (Nihat Tavsan) korundu; yerelde yazılan yer tutucu atıldı.
- **2026-09-29 · Phase 0 — `bench` script'i sonraya bırakıldı.**
  - Karar: `bench` script'i `tools/bench.js` ile birlikte eklenecek.
  - Neden: var olmayan bir dosyaya işaret eden script tuzak olur.
- **2026-09-29 · Phase 0 — Ad değişti.**
  - Karar: proje adı kullanıcı talebiyle **Strata Sandbox** oldu. `APP_NAME`, `<title>` ve README güncellendi.
- **2026-09-29 · Phase 0 — Git akışı değişti.**
  - Karar: kullanıcı talimatıyla `main`'de çalışılıyor ve sormadan push ediliyor. `.claude/settings.json`'daki push `ask` kuralı kaldırıldı.
- **2026-09-29 · Phase 0 — Tema sloganı kaldırıldı.**
  - Karar: kullanıcı talebiyle arayüzden ve dokümanlardan tema sloganı ifadeleri kaldırıldı. Alt başlık artık "materyal fiziği".
  - Görsel yön (renkler, tipografi, jeolojik katmanlar) değişmedi.
- **2026-09-29 · Phase 0 — Geçici iskelet `base.css`'te.**
  - Karar: geçici uygulama iskeleti (grid layout) şimdilik `base.css`'te duruyor; Phase 6'da `layout.css`'e taşınacak.

- **2026-09-29 · Phase 1 — Minimal renderer ve demo sahnesi.**
  - Karar: görünür dilimdeki çizim, atılacak kod olarak yazılmadı; doğrudan `render/renderer.js` ve `render/palette.js`'in minimal sürümü olarak yazıldı. Phase 4 bunları genişletecek.
  - Geçici demo `scenes/demo.js`'te duruyor; Phase 7'de gerçek sahneler gelince kaldırılacak.
- **2026-09-29 · Phase 1 — Accumulator birimi "ms × TPS".**
  - Karar: accumulator "ms × TPS" biriminde tutuluyor (1000 birim = 1 tick).
  - Neden: `1000/60` ile bölmek, 50 ms gibi değerlerde kayan nokta yüzünden 3 yerine 2 tick üretiyordu.
- **2026-09-29 · Phase 1 — Stamp istisnası: boş hücre.**
  - Karar: "bu tick'te stamp'lenmiş hücreye girilmez" kuralı boş hücreye uygulanmıyor.
  - Neden: aksi halde düşen bir sütunda üst taneler takılıyor (sütun testi). Kuralın asıl amacı, zaten hareket etmiş bir parçacığın ikinci kez yerinden edilmesini önlemek.
- **2026-09-29 · Phase 1 — Parçacık çift hareketi testi Phase 2'ye kaldı.**
  - Neden: yalnızca tozların olduğu aşağıdan yukarı taramada parçacık, taranmamış bir hücreye taşınamıyor; bu yüzden durum Phase 1'de oluşamıyor.
  - Test, yukarı itilen sıvı ve gazlarla Phase 2'de yazılacak.
- **2026-09-29 · Phase 1 — Kozmetik ton.**
  - Karar: `setCell` kozmetik tonu `hash(index, version)` ile üretiyor ve sim RNG'sini tüketmiyor.
  - Etkisi: boyama ve palet fizik dizisini değiştirmez.
- **2026-09-29 · Phase 1 — Değişmez kontrolü her tick'te.**
  - Karar: `?debug=1` modunda `checkInvariants` her tick çalışıyor. 240×135'te maliyeti düşük.
  - Grid büyürse örnekleme aralığı eklenebilir.

- **2026-09-30 · Phase 2 — Sıvılar gaz hücresine yatay giremez.**
  - Karar: sıvılar yalnızca boş hücreye yatay akar; sıvı↔gaz değişimi yalnızca dikeyde olur.
  - Neden: dipteki su kabarcıkla yana yer değiştirip onu stamp'liyordu. Üstteki su kabarcığa düşemiyor, kabarcık dipte hapsoluyordu (kabarcık testi kırmızıydı).
  - Yanlışsa maliyeti: gaz bulutuna yandan dayanan su bir tick gecikmeyle yayılır; gaz zaten yükselip çekilir.
- **2026-09-30 · Phase 2 — Köşegen kuralı tüm hareketli türlerde aynı.**
  - Karar: köşegen kuralı toz, sıvı ve gazda aynı: yan hücre STATIC ise köşegen yok. Yan hücre sıvı ya da toz olsa bile köşegene izin var.
  - Neden: yalnızca katı duvarlardaki çapraz boşluktan sızıntıyı önlemek hedefleniyor.
- **2026-09-30 · Phase 2 — Yön bit'i spawn hash'inden.**
  - Karar: sıvı yön bit'i `setCell`'de spawn hash'inin 8. bitinden alınıyor; `transform` bit0'ı koruyor (inceleme bulgusu #3).
  - Neden: bit hep 0 başlasaydı yeni sıvılar hep sola akar, kalıcı bias oluşurdu. Mutasyon testi bunu yakalıyor.
- **2026-09-30 · Phase 2 — `life` başlatma Phase 3'e taşındı.**
  - Neden: ömür ve zamanlayıcılar (Fire, Steam, yanma) reaksiyonlarla anlam kazanıyor. Phase 2'de `life` 0.
- **2026-09-30 · Phase 2 — Tarayıcı FPS ölçümü güvenilir değil.**
  - Gözlem: Playwright'ın açtığı pencere örtülü/arka planda olduğunda Chrome rAF'i ~1 Hz'e düşürüyor (ana thread boşta; saniyede 211 `setTimeout`).
  - Karar: fizik maliyeti Node'da ölçülüyor. Gerçek FPS ölçümü Phase 10 benchmark'ı ve manuel testle yapılacak.

- **2026-09-30 · Phase 3 — Kum ısınmasının sahibi lava.**
  - Karar: kumu lava ısıtıyor; kum yalnızca ucuz bir soğuma adımı yapıyor (tick başına −1, RNG'siz).
  - Plandaki hali: kumun kendisi lavayı yoklayacaktı.
  - Neden: büyük kum yığınlarının her tick rastgele komşu örneklemesi pahalı; lava hücreleri çok daha az. Tek sahip ilkesi korunuyor: ısıtma lavada, soğuma kumda (ayrı etkileşimler).
  - Yanlışsa maliyeti: oranların yeniden ayarlanması.
- **2026-09-30 · Phase 3 — Ateş tick başına 2 komşu örnekliyor; `rise` 0.65.**
  - Neden: tek örnekle, yağın hemen üstündeki bir kıvılcım yağı yalnızca 11/40 oranında tutuşturuyordu ("kolay tutuşmalı" gereksinimi karşılanmıyordu). Şimdi oran 27/40; fırça ise çok hücre bırakıyor.
  - Etkisi: ateş ilk kaynattığı suda söndüğü için "tick başına en fazla 1 buhar" özelliği korunuyor.
- **2026-09-30 · Phase 3 — Yanan yağ suyla sönmüyor.**
  - Karar: `douse: 0`.
  - Neden: yağ suyun üstünde yüzer ve yanmaya devam eder.
- **2026-09-30 · Phase 3 — Lava kabuk bağlıyor.**
  - Karar: havayla temas eden lava yavaşça soğuyor (tick başına örneklenen komşu hava ise %10 olasılıkla +1). Hava görmeyen lava gölü sıvı kalıyor.
  - Plandaki "izole lava yavaş soğur" maddesinin fiziksel karşılığı.
- **2026-09-30 · Phase 3 — Phase 2 testleri reaksiyonlara uyarlandı.**
  - "Sand lavanın üstünde kalır" testi artık cama dönüşmeye izin veriyor.
  - "Reaksiyonsuz karışım" testi reaktif lava ve buharı çıkarıp Ash ekliyor.

### Phase 0–1 bağımsız inceleme (2026-09-30)

Taze bağlamlı bir reviewer ajanı `ade40c2..f0956b6` aralığını inceledi. Critical bulgu çıkmadı.

**Düzeltilenler** (her biri önce kırmızı test, sonra yeşil; suite 92/92):

- `update(NaN)` fiziği kalıcı olarak durduruyordu.
  - Düzeltme: NaN, undefined ve negatif `dt` artık 0 sayılıyor.
  - Test: `NaN, undefined veya negatif dt fizik zamanlamasını bozmaz`.
- Kesirli koordinatla yapılan `setCell` materyal sayaçlarını bozuyordu.
  - Düzeltme: `inBounds` tam sayı koşulu arıyor.
  - Testler: `setCell ve getCell tam sayı olmayan koordinatları reddeder` ve `inBounds` testi.
- `onFrame` içindeki tek bir hata rAF döngüsünü öldürüyordu (reviewer: Minor; stabilite önceliği nedeniyle Important'a yükseltildi).
  - Düzeltme: `try/finally` ile yeniden planlama. `onFrame` içinde `stop()` çağrısı artık kalıcı oluyor.
  - Testler: `tests/loop.test.js`.
- Doküman uyumsuzlukları giderildi:
  - ADR-008'deki ifade `hash(index, version)` oldu.
  - `?debug=0` artık debug modunu açmıyor (`=== '1'`).

**Sonraki fazlara taşınanlar** (ilgili fazın ilk adımı olarak ele alınacak):

- **Phase 2:**
  - Sıvının kalıcı yön bit'i spawn ve transform sırasında 0 başlarsa kalıcı bir sol/sağ bias oluşur. Bit spawn anında kozmetik hash ile tohumlanacak (sim RNG'si tüketilmez); transform bit'i korumalı ya da rastgeleleştirmeli. Su musluğu simetri testiyle doğrulanacak.
- **Phase 2:**
  - Dispersion taraması girilemeyen ilk hücrede durmalı. Aksi halde 1 hücrelik padding'i aşıp önceki satırın iç hücresine sıçrar.
  - Test: `x = 0` ve `x = W−1` kenarlarında sıvı.
- **Phase 2:** Köşegen kuralı şu an yalnızca STATIC yan hücreyi reddediyor, planda ise "geçilebilir" diye tanımlanmıştı. Kural, sıvılar ve gazlar için de bilinçli olarak aynı tutulacak ya da genişletilecek; karar orada yazılacak.
- **Phase 4:** Renderer değişikliği yalnızca `version` ile takip ediyor. Aynı boyutta yeni bir `Simulation` gelirse eski kare kalabilir. `view` kimliği de takip edilecek; `computeLayout` resize'da cache'lenecek.
- **Phase 5:** Undo snapshot'ı `counts`'u da içermeli (ya da `World.recount()`). Aksi halde debug değişmezleri bozulur.

**Ertelenen minor'lar:**

- `tools/check-paths.js` kapsamı dar. Phase 11'den önce genişletilecek:
  - template-literal import, `new URL(…, import.meta.url)`, `fetch(`/`Worker(`
  - `.css` içindeki `url()`/`@import`, `srcset`, `.webmanifest` taranmıyor
  - `href="./"` yanlışlıkla eksik sayılıyor; yorumdaki import'lar da raporlanıyor
  - `serve.js` isteğe bağlı olarak tam harf eşleşmesi zorunlu kılabilir
- `pages.yml`:
  - `concurrency` ve Pages izinleri deploy job'una taşınabilir.
  - Deploy koşuluna `github.ref == 'refs/heads/main'` eklenebilir.
- Test boşlukları:
  - `js/engine` için statik kaynak taraması (`Math.random|document|window|localStorage|requestAnimationFrame`)
  - `serve.test.js`'e `%5c` (ters bölü) traversal vakası
- `getStats`'ta `tps` alanı yok (plandaki API'de var). Phase 6 stats paneliyle eklenecek.

---

## Manuel test checklist

Her fazın sonunda ilgili maddeler işaretlenir. Tam tur Phase 12'de yapılır.

**Masaüstü (Chrome / Firefox / Safari)**

- [ ] Sayfa açılıyor, konsol temiz
- [ ] Mouse ile çizim; hızlı çapraz hareketlerde çizgi kopmuyor
- [ ] Sağ tık geçici silgi; context menu açılmıyor
- [ ] Basılı tutunca materyal akmaya devam ediyor
- [ ] Tüm kısayollar çalışıyor, input alanındayken devre dışı kalıyor
- [ ] Pause / Step / hız değişimleri beklendiği gibi
- [ ] Undo son stroke'u geri alıyor
- [ ] Capture PNG indiriyor
- [ ] Pencere yeniden boyutlanınca dünya korunuyor

**Mobil / tablet (iOS Safari, Android Chrome)**

- [ ] 360px genişlikte yatay scroll yok
- [ ] Dokunmayla çizim; sayfa kaymıyor, pull-to-refresh tetiklenmiyor
- [ ] Rotasyonda dünya korunuyor
- [ ] Dokunma hedefleri rahat (≥ 44px)
- [ ] 30–60 FPS aralığında akıcı

**Erişilebilirlik**

- [ ] Yalnızca klavyeyle tüm kontrollere erişim
- [ ] Görünür focus
- [ ] Seçili materyal renkten bağımsız belli
- [ ] `prefers-reduced-motion` dekoratif hareketleri azaltıyor

---

## Benchmark log

Benchmark sahnesi (Phase 7) ve `tools/bench.js` (Phase 10) hazır olduğunda doldurulacak.

| Tarih | Commit | Makine / tarayıcı | Grid | Parçacık | ms/tick (median) | ms/tick (p95) | Not |
| --- | --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — | — | — |

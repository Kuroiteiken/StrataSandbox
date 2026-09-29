# Strata Sandbox — Geliştirme Takibi

Bu dosya projenin canlı geliştirme takibidir.
- Planın onaylı ilk hali: [PLAN.md](PLAN.md)
- Mimari: [ARCHITECTURE.md](ARCHITECTURE.md)
- Kararlar: [DECISIONS.md](DECISIONS.md)

## Kurallar

| İşaret | Anlamı |
|---|---|
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
- [ ] `rng.js`: sfc32, cyrb128 seed hash, stream'ler, state kaydet/yükle
- [ ] `world.js`: SoA array'ler, WALL padding, `index(x,y)` ve koordinat yardımcıları
- [ ] World primitive'leri: `set`, `swap`, `transform`, `clear` (tek yazma noktası) + materyal sayaçları
- [ ] Stamp mekanizması (Uint16, taşmada fill ve 1'den başlama)
- [ ] `materials.js`:
  - [ ] tanım tablosu ve derleyici (doğrulamalı)
  - [ ] `DISPLACE` matrisi
  - [ ] ilk materyaller: EMPTY, WALL, SAND, STONE
- [ ] `kernels.js`: `stepPowder` (aşağı, köşegen, köşe sızıntısı kuralı)
- [ ] `simulation.js`:
  - [ ] iki geçişli `tick()` ve alternating scan
  - [ ] `step`, `play`/`pause`, `setSpeed`
  - [ ] `update(dt, budget)`, `resetTiming`, `setCell`/`getCell`, `getStats`
- [ ] Runtime assertion'lar (DEBUG bayrağıyla: tip aralığı, WALL bütünlüğü)
- [ ] Minimal vertical slice:
  - [ ] `main.js`
  - [ ] minimal `render/renderer.js` + `render/palette.js`
  - [ ] `app/loop.js`
  - [ ] sonuç: kum tarayıcıda düşüyor
- [ ] **Test:**
  - [ ] RNG determinizmi
  - [ ] index ve padding
  - [ ] Sand boş alanda düşer
  - [ ] Sand doğal yığın oluşturur
  - [ ] Stamp çift hareketi engeller
  - [ ] Pause'dayken `update` ilerlemez
  - [ ] `step` tam 1 tick çalıştırır
  - [ ] Hız ayarı `dt` başına doğru tick sayısını üretir
  - [ ] `dt` clamp ve tick cap çalışır
  - [ ] Kapalı kutuda kütle korunur
  - [ ] Sol/sağ bias yok (birden çok seed)
  - [ ] Engine modülleri Node'da DOM'suz import edilir
  - [ ] `Math.random` stub'ı hiç tetiklenmez
  - [ ] 1000 tick sonunda grid hash'i tekrarlanabilir

### Phase 2 — Temel materyallerin hareket fiziği
- [ ] `stepLiquid`: düşme, köşegen, dispersion taraması, kalıcı yön bit'i, altı boş hücrede durma
- [ ] Water (5), Oil (2), Lava (1 + düşük yayılma olasılığı, serbest düşüş)
- [ ] Toz→sıvı olasılıksal batma; sıvı–sıvı katmanlaşma
- [ ] `stepGas` (ikinci geçiş): yükselme, yatay drift; Steam ve Fire hareketi
- [ ] Statikler: Stone, Wood, Glass, Plant
- [ ] Spawn anında materyale göre `life` başlatma
- [ ] **Test:**
  - [ ] Sand su ve yağ içinden batar
  - [ ] Oil, Water'ın üstünde kalır
  - [ ] Steam ve Fire yükselir
  - [ ] Dam-break sonrası su yüzeyi varyansı eşiğin altındadır
  - [ ] Çapraz duvardan sızıntı olmaz
  - [ ] Statikler yer değiştirmez
  - [ ] Kütle korunur
  - [ ] Sağ/sol simetri vardır

### Phase 3 — Reaction System
- [ ] `reactions.js`: `ignite`, `heat`, `cool`, `transform`, `spawnAbove`, rastgele tek komşu örnekleme
- [ ] Fire: ömür, sönme, tutuşturma, Water → Steam
- [ ] BURNING_WOOD:
  - [ ] yanma süresi, kararma
  - [ ] Fire üretimi (üst sınırlı), yayılma
  - [ ] suyla sönme
  - [ ] sonunda EMPTY ya da Ash
- [ ] BURNING_PLANT, BURNING_OIL
- [ ] Lava:
  - [ ] Water → Steam, soğuma sayacı → Stone
  - [ ] yanıcıları tutuşturma
  - [ ] izole lavanın yavaş soğuması
- [ ] Sand ısı birikimi → Glass
- [ ] Steam yoğuşma → Water
- [ ] Plant: su tüketerek büyüme, miras bütçe, global tick üst sınırı
- [ ] Ash
- [ ] **Test:**
  - [ ] Her reaksiyon izole senaryoda doğru sonucu verir
  - [ ] Plant büyümesi sınırlıdır
  - [ ] Steam kapalı kutuda yoğuşur
  - [ ] Kaynaksız Fire temizlenir
  - [ ] 10k tick lava+su stabilitesi
  - [ ] Hiçbir reaksiyon çift sayılmaz (oran testi)

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
|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | — |

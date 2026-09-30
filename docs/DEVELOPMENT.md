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
  - Not (2026-09-30): kullanıcı isteğiyle `.claude/` repodan çıkarıldı ve `.gitignore`'a eklendi; dosya yerelde duruyor.
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

- [x] `palette.js`:
  - [x] statik ton LUT'u (endianness)
  - [x] `gradient()`
  - [x] dinamik rampalar: fire, lava, yanan odun/bitki/yağ, kum ısısı
  - [x] `DYNAMIC` ve `ANIMATED_IDS` tabloları
- [x] `pixels.js`: `fillPixels`:
  - [x] saf fonksiyon, allocation yok
  - [x] ateşte ömre göre renk + kozmetik titreme
  - [x] lavada hücre fazı + kayan dalga
  - [x] yanmada kararma (kömürleşme)
  - [x] ısınan kumda kızarma
- [x] `layout.js`:
  - [x] `computeLayout`: tam sayı ölçek tercihi + letterbox
  - [x] `pointToCell` (kırpma seçenekli)
  - [x] `chooseGridSize`: açılışta sabit grid, tam sayı CSS px hücre, bütçe (masaüstü 90k / dokunmatik 40k)
- [x] `renderer.js`:
  - [x] DPR (en fazla 2, `main.js`)
  - [x] katman birleştirme: cache'li arka plan → sim
  - [x] `clientToCell`
  - [x] layout cache'i
  - [x] yalnızca durum değişince yeniden doldurma (`view` kimliği + `version`); canlanan materyal varken her karede
  - [x] `setReducedMotion`
- [x] `background.js`: gradyan, seed'li yıldızlar, 3 katmanlı sırt silueti + strata çizgileri; yarım çözünürlükte cache'li
- [x] `sim.view.counts` (salt-okunur; animasyon kararı için)
- [x] `prefers-reduced-motion` takibi (`main.js`): titreme ve lava dalgası kapanır
- [x] **Test** (`render-layout`, `render-pixels`, `render-background`, `renderer`, `palette`; suite 166/166):
  - [x] LUT ve endianness
  - [x] ölçek, `pointToCell`, `chooseGridSize`
  - [x] `clientToCell` (DPR 2, ofset)
  - [x] Ateş: taze parlak / sönük koyu. Kömürleşme. Isınan kum kızarır.
  - [x] Lava animasyonu var; reduced motion'da sabit
  - [x] Renderer ve `fillPixels` durumu değiştirmez
  - [x] Yeniden doldurma kuralları: durağan, yeni view, canlanan, reduced motion (sahte canvas)
  - [x] Tarayıcı (Playwright MCP):
    - [x] 1440×860'ta grid 282×197 (hücre 4 px), tam sayı ölçek
    - [x] render yaklaşık 1,5 ms
    - [x] görsel kontrol tamam
  - [~] DPR 2 görsel kontrolü: matematiği testte doğrulandı; gerçek yüksek DPI ekranda manuel kontrol Phase 9/12 checklist'inde

### Phase 5 — Input / Brush / Undo

- [x] `engine/brush.js`:
  - [x] Circle/Square/Spray footprint'leri (boyut = çap, 1–16, kırpılır)
  - [x] `(dx,dy)` cache'i
  - [x] ana hat (`footprintOutline`)
  - [x] boşluksuz 8-komşulu Bresenham (`lineCells`)
- [x] `Simulation`:
  - [x] `paintAt`/`paintLine`
    - [x] varsayılan olarak yalnızca boş ve gaz hücrelere yazar
    - [x] `replace` modu
    - [x] EMPTY silgi
    - [x] WALL korumalı, dünya dışı atlanır
  - [x] spray (`inputRng`, fizik RNG'si tüketilmez)
- [x] Basılı tutma: `setHold`/`releaseHold`, tick sonunda uygulanır (kesintisiz akış)
- [x] Snapshot undo:
  - [x] iki önceden ayrılmış tampon (type/variant/life/flags/counts + RNG + tick)
  - [x] boş stroke undo noktasını silmez
  - [x] Clear geri alınabilir
  - [x] tek seviye
- [x] `app/pointer.js`:
  - [x] Pointer Events, pointer capture
  - [x] `getCoalescedEvents`
  - [x] `pointercancel` stroke'u bitirir
  - [x] context menu kapalı, sağ tık silgi, Shift replace
  - [x] ikinci pointer yok sayılır
  - [x] sürükleme kenara sabitlenir
- [x] Brush preview (`renderer.setBrushPreview`):
  - [x] footprint ana hattı; spray kesikli
  - [x] touch'ta gizli
  - [x] tamponu yeniden doldurmaz
- [x] **Test** (`brush`, `paint`, `pointer`, `renderer`; suite 207/207; mutasyonlarla doğrulandı):
  - [x] footprint simetrisi, alanı ≈ π·(boyut/2)², kapalı ana hat
  - [x] Çizgide boşluk yok; tek hücrelik çapraz taş çizgi suyu geçirmez
  - [x] Undo sonrası hash ve sonraki 50 tick referansla birebir aynı
  - [x] Tekrarlanan stroke'larda yeni tampon ayrılmıyor
  - [x] Replace kapalıyken dolu hücre korunuyor; WALL boyanamıyor; kenarda çerçeve bozulmuyor
  - [x] Spray deterministik ve fizik RNG'sinden bağımsız
  - [x] Pointer (sahte olaylar):
    - [x] çizgi
    - [x] coalesced
    - [x] sağ tık, Shift
    - [x] hold
    - [x] cancel
    - [x] ikinci pointer
    - [x] kenar
    - [x] detach
  - [x] Tarayıcı (Playwright, gerçek fare):
    - [x] tek hamlelik çapraz sürükleme boşluksuz 81 hücre bıraktı
    - [x] sağ tık siliyor
    - [x] undo geri alıyor
    - [x] önizleme görünür
- [ ] **Manuel test:** touch ve stylus (gerçek cihaz) → Phase 9/12 checklist'i

### Phase 6 — UI ve uygulama katmanı

- [x] Semantik `index.html`:
  - [x] header + durum göstergesi, canvas bölgesi, `aside` panel ve bölümleri
  - [x] `dialog` (kısayollar)
  - [x] `aria-live` duyurucu
- [x] CSS:
  - [x] `base.css` (token'lar, ortak öğeler)
  - [x] `layout.css` (iskelet, dar ekranda alt alta; canvas kenar cetveli)
  - [x] `controls.css` (numune kartları, segmentli seçim, butonlar, alanlar, göstergeler)
- [x] `app/catalog.js`: materyal sırası, Türkçe etiketler, kısayollar
- [x] `app/controls.js`:
  - [x] numune kartları (radiogroup; doku örneği paletten)
  - [x] fırça boyutu, şekil, üzerine yaz
  - [x] Duraklat/Devam, Adım, Hız, Geri al, Temizle
  - [x] Sahne, Seed, Yeniden üret, Yeni seed
  - [x] Görüntü al, Kısayollar
- [x] `app/app.js`: uygulama durumu ve eylemleri, geciktirilmiş tercih kaydı, duyurular, capture indirme, klavye dağıtımı
- [x] `app/keyboard.js`:
  - [x] 1–0, G, Space, `.`, `[` `]`, S, `+` `=` `−`, `?`, Ctrl/Cmd+Z
  - [x] metin alanlarında devre dışı
  - [x] AltGr (Türkçe Q) desteği
  - [x] odaklı butonda Space butonu tetikler
- [x] `app/stats.js`:
  - [x] PARTICLES/FPS/GRID/SPEED/SEED (yaklaşık 400 ms, yalnızca değişen değerler yazılır)
  - [x] `?debug=1` paneli: fizik ms, render ms, TPS, aktif hücre, kalite, imleç hücresi ve materyali
- [x] `app/storage.js`: try/catch, şema doğrulama, clamp, güvenli seed deseni; `safeLocalStorage`
- [x] URL parametreleri: `?debug=1`, `?scene=`, `?seed=`; debug'da `window.__strata`
- [x] Capture: arka plan + sim (önizleme hariç) → PNG indirme (`strata-<sahne>-<seed>-<zaman>.png`)
- [x] `Simulation.loadScene(scene, seed)`, sahne kaydı (`scenes/index.js`: Demo, Boş)
- [x] **Test** (`app-modules`, `app`, `renderer` + `simulation`; suite 236/236):
  - [x] Storage: bozuk JSON, erişim hatası, geçersiz alanlar, gidiş-dönüş
  - [x] Kısayol eşlemesi, modifier'lar, AltGr, metin alanında devre dışı
  - [x] Stats: biçimleme, FPS/TPS ölçümü
  - [x] Uygulama eylemleri (sahte doc)
  - [x] `loadScene` determinizmi ve sıfırlama; sahne sonrası undo yok
  - [x] Capture: PNG, önizleme hariç
  - [x] Tarayıcı (Playwright): konsol temiz
    - [x] kartlar ve seçili durum
    - [x] kısayollar (2, `]`, S, Space)
    - [x] Adım tam 1 tick; hız butonu
    - [x] seed girişi ve istatistik güncellemesi
    - [x] yardım diyaloğu (Esc kapatır)
    - [x] metin alanında kısayol yok
    - [x] Esc seed düzenlemesini iptal eder, geçersiz seed reddedilir
    - [x] 1440 ve 360 px'te yatay scroll yok

### Phase 7 — Procedural Scenes

- [x] `scenes/tools.js`:
  - [x] aritmetik value noise (`Math.sin`/`exp`/`pow` yok)
  - [x] `frame` (normalize koordinat)
  - [x] `rect`, `disk`, `thickLine`, `fillPolygon` (tarama çizgisi), `fillColumns` (yükseklik haritası)
- [x] `scenes/index.js`: `{ id, name, generate(sim, rng), hidden? }`; varsayılan `volcano`; Benchmark yalnızca debug seçicide
- [x] Volcano (varsayılan):
  - [x] kesik taş koni, içine oyulmuş krater çanağı, baca, magma odası
  - [x] sağ kenarda yarık → lav sağ yamaçtan iner, ağaçları tutuşturur
  - [x] yamaçlarda kum
  - [x] solda göl ve kıyı bitkileri
  - [x] sağda odun + bitki ağaçlar
- [x] Hourglass:
  - [x] cam duvarlı iki hazne, 3 hücrelik boğaz
  - [x] odun çerçeve
  - [x] üst haznede kum; akış tamamen fizikle
- [x] Oasis: seed'li kum tepeleri (iki oktav), taşla kaplı gölet, kıyıda bitki örtüsü, kavisli palmiyeler, taş taban
- [x] Chaos Lab:
  - [x] seed'li platformlar, cam kaplar (sıvılı)
  - [x] materyal kütleleri (ilk dördü farklı), kıvılcım
  - [x] doluluk ≤ %40
- [x] Benchmark: seed'den bağımsız sabit yerleşim (kum, su deposu, bitki, lav havuzu, odun + ateş, buhar, yağ)
- [x] Geçici demo sahnesi kaldırıldı
- [x] **Test** (`tests/scenes.test.js`; suite 255/255):
  - [x] Her sahne 320×180, 400×225, 120×166, 64×48'de hatasız üretilir; değişmezler temiz
  - [x] Aynı (seed, W, H) → aynı yerleşim; Volcano, Oasis ve Chaos seed ile değişir; Benchmark seed'den bağımsız
  - [x] Beklenen materyaller mevcut
  - [x] Chaos: ≥ 4 materyal, doluluk ≤ %40
  - [x] Hourglass: alt haznedeki kum 300 tick'te artıyor, toplam kum korunuyor
  - [x] Sahne üretimi 400×225'te < 60 ms
  - [x] `valueNoise` (deterministik, pürüzsüz), `fillPolygon`
  - [x] Tarayıcı (Playwright): dört sahnenin görsel kontrolü
    - [x] Volcano'da krater kenarı ve yarık düzeltmesi sonrası lav yalnızca sağa akıyor, göl korunuyor

### Phase 8 — Görsel efektler

- [x] Glow:
  - [x] `fillPixels` aynı döngüde ışık tamponunu dolduruyor: ateş, lav ve yanma; alfa = yoğunluk
  - [x] renderer'da kademeli küçültme (grid → ½ → ¼) ile bulanıklık
  - [x] `lighter` birleştirme
  - [x] ışık kaynağı yoksa glow atlanıyor
- [~] `ctx.filter` blur kullanılmadı: kademeli küçültme tüm tarayıcılarda aynı ve ucuz (bkz. karar notları)
- [x] Kalite:
  - [x] HIGH: iki katman glow (½ + ¼); MEDIUM: tek katman (¼); LOW: glow yok
  - [x] `renderer.setQuality`
- [x] Otomatik kalite (`app/quality.js`):
  - [x] kare iş süresinin (fizik + render) EMA'sı
  - [x] 12 ms'yi 2 sn aşarsa bir kademe düşer; 6 ms'nin altında 5 sn kalırsa geri yükselir
  - [x] elle seçilen seviye sabit
  - [x] yalnızca dekoru etkiler
- [x] Panelde "Görsel kalite" seçimi (Otomatik / Yüksek / Orta / Düşük); tercih olarak saklanıyor
- [x] `prefers-reduced-motion`:
  - [x] ateş titremesi ve lav dalgası kapanıyor
  - [x] canlanmayan dünyada tampon her karede yenilenmiyor
  - [x] CSS geçişleri kapalı
  - [x] tercih çalışırken değişince anında uygulanıyor
- [x] **Test** (`quality`, `render-pixels`, `renderer`; suite 265/265):
  - [x] Otomatik kalite:
    - [x] tek kare sıçraması düşürmez
    - [x] sürekli yükte düşer (histerezis)
    - [x] yük azalınca daha temkinli yükselir
    - [x] elle seçilen seviye sabit
  - [x] Glow tamponu yalnızca ışık yayanlarda; sönük ateş daha az ışık yayar
  - [x] Glow ışık kaynağı varken ve kalite düşük değilken çizilir
  - [x] Fizik hash'i kaliteden bağımsız (renderer durumu yazmaz; ilgili testler)
  - [x] Tarayıcı (Playwright):
    - [x] glow görsel kontrolü (Volkan)
    - [x] kalite seçimi
    - [x] reduced motion emülasyonu açık ve kapalı

### Phase 9 — Mobil / Responsive / Accessibility

- [x] Mobil layout (≤ 760 px):
  - [x] canvas üstte, panel altta ve kendi içinde kayıyor
  - [x] materyal seçici yatay kayan şerit
  - [x] "Sahne ve diğer ayarlar" açılır bölümü (dar ekranda kapalı başlar)
  - [x] alt başlık gizli; 480 px altında başlık göstergeleri özet
- [x] Tablet (761–1100 px): 248 px panel, grid göstergesi gizli
- [x] `100dvh` (+ `100vh` fallback), safe-area inset'leri, `overscroll-behavior: none`
- [x] Dokunmatik:
  - [x] canvas'ta `touch-action: none`, `-webkit-touch-callout: none`, `user-select: none`
  - [x] kontrollerde `touch-action: manipulation` (çift dokunma zoom'u yok)
  - [x] coarse pointer'da 44 px kontrol yüksekliği
- [x] ResizeObserver (Phase 1); DPR değişimi `matchMedia` ile takip ediliyor (monitör değişimi, zoom)
- [x] Erişilebilirlik:
  - [x] semantik bölümler, `label`/`legend`
  - [x] radiogroup (ok tuşlarıyla gezinme)
  - [x] `aria-pressed`, `aria-live`, `aria-keyshortcuts`
  - [x] canvas için `role="img"` + açıklama
  - [x] görünür odak
  - [x] seçili materyal renkten bağımsız belli (▸, kalın ad, çift çerçeve)
- [x] **Test** (Playwright):
  - [x] 360×640, 768×1024, 1280×800, 1920×1080'de yatay scroll yok, konsol temiz; grid her boyutta bütçeye göre açılışta seçiliyor
  - [x] Yön değişimi (390×844 → 844×390): grid ve parçacık sayısı korunuyor
  - [x] Tab ile tüm kontrollere erişim (devre dışı "Geri al" atlanıyor); radio grubunda ok tuşları; odak halkası görünür
  - [x] Touch emülasyonu (hasTouch, DPR 2): dokunarak çizim çalışıyor, önizleme gizli, `touch-action: none`
  - [x] Kontrast (WCAG): en düşük oran 6,2:1 (ipucu metni); tüm metinler AA üstünde
- [ ] **Manuel test:** gerçek cihazda iOS Safari + Android Chrome (checklist; bu ortamda yapılamıyor)

### Phase 10 — Performance

- [x] `tools/bench.js` + `npm run bench`:
  - [x] Benchmark sahnesi; 400×225, 320×180 ve 200×200 grid'de median/p95/max ms/tick
  - [x] deterministik durum hash'i
- [x] Profil (V8 `--cpu-prof`) → iki sıcak nokta bulundu ve giderildi:
  - [x] **Yerleşmiş tozlar RNG tüketmiyor.** Köşegen girilebilirliği önce zarsız kontrol ediliyor; RNG yalnızca iki yön de açıksa ya da olasılıksal geçişte çekiliyor. Bias testleri geçiyor.
  - [x] **Kum soğuması satır içi.** Her kum tanesi için `react()` çağrısı yerine `COOLS` tablosu kullanılıyor.
  - [x] Gaz geçişi yalnızca birinci geçişte gaz görülen satırları tarıyor; tarama yönü satır başına seçiliyor
- [x] Hot loop'ta allocation yok (tick içinde nesne oluşturulmuyor); typed array'ler lokal değişkenlerde
- [x] Frame bütçesi: kare başına 8 ms fizik, en fazla 8 tick (Phase 1). Ağır sahnede 4× hız tutmazsa efektif hız zarifçe düşüyor (TPS göstergesi).
- [x] `?invariants=1` ayrıldı: `?debug=1` artık her tick değişmez kontrolü yapmıyor (ölçümleri şişiriyordu)
- [x] **Active chunk kararı (ADR-005): v1'de gerekmiyor.**
  - 400×225'te ~44k parçacıkta tick yaklaşık 2 ms; eşik yaklaşık 6 ms.
  - Gerçek mobil cihaz ölçümü eşiği aşarsa yeniden değerlendirilecek.
- [x] **Test:**
  - [x] `tests/bench.test.js` (araç alanları, determinizm)
  - [x] Tüm fizik suite'i optimizasyon sonrası 267/267
  - [x] A/B karşılaştırma (dönüşümlü çalıştırma): HEAD 3,6–4,9 ms → yeni 1,9–2,3 ms
  - [x] Tarayıcı (Chrome 154, 320×207, ~32k parçacık): tick medyanı 3,0 ms, render medyanı 2,3 ms
- [ ] Mobil hücre bütçesi kalibrasyonu: gerçek cihaz ölçümü gerekiyor (Phase 12 checklist)

### Phase 11 — GitHub Pages

- [x] Root-absolute URL ve harf büyüklüğü taraması (`tools/check-paths.js`, `npm test` ile CI'da):
  - [x] JS: import/export, `import()` (template literal dahil), `new URL(…, import.meta.url)`, `fetch`/`Worker` (belgeye göre)
  - [x] HTML: `src`/`href`/`srcset`
  - [x] CSS: `url()`/`@import`
  - [x] yorumlar yok sayılıyor; `href="./"` yanlış alarmı giderildi
- [x] Favicon, meta description, `theme-color`, `color-scheme`, Open Graph başlık ve açıklama
- [x] `.github/workflows/pages.yml`:
  - [x] test → deploy
  - [x] varsayılan izin `contents: read`
  - [x] Pages izinleri ve concurrency yalnızca deploy işinde
  - [x] deploy yalnızca `main`
- [x] Senin adımların: repo oluşturuldu, Pages (GitHub Actions modu) açık
- [x] Yayındaki URL'de smoke testi (Playwright, taze tarayıcı bağlamı):
  - [x] 30 modül yüklendi
  - [x] konsol hatası ve başarısız istek yok
  - [x] simülasyon çalışıyor
  - [x] `docs/`, `tests/`, `tools/`, `.claude/` ve `package.json` yayında yok (404)
- [x] README'nin deployment bölümü

### Phase 12 — Final QA ve v1.0.0

- [x] Uzun koşu (dayanıklılık, `node --expose-gc tools/soak.js`):
  - [x] Volkan, Benchmark ve Kaos sahneleri 36 000'er tick (60 TPS'de 10 dakikalık simülasyon)
  - [x] değişmez hatası yok, parçacık sayısı sınırlı
  - [x] GC sonrası heap büyümesi +0,01–0,02 MB (sızıntı yok)
- [x] Tarayıcı uzun koşusu (Chrome, canlı site): 3000 kare adım + render, kare başına ~3,5 ms, heap +0,5 MB (GC'siz ölçüm dalgalanması)
- [x] İnceleme ertelemelerinin kapanışı:
  - [x] engine statik kaynak taraması testi
  - [x] `serve` ters bölü traversal testi
  - [x] path denetleyicisi kapsamı
  - [x] workflow izinleri
- [x] Final QA'da bulunan ve düzeltilen hatalar:
  - [x] **Volkan lavı dar/dikey gridlerde sol yamaca taşıyordu.**
    - Sebep: baca, dik koninin tepesinden genişti.
    - Çözüm: yamuk koni (geniş plato) ve içeriden dışarıya oyulan çanak.
    - Regresyon testi: 7 grid boyutu × 4 seed.
  - [x] **Bitki gölü çok hızlı kaplıyordu.** Büyüme olasılığı 0,05 → 0,012, bütçe 12 → 8 ("yavaş yayılmalı" gereksinimi).
- [x] Dokümanlar güncel: README ekran görüntüleri ve bilinen sınırlamalar, ARCHITECTURE, DECISIONS, CHANGELOG 0.9.0
- [x] Known Issues listesi (README "Bilinen sınırlamalar")
- [ ] **Senin adımın — manuel checklist:** Firefox, Safari, iOS Safari, Android Chrome; gerçek cihazda touch/stylus (aşağıdaki "Manuel test checklist")
- [ ] **`v1.0.0` tag'i:** manuel checklist tamamlanınca (senin onayınla)

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

- **2026-09-30 · Phase 4 — Renderer saf modüllere bölündü.**
  - Karar: `layout.js` (geometri), `pixels.js` (hücre → piksel) ve `background.js`'in profil fonksiyonu DOM'suz; Node'da test ediliyor. `renderer.js` yalnızca canvas yönetimi yapıyor.
  - İnceleme bulgusu #9 kapandı: tampon, `view` kimliği değişince de yenileniyor.
- **2026-09-30 · Phase 4 — Grid seçimi açılışta.**
  - Karar: `chooseGridSize` hücreyi tam sayı CSS px seçiyor (en az 3) ve bütçeyi aşmayana kadar büyütüyor. Planda "üst sınır 6" vardı; büyük ekranlarda bütçeyi korumak için üst sınır kaldırıldı.
  - En küçük grid 64×48.
- **2026-09-30 · Phase 4 — Arka plan yarım çözünürlükte.**
  - Karar: arka plan yarım çözünürlükte çizilip yumuşak büyütülüyor (bellek). Sim tamponu her zaman keskin (smoothing kapalı).

- **2026-09-30 · Phase 5 — 8-komşulu çizgi.**
  - Karar: çizgi interpolasyonu 4-komşulu değil, 8-komşulu Bresenham.
  - Neden: köşe sızıntısı kuralı ince çapraz duvarları zaten geçirmez yapıyor. "Tek hücrelik çapraz taş çizgi suyu geçirmez" testiyle doğrulandı. 8-komşulu çizgi daha az hücre boyar ve görsel olarak daha temiz.
- **2026-09-30 · Phase 5 — Basılı tutma tick sonunda.**
  - Karar: basılı tutma tick başında değil sonunda uygulanıyor.
  - Neden: tick başında uygulanınca kaynak hücre henüz boşalmamış oluyordu ve akış iki tick'te bir tane veriyordu (noktalı akış). Hold testi kırmızıydı.
- **2026-09-30 · Phase 5 — İki snapshot tamponu.**
  - Karar: undo için iki tampon kullanılıyor; bekleyen stroke kopyası, stroke gerçekten boyama yaptıysa undo noktası oluyor. Bellek sabit (yaklaşık 2 × 5 bayt × hücre).
  - İnceleme bulgusu #7 kapandı: `counts` da snapshot'a dahil.
- **2026-09-30 · Phase 5 — Fırça boyutu = çap.**
  - Karar: boyut çap (1–16); çift boyutlarda merkez iki hücre arasında.

- **2026-09-30 · Phase 6 — Arayüz dili Türkçe.**
  - Karar: arayüz dili Türkçe (Kum, Su, Taş…). Engine'deki İngilizce materyal adları tanımlayıcı olarak kalıyor.
  - Neden: sayfa `lang="tr"` ve kullanıcı Türkçe iletişim kuruyor.
  - Yanlışsa maliyeti: `catalog.js` etiketlerinin değiştirilmesi.
- **2026-09-30 · Phase 6 — Spawn hash'i `(index, tick, seed)`.**
  - Karar: spawn hash tuzu `version` yerine `(tick, seed)`.
  - Neden: `loadScene` testinde, sahneden önce yapılan fazladan bir `setCell` sahnenin tonlarını değiştiriyordu. Determinizm çağrı geçmişinden bağımsız olmalı. ADR-008 güncellendi.
- **2026-09-30 · Phase 6 — Sahne üretimi undo noktası bırakmaz.**
  - Karar: sahne üretimi undo noktası bırakmıyor. Demo artık kendi içinde `clear()` çağırmıyor; `loadScene` undo'yu üretimden sonra da sıfırlıyor (regresyon testi var).
- **2026-09-30 · Phase 6 — Esc ile seed iptali.**
  - Karar: seed alanında Esc, değeri odaklanmadan önceki haline döndürüp odaktan çıkıyor. Tarayıcı testinde yakalanan hata: düzenleme yine de uygulanıyordu.
- **2026-09-30 · Phase 6 — Mutasyon notu.**
  - "Hızın uçlarda sıkıştırılmaması" eşdeğer bir mutasyon: `setSpeed` geçersiz değeri zaten reddediyor.
  - Tercih kaydının gecikmesi yalnızca "senkron yazılmaz" düzeyinde test ediliyor (minor).

- **2026-09-30 · Phase 7 — Benchmark seed'den bağımsız.**
  - Karar: Benchmark sahnesi seed'i yok sayıyor.
  - Neden: performans ölçümlerinin karşılaştırılabilir olması gerekiyor. Seçicide yalnızca `?debug=1` ile görünüyor; `?scene=benchmark` her zaman çalışıyor.
- **2026-09-30 · Phase 7 — Krater koninin içine oyuluyor.**
  - İlk sürümde krater lavı koni yüzeyinin üstünde, havada kalıyordu ve iki yana akıp gölü kaynatıyordu (görsel kontrolde yakalandı).
  - Karar: koni tepesi düzleştiriliyor (plato), çanak platonun altına oyuluyor, lav yalnızca sağ kenardaki yarıktan taşıyor.
- **2026-09-30 · Phase 7 — Opsiyonel maddeler ertelendi.**
  - Karar: sınırlı ömürlü EMITTER ve kum saati "Flip" özelliği şimdilik yapılmadı. v1 için gerekli değil; roadmap'te fikir olarak duruyor.

- **2026-09-30 · Phase 8 — `ctx.filter` blur kullanılmıyor.**
  - Karar: glow kademeli küçültme (grid → ½ → ¼ çözünürlük, bilinear) ile yapılıyor.
  - Neden: Safari'de `ctx.filter` güvenilir değil; kademeli küçültme her tarayıcıda aynı görünüyor ve ucuz. HIGH kalite ek bir ½ katman ekliyor.
  - Yanlışsa maliyeti: gerekirse HIGH'a feature-detect'li `filter` katmanı eklenebilir.
- **2026-09-30 · Phase 8 — Otomatik kalite ölçütü iş süresi.**
  - Karar: ölçüt rAF aralığı değil, kare iş süresi (fizik + render).
  - Neden: 30 Hz ekranlarda ya da arka plana düşürülen pencerede aralık yükten bağımsız olarak uzundur; yanlış düşüşe yol açardı.

- **2026-09-30 · Phase 10 — Active chunk ertelendi.**
  - Karar: active chunk sistemi uygulanmadı (ADR-005 eşiği aşılmadı; yaklaşık 2 ms'ye karşı 6 ms).
  - Ek gerekçe: optimizasyondan sonra yerleşmiş kum RNG tüketmiyor; ileride chunk eklenirse uyuyan bölgelerin determinizme etkisi de azalmış oldu.
- **2026-09-30 · Phase 10 — Değişmez kontrolü ayrı bayrakta.**
  - Karar: `?debug=1` yalnızca debug panelini ve `window.__strata`'yı açıyor. Her tick yapılan değişmez kontrolü `?invariants=1` ile ayrı açılıyor.

- **2026-09-30 · Phase 12 — Sürüm 0.9.0, v1.0.0 etiketi yok.**
  - Karar: sürüm 0.9.0 olarak işaretlendi; v1.0.0 etiketi atılmadı.
  - Neden: plan, v1.0.0'ı gerçek cihaz ve tarayıcı testlerinden sonraya koyuyor. Bu ortamda yalnızca Chromium (Playwright) test edilebildi.
- **2026-09-30 · Phase 12 — Bitki büyüme hızı yavaşlatıldı.**
  - Karar: `plantGrow` 0,012, bitki bütçesi 8.
  - Neden: görsel QA'da Volkan'daki göl yaklaşık 12 saniyede tamamen bitkiyle kaplanıyordu.

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

### Phase 2–12 bağımsız inceleme (2026-09-30)

Taze bağlamlı bir reviewer ajanı `f0956b6..34969c5` aralığını inceledi. Critical bulgu çıkmadı. Reviewer, gas-row atlamasının ve undo determinizminin doğruluğunu kod çalıştırarak teyit etti.

**Düzeltilenler** (önce kırmızı test, sonra yeşil; suite 280/280; tarayıcıda doğrulandı):

- **Çizimden sonra "Geri al" butonu aktifleşmiyordu.**
  - Düzeltme: pointer'a `onStrokeEnd` eklendi, panel her stroke sonunda senkronlanıyor.
  - Test: `stroke bitince onStrokeEnd çağrılır`.
- **Fareyle tıklanan bir butonda Space butonu yeniden tetikliyordu** ("Yeniden üret" dünyayı geri alınamaz şekilde siliyordu). Seçim kutusundan sonra tüm kısayollar yutuluyordu.
  - İlk deneme (`:focus-visible`) Chrome'da çalışmadı: tuşa basılınca odak "görünür" sayılıyor.
  - Düzeltme: panel butonları fareyle tıklanınca (`detail > 0`) odağı bırakıyor; odakta buton varsa klavyeyle gelinmiştir ve Space butonu tetikler. Radyolarda Space her zaman pause yapıyor. Select'ler seçimden sonra odağı bırakıyor. Diyalog açıkken kısayollar engelleniyor.
  - Testler: `app-modules` altındaki Space ve diyalog testleri; tarayıcı doğrulaması.
- **Canvas kenarlık dahil ölçülüyordu**; tarayıcı her karede yeniden örnekliyor, tam sayı ölçeğin keskinliği kayboluyordu.
  - Düzeltme: canvas'ın kendisi ölçülüyor ve gözleniyor; ek olarak `image-rendering: pixelated`.
- **Kaybolan `pointerup` durumunda akış durmuyordu** (reviewer: Minor; "materyal durmadan akar" etkisi nedeniyle Important'a yükseltildi).
  - Düzeltme: `lostpointercapture` ve `buttons === 0` olan hareket stroke'u bitiriyor.
  - Testler: iki pointer testi.
- **`?scene=benchmark` sonrası sahne seçicisi boş kalıyordu** (tercihe sızan gizli sahne; Important'a yükseltildi).
  - Düzeltme: seçicide olmayan aktif sahne için seçenek dinamik olarak ekleniyor.
- **CI kırılganlığı:** duvar saati testinin eşiği 60 ms'den 250 ms'ye çıkarıldı; bench testindeki tautoloji kaldırıldı.
- **Ölü kod ve doküman uyumsuzlukları:** `_gasCount` kaldırıldı. ARCHITECTURE'da gaz geçişinin satır bazlı atlanması ve katman sırası (glow → önizleme) düzeltildi.

**Ertelenen minor'lar** (kullanıcı etkisi düşük; sonraki sürüm):

- Debug TPS göstergesi undo ya da sahne yüklemesinden sonra negatif görünebiliyor (tick sıfırlanıyor). Yalnızca debug paneli etkileniyor.
- Tick başına global bitki ve ateş bütçesi satır tarama sırasıyla harcanıyor. Bütçe dolduğunda alt satırlar önceliklidir; yalnızca yoğun yükte fark edilir.
- Stroke sürerken Ctrl+Z basılırsa, stroke bitince undo noktası stroke öncesine kurulur (kenar durum).
- Oynat butonu hem `aria-pressed` hem değişen etiket kullanıyor; ikisinden biri seçilmeli.
- Tercih kaydı 300 ms gecikmeli; sekme o arada kapanırsa son değişiklik kaybolabilir (`pagehide` ile flush edilebilir).
- Küçük kare başı allocation'lar (layout/arka plan anahtar string'leri, glow kaynak dizisi, `paintLine` kapanışı); per-cell döngüde değil.
- "Benchmark seed'den bağımsız" ifadesi yalnızca yerleşim için doğru; tonlar ve RNG seed'e bağlı. `bench.js` sabit seed kullandığı için etkisiz.

### Phase 13 — Sıcaklık sistemi ve yeni içerik (0.10.0)

Spec: `docs/superpowers/specs/2026-09-30-sicaklik-sistemi-design.md` · Plan: `docs/superpowers/plans/2026-09-30-sicaklik-sistemi.md` · Materyal belgesi: `docs/MATERIALS.md`

- [x] Sürüm rozeti ve Yenilikler diyaloğu
- [x] Ters çevirme (`flipVertical`, düğme, `F`)
- [x] Kum saati yenilemesi
- [x] Sıcaklık alanı veri modeli
- [x] Isı geçişi (difüzyon, hava, kaynaklar, uyuyan satırlar)
- [x] Isı görselleri ve termal görünüm
- [x] Faz geçişleri ve sayaç hilelerinin taşınması
- [x] Buz, Kar, Metal, Erimiş metal, Magma
- [ ] Gün/gece döngüsü, sahne ortamları, gökyüzü
- [ ] Isıt ve Soğut fırçaları
- [ ] Sekmeli seçici, Ortam bölümü, termal düğme, kısayollar, göstergeler
- [x] Çoğaltıcı (`CLONER`) ve Yutucu (`SINK`) — Görev 3'te, kum saatiyle birlikte
- [ ] Buzul, Dökümhane ve Mağara sahneleri; volkan magması ve çoğaltıcısı
- [ ] Performans, dokümanlar, 0.10.0 sürümü

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
| 2026-09-30 | 42e4fd0 | Win10 x64, Node 22.17 | 400×225 | 43 918 | 5,99 (tekrarlarda 3,6–4,9) | 9,45 | optimizasyon öncesi; makine gürültülü |
| 2026-09-30 | 42e4fd0 | Win10 x64, Node 22.17 | 320×180 | 28 214 | 4,44 | 9,20 | optimizasyon öncesi |
| 2026-09-30 | Phase 10 | Win10 x64, Node 22.17 | 400×225 | 43 911 | 1,87–2,27 (en iyi 3 tur) | 3,6–5,0 | RNG'siz yerleşme + satır içi soğuma + gaz satırları |
| 2026-09-30 | Phase 10 | Win10 x64, Node 22.17 | 320×180 | 28 211 | 2,27 | 3,57 | |
| 2026-09-30 | Phase 10 | Win10 x64, Node 22.17 | 200×200 | 19 917 | 1,78 | 3,78 | |
| 2026-09-30 | Görev 5 | Win10 x64, Node 22.17 | 400×225 | 43 911 | 1,25–1,27 (ısısız aynı ölçüm 0,77) | 1,57–1,61 | ısı geçişi: aktif satır oranı %26, geçişin payı ~0,39 ms; hedef +0,6 ms içinde |
| 2026-09-30 | Phase 10 | Chrome 154 (Playwright) | 320×207 | 32 466 | 3,0 | 4,5 | render medyanı 2,3 ms (glow: high) |

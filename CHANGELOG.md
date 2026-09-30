# Changelog

Bu projedeki önemli değişiklikler bu dosyada tutulur.
Biçim [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) yaklaşımını izler. Sürümleme [Semantic Versioning](https://semver.org/lang/tr/) kurallarına göre yapılır.

## [Unreleased]

### Removed

- `.claude/` klasörü artık repoda izlenmiyor (`.gitignore`'da). Claude Code ayarları yerelde kalır.

## [0.9.0] - 2026-09-30

İlk tam sürüm adayı: Phase 0–12 tamamlandı. v1.0.0 gerçek cihaz ve tarayıcı testlerinden sonra etiketlenecek.

### Added — Phase 12 (Final QA)

- `tools/soak.js`: dayanıklılık testi (değişmezler, parçacık sınırı, bellek büyümesi).
- README'ye ekran görüntüleri (`docs/screenshots/`) ve "Bilinen sınırlamalar" bölümü.
- Engine için statik kaynak taraması testi; sunucu için ters bölü traversal testi.

### Fixed

- Çizimden sonra panel "Geri al" butonu aktifleşmiyordu.
- Fareyle tıklanan bir butonda Space butonu yeniden tetikliyordu; ör. "Yeniden üret" dünyayı siliyordu. Seçim kutusundan sonra kısayollar çalışmıyordu. Artık fareyle tıklanan butonlar ve select'ler odağı bırakıyor; diyalog açıkken kısayollar engelleniyor.
- Canvas kenarlık dahil ölçüldüğü için her karede yeniden örnekleniyordu; pikseller artık keskin.
- Kaçan `pointerup` ya da kaybolan pointer capture durumunda materyal akmaya devam ediyordu.
- `?scene=benchmark` ziyaretinden sonra sahne seçicisi boş kalıyordu.
- Volkan: dar ve dikey gridlerde lav, baca koniden geniş kaldığı için sol yamaca taşıyordu. Koni artık düz tepeli (yamuk).
- Bitki büyümesi çok hızlıydı; yavaşlatıldı (olasılık 0,012, bütçe 8).

### Added — Phase 11 (GitHub Pages)

- Path denetleyicisi artık şunları da tarıyor:
  - template-literal import, `new URL(…, import.meta.url)`, `fetch`, `Worker`
  - CSS `url()`/`@import`, HTML `srcset`
  - Yorumları yok sayıyor.
- Open Graph başlık ve açıklaması, `color-scheme`.

### Changed

- GitHub Actions: Pages izinleri yalnızca deploy işinde; deploy yalnızca `main`.

### Performance — Phase 10

- Fizik yaklaşık 2 kat hızlandı (400×225 Benchmark: ~4 ms → ~2 ms/tick):
  - Yerleşmiş toz parçacıkları artık RNG tüketmiyor (zarsız ön kontrol).
  - Kum soğuması tarama döngüsünde satır içi yapılıyor.
  - Gaz geçişi yalnızca gaz bulunan satırları tarıyor.
- `npm run bench` (`tools/bench.js`): headless benchmark (median / p95 / max ms/tick).
- Active chunk sistemi v1'de gerekmedi (ADR-005).

### Changed

- `?debug=1` artık her tick değişmez kontrolü yapmıyor; bunun için `?invariants=1` var.

### Added — Phase 9 (Mobil / Erişilebilirlik)

- Dar ekranda materyal seçici yatay kayan şerit. "Sahne ve diğer ayarlar" açılır bölümü dar ekranda kapalı başlar.
- Tablet kırılma noktası (daha dar panel).
- Dokunmatik iyileştirmeler: çift dokunma zoom'u yok, dokunma vurgusu yok.
- DPR değişimi takibi (monitör değişimi, tarayıcı zoom'u).
- Kontrast doğrulaması: tüm metinler WCAG AA üstünde (en düşük 6,2:1).

### Added — Phase 8 (Görsel efektler)

- Ateş, lav ve yanan materyaller için glow (ısı ışıltısı): kademeli küçültmeyle bulanıklaştırılıp `lighter` ile eklenir.
- Görsel kalite seviyeleri: Yüksek, Orta, Düşük ve **Otomatik**. Otomatik mod, kare iş süresine göre histerezisle yalnızca dekoratif efektleri azaltır; fizik değişmez.
- Panelde "Görsel kalite" seçimi (tercih olarak saklanır).
- `prefers-reduced-motion` çalışırken değişince anında uygulanıyor.
- Testler: `tests/quality.test.js`, glow testleri (toplam 265).

### Added — Phase 7 (Procedural Scenes)

- **Volkan** (varsayılan): kesik koni, krater ve magma odası. Sağ yarıktan taşan lav ağaçları tutuşturur. Yamaçlarda kum, solda göl ve kıyı bitkileri.
- **Kum saati**: cam hazneler, 3 hücrelik boğaz, odun çerçeve. Kum yalnızca fizikle akar.
- **Vaha**: seed'li kum tepeleri, taşla kaplı gölet, bitki örtüsü, palmiyeler.
- **Kaos Lab**: seed tabanlı kontrollü rastgele düzen; doluluk en fazla %40.
- **Benchmark** (yalnızca `?debug=1` seçicide ya da `?scene=benchmark`): seed'den bağımsız sabit yük sahnesi.
- Sahne yardımcıları: aritmetik value noise, çokgen, disk, kalın çizgi ve yükseklik haritası doldurma.
- Testler: `tests/scenes.test.js` (toplam 255).

### Removed

- Geçici demo sahnesi.

### Added — Phase 6 (UI)

- Kontrol paneli:
  - Materyal seçici (numune kartları, doku örneği, kısayol)
  - Fırça boyutu, şekli ve "Üzerine yaz"
  - Duraklat/Devam, Adım, Hız (0.5×–4×), Geri al, Temizle
  - Sahne ve Seed seçimi, Yeniden üret, Yeni seed
  - Görüntü al (PNG)
  - Kısayollar diyaloğu
- Klavye kısayolları: 1–0, G, Space, `.`, `[` `]`, S, `+`/`−`, `?`, Ctrl/Cmd+Z. Metin alanlarında devre dışı; Türkçe Q klavyede AltGr desteği.
- Durum göstergesi (parçacık, FPS, grid, hız, seed) ve `?debug=1` paneli.
- Tercihler localStorage'da saklanıyor (materyal, fırça, hız, kalite, seed, sahne); bozuk veri ve erişim hatalarına dayanıklı.
- URL parametreleri: `?scene=`, `?seed=`, `?debug=1`.
- `Simulation.loadScene(scene, seed)` ve sahne kaydı.
- Ekran okuyucu duyuruları (`aria-live`), görünür odak, seçili materyal renkten bağımsız belirtiliyor.
- Testler: app-modules, app ve genişletilmiş renderer/simulation (toplam 236).

### Changed

- Arayüz dili Türkçe.
- Spawn hash'i `(index, tick, seed)` üzerinden hesaplanıyor; sahne üretimi çağrı geçmişinden bağımsız.

### Added — Phase 5 (Input / Brush / Undo)

- Fırça: Circle, Square, Spray (boyut 1–16).
  - Hızlı harekette boşluksuz çizgi (coalesced pointer olayları + Bresenham).
  - Basılı tutunca materyal akmaya devam eder.
  - Sağ tık geçici silgi, Shift ile üzerine yazma (replace).
  - Mouse, touch ve stylus (Pointer Events, pointer capture, `pointercancel`).
- Fırça önizlemesi: footprint ana hattı, spray için kesikli; touch'ta gizli.
- Tek seviyeli undo (stroke başında snapshot; Clear da geri alınabilir). Boş stroke undo noktasını silmez.
- Spray ayrı bir input RNG'si kullanır; fizik dizisini etkilemez.
- Testler: brush, paint, pointer ve genişletilmiş renderer (toplam 207).

### Added — Phase 4 (Renderer)

- Dinamik renkler:
  - ateş ömrüne göre sıcak → sönük, titreme
  - lava nabzı
  - yanan odun/bitki/yağın kömürleşmesi
  - ısınan kumun kızarması
- Procedural arka plan: alacakaranlık gradyanı, seed'li yıldızlar, katmanlı sırt siluetleri (cache'li).
- Açılışta konteynıra göre sabit grid boyutu (`chooseGridSize`; masaüstü 90k, dokunmatik 40k hücre bütçesi).
- `renderer.clientToCell`, `setReducedMotion`, layout cache'i.
- Tampon yalnızca durum değişince (ya da canlanan materyal varken) yenileniyor.
- `prefers-reduced-motion` desteği (titreme ve lava dalgası kapanır).
- Saf render modülleri: `js/render/layout.js`, `js/render/pixels.js`.
- Testler: render-layout, render-pixels, render-background, renderer (toplam 166).

### Added — Phase 3 (Reaction System)

- `js/engine/reactions.js`:
  - Tek sahip kuralı ve tick başına rastgele komşu örneklemesi.
  - Ayarlanabilir oranlar (`RATES`), tick başına ateş ve büyüme bütçeleri.
- Yeni iç materyaller: **Burning Wood**, **Burning Plant**, **Burning Oil** (akan yanan sıvı), **Ash**.
- Reaksiyonlar:
  - Fire → Wood/Plant/Oil'i tutuşturur, suyu buharlaştırıp söner.
  - Yanan materyaller alev üretir, yayılır, suyla söner (yağ hariç), sonunda küle ya da boşluğa döner.
  - Lava → suyu buharlaştırır ve soğuyarak taşa döner, yanıcıları tutuşturur, kumu ısıtıp cama dönüştürür. Havayla temas eden yüzeyi yavaşça kabuk bağlar.
  - Steam → ömrü bitince çoğunlukla suya yoğuşur.
  - Plant → suyu tüketerek, miras bütçeyle sınırlı büyür.
- Materyal başına spawn ömrü (`life: [min, max]`). Boyanan ateş ve buhar ömürle başlar.
- Gaz `rise` parametresi: ateş yakıtın yanında oyalanır.
- Testler: `tests/reactions.test.js` (toplam 142).

### Added — Phase 2 (Temel materyaller)

- Yeni materyaller:
  - **Water**, **Oil**, **Lava** (sıvı)
  - **Steam**, **Fire** (gaz)
  - **Wood**, **Glass**, **Plant** (statik)
- Sıvı parametreleri: `dispersion`, `spread` (viskozite), `drag`. Gaz parametresi: `drift`.
- `stepLiquid`:
  - serbest düşüş
  - kalıcı yön bit'iyle köşegen ve yatay akış (duvardan tünel yok, kenar çerçevesi aşılmaz)
  - viskozite yalnızca yayılmayı yavaşlatır
- `stepGas`: ikinci (yukarıdan aşağı) geçişte yükselme, sürüklenme ve tavanda kıpırdama. Dünyada gaz yoksa geçiş atlanır.
- Yoğunluk tabanlı yer değiştirme:
  - kum su ve yağda olasılıksal batar, lavada yüzer
  - yağ suyun üstünde yüzer
  - buhar kabarcıkları sudan yükselir
- Testler: `tests/fluids.test.js` ve genişletilmiş `tests/materials.test.js` (toplam 120).

### Fixed

- `update(NaN)` fiziği kalıcı olarak durduruyordu. NaN, undefined ve negatif `dt` artık 0 sayılıyor.
- Kesirli koordinatla yapılan `setCell` materyal sayaçlarını bozuyordu.
- `onFrame` içindeki bir hata rAF döngüsünü kalıcı olarak durduruyordu.
- `?debug=0` debug modunu açıyordu. Artık yalnızca `?debug=1` açıyor.

### Added — Phase 1 (Simulation Core)

- `js/engine/rng.js`: cyrb128 seed hash + sfc32 PRNG. Ayrı stream'ler, state kaydet/yükle. Engine'de `Math.random` kullanılmıyor.
- `js/engine/materials.js`:
  - Merkezi materyal tanımları: EMPTY, WALL, SAND, STONE.
  - Doğrulamalı derleyici ve `DISPLACE` lookup tablosu.
- `js/engine/world.js`:
  - SoA typed array'ler (`type`/`variant`/`life`/`flags`/`stamp`), 1 hücrelik WALL çerçevesi.
  - `set`/`swap`/`transform`/`clear` primitive'leri, materyal sayaçları.
  - Taşmaya dayanıklı Uint16 update stamp, değişmez kontrolü.
- `js/engine/kernels.js`: `stepPowder`.
  - Aşağı ve rastgele sıralı köşegen hareket, köşe sızıntısı önlemi.
  - Hareket etmiş parçacıkla yer değiştirmeme kuralı.
- `js/engine/simulation.js`: public API.
  - `step`, `play`/`pause`, `setSpeed` (0.5×–4×).
  - Fixed-timestep `update`: dt kırpma, frame başına tick sınırı, borç silme, fizik bütçesi.
  - `setCell`/`getCell`/`clear`/`getStats`, salt-okunur `view`, debug modunda her tick değişmez kontrolü.
- `js/render/palette.js` ve minimal `js/render/renderer.js`:
  - Uint32 palet LUT (endianness).
  - ImageData'yı gizli canvas'a yazıp büyüterek çizim; tam sayı ölçek tercihli yerleşim.
- `js/app/loop.js`: rAF döngüsü. Sekme gizlenince durur; geri gelince zamanlama sıfırlanır.
- Geçici demo sahnesi (`js/scenes/demo.js`): kum tarayıcıda düşüyor ve yığınlar oluşturuyor. `?debug=1` ile `window.__strata`.
- Testler (toplam 86):
  - rng, materials, world, physics, simulation, engine-purity
  - palette, render-layout, demo-scene
  - Bias testleri köşegen tercihini ve tarama yönünü ayrı ayrı ölçüyor.

### Added — Phase 0

- Proje iskeleti:
  - `index.html`
  - tasarım token'larıyla `css/base.css`
  - `js/config.js` (`APP_NAME = 'Strata Sandbox'`)
  - minimal `js/main.js`
  - favicon
- `tools/serve.js`: sıfır bağımlılıklı yerel geliştirme sunucusu.
  - Doğru MIME tipleri, path traversal koruması ve `no-store` önbellek başlığı.
- `tools/check-paths.js`: Windows ile GitHub Pages arasındaki büyük/küçük harf farkından doğan path hatalarını, eksik dosyaları ve root-absolute path'leri yakalar.
- Testler (`node --test`, 0 dependency):
  - `tests/serve.test.js`
  - `tests/imports.test.js`
- GitHub Actions workflow'u (`.github/workflows/pages.yml`): testleri çalıştırır, ardından yalnızca uygulama dosyalarını GitHub Pages'e yayınlar.
- Projeye özel Claude Code ayarları (`.claude/settings.json`).
- Dokümanlar:
  - `README.md`
  - `docs/PLAN.md`
  - `docs/DEVELOPMENT.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DECISIONS.md`

### Changed

- Proje adı "Strata" yerine **Strata Sandbox** oldu.

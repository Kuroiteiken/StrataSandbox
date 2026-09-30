# Changelog

Bu projedeki önemli değişiklikler bu dosyada tutulur.
Biçim [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) yaklaşımını izler. Sürümleme [Semantic Versioning](https://semver.org/lang/tr/) kurallarına göre yapılır.

## [Unreleased]

Hedef sürüm 0.10.0: sıcaklık sistemi, Buz, Kar, Metal, yeni sahneler ve kum saati iyileştirmesi. Tasarım: `docs/superpowers/specs/2026-09-30-sicaklik-sistemi-design.md`.

### Added

- Başlıkta sürüm rozeti. Rozete tıklanınca "Yenilikler" diyaloğu açılır: en üstte geliştirmedeki sürümün (0.10.0) yayında olan yenilikleri, altında yayınlanmış tüm sürümler listelenir. Görülmemiş sürümde rozette küçük bir işaret görünür.
- Sürüm tutarlılığı testi: `APP_VERSION`, `package.json`, CHANGELOG ve Yenilikler aynı sürümü göstermek zorunda. `docs/MATERIALS.md` için senkron testi: her materyal belgede yer almak zorunda.
- Ters çevirme (`F` ya da "Ters çevir" düğmesi): dünya dikey olarak aynalanır ve işlem geri alınabilir. Kum saatinde kum bitince yeniden akıtmak için kullanılır.
- **Çoğaltıcı** (`X`): üstüne dökülen ilk hareketli materyali (toz, sıvı, gaz) öğrenir ve bitişik boş hücrelere kopyalar. Hücre başına 1000 kopya üretip durur, öğrendiği materyalin rengine bürünür. Statik materyalleri öğrenmez.
- **Yutucu** (`Y`): değen hareketli materyali yutar; hücre başına 1000 birim, sonra durur ve grileşir.
- Sınırsız kaynak modu (bütçe 65535) ve sahneler için `sim.configureSource(x, y, { learn, budget })` API'si.
- Sıcaklık alanı (`world.temp`, °C): her hücrenin bir sıcaklığı var ve sıcaklık parçacıkla birlikte taşınıyor. Undo ve ters çevirme sıcaklığı da kapsıyor. Sönen ateş geride sıcak hava bırakıyor, yutucunun boşalttığı yer ortam sıcaklığına dönüyor.
- Isı iletimi (`js/engine/heat.js`): tick'in yeni 3. geçişi. Çift tamponlu 4 komşulu difüzyon kullanır (yön bias'ı yok, enerji korunur). Hava ortam sıcaklığına yaklaşır; ateş ve yanan materyaller ısı kaynağıdır. Sakin satırlar atlanır (benchmark'ta tick başına ~+0,5 ms).
- `sim.setAmbient` ve `sim.setTemp` API'leri. Ortam ayarı dünyayı anında değiştirmez, undo noktası oluşturmaz.
- Isı görselleri: 450 °C üstündeki her materyal akkorlaşır (koyu kırmızı → sarı-beyaz) ve parlar. Lav soğudukça koyulaşır; donma noktasına yaklaşan su açık maviye kayar.
- Termal görünüm (`renderer.setViewMode('thermal')`): sıcaklık rampası (−40 mavi → 1200+ beyaz). Hava ve madde ayrı tonlarda gösterilir.
- Yeni materyaller: **Buz** (`B`, 1 °C'de erir; su −1 °C'de donar ve göl yüzeyden buz tutar), **Kar** (`K`, hafif toz, suda yüzer, çabuk erir), **Metal** (`M`, ısıyı çok hızlı iletir, kızarır, 1400 °C'de erir), **Erimiş metal** (`E`, lavdan ağır, soğuyunca metal olur) ve sahneler için gizli **Magma kaynağı** (sabit 1200 °C).
- Gün/gece döngüsü (motor; arayüz düğmesi sonraki adımda): 1× hızda bir gün ≈ 4 dakika, ortam sıcaklığı gece 10 °C düşer, öğlen 10 °C yükselir. Gökyüzü geceleri kararır, yıldızlar belirginleşir.
- Sahnelerin varsayılan ortam sıcaklığı var (Vaha 30 °C, diğerleri 20 °C); sahne yüklenince alan bu sıcaklıkla başlar.
- **Isıt** (`H`) ve **Soğut** (`C`) fırçaları: materyal koymadan fırçanın altındaki hücrelerin sıcaklığını her uygulamada 25 °C değiştirir. Basılı tutunca etki sürer, sınırlar −100…2500 °C. Geri alınabilir; sağ tık yine silgidir.
- Görünür **Ortam** bölümü: sıcaklık kaydırıcısı (−40…60 °C), gün/gece döngüsü onay kutusu, anlık durum ("Öğle · 28 °C") ve termal görünüm düğmesi (`T`).
- Başlıkta Ortam değeri; fare ve kalemde imlecin altındaki materyal ve sıcaklık ("Su · 12 °C").
- `docs/MATERIALS.md`: tüm materyallerin ve etkileşimlerinin (mevcut ve planlanan) başvuru belgesi. Tür, yoğunluk, kısayol, olasılıklar ve 0.10.0'da değişecek kurallar burada tutulur.

### Changed

- Materyal seçici sekmelere ayrıldı: Toz, Sıvı, Gaz, Katı, Araç. Ok tuşlarıyla gezilir; kısayolla seçilen materyalin sekmesi açılır.
- Faz geçişleri artık sıcaklık alanında ve gizli ısıyla çalışıyor: su 100 °C'de kaynıyor; buhar 95 °C'de yoğuşuyor ve bir kısmı kayboluyor; lav 750 °C'de taşa dönüyor (önce dış yüzeyi, ortası en son); kum 550 °C'de cama dönüyor; taş 1500 °C'de eriyor.
- Sıcak ortamda (≥ 35 °C) açık su yüzeyi yavaşça buharlaşıyor. Odun (300 °C), yağ ve bitki (250 °C) sıcaklıkla kendiliğinden tutuşuyor; bitki 5 °C'nin altında büyümüyor.
- Eski `life` sayaç hileleri (kum ısısı, lav soğuma sayacı, buhar zamanlayıcısı) kaldırıldı. Temasla tutuşma ve ateşin suyu buharlaştırması korundu; tüm buhar üretimi tek bir yoldan (`emitSteam`) geçiyor.
- Kum saati yenilendi: kavisli iki cam hazne, dar boğaz, odun kapaklar ve direkler; cam ve odun şekli orta satıra göre tam simetrik. Üstte sınırsız çoğaltıcı, altta sınırsız yutucu olduğu için kum hiç durmadan akıyor. Kum camda takılmıyor. Sahne yüklenince bir ipucu duyuruluyor.
- CI: yalnızca `docs/` altında değişiklik olduğunda test ve yayın akışı çalışmıyor (`paths-ignore`). Karışık push'larda akış yine çalışır.

### Fixed

- Faz geçişlerinde eşiğin çok az üstündeki ısı fazlası sıfıra yuvarlanıyordu; buz 1 °C'de hiç erimiyor, göl hiç donmuyordu. İlerleme artık sabit noktalı ve stokastik yuvarlanıyor.
- Çizim sürerken Temizle ya da ters çevirme yapılırsa, çizimin undo noktası bekleyen snapshot'ın üzerine yazılabiliyordu.

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

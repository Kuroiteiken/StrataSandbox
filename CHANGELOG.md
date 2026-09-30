# Changelog

Bu projedeki önemli değişiklikler bu dosyada tutulur.
Biçim [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) yaklaşımını izler. Sürümleme [Semantic Versioning](https://semver.org/lang/tr/) kurallarına göre yapılır.

## [Unreleased]

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

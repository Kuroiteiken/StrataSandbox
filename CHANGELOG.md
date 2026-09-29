# Changelog

Bu projedeki önemli değişiklikler bu dosyada tutulur.
Biçim [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) yaklaşımını izler. Sürümleme [Semantic Versioning](https://semver.org/lang/tr/) kurallarına göre yapılır.

## [Unreleased]

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

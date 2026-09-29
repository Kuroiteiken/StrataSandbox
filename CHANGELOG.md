# Changelog

Bu projedeki önemli değişiklikler bu dosyada tutulur.
Biçim [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) yaklaşımını izler. Sürümleme [Semantic Versioning](https://semver.org/lang/tr/) kurallarına göre yapılır.

## [Unreleased]

### Added
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

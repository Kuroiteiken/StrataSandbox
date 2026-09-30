# Strata Sandbox

Tarayıcıda çalışan, grid tabanlı bir **materyal ve fizik sandbox'ı**. Kum, su, yağ, lava, ateş, buhar, bitki ve daha fazlasını simülasyon alanına çizip birbirleriyle nasıl etkileştiklerini izleyebilirsin. Simülasyon gerçek bir cellular automaton'dur: her hücre her tick'te fizik kurallarına göre güncellenir.

- **Canlı sürüm:** <https://kuroiteiken.github.io/StrataSandbox/>
- **Durum:** v0.9.0. Tüm fazlar tamamlandı; gerçek cihaz ve tarayıcı testleri sonrası v1.0.0 olacak. Ayrıntılar: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Özellikler

- **Materyaller:**
  - Sand, Water, Stone, Wood, Fire, Steam, Oil, Lava, Plant, Glass
  - Eraser
- **Fizik:**
  - Yoğunluk tabanlı yer değiştirme: kum suda batar, yağ suda yüzer.
  - Viskoz sıvılar.
  - Yükselen gazlar.
- **Reaksiyonlar:**
  - Lava + Sand → Glass
  - Lava + Water → Steam ve soğuyan lava → Stone
  - Fire → Wood, Plant ve Oil'i tutuşturur
  - Plant, su yakınında büyür
- **Sahneler:** Volkan, Kum saati, Vaha, Kaos Lab (ve Boş). Seed tabanlıdır; aynı seed aynı başlangıç sahnesini üretir. URL ile paylaşılabilir: `?scene=oasis&seed=abc`.
- **Kontroller:**
  - Brush: Circle, Square, Spray
  - Pause / Step
  - 0.5×–4× hız
  - Undo, Capture (PNG)
- **Performans ve görsel:**
  - Fixed timestep; fizik ekran yenileme hızından bağımsızdır.
  - Heat/bloom efekti ve uyarlanır görsel kalite.
- **Platform:**
  - Mobil ve masaüstü uyumlu.
  - Klavye erişimi.
  - `prefers-reduced-motion` desteği.
  - Backend yok, build adımı yok, runtime dependency yok.

## Kontroller ve kısayollar

> Uygulamadaki "Kısayollar" diyaloğu (`?`) aynı listeyi gösterir.

| Tuş | İşlev |
| --- | --- |
| `1` … `9`, `0` | Sand, Water, Stone, Fire, Wood, Steam, Oil, Lava, Plant, Eraser |
| `G` | Glass |
| `Space` | Pause / Play |
| `.` | Tek tick ilerlet (Step) |
| `[` / `]` | Brush küçült / büyüt |
| `S` | Brush şekli: Circle → Square → Spray |
| `+` / `−` | Simülasyon hızı |
| `Ctrl+Z` / `Cmd+Z` | Son stroke'u geri al |
| Sağ tık | Geçici silgi |
| `?` | Kısayol yardımı |

## Mimari özeti

Proje üç katmandan oluşur. Katmanlar birbirleriyle yalnızca tanımlı API'ler üzerinden konuşur.

- **Physics engine** (`js/engine/`):
  - DOM'a dokunmaz, Node'da da çalışır.
  - Dünya SoA typed array'lerde tutulur.
  - Merkezi materyal tanımları ve derlenmiş lookup tabloları kullanılır.
  - Fixed-timestep tick, seed'li PRNG.
- **Render engine** (`js/render/`):
  - Simülasyon durumunu yalnızca okur.
  - Çizim ImageData + Uint32 palet tablosuyla yapılır ve canvas'a büyütülür.
  - Cache'li procedural arka plan, glow.
- **Uygulama katmanı** (`js/app/`):
  - Pointer ve klavye girişi, panel, istatistikler, tercihler.

Ayrıntılar:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Teknik kararlar: [docs/DECISIONS.md](docs/DECISIONS.md)
- İlk plan: [docs/PLAN.md](docs/PLAN.md)

## Yerel çalıştırma

Node.js 22+ gerekir. Paket kurulumu yoktur.

```bash
npm run serve   # http://127.0.0.1:8080/
npm test        # tüm testler
```

- ES module'ler `file://` üzerinden çalışmaz; sayfayı bir HTTP sunucusuyla açman gerekir.
- `tools/serve.js` doğru MIME tiplerini gönderen, sıfır bağımlılıklı küçük bir sunucudur.
- Windows'ta `python -m http.server` bazen `.js` dosyalarını yanlış MIME tipiyle sunar. Bu yüzden önerilmez.

- Debug paneli: `?debug=1`.
- Her tick dünya değişmezi kontrolü (yavaş): `?invariants=1`.
- Headless performans ölçümü: `npm run bench`.

## GitHub Pages yayını

- Yayın adresi: <https://kuroiteiken.github.io/StrataSandbox/>
- `main` branch'ine yapılan her push'ta `.github/workflows/pages.yml` çalışır.
- Workflow önce testleri Linux'ta çalıştırır. Linux, büyük/küçük harfe duyarlı olduğu için path hataları burada yakalanır.
- Ardından yalnızca uygulama dosyalarını GitHub Pages'e yayınlar: `index.html`, `css/`, `js/`, `assets/`.
- Repo ayarlarında Pages kaynağı **GitHub Actions** olmalıdır.
- Pull request'lerde yalnızca testler çalışır; yayın yalnızca `main`'den yapılır.
- GitHub Pages dosyaları yaklaşık 10 dakika önbellekler. Yeni yayından hemen sonra eski sürümü görürsen sayfayı zorla yenile (Ctrl+F5).
- Tüm path'ler relative'dir. Bu sayede uygulama `username.github.io/repo-adı/` alt dizininde sorunsuz çalışır.

## Ekran görüntüleri

![Volkan sahnesi: kraterden taşan lav ağaçları tutuşturur, magma odası ışıldar](docs/screenshots/strata-volcano.png)

| Kum saati | Vaha | Mobil |
| --- | --- | --- |
| ![Kum saati: kum dar boğazdan gerçek fizikle akar](docs/screenshots/strata-hourglass.png) | ![Vaha: kum tepeleri, gölet ve palmiyeler](docs/screenshots/strata-oasis.png) | ![Mobil görünüm](docs/screenshots/strata-mobile.png) |

## Bilinen sınırlamalar

- **Basınç yok:** Sıvılar yalnızca yerel kurallarla akar. U şeklindeki bir boruda iki kol eşitlenmez (cellular automaton sınırlaması).
- **Sıcaklık alanı yok (v1):** Isı etkileşimleri temas tabanlıdır (ADR-003). Buz, kar ve metal gibi materyaller eklenirken yeniden değerlendirilecek.
- **Undo tek seviyelidir:** Dünyayı son çizimden önceki ana döndürür. Çizimden sonra geçen simülasyon süresi de geri alınır (ADR-010).
- **Grid boyutu açılışta seçilir:** Ekran döndürülünce ya da pencere büyütülünce dünya korunur ama kenarlarda boşluk kalabilir. Yeni boyut için sayfayı yenilemek gerekir.
- **Aynı seed farklı grid boyutunda farklı sahne üretir:** Birebir aynılık (sahne, seed, genişlik, yükseklik) dörtlüsüyle garanti edilir.
- **Yayın önbelleği:** GitHub Pages dosyaları yaklaşık 10 dakika önbellekler. Yeni yayından hemen sonra zorla yenileme (Ctrl+F5) gerekebilir.

## Roadmap

Fazlar ve durumları [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)'de tutulur:

- Phase 0 — Repository ve iskelet
- Phase 1 — Simulation Core
- Phase 2 — Temel materyaller
- Phase 3 — Reaction System
- Phase 4 — Renderer
- Phase 5 — Input / Brush / Undo
- Phase 6 — UI
- Phase 7 — Procedural sahneler
- Phase 8 — Görsel efektler
- Phase 9 — Mobil / Accessibility
- Phase 10 — Performance
- Phase 11 — GitHub Pages
- Phase 12 — Final QA

**v1 sonrası fikirler:**

- Yeni materyaller: Acid, Salt, Ice, Snow, Metal, Gunpowder, Smoke, Electricity
- Dünyayı kaydetme/yükleme ve URL ile sahne paylaşımı
- Özel simülasyon boyutları
- Tam ekran

## Lisans

[MIT](LICENSE)

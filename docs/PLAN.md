> **Bu dosya, 2026-09-29'da onaylanan ilk uygulama planının kopyasıdır.**
> Plan onaylandığı haliyle korunur. Canlı ilerleme takibi için [DEVELOPMENT.md](DEVELOPMENT.md), güncel teknik kararlar için [DECISIONS.md](DECISIONS.md) esas alınır.
>
> **Onay sonrası revizyonlar**
> - **Ad:** Proje adı "Strata" yerine **Strata Sandbox** oldu. Uygulama yalnızca falling-sand değil, genel bir materyal/fizik sandbox'ı.
> - **Repo ve Pages:**
>   - Repo: <https://github.com/Kuroiteiken/StrataSandbox>
>   - Yayın adresi: <https://kuroiteiken.github.io/StrataSandbox/>
> - **Deploy (B11 ve F bölümleri):**
>   - Pages "GitHub Actions" modunda açılmış. Bu yüzden "main / root + .nojekyll" yerine `.github/workflows/pages.yml` kullanılıyor.
>   - Workflow önce `npm test`'i Linux'ta (büyük/küçük harfe duyarlı) çalıştırıyor, sonra yalnızca uygulama dosyalarını yayınlıyor: `index.html`, `css/`, `js/`, `assets/`.
>   - Ayrıntı: DECISIONS.md, ADR-011.
> - **Git akışı:** Çalışma doğrudan `main` üzerinde yapılıyor. Commit ve push, uygun noktalarda sorulmadan atılıyor (kullanıcı talimatı). Bu nedenle `.claude/settings.json`'daki "git push'ta sor" kuralı kaldırıldı.
> - **LICENSE:** Uzak repodaki MIT lisansı (Copyright (c) 2026 Nihat Tavsan) kullanılıyor.
> - **`package.json` script'leri:** `bench` script'i, `tools/bench.js` hazır olduğunda (Phase 10) eklenecek. Var olmayan bir dosyaya işaret eden script bırakılmadı.

---

# Strata — Falling Sand Physics Sandbox · Uygulama Planı

## Bağlam

- **Dizin:** `D:\GitRepos\Sandbox` şu an boş ve henüz bir git reposu değil. Proje sıfırdan kurulacak.
- **Hedef:** Tarayıcıda çalışan, backend'siz, GitHub Pages'te yayınlanan, grid tabanlı gerçek bir cellular automaton sandbox.
- **Ortam:** Node 22.17, Git 2.47 ve Python 3.11 kurulu.
- **Kullanıcının verdiği kararlar:**
  - Undo = **snapshot**
  - Geçici ad = **Strata**
  - Lisans = **MIT**
- **Öncelik sırası:** fizik doğruluğu > stabilite > input > performans > render netliği > UI > dekor.

**Ad nasıl değiştirilecek:**
- Ad yalnızca üç yerde geçer: `js/config.js` (`APP_NAME`), `index.html` (`<title>`/meta) ve README.
- localStorage anahtarı (`fsbox.prefs.v1`) addan bağımsızdır. Ad değişince kullanıcı ayarları kaybolmaz.

---

## A. Mimari Öneri

### A.1 Klasör yapısı

```text
/
├── index.html              # tek sayfa; tüm path'ler relative
├── .nojekyll               # Pages'te Jekyll işlemesini kapatır
├── .gitignore              # .claude/settings.local.json dahil
├── .claude/
│   └── settings.json       # projeye özel Claude Code ayarları (repo ile commit edilir)
├── package.json            # SADECE test/dev script'leri; "type":"module"; 0 dependency
├── README.md  LICENSE (MIT)  CHANGELOG.md
├── assets/                 # favicon.svg vb.
├── css/
│   ├── base.css            # tasarım token'ları, reset, tipografi, focus stilleri
│   ├── layout.css          # app shell + responsive breakpoint'ler
│   └── controls.css        # panel bileşenleri (numune kartları, butonlar, slider)
├── js/
│   ├── main.js             # composition root: sim + renderer + app katmanını bağlar
│   ├── config.js           # APP_NAME, hücre bütçeleri, TPS, sabitler
│   ├── engine/             # PHYSICS ENGINE: DOM'suz, Node'da çalışır
│   │   ├── world.js        # typed array'ler, padding, index yardımcıları, primitive'ler, stamp
│   │   ├── materials.js    # materyal tanımları + derlenmiş lookup tabloları
│   │   ├── kernels.js      # hareket çekirdekleri: stepPowder / stepLiquid / stepGas
│   │   ├── reactions.js    # reaksiyon kuralları + ignite/heat/cool/transform primitive'leri
│   │   ├── simulation.js   # public API: tick, fixed timestep, hız, paint, undo, sahne, stats
│   │   ├── brush.js        # footprint üretimi + çizgi interpolasyonu (saf fonksiyonlar)
│   │   └── rng.js          # sfc32 PRNG, seed hash, stream'ler
│   ├── scenes/
│   │   ├── index.js        # sahne kaydı
│   │   ├── tools.js        # aritmetik value noise, şekil doldurma (normalize koordinat)
│   │   └── volcano.js  hourglass.js  oasis.js  chaos.js  benchmark.js
│   ├── render/             # RENDER ENGINE: yalnızca sim.view okur
│   │   ├── renderer.js     # canvas, DPR, ölçekleme, katman birleştirme, capture, clientToCell
│   │   ├── palette.js      # renk rampaları → Uint32 LUT (endianness)
│   │   ├── background.js   # procedural, cache'li arka plan
│   │   └── glow.js         # heat/bloom, kalite seviyeleri
│   └── app/                # UI / APPLICATION katmanı
│       ├── loop.js         # rAF, visibility, frame bütçesi, adaptive quality sinyali
│       ├── pointer.js      # Pointer Events → hücre koordinatı, coalesced, interpolasyon, hold
│       ├── keyboard.js     # kısayollar
│       ├── controls.js     # panel, material picker, butonlar, sahne/seed
│       ├── stats.js        # stats + ?debug=1 paneli (throttle'lı)
│       └── storage.js      # prefs (try/catch + doğrulama)
├── tests/                  # node --test (yerleşik; dependency yok)
│   ├── helpers.js          # ASCII-art ile senaryo kurma, grid hash, sayım
│   └── *.test.js           # rng, world, physics, reactions, determinism, brush, simulation, scenes, imports
├── tools/
│   ├── serve.js            # sıfır bağımlılıklı statik sunucu (doğru MIME)
│   └── bench.js            # headless benchmark
└── docs/
    ├── DEVELOPMENT.md      # faz takibi + manuel test checklist + benchmark log
    ├── ARCHITECTURE.md
    └── DECISIONS.md        # ADR'ler
```

**Senin önerdiğin yapıdan farklar ve gerekçeleri:**

- **Dosya adları küçük harf** (`simulation.js`); sınıf adları içeride PascalCase kalır. Windows büyük/küçük harf ayırmaz, GitHub Pages ayırır. Bu yüzden yanlış yazılmış bir import sadece yayında 404 verir.
- **`input/` ve `ui/` tek bir `app/` klasöründe birleşti.** İkisi de aynı katmana ait. Ayrı klasör ek netlik getirmiyordu.
- **`brush.js` engine içinde duruyor.** Footprint hesabı saf bir fonksiyon ve hem paint hem preview tarafından kullanılıyor. Böylece Node'da da test edilebiliyor.
- **`responsive.css` ayrı dosya olarak yok.** Media query'ler ilgili kuralın yanında durursa bakımı daha kolay oluyor.
- **`tests/` ve `tools/` klasörleri eklendi.**

### A.2 Katmanlar arası iletişim

```text
app/  (DOM, pointer, klavye, panel)
  │  komutlar: play/pause/step/paintLine/undo/loadScene…
  ▼
Simulation (public API) ──► world / kernels / reactions   ← DOM'a asla dokunmaz
  │
  │  sim.view  (salt-okunur typed array görünümü + version sayacı)
  ▼
Renderer.render(view, frameInfo)                          ← state'i asla yazmaz
```

**Kurallar:**
- `engine/` altında `window`/`document` kullanılmaz. Bu, Node import testiyle zorlanır.
- `app/`, world array'lerine doğrudan erişmez.
- `render/` fizik kuralı içermez.

**Engine API:**
```js
const sim = new Simulation({ width, height, seed });
sim.play(); sim.pause(); sim.isPaused;
sim.step();                          // tam 1 tick (pause'da da çalışır)
sim.update(dtMs, budgetMs);          // fixed-timestep accumulator → çalışan tick sayısı
sim.setSpeed(0.5 | 1 | 2 | 4);
sim.clear();
sim.loadScene(sceneId, seed);
sim.paintLine(x0, y0, x1, y1, brush); // brush = { material, size, shape, replace }
sim.setHold(x, y, brush); sim.releaseHold();   // basılı tutunca tick başına akış
sim.beginStroke(); sim.endStroke(); sim.undo(); sim.canUndo;
sim.getCell(x, y);                   // { material, life } — hot path değil
sim.getStats();                      // { particles, tick, tps, physicsMs, activeCells }
sim.view;                            // { width, height, type, variant, life, flags, tick, version }
```

**Render API:**
```js
const renderer = new Renderer(canvas, { palette });
renderer.resize(cssW, cssH, dpr);            // sadece sunum; fizik grid'i değişmez
renderer.render(sim.view, { frame, reducedMotion });
renderer.setQuality('auto' | 'high' | 'medium' | 'low');
renderer.setBrushPreview({ x, y, size, shape, visible });
renderer.clientToCell(clientX, clientY);     // → { x, y } | null
renderer.setBackground(sceneId, seed);       // arka plan cache'ini yeniler
renderer.capture();                          // → Promise<Blob> (PNG)
```

### A.3 Temel veri yapıları

**World** (her hücre için bir değer tutan SoA düzeni):
- Boyut `(W+2)×(H+2)`'dir; kenarda 1 hücrelik görünmez **WALL** çerçevesi vardır.
- Bu çerçeve sayesinde hot loop'ta bounds check gerekmez.
- Tüm kurallar en fazla 1 hücre uzağa bakar. Bu, assert ile doğrulanır.

| Array | Tip | İçerik |
|---|---|---|
| `type` | Uint8Array | materyal id (0 = EMPTY/hava) |
| `variant` | Uint8Array | parçacığa özgü kozmetik ton tohumu; parçacıkla birlikte taşınır |
| `life` | Uint16Array | anlamı materyale göre değişen sayaç: fire ömrü, yanma ilerlemesi, kum ısısı, lava soğuması, plant büyüme bütçesi, steam yoğuşma zamanlayıcısı |
| `flags` | Uint8Array | bit0 = sıvının kalıcı akış yönü; diğer bitler ileride alt durumlar için |
| `stamp` | Uint16Array | update stamp; taşmada `fill(0)` yapılır ve sayaç 1'den başlar |

**Derlenmiş lookup tabloları** (`materials.js` bunları başlangıçta tanım tablosundan üretir):
- **Tek boyutlu tablolar:** `DENSITY`, `KIND` (NONE/STATIC/POWDER/LIQUID/GAS), `FLAGS` bitmask (ACTIVE, REACTIVE, FLAMMABLE, HOT, PAINTABLE…), `DISPERSION`, `SPREAD_CHANCE` (u32 eşik).
- **`DISPLACE` (Uint8Array 256×256):** "mover → target" yer değiştirme olasılığı (0 = asla, 255 = her zaman). Yoğunluk ve faz kurallarının hepsi bu tabloda. Hot loop'ta tek okuma yeter.
- **Yeni materyal eklemek** tanım tablosuna bir kayıt, gerekirse de bir `react()` fonksiyonu eklemek demek.

**Diğer yapılar:**
- **Palette** (render tarafında): `Uint32Array(256 × 32)`, materyal × ton.
- **Undo snapshot'ı:** önceden ayrılmış ve tekrar kullanılan buffer'lar; type/variant/life/flags ile RNG state ve tick tutulur. Toplam yaklaşık 0,5 MB.
- **Brush footprint cache'i:** anahtar `"shape:size"`, değer `(dx, dy)` çiftleri içeren bir `Int16Array`.

### A.4 Materyaller ve yoğunluk

EMPTY'yi "hava" kabul edip iç referans yoğunluğunu **5** yapıyorum. Böylece "gaz < hava < sıvı" sıralaması tek kuralla çalışıyor. Senin verdiğin oranlar aynen korunuyor.

| Materyal | Tür | Yoğunluk | Not |
|---|---|---|---|
| Steam | gaz | 2 | yükselir, sürüklenir, yoğuşur |
| Fire | gaz | 3 | ömürlü, titrer, tutuşturur |
| EMPTY (hava) | — | 5 | referans |
| Oil | sıvı | 8 | dispersion 2, suyun üstünde yüzer |
| Water | sıvı | 10 | dispersion 5 |
| Ash *(iç)* | toz | 12 | yanma kalıntısı |
| Sand | toz | 20 | lava üstünde yüzer ve camlaşır |
| Lava | sıvı | 30 | dispersion 1, yatay yayılma olasılığı düşük, serbest düşüş normal |
| Stone, Wood, Glass, Plant | statik | ∞ | normal displacement'ta asla yer değiştirmez |

**İç materyaller** (picker'da görünmez): `WALL`, `BURNING_WOOD`, `BURNING_PLANT`, `BURNING_OIL`, `ASH`. Opsiyonel olarak sahneler için sınırlı ömürlü bir `EMITTER`.

**Kısayol notu:** Glass için listede kısayol yoktu; **G** tuşunu öneriyorum.

### A.5 Görsel kimlik — "Strata: saha gözlem aleti"

Konsept, jeolojik kesit ile pirinç bir bilimsel aletin ve antik bir laboratuvar defterinin buluşması.

- **Renkler:**
  - Zemin: koyu umber/is tonu.
  - Metin: kemik rengi.
  - Ana vurgu: pirinç.
  - İkincil vurgu: patina yeşili.
- **Tipografi:**
  - Başlıklarda sistem serif fontu kullanılır; gravür etiket hissi verir.
  - Göstergeler `ui-monospace` ile `tabular-nums` kullanır; alet ekranı gibi görünür.
  - Harici font yoktur.
- **Canvas:** ince pirinç bir çerçeve ve kenarlarda cetvel çentikleriyle bir "gözlem camı" gibi görünür.
- **Material picker:** "numune kartları" şeklinde. Her kartta şunlar bulunur:
  - Materyalin gerçek paletinden üretilmiş bir doku örneği.
  - Materyalin adı.
  - Kısayol numarası.
- **Seçili materyal nasıl belli olur:** kabarık çerçeve, ▸ işareti, kalın etiket ve `aria-checked`. Seçim yalnızca renkle belirtilmez.
- **Arka plan:** alacakaranlık gradyanı, uzakta katmanlı siluetler ve seed'e bağlı soluk yıldızlar. Cache'lenir.
- **Kaçınılanlar:** glassmorphism, neon, admin panel görünümü, Tailwind demo kartları.

---

## B. Temel Teknik Kararlar

| # | Konu | Karar | Kısa gerekçe |
|---|---|---|---|
| B1 | Vanilla mı Vite mı | **Vanilla JS + native ES modules, build yok** | Yaklaşık 25 modül HTTP/2 üzerinde sorun olmaz. Çalışan kod kaynak kodla aynıdır, bu da debug'ı kolaylaştırır. 0 dependency. HMR ve minify bu ölçekte belirgin fayda sağlamaz. `package.json` yalnızca `node --test` ve dev script'leri içindir. TypeScript kullanılmaz; gerekirse JSDoc tipleri eklenir. |
| B2 | Grid | **Sabit iç grid (Seçenek B)** | Ayrıntılar aşağıda. |
| B3 | Temperature | **v1'de per-cell temperature yok** | Ayrıntılar aşağıda. |
| B4 | Reaction-only yeterli mi | **Evet, "tek sahip" kuralıyla** | Reaksiyon tablosu aşağıda. |
| B5 | Full-grid mi chunk mı | **v1'de full-grid, erken atlamalı** | Ayrıntılar aşağıda. |
| B6 | Fixed timestep | **Ölçekli tick aralığı + limitli accumulator** | Ayrıntılar aşağıda. |
| B7 | Tick sırası | **İki geçiş + stamp kuralları** | Ayrıntılar aşağıda. |
| B8 | Renderer | **ImageData + LUT + katmanlı birleştirme** | Ayrıntılar aşağıda. |
| B9 | PRNG | **sfc32 + cyrb128 seed hash, ayrı stream'ler** | Ayrıntılar aşağıda. |
| B10 | ImageData stratejisi | **Tek ImageData, tek pixel döngüsü** | Ayrıntılar aşağıda. |
| B11 | Pages deploy | **`main` branch, `/ (root)`, `.nojekyll`** | Build olmadığı için Actions gerekmez. `docs/` klasörü markdown dokümanlara ayrıldı; uygulamayı oraya taşımak karışıklık yaratır. |
| B12 | Undo | **Snapshot (senin kararın)** | Ayrıntılar aşağıda. |
| B13 | Brush uygulaması | **Anında uygulama, basılı tutma tick başına** | Ayrıntılar aşağıda. |

**B2 — Sabit iç grid (Seçenek B)**

- **Grid açılışta bir kez belirlenir:**
  - Hücre boyutu: `cellCss = clamp(ceil(√(alan / bütçe)), 3, 6)` px.
  - Hücre bütçesi: masaüstünde yaklaşık 90k hücre (örneğin 400×225), mobilde yaklaşık 40k.
  - Önce hücrenin device-pixel boyutu tam sayı olarak seçilir, sonra W×H hesaplanır. Böylece pikseller keskin kalır.
- **Viewport resize olduğunda:**
  - Yalnızca sunum ölçeği değişir.
  - Tam sayı ölçek tercih edilir.
  - Boşluk %15'i aşarsa kesirli ölçeğe geçilir.
- **Neden bu seçenek:**
  - Mobil adres çubuğu ya da ekran dönmesi dünyayı bozmaz; state korunur.
  - Resize'ın maliyeti neredeyse sıfırdır.
  - Piksel okunabilirliği sabit kalır.
- **Bedeli:** ekran döndüğünde kenarlarda boşluk (letterbox) kalır.
- **İleride:** "World Size" ayarı grid'i yalnızca kullanıcının açık ve onaylı eylemiyle yeniden kurar.
- **Sahneler:** normalize koordinatta üretilir, bu yüzden her grid boyutunda çalışır.
- **Birebir aynı sonuç** (seed, W, H) üçlüsü aynı olduğunda garanti edilir.

**B3 — Temperature: v1'de per-cell temperature yok**

- **Yaklaşım:** reaksiyonlar temas tabanlı çalışır. Yerel ısı ve soğuma `life` içindeki sayaçlarda tutulur. Örneğin lavaya dokunan kumun sayacı artar, temas kesilince azalır.
- **Neden:**
  - İstenen tüm reaksiyonlar temas tabanlı.
  - Genel bir ısı alanı her tick'e ek bir difüzyon geçişi ekler; bu, tarama maliyetini yaklaşık ikiye katlar.
  - Ayrıca dengelemesi zor emergent davranışlar doğurur ("her yer kaynıyor" gibi).
- **Göç yolu:** tüm reaksiyonlar `heat()`, `cool()`, `ignite()` ve `transform()` primitive'lerinden geçer. Ice/Snow/Metal eklenirken bu primitive'lerin arkasına bir `Int16Array temperature` alanı eklenebilir. Bu tetikleyici ADR'ye yazılır.

**B4 — Reaction-only yeterli mi: evet, "tek sahip" kuralıyla**

- **Tek sahip:** her etkileşim çiftini yalnızca bir taraf işler. Böylece çift işleme ve yön/oran bias'ı oluşmaz.
- **Komşu örnekleme:** sahip hücre her tick 8 komşusundan **rastgele birini** örnekler. Bu, sabit sıradan kaynaklanan bias'ı önler ve daha ucuzdur.

| Etkileşim | Sahip | Sonuç |
|---|---|---|
| Fire ↔ Wood/Plant/Oil | Fire | hedef → BURNING_* (olasılık = yanıcılık) |
| Fire ↔ Water | Fire | Water → Steam, Fire söner |
| BURNING_* ↔ yanıcı / boşluk | BURNING_* | yangın yayılır; üstteki boşluğa Fire üretir (üst sınırlı) |
| BURNING_* ↔ Water | BURNING_* | söner (tekrar Wood/Plant olur), Water → Steam |
| Lava ↔ Water | Lava | Water → Steam; lavanın soğuma sayacı artar, eşiği geçince Stone olur |
| Lava ↔ yanıcı | Lava | tutuşturur |
| Sand ↔ Lava | Sand | ısı sayacı artar (temas yoksa azalır), eşiği geçince Glass olur |
| Plant ↔ Water | Plant | su tüketilir → yeni Plant oluşur (bütçe − 1); tick başına global üst sınır var |
| Steam (tek başına) | Steam | ömrü bitince olasılıkla Water olur, olmazsa kaybolur; kapalı alanda da yoğuşur |
| Fire (tek başına) | Fire | ömrü bitince söner |
| BURNING_OIL | kendisi | akmaya devam eder; ömrü boyunca Fire'ı besler |
| BURNING_WOOD sonu | kendisi | zamanla kararır (life); sonunda EMPTY ya da Ash olur |

**B5 — Full-grid update, erken atlamalı (v1)**

- **Neden chunk'sız başlıyoruz:**
  - Yaklaşık 90k hücrede boş ve inert hücreleri erkenden atlamak taramayı ucuz tutar.
  - Asıl maliyet hareketli parçacıklardan gelir. Sürekli hareket eden sıvılar chunk'tan zaten fayda görmez.
- **Hazırlık:** tüm yazmalar `world` primitive'lerinden geçer. `markActive()` sonradan tek bir noktaya eklenebilir.
- **Karar zamanı:** Phase 10'da, benchmark ölçümüne göre.
- **Chunk'a geçme eşiği** (ikisinden biri gerçekleşirse):
  - 1× hızda masaüstünde tick süresi yaklaşık 6 ms'yi aşıyor.
  - Mobilde hedef FPS tutmuyor.

**B6 — Fixed timestep**

- **Tick hızı:** taban 60 TPS. `tickMs = 1000 / (60 × speed)`, yani 0.5× → 30, 1× → 60, 2× → 120, 4× → 240 TPS.
- **Her frame:**
  - `dt` en fazla 100 ms olacak şekilde kırpılır.
  - Frame başına en fazla 8 tick çalışır ve yaklaşık 8 ms fizik bütçesi aşılmaz.
  - Sınıra takılırsa birikmiş borç silinir (`acc = min(acc, tickMs)`), böylece "spiral of death" oluşmaz.
- **Hızlandırma:** tick sıklığıyla yapılır; parçacıklar tick başına daha çok hücre zıplamaz.
- **Gerçekleşen TPS** stats'ta görünür.
- **Accumulator engine içindedir** ve Node'da test edilir. rAF döngüsü `app/loop.js`'dedir.
- **Tab hidden olunca** döngü durur. Tekrar görünür olduğunda `last = now` ve `acc = 0` yapılır.

**B7 — Tick sırası: iki geçiş + stamp kuralları**

- **Geçişler:**
  - Birinci geçiş aşağıdan yukarı yapılır: tozlar, sıvılar ve reaktif statikler.
  - İkinci geçiş yukarıdan aşağı yapılır: gazlar (Fire, Steam).
- **Yatay yön:** tick paritesi XOR satır paritesi ile belirlenir.
- **Stamp kuralları:**
  - Yer değiştiren iki hücre de stamp'lenir.
  - Bu tick'te stamp'lenmiş bir hücreyle swap yapılmaz. Böylece bir kabarcık tek tick'te bütün sütunu tırmanamaz.
  - Transform olan ya da yeni oluşan hücre de stamp'lenir. Böylece yangın tek tick'te bütün sütuna yayılamaz.
- **Köşegen hareket:** yalnızca o taraftaki yatay komşu da geçilebilirse yapılır. Böylece ince çapraz duvarlardan sızıntı olmaz.
- **Faz kuralları:**
  - Sıralama: gaz/hava < sıvı < toz < statik.
  - Sıvı tozu itemez.
  - Aynı fazda yoğunluğu yüksek olan aşağı iner.
  - Toz sıvıya olasılıksal olarak batar; bu, sürtünme hissi verir.
- **Sıvı yayılması:**
  - Yol üzerindeki her hücre kontrol edilir, tünelleme olmaz.
  - Altı boş hücreye gelince durur, çünkü düşmenin önceliği vardır.
  - Akış yönü `flags`'te kalıcıdır ve yalnızca önü tıkanınca döner. Bu, hızlı seviyelenme ve az titreme sağlar.
- **Lava** her zaman serbest düşer. Viskozite yalnızca yatay yayılmayı yavaşlatır.
- **Transform** `life` değerini her zaman yeniden ayarlar. **Swap** ise variant, life ve flags değerlerini birlikte taşır.

**B8 — Renderer: ImageData + LUT + katmanlı birleştirme**

- **Sim buffer:**
  - Grid boyutunda bir ImageData ve üzerinde `Uint32Array` view.
  - Renk `PALETTE[type*32 + ton]` ile okunur.
  - Dinamik materyaller (fire, lava, yanma, ısınan kum) için küçük bir switch kullanılır.
  - EMPTY şeffaftır.
- **Katman sırası:**
  1. Cache'li arka plan (sunum çözünürlüğünde).
  2. Sim canvas (`imageSmoothingEnabled = false`; bu ayar her resize'da yeniden set edilir).
  3. Glow (`lighter` modunda).
  4. Brush preview.
- **Sim buffer'ı yalnızca bir tick ya da paint olduysa** yeniden doldururuz (`view.version` ile anlaşılır). 144 Hz ekranlarda ve 0.5× hızda bu, maliyeti yarıya indirir.
- **DPR** en fazla 2'dir.

**B9 — PRNG: sfc32 + cyrb128 seed hash**

- **Seed:** string seed cyrb128 ile hash'lenir ve 4×u32 state üretir. UI'da kısa base36 metin olarak görünür.
- **Ayrı stream'ler:** `sceneRng`, `simRng` ve `inputRng` (spray için).
- **Kozmetik ton:** `hash(index, tick)` ile hesaplanır. Palet değişikliği fiziği etkilemez.
- **`Math.random` engine'de yasak.** Testlerde, çağrılırsa hata fırlatacak şekilde stub'lanır.
- **Sahne üretimi yalnızca aritmetik kullanır:** `+ − × ÷`, `Math.sqrt`, `floor`, `imul`. `Math.sin`, `exp` ve `pow` kullanılmaz, çünkü tarayıcılar arasında bit farkı çıkabilir.

**B10 — ImageData stratejisi**

- **Tek ImageData** bir kez ayrılır ve tekrar kullanılır.
- **Çizim:** önce `putImageData` ile W×H boyutlu gizli bir `<canvas>`'a yazılır, sonra `drawImage` ile büyütülür. Eski Safari yüzünden OffscreenCanvas kullanılmaz.
- **Glow için ışık kaynakları** aynı pixel döngüsünde ayrı bir buffer'a yazılır.
- **Blur:** bu buffer küçültülüp büyütülerek bilinear blur uygulanır.
- **`ctx.filter`** yalnızca HIGH kalitede ve bir piksel geri okuma testiyle desteklendiği doğrulanırsa kullanılır.

**B12 — Undo: snapshot (senin kararın)**

- **Nasıl çalışır:** her stroke'un başında dünyanın tam kopyası alınır. Undo dünyayı çizimden hemen önceki ana birebir döndürür.
- **Clear da** aynı mekanizmayla geri alınabilir.
- **Scene load** undo'yu geçersiz kılar.
- **Bellek** sabit ve sınırlıdır.

**B13 — Brush uygulaması**

- **Anında uygulama:** çizgi segmentleri pointer event'lerinde hemen uygulanır; pause'dayken de çalışır.
- **Basılı tutma:** yalnızca pointer hareketsizken basılı tutulursa (hold-to-pour) brush tick başına yeniden uygulanır. Bu, refresh rate'ten bağımsızdır.
- **Varsayılan yazma:** yalnızca EMPTY ve gaz hücrelerine yazılır.
- **Replace modu:** Shift ile ya da mobilde UI toggle ile açılır.
- **WALL** hiçbir zaman boyanamaz.

---

## C. Geliştirme Roadmap

**Durum işaretleri:**
- `[ ]` başlanmadı
- `[~]` devam ediyor
- `[x]` tamamlandı — yalnızca test edildikten sonra işaretlenir

Bu roadmap Phase 0'da `docs/DEVELOPMENT.md`'ye taşınacak.

### Phase 0 — Repository, iskelet ve dokümanlar
- [ ] `git init`, `.gitignore` (`.claude/settings.local.json` dahil), `.nojekyll`, `LICENSE` (MIT)
- [ ] `.claude/settings.json`: projeye özel (senin kararın); kişisel UI tercihleri (theme, bildirim, remoteControl, autoUpdates) kopyalanmaz. Planlanan içerik:
  ```json
  {
    "$schema": "https://json.schemastore.org/claude-code-settings.json",
    "language": "Turkish",
    "enabledPlugins": {
      "context7@claude-plugins-official": true,
      "playwright@claude-plugins-official": true,
      "superpowers@claude-plugins-official": true
    },
    "permissions": {
      "allow": [
        "Bash(npm test)", "Bash(npm run serve)", "Bash(npm run bench)",
        "Bash(node --test *)", "Bash(node tools/*)",
        "Bash(git status)", "Bash(git diff *)", "Bash(git log *)",
        "PowerShell(npm test)", "PowerShell(npm run serve)", "PowerShell(npm run bench)",
        "PowerShell(node --test *)", "PowerShell(node tools/*)",
        "PowerShell(git status)", "PowerShell(git diff *)", "PowerShell(git log *)"
      ],
      "ask": ["Bash(git push *)", "PowerShell(git push *)"]
    }
  }
  ```
  - `git push` her zaman onayına sunulur, çünkü yayınlama senin kararın.
  - Global dosyandaki `defaultMode: auto` ve `model` ayarları global kalır; burada tekrarlanmaz.
  - **Doğrulama:** dosya Node ile JSON olarak parse edilir. `/permissions` ekranında kuralların göründüğünü sen kontrol edersin.
  - **Not:** Pages repo kökünden yayınlandığı için `.claude/settings.json` da herkese açık olur. İçinde gizli bir bilgi yok.
- [ ] `package.json` (`"type":"module"`; `test`, `serve` ve `bench` script'leri; 0 dependency)
- [ ] `tools/serve.js`: sıfır bağımlılıklı statik sunucu (`.js` → `text/javascript`)
- [ ] `index.html` iskeleti (relative path'ler, module entry, canvas, panel yer tutucuları)
- [ ] `css/base.css` token'ları
- [ ] `js/config.js` (`APP_NAME = 'Strata'`, `STORAGE_KEY`, sabitler)
- [ ] `README.md` iskeleti: tüm başlıklar yer alır ve "yapım aşamasında" notu düşülür
- [ ] `CHANGELOG.md` (Keep a Changelog formatı, `Unreleased` bölümü)
- [ ] `docs/DEVELOPMENT.md` (roadmap + manuel test checklist + benchmark log tablosu)
- [ ] `docs/ARCHITECTURE.md` (bu planın A bölümü)
- [ ] `docs/DECISIONS.md` (B1–B13'ten önemli olanlar ADR olarak)
- [ ] `tests/imports.test.js`: import specifier'larını diskteki gerçek dosya adı harfleriyle karşılaştırır
- [ ] **Test:** `npm test` geçer; `npm run serve` ile sayfa açılır; Playwright MCP ile konsol hatası kontrol edilir

### Phase 1 — Simulation Core + görünür ilk dilim
- [ ] `rng.js`: sfc32, cyrb128, stream fork
- [ ] `world.js`: SoA array'ler, WALL padding, `idx(x,y)` ve koordinat yardımcıları
- [ ] World primitive'leri: `set`, `swap`, `move`, `transform`, `clear` (tek yazma noktası)
- [ ] Stamp mekanizması (Uint16, taşmada fill ve 1'den başlama)
- [ ] `materials.js`: tanım tablosu, derleyici, `DISPLACE` matrisi; ilk materyaller EMPTY, WALL, SAND, STONE
- [ ] `kernels.js`: `stepPowder` (aşağı, köşegen, köşe sızıntısı kuralı)
- [ ] `simulation.js`:
  - [ ] iki geçişli `tick()` ve alternating scan
  - [ ] `step`, `play`/`pause`, `setSpeed`
  - [ ] `update(dt, budget)`
- [ ] Parçacık sayımı tarama sırasında yapılır (ek maliyet yok)
- [ ] Runtime assertion'lar (DEBUG bayrağıyla: tip aralığı, WALL bütünlüğü)
- [ ] Minimal vertical slice: `main.js` + geçici basit ImageData çizimi + `app/loop.js` → kum tarayıcıda düşüyor
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
  - [ ] Sol/sağ bias yok: merkezden dökülen kumda, birden çok seed'le sol/sağ kütle farkı toleransın altında
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
  - [ ] N tick sonra her sütunda Oil, Water'ın üstündedir
  - [ ] Steam ve Fire yükselir
  - [ ] Dam-break sonrası su yüzeyinin yükseklik varyansı eşiğin altındadır
  - [ ] Su tek hücrelik çapraz duvardan sızmaz
  - [ ] Statikler yer değiştirmez
  - [ ] Reaksiyonsuz modda kütle korunur
  - [ ] Su için sağ/sol simetri vardır

### Phase 3 — Reaction System
- [ ] `reactions.js`: `ignite`, `heat`, `cool`, `transform`, `spawnAbove`, rastgele tek komşu örnekleme
- [ ] Fire:
  - [ ] ömür ve sönme
  - [ ] Wood/Plant/Oil'i tutuşturma
  - [ ] Water ile karşılaşınca Steam üretme
- [ ] BURNING_WOOD:
  - [ ] yanma süresi ve kararma
  - [ ] Fire üretimi (üst sınırlı)
  - [ ] komşuya yayılma
  - [ ] suyla sönme
  - [ ] sonunda EMPTY ya da Ash
- [ ] BURNING_PLANT (hızlı yanma)
- [ ] BURNING_OIL (akarak yanar, Fire'ı besler)
- [ ] Lava:
  - [ ] Water → Steam ve soğuma sayacı → Stone
  - [ ] yanıcıları tutuşturma
  - [ ] izole lavanın yavaş soğuması
- [ ] Sand ısı birikimi → Glass
- [ ] Steam yoğuşma zamanlayıcısı → Water
- [ ] Plant: su tüketerek büyüme, miras bütçe, global tick üst sınırı
- [ ] Ash (hafif toz)
- [ ] **Test:**
  - [ ] Her reaksiyon izole ve deterministik bir senaryoda doğru sonucu verir: Lava + Water → Steam artar ve Stone oluşur; lavayla uzun temas → Glass, kısa temas → Glass yok
  - [ ] Wood sonunda tükenir
  - [ ] Oil, Fire'ı belirli bir süre besler
  - [ ] Plant büyümesi hem su miktarıyla hem bütçeyle sınırlıdır
  - [ ] Steam kapalı kutuda yoğuşur
  - [ ] Kaynaksız Fire temizlenir
  - [ ] Lava+Water kapalı kutusu 10k tick sonunda sınırlı ve stabil kalır
  - [ ] Hiçbir reaksiyon çift sayılmaz (oran testi)

### Phase 4 — Renderer
- [ ] `palette.js`: renk rampaları → Uint32 LUT (endianness tespiti)
- [ ] `renderer.js`:
  - [ ] DPR (en fazla 2)
  - [ ] tam sayı ölçek + letterbox
  - [ ] katman birleştirme
  - [ ] `clientToCell`
  - [ ] geçici çizimin yerini alır
- [ ] Dinamik renkler: fire (life + flicker), lava nabzı, yanmada kararma, ısınan kumun tonu
- [ ] `background.js`: gradyan, strata siluetleri, seed'li yıldızlar; cache'li
- [ ] `version` tabanlı "yalnızca değiştiyse yeniden doldur"
- [ ] **Test:**
  - [ ] LUT pack/unpack Node'da çalışır (her iki endianness)
  - [ ] Ölçek ve `clientToCell` matematiği Node'da doğrulanır
  - [ ] Render öncesi ve sonrası view hash'i aynıdır (renderer state yazmaz)
  - [ ] Playwright MCP ile ekran görüntüsü + konsol kontrolü
  - [ ] DPR 1 ve 2'de görsel kontrol

### Phase 5 — Input / Brush / Undo
- [ ] `brush.js`:
  - [ ] Circle/Square/Spray footprint'leri
  - [ ] `(dx,dy)` cache'i ve kırpma
  - [ ] 4-connected çizgi interpolasyonu (adım ≤ size/2)
- [ ] `pointer.js`:
  - [ ] Pointer Events ve `setPointerCapture`
  - [ ] `getCoalescedEvents` (feature detect)
  - [ ] `pointercancel` stroke'u bitirir
  - [ ] context menu kapalı
  - [ ] sağ tık geçici Eraser olur
  - [ ] canvas'ta `touch-action: none`
- [ ] Hemen uygulanan `paintLine` ve basılı tutmada `setHold`
- [ ] Replace modu (Shift + UI toggle); WALL korumalı
- [ ] Spray (`inputRng`)
- [ ] Snapshot undo (önceden ayrılmış buffer'lar, RNG state ve tick dahil); Clear geri alınabilir
- [ ] Brush preview (`renderer.setBrushPreview`); touch'ta gizli
- [ ] **Test:**
  - [ ] Footprint simetrik ve alanı ≈ πr²
  - [ ] Çizgide boşluk yok
  - [ ] Undo sonrası hash stroke öncesiyle aynı
  - [ ] Tekrarlanan stroke'larda allocation olmuyor
  - [ ] Replace kapalıyken dolu hücre korunuyor
  - [ ] WALL boyanamıyor
- [ ] **Manuel test:** mouse, touch, stylus, hızlı çapraz çizim, basılı tutma

### Phase 6 — UI ve uygulama katmanı
- [ ] Semantik `index.html` (header, canvas bölgesi, aside panel), `layout.css`, `controls.css`
- [ ] `controls.js`:
  - [ ] material picker (radiogroup, numune kartları)
  - [ ] brush size ve shape
  - [ ] Play/Pause, Step, Speed
  - [ ] Clear
  - [ ] Scene picker
  - [ ] Seed alanı, New Seed, Regenerate
  - [ ] Capture, Undo, Replace
- [ ] `keyboard.js`:
  - [ ] Materyaller: 1–0, G (Glass)
  - [ ] Space (Pause/Play), `.` (Step)
  - [ ] `[` / `]` (brush küçült/büyüt)
  - [ ] Ctrl/Cmd+Z (Undo)
  - [ ] S (shape döngüsü), `+` / `−` (hız), `?` (kısayol yardımı)
  - [ ] Input'a odaklanınca kısayollar devre dışı
- [ ] `stats.js`:
  - [ ] PARTICLES/FPS/GRID/SPEED/SEED, yaklaşık 400 ms aralıkla
  - [ ] `?debug=1` paneli: physics ms, render ms, TPS, active cells, quality, cursor cell/material
- [ ] `storage.js`: try/catch, şema doğrulama, clamp
- [ ] URL parametreleri: `?debug=1`, `?scene=`, `?seed=`
- [ ] Debug modda `window.__strata` test kancası
- [ ] Capture:
  - [ ] içerik: arka plan + sim + glow (preview hariç)
  - [ ] PNG olarak indirme
  - [ ] dosya adı: `strata-<scene>-<seed>-<time>.png`
- [ ] **Test:**
  - [ ] Storage bozuk veri ve erişim hatası senaryoları (Node stub)
  - [ ] Stats güncelleme sıklığı
  - [ ] Playwright MCP ile buton ve kısayol smoke testi
  - [ ] Capture çıktısının kontrolü

### Phase 7 — Procedural Scenes
- [ ] `scenes/tools.js`: hash tabanlı value noise, rect/circle/polygon/heightmap doldurma
- [ ] `scenes/index.js`: `{ id, name, generate(world, rng) }` kayıtları
- [ ] Volcano (default):
  - [ ] stone koni ve krater lavası
  - [ ] yamaçlarda sand
  - [ ] göl
  - [ ] plant ve wood ağaçlar
  - [ ] opsiyonel: sınırlı ömürlü EMITTER
- [ ] Hourglass:
  - [ ] glass duvarlar ve çerçeve
  - [ ] sand dolu üst hazne
  - [ ] 2–3 hücrelik dar boğaz
  - [ ] opsiyonel: Flip
- [ ] Oasis: seed'li kumullar, stone çevrili gölet, bitki örtüsü, palmiyeler
- [ ] Chaos Lab: kontrollü rastgelelik (platformlar, kaplar, blob'lar, en fazla %40 doluluk); regenerate ve yeni seed
- [ ] Benchmark sahnesi (sabit seed): `?scene=benchmark` veya debug picker'dan açılır
- [ ] **Test:**
  - [ ] Aynı (seed, W, H) üçlüsü aynı hash'i verir
  - [ ] Farklı seed farklı hash verir
  - [ ] Farklı grid boyutlarında hatasız üretilir
  - [ ] Hourglass'ta alt haznedeki kum artar ve toplam kum korunur
  - [ ] Üretim süresi yaklaşık 50 ms'nin altında

### Phase 8 — Görsel efektler
- [ ] `glow.js`: ışık kaynağı buffer'ı, küçültüp büyüterek blur, `lighter` birleştirme
- [ ] `ctx.filter` blur (geri okumayla doğrulanırsa, yalnızca HIGH)
- [ ] HIGH/MEDIUM/LOW + auto: kayan ortalama frame süresi, histerezis; yalnızca dekoru etkiler
- [ ] `prefers-reduced-motion`: flicker genliği azalır, arka plan animasyonu ve CSS transition'lar kapanır
- [ ] **Test:**
  - [ ] Her kalite seviyesinde render ms ölçümü
  - [ ] Auto kalite yapay yük altında düşer, sonra geri gelir
  - [ ] Reduced motion emülasyonu
  - [ ] Fizik hash'i kalite ayarından bağımsızdır

### Phase 9 — Mobil / Responsive / Accessibility
- [ ] Mobil layout:
  - [ ] canvas üstte
  - [ ] kompakt alt araç çubuğu; materyal şeridi kendi içinde kaydırılır
  - [ ] ikincil kontroller bir çekmecede
- [ ] Viewport ve dokunma ayarları:
  - [ ] `100dvh` (fallback `100vh`)
  - [ ] safe-area
  - [ ] `overscroll-behavior: none`
  - [ ] `-webkit-touch-callout: none`
- [ ] Resize ve DPR takibi:
  - [ ] ResizeObserver
  - [ ] DPR için `matchMedia` dinleyicisi
- [ ] Tablet breakpoint
- [ ] Erişilebilirlik:
  - [ ] klavye navigasyonu
  - [ ] görünür focus
  - [ ] label'lar
  - [ ] ARIA (radiogroup, `aria-pressed`, `aria-live`)
  - [ ] AA kontrast
  - [ ] touch hedefleri ≥ 44px
  - [ ] canvas için erişilebilir ad
- [ ] **Test:**
  - [ ] 360×640, 768×1024, 1280×800, 1920×1080'de yatay scroll yok
  - [ ] Resize ve rotasyonda grid ile parçacık sayısı değişmez
  - [ ] Tüm kontrollere klavyeyle erişilir
  - [ ] Touch emülasyonuyla çizim yapılabilir
- [ ] **Manuel test:** gerçek cihazda iOS Safari + Android Chrome

### Phase 10 — Performance
- [ ] `tools/bench.js`: N tick, median/p95 ms/tick → DEVELOPMENT.md benchmark log
- [ ] Profil:
  - [ ] hot loop'ta allocation yok
  - [ ] typed array'ler lokal referanslarda
  - [ ] RNG state lokal değişkenlerde
  - [ ] olasılıklar u32 eşik olarak
- [ ] Frame bütçesi ve tick üst sınırı kalibrasyonu; mobil hücre bütçesi kalibrasyonu
- [ ] Active chunk kararı (B5 eşiklerine göre). Gerekirse:
  - [ ] 32×32 chunk
  - [ ] uyku sayacı
  - [ ] debug overlay
- [ ] **Test:**
  - [ ] Değişiklik öncesi ve sonrası benchmark karşılaştırması
  - [ ] Chunk eklenirse: tüm fizik suite'i geçer; uyuyan chunk'ta hareket kaybolmaz; kütle korunur

### Phase 11 — GitHub Pages
- [ ] Root-absolute URL olmadığını tara (`"/` ve `'/` ile başlayan path yok)
- [ ] Favicon, meta description, `theme-color`
- [ ] Opsiyonel: `.github/workflows/test.yml` (push/PR'da `npm test`; deploy için gerekmez)
- [ ] Senin adımların:
  - [ ] GitHub'da repo oluşturmak
  - [ ] push etmek
  - [ ] Settings → Pages → `main` / root seçmek
- [ ] Yayındaki URL'de smoke test (Playwright MCP): modüller yükleniyor, konsol temiz, alt dizin path'leri çalışıyor
- [ ] README'nin deployment bölümü

### Phase 12 — Final QA ve v1.0.0
- [ ] Manuel checklist: Chrome, Firefox, Safari, iOS Safari, Android Chrome
- [ ] 30 dakikalık uzun koşu: bellek sabit, FPS stabil
- [ ] Dokümanlar güncel (README ekran görüntüleri, ARCHITECTURE, DECISIONS, CHANGELOG 1.0.0)
- [ ] Known Issues listesi (ör. basınç olmadığı için U-tube seviyelenmez)
- [ ] `v1.0.0` tag'i (senin onayınla)

---

## D. Test Stratejisi

**1. Unit ve deterministik simülasyon testleri**
- Araç: `node --test tests/` (Node 22'ye yerleşik, dependency yok).
- Engine DOM'suz olduğu için şunlar headless test edilir: fizik, reaksiyonlar, sahneler, brush, undo, storage mantığı.
- Senaryolar ASCII-art ile kurulur. Örnek: `makeWorld("..S..\n.....\n~~~~~")`.
- Yardımcılar: `runTicks(n)`, `hashWorld()`, `count(material)`.

**2. Invariant testleri**
- kütle korunumu
- sol/sağ bias
- stamp
- sınırlı büyüme
- golden hash — fizik bilinçli olarak değiştirildiğinde elle güncellenir

**3. Runtime assertion'lar**
- Yalnızca DEBUG modda çalışır: testlerde ve `?debug=1` ile.
- Production'da tek bir boolean dalı olarak kalır, maliyeti yoktur.

**4. Browser smoke testleri**
- Repoya Playwright/Puppeteer **eklenmiyor**. v1 için dependency ve CI karmaşıklığı getirmeye değmiyor.
- Geliştirme sırasında bu oturumdaki **Playwright MCP** ile şunları yapacağım:
  - sayfa yükleme ve konsol kontrolü
  - buton ve kısayol testleri
  - viewport ve touch emülasyonu
  - reduced motion emülasyonu
  - ekran görüntüleri
- `window.__strata` kancası debug modda testleri kolaylaştırır.

**5. Manuel checklist**
- `DEVELOPMENT.md` içinde tutulur.
- Gerçek cihazda touch ve stylus testleri özellikle burada yer alır.

**6. Performans**
- `tools/bench.js` + tarayıcıdaki debug stats.
- Sonuçlar benchmark log tablosunda karşılaştırılır.

| Sistem | Yöntem |
|---|---|
| Physics | ASCII fixture'lı deterministik testler; korunum, bias ve stamp invariant'ları |
| Reactions | izole senaryolar, oran ve sınır testleri, 10k tick stabilite |
| Renderer | saf parçalar Node'da (LUT, endianness, ölçek, `clientToCell`); view hash'i değişmezliği; MCP ekran görüntüsü |
| Brush | footprint ve interpolasyon Node'da; hızlı çizim manuel |
| Touch | MCP touch emülasyonu + gerçek cihaz |
| Scenes | (seed, W, H) hash determinizmi, çoklu grid boyutu, hourglass akış testi |
| Seed | RNG dizisi, string → state, `?seed=` gidiş-dönüşü |
| Resize | MCP ile resize: grid ve parçacık sayısı sabit, yatay scroll yok |
| Performance | bench median/p95, frame bütçesi, 30 dk bellek testi |
| Mobile | 360px viewport, dvh/safe-area, gerçek cihaz |

**Kural:** Test edilmemiş hiçbir görev `[x]` olarak işaretlenmez.

---

## E. Teknik Riskler

| Risk | Mitigation |
|---|---|
| Directional bias | tick XOR satır paritesi, rastgele köşegen seçimi, kalıcı sıvı yönü, bias testi |
| Double update | stamp; stamp'li hedefle swap yok; transform/spawn edilen hücre de stamp'lenir |
| Reaksiyonların çift işlenmesi / oran bias'ı | tek sahip tablosu, rastgele tek komşu örnekleme |
| Reaction loop (lava↔su↔buhar) | Steam olasılıkla yoğuşur ve bir kısmı kaybolur; lavanın soğuma sayacı sonunda Stone'a götürür; 10k tick testi |
| Plant runaway | büyüme suyu tüketir, bütçe mirasla azalır, tick başına global üst sınır var |
| Steam/Fire ekranı doldurması | ömür sınırı, Fire üretim üst sınırı, kapalı alanda da yoğuşma |
| Köşe sızıntısı | köşegen kuralı, 4-connected çizgi |
| Brush gaps | interpolasyon + coalesced events |
| Resize state kaybı | sabit iç grid |
| Mobil performans / yüksek parçacık sayısı | hücre bütçesi, erken atlama, `DISPLACE` LUT, allocation'sız döngü, frame bütçesi, adaptive quality, chunk opsiyonu |
| Bloom maliyeti | küçült-büyüt blur, LOW'da kapalı, auto quality |
| Determinizm | `Math.random` yasağı (stub testi), ayrı stream'ler, kozmetik hash, yalnızca aritmetik noise, (seed, W, H) kapsamı |
| Stamp taşması | `fill(0)` sonrası sayaç 1'den başlar; test edilir |
| Padding aşımı | tüm kurallar en fazla 1 hücre uzağa bakar (assert) |
| Windows ↔ Pages büyük/küçük harf farkı | küçük harfli dosya adları, import testi, yeniden adlandırmada `git mv` |
| Windows'ta `python http.server` `.js` dosyasını `text/plain` servis ederse module yüklenmez | `tools/serve.js` |
| Pages cache'i (`max-age=600`) yüzünden yeni ve eski modüller karışabilir | bilinen durum olarak belgelenir; sorun olursa import map ile versiyonlama |
| iOS Safari | eski canvas'lar serbest bırakılır (`width = 0`); `ctx.filter` geri okumayla doğrulanır; OffscreenCanvas yok; `touch-action: none` |
| Snapshot undo simülasyon zamanını da geri alır | bilinçli karar; UI ipucu: "son çizimden önceki ana döner" |
| Basınç yok, U-tube seviyelenmez | CA sınırlaması; Known Issues'a yazılır |

---

## F. GitHub Pages Stratejisi

- **Repo yapısı:** A.1'deki gibi. Repo kökü aynı zamanda site köküdür.
- **Asset path'leri:**
  - Her yerde relative path kullanılır: `./css/base.css`, `./js/main.js`.
  - Import'larda uzantı yazılır: `./world.js`.
  - Gerekirse `new URL('./assets/x.svg', import.meta.url)` kullanılır.
  - `/...` ile başlayan root-absolute path kullanılmaz.
- **Deploy:** Settings → Pages → *Deploy from a branch* → `main` / `(root)`. `.nojekyll` eklenir; aksi halde Jekyll `_` ile başlayan dosyaları atar.
- **Local development:**
  - `npm run serve` (`tools/serve.js`, `http://localhost:8080`).
  - `file://` üzerinden ES module çalışmaz.
  - Alternatif olarak VS Code Live Server kullanılabilir.
- **ES module davranışı:**
  - Pages dosyaları doğru MIME tipiyle servis eder.
  - Path'ler büyük/küçük harfe duyarlıdır.
  - Her modül ayrı bir istektir; HTTP/2 ile sorun olmaz, gerekirse `<link rel="modulepreload">` eklenir.
  - Cache süresi 10 dakikadır.
- **GitHub Actions:**
  - Deploy için gerekmiyor.
  - Opsiyonel olarak push/PR'da `npm test` çalıştıran hafif bir CI workflow'u eklenebilir (Phase 11).

---

## G. İlk Implementasyon Adımı

"Başla" dediğinde sırasıyla şunları yapacağım:

**1. Phase 0 — iskelet ve dokümanlar**
- `.claude/settings.json` (projeye özel Claude Code ayarları)
- `.gitignore`, `.nojekyll`, `LICENSE`, `package.json`
- `tools/serve.js`
- `index.html`, `css/base.css`, `js/config.js`
- `README.md`, `CHANGELOG.md`
- `docs/DEVELOPMENT.md`: bu roadmap, tüm maddeler `[ ]`
- `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`
- `tests/imports.test.js`
- Ardından `git init`. Commit'i senin onayınla atarım.

**2. Phase 1'in ilk sistemi — veri katmanı (TDD, önce testler)**
- `tests/helpers.js`, `tests/rng.test.js`, `tests/world.test.js`
- `js/engine/rng.js`: sfc32, cyrb128, stream'ler
- `js/engine/world.js`: typed array'ler, WALL padding, index yardımcıları, primitive'ler, stamp

**3. Aynı fazın devamı**
- `materials.js` (EMPTY/WALL/SAND/STONE + `DISPLACE`), `kernels.js` (`stepPowder`)
- `simulation.js` (iki geçişli tick + fixed timestep)
- "Sand düşer / yığın oluşturur / bias yok" testleri
- Minimal vertical slice: kum tarayıcıda düşüyor

**Her faz sonunda:**
- `DEVELOPMENT.md` ve `CHANGELOG.md` güncellenir.
- Sana Türkçe kısa bir rapor veririm: ne yapıldı, testlerin çıktısı, açık konular.
- Commit'i senin onayınla atarım.

## Doğrulama (uçtan uca)
- `npm test`: tüm Node testleri geçmeli.
- `npm run serve`, ardından Playwright MCP ile:
  - sayfa açılıyor ve konsol temiz
  - çizim, kısayollar ve butonlar çalışıyor
  - 360px'te yatay scroll yok
  - resize'da state korunuyor
- `npm run bench`: tick süreleri DEVELOPMENT.md benchmark log'una yazılır.
- Yayında da aynı smoke test repo alt dizini URL'sinde tekrarlanır.

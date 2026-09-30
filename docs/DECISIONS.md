# Strata Sandbox — Karar Kaydı (ADR)

Burada yalnızca gerçekten önemli teknik kararlar tutulur. Her kayıt dört başlık içerir:

- **Karar:** ne seçildi
- **Neden:** gerekçe
- **Alternatif:** değerlendirilen diğer seçenek
- **Sonuç:** alternatifin akıbeti

---

## ADR-001 — Vanilla JS + native ES modules, build yok

- **Karar:** React/Vue gibi framework ya da Vite gibi bir build sistemi kullanılmayacak. Kod doğrudan tarayıcıda çalışan ES module'lerdir.
- **Neden:**
  - Yaklaşık 25 modül HTTP/2 üzerinde sorun olmaz.
  - Çalışan kod kaynak kodun ta kendisidir; bu, debug'ı kolaylaştırır.
  - Runtime dependency sayısı 0'dır.
  - GitHub Pages ile doğrudan uyumludur.
- **Alternatif:** Vite (HMR, minify, bundling).
- **Sonuç:** Reddedildi. Bu ölçekte belirgin bir kazanç sağlamıyor.
  - **Yeniden değerlendirme şartı:** modül sayısı yaklaşık 60'ı geçerse ya da yükleme waterfall'u ölçülebilir bir sorun olursa.

## ADR-002 — Sabit iç grid; resize yalnızca sunumu değiştirir

- **Karar:** Fizik grid'inin boyutu açılışta, konteynıra ve cihazın hücre bütçesine göre bir kez belirlenir. Sonraki viewport değişiklikleri yalnızca görsel ölçeği etkiler.
- **Neden:**
  - Mobilde adres çubuğu ya da ekran dönmesi dünyayı bozmaz.
  - Resize maliyeti yaklaşık sıfırdır.
  - Piksel okunabilirliği sabit kalır.
- **Alternatif:** Viewport değiştikçe grid'i yeniden boyutlandırmak.
- **Sonuç:** Reddedildi. State kaybı ya da yeniden örnekleme karmaşıklığı getirir.
  - **Bedeli:** ekran döndüğünde kenarlarda boşluk (letterbox) kalır.

## ADR-003 — v1'de per-cell sıcaklık alanı yok

- **Karar:** Reaksiyonlar temas tabanlı çalışır. Yerel ısı ve soğuma `life` sayaçlarında tutulur; örneğin lavaya dokunan kumun ısısı birikir. Tüm reaksiyonlar `heat`/`cool`/`ignite`/`transform` primitive'lerinden geçer.
- **Neden:**
  - İstenen tüm reaksiyonlar temas tabanlı.
  - Genel bir ısı alanı her tick'e ek bir difüzyon geçişi ekler; maliyet yaklaşık iki katına çıkar.
  - Ayrıca dengelemesi zor emergent davranışlar doğurur.
- **Alternatif:** Her hücre için `Int16Array temperature`.
- **Sonuç:** Ertelendi. Ice, Snow ya da Metal eklendiğinde yeniden değerlendirilecek. Sıcaklık alanı primitive'lerin arkasına eklenebilir.

## ADR-004 — Reaksiyonlarda "tek sahip" kuralı

- **Karar:** Her etkileşim çiftini yalnızca bir taraf işler; örneğin Lava↔Water etkileşimini Lava işler. Sahip hücre, her tick 8 komşusundan rastgele birini örnekler.
- **Neden:**
  - Etkileşimi iki tarafın da işlemesi reaksiyonları çift saydırır.
  - Sabit komşu sırası yön ve oran bias'ı üretir.
- **Alternatif:** Her iki tarafın da kontrol etmesi, sabit komşu sırası.
- **Sonuç:** Reddedildi.
- **Uygulamadaki bilinçli istisnalar (Phase 3):**
  - Ateş tick başına 2 komşu örnekler. Kısa ömürlü ve hareketli olduğu için tek örnekle yakıtı çoğu zaman tutuşturamıyordu.
  - Kum ısınmasını lava yönetir; kum yalnızca soğur. Büyük kum yığınlarında örnekleme maliyetini önler. Tablo: ARCHITECTURE.md §5.

## ADR-005 — v1'de full-grid update; active chunk ölçüme göre

- **Karar:** Tüm grid her tick taranır; boş ve inert hücreler erkenden atlanır. Tüm yazmalar world primitive'lerinden geçer, böylece `markActive()` sonradan tek bir noktaya eklenebilir.
- **Neden:**
  - Yaklaşık 90k hücrede tarama ucuzdur; asıl maliyet hareketli parçacıklardan gelir.
  - Chunk sistemi uyku ve uyandırma hataları riski taşır.
- **Alternatif:** Phase 1'den itibaren 32×32 active chunk.
- **Sonuç:** Ertelendi. Karar Phase 10'da benchmark ile verilecek.
  - **Eşik:** masaüstünde 1× hızda tick süresi yaklaşık 6 ms'yi aşarsa ya da mobilde hedef FPS tutmazsa chunk sistemi eklenir.
- **Phase 10 sonucu:** v1'de gerekmiyor.
  - İki optimizasyondan sonra (RNG'siz yerleşme kontrolü, satır içi soğuma) Benchmark sahnesinde 400×225 ve ~44k parçacıkta tick yaklaşık 2 ms; tarayıcıda 320×207 için yaklaşık 3 ms.
  - Gerçek mobil ölçüm eşiği aşarsa yeniden açılacak.

## ADR-006 — Fixed timestep, limitli accumulator

- **Karar:** Taban hız 60 TPS; hız çarpanı tick aralığını değiştirir (0.5×–4×).
  - `dt` en fazla 100 ms'ye kırpılır.
  - Frame başına en fazla 8 tick çalışır ve yaklaşık 8 ms fizik bütçesi aşılmaz.
  - Sınıra takılınca birikmiş borç silinir.
  - Accumulator engine içindedir; rAF döngüsü uygulama katmanındadır.
- **Neden:**
  - Fizik davranışı render FPS'ten bağımsız olmalı.
  - Tab uzun süre arka planda kalınca devasa bir catch-up yaşanmamalı.
- **Alternatif:** Frame'e bağlı fizik; hızlandırmada parçacığın tick başına birden fazla hücre ilerlemesi.
- **Sonuç:** Reddedildi.

## ADR-007 — İki geçişli tick ve stamp kuralları

- **Karar:**
  - Birinci geçiş aşağıdan yukarı yapılır, ikinci geçiş yukarıdan aşağı ve yalnızca gazlar için.
  - Yer değiştiren iki hücre de stamp'lenir.
  - Stamp'lenmiş bir parçacıkla swap yapılmaz.
  - Transform ve spawn edilen hücre de stamp'lenir.
  - Köşegen hareket için yandaki hücrenin geçilebilir olması gerekir.
- **Neden:** Bu kurallar şunları önler:
  - aynı tick'te çift hareket
  - bir kabarcığın tek tick'te bütün sütunu tırmanması
  - yangının tek tick'te sütun boyunca yayılması
  - ince çapraz duvarlardan sızıntı
- **Alternatif:** Tek geçiş; gazlar için ayrı bir tarama olmaması.
- **Sonuç:** Reddedildi. Tek geçişte gazlar tırtıl gibi yükselir.

## ADR-008 — Seed'li PRNG: sfc32 + cyrb128, ayrı stream'ler

- **Karar:**
  - String seed cyrb128 ile hash'lenir, çıkan değerle sfc32 başlatılır.
  - Sahne, fizik ve input için ayrı stream'ler kullanılır.
  - Spawn anındaki kozmetik ton, sıvı yön bit'i ve ömür `hash(index, tick, seed)` ile hesaplanır. Sim RNG'si tüketilmez ve sonuç çağrı geçmişinden bağımsızdır (sahne determinizmi).
  - Engine'de `Math.random` kullanılmaz. Testler bunu, çağrıldığında hata fırlatan bir stub'la doğrular.
- **Neden:**
  - Debug edilebilirlik ve deterministik sahneler.
  - Seed paylaşımı.
  - Palet değişikliği fiziği etkilememeli.
- **Alternatif:** `Math.random`; tek bir global stream.
- **Sonuç:** Reddedildi.

## ADR-009 — Renderer: ImageData + Uint32 LUT + katmanlı birleştirme

- **Karar:**
  - Grid boyutunda tek bir `ImageData` kullanılır; renkler Uint32 palet tablosundan okunur.
  - Sim buffer `drawImage` ile büyütülür (`imageSmoothingEnabled = false`).
  - Katman sırası: cache'li arka plan → sim → glow (`lighter`) → brush preview.
  - Blur, küçültüp büyütme ile yapılır. `ctx.filter` yalnızca geri okumayla desteklendiği doğrulanırsa kullanılır.
- **Neden:**
  - Her parçacık için `fillRect` çağırmak çok pahalı.
  - Safari'de `ctx.filter` güvenilir değil.
- **Alternatif:** Her parçacık için `fillRect`; WebGL.
- **Sonuç:** Reddedildi. WebGL gereksiz karmaşıklık getirir.

## ADR-010 — Undo: stroke başında snapshot

- **Karar:** Her stroke'un başında dünyanın önceden ayrılmış buffer'lara tam kopyası alınır. Kopyaya type, variant, life, flags, RNG state ve tick dahildir.
  - Undo tek seviyelidir ve dünyayı çizimden hemen önceki ana döndürür.
  - Clear da geri alınabilir.
- **Neden:** Canlı simülasyonda hücre günlüğü akan ve düşen parçacıkları geri alamaz; snapshot ise kesin sonuç verir. Bu kararı kullanıcı verdi.
- **Alternatif:** Hücre günlüğü (index + önceki değer).
- **Sonuç:** Reddedildi.
  - **Bilinen bedel:** çizimden sonra geçen simülasyon süresi de geri alınır.

## ADR-011 — GitHub Pages: Actions workflow ile yalnızca uygulama dosyaları

- **Karar:** `.github/workflows/pages.yml` akışı şöyledir:
  1. Her `main` push'unda testler Linux'ta çalışır.
  2. Testler geçerse yalnızca `index.html`, `css/`, `js/` ve `assets/` yayınlanır.
- **Neden:**
  - Repo Pages'i "GitHub Actions" modunda açılmış.
  - Testler yayın için bir kapı işlevi görür.
  - `docs/`, `tests/`, `tools/` ve `.claude/` yayınlanmaz.
  - Linux'un büyük/küçük harfe duyarlılığı path hatalarını yakalar.
- **Alternatif:** `main` branch / root + `.nojekyll` (ilk plan).
- **Sonuç:** Planı revize eder. Branch yayını reddedildi.

## ADR-012 — Küçük harfli dosya adları + path denetleyicisi

- **Karar:** Tüm dosya adları küçük harfle yazılır; sınıf adları kod içinde PascalCase kalır. `tools/check-paths.js`, import'ları ve HTML path'lerini diskteki gerçek adlarla karşılaştırır.
- **Neden:** Geliştirme Windows'ta yapılıyor ve Windows büyük/küçük harf ayırmaz. GitHub Pages ise ayırır; yanlış harfle yazılmış bir import yalnızca yayında 404 verir.
- **Alternatif:** PascalCase dosya adları ve dikkatli olmak.
- **Sonuç:** Reddedildi.

## ADR-013 — Sıfır bağımlılıklı yerel sunucu

- **Karar:** Yerel geliştirme için `tools/serve.js` kullanılır (`npm run serve`).
- **Neden:**
  - ES module'ler `file://` üzerinden çalışmaz.
  - Windows'ta `python -m http.server` `.js` dosyalarını `text/plain` sunabilir; bu durumda module'ler yüklenmez.
- **Alternatif:** `npx serve` (ağdan paket indirir), Python sunucusu.
- **Sonuç:** Reddedildi.

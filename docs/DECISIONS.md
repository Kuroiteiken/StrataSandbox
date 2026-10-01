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

- **Durum:** Yerini ADR-014 aldı (0.10.0).

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

## ADR-014 — Tam çözünürlüklü sıcaklık alanı, ayrı ısı geçişi

- **Karar:** Her hücrede `Float32` sıcaklık (°C) tutulur ve parçacıkla birlikte taşınır. Tick'in 3. geçişi (`js/engine/heat.js`) şunları yapar:
  - 4 komşulu, çift tamponlu (Jacobi) difüzyon; iletim `k = min(K_i, K_j)`
  - havanın ortama yaklaşması, kenarın ortam sıcaklığında tutulması
  - ısı kaynakları (ateş, yanma, magma)
  - uyuyan satırlar
  - faz, tutuşma ve buharlaşma kuralları (ADR-015)
- **Neden:**
  - Buz, kar ve metal ısı iletimi gerektiriyor.
  - Çift tampon tarama yönü bias'ı üretmez; simetrik `k` enerjiyi korur.
  - `K/C ≤ 0,25` kararlılığı derlemede doğrulanır.
- **Alternatif:** 4×4 kaba ısı ızgarası; mevcut `life` sayaçlarını genişletmek.
- **Sonuç:** Reddedildi. Kaba ızgara ince yapıları ve ısının maddeyle taşınmasını kaybeder. Sayaçlar iletimi hiç modellemez.
- **Ölçüm:** 400×225 benchmark sahnesinde tick başına ~+0,64–0,71 ms. Isı geçişinin kendisi ~0,62 ms. Hedef +0,6 ms'ydi; ~0,1 ms aşıldı, karar kaydı DEVELOPMENT.md'de.
  - **Gün/gece açıkken (0.10.1 incelemesi):** ortam sürekli kaydığı için taş gibi iç bölgeler hiç yerleşmez ve satır uykusu daha az işe yarar. Aktif satır oranı benchmark'ta %66'dan %100'e, volkanda %45'ten %82'ye çıkar. Eşleştirilmiş ölçümde artış döngü kapalıyken ~+0,52–0,60 ms, açıkken ~+0,85–0,90 ms. Toplam tick yine ADR-005'in 6 ms eşiğinin çok altında.
- **Optimizasyonlar:**
  - satır uykusu (±0,5 °C, bilinçli yaklaşıklık)
  - materyal başına eşik adayı penceresi
  - hava–hava hızlı yolu

## ADR-015 — Faz geçişlerinde gizli ısı: `life` üzerinde sabit noktalı ilerleme

- **Karar:** Eşiği aşan hücrenin sıcaklığı eşikte sabitlenir. Fazla ısı (ΔT·C) `life`'ta ilerleme olarak birikir: sabit noktalı (×16), kesir sim RNG'siyle stokastik yuvarlanır. İlerleme gizli ısıya ulaşınca hücre dönüşür; eşiğin gerisinde ilerleme yavaşça söner. Eşiklerde histerezis vardır (ör. donma −1, erime +1).
- **Neden:**
  - Buz bir anda erimez, su kaynar, göl yüzeyden donar, lav kademeli kabuk bağlar.
  - Faz materyallerinde `life` başka bir iş için kullanılmıyor.
  - Stokastik yuvarlama olmadan eşiğin az üstündeki küçük fazlalar sıfıra yuvarlanıyordu (1 °C'deki buz hiç erimiyordu).
- **Alternatif:** Anlık eşik dönüşümü; ayrı bir entalpi alanı.
- **Sonuç:** Reddedildi.
  - Anlık dönüşüm titreşim üretir.
  - Entalpi alanı ek bellek ve geçiş maliyeti getirir.
- **Bilinen basitleştirme:** sönen ilerlemenin enerjisi geri verilmez.
- **İki kenarlı materyal (0.10.1):** su hem kaynar hem donar ve iki yön aynı `life` sayacını kullanır. İlerlemenin yönü `flags` bit3'te tutulur; yön değişince ilerleme sıfırlanır. `transform` bu biti temizler (yalnızca bit0 korunur).

## ADR-016 — Kaynaklar: Çoğaltıcı ve Yutucu

- **Karar:** İki reaktif statik materyal eklendi.
  - **Çoğaltıcı:** ilk temas ettiği hareketli materyali öğrenir ve bitişik boş hücrelere kopyalar.
  - **Yutucu:** değen hareketli materyali yok eder.
  - Bütçe `life` alanındadır: 1000, `65535` sınırsız demektir.
  - Sahneler kaynağı `sim.configureSource` ile kurar.
- **Neden:**
  - Kullanıcı sürekli akan kum saati ve uzun süre lav akıtan volkan istedi.
  - Kopya yalnızca bitişik boş hücrelere yazıldığı için taşma olmaz.
  - Statikler öğrenilmez, bu yüzden kap duvarları kopyalanmaz.
- **Alternatif:** Sahneye özgü sabit "emitter" materyalleri.
- **Sonuç:** Reddedildi. Genel kaynak her sahnede ve kullanıcı boyamasında işe yarıyor.
- **Bilinen sınır:** basınç yok. Dolu bir odanın altındaki çoğaltıcının boş komşusu olmaz ve üretim yapmaz (alt proje 2).
- **Ek (0.10.1): aşağı yönlü mod.** `configureSource(x, y, { downward: true })` `flags` bit2'yi açar. Aşağı yönlü kaynak yalnızca yönündeki üç komşudan birini örnekler: çoğaltıcı alttakilere üretir, yutucu üsttekileri yutar.
  - **Neden:** yönsüz kaynaklarla kum saati ters çevrilince akış kalıcı olarak duruyordu. Alttaki çoğaltıcı kumun altında kalıyor, üstteki yutucu boşta kalıyordu. Yön dünya koordinatında olduğu için iki kapağa aynı sıra konunca çevirme görevleri kendiliğinden değiştirir.
  - **Alternatif:** çoğaltıcıyı her zaman "materyalin hareket yönünde" üretir yapmak. Reddedildi: volkan yarığının tabanındaki çoğaltıcılar lavı yukarı doğru dolduruyor, kullanıcının boyadığı "üstüne döküleni çoğaltan" kaynağın davranışı da değişirdi.
  - **Alternatif:** sahneye çevirme kancası. Reddedildi: çevirme genel bir dünya işlemi.
  - Seçiciden boyanan kaynaklar yönsüz kalır.

## ADR-017 — Patlamalar: olay kuyruğu, birleştirme ızgarası, dayanıklılık

- **Bağlam:** 0.11.0 patlayıcılar, basınç ve buhar patlaması getiriyor. Çok sayıda barut hücresi aynı anda tetiklenebilir; her hücrenin kendi patlamasını uygulaması hem maliyeti patlatır hem sonucu hücre sırasına bağımlı yapar.
- **Karar:**
  - **Olay kuyruğu:** patlamalar (araç, basınç, buhar) `requestExplosion` ile kuyruğa girer. Geçiş 5 tick başına en fazla 16 patlama ve 4000 etkilenen hücre işler; kalanlar sonraki tick'e kalır. Kuyruk doluysa güç birleştirme ızgarasına düşer, kaybolmaz.
  - **Birleştirme ızgarası:** patlayıcılar gücünü hücrenin 8×8 bloğuna yazar (`addBlastPower`). Blok başına güç toplanır, merkez güç ağırlıklı ortalamadır; `MERGE_MIN` altı söner. 500 barut hücresi birkaç blok olayına iner.
  - **Zincir:** patlama sırasında tetiklenen patlayıcılar ızgaraya yazılır ve bir sonraki tick patlar. Tek tick'te sınırsız zincir oluşmaz, barut hattı dalga gibi ilerler.
  - **Formül:** yarıçap `r = min(20, 1 + 1,5·√G)`, şiddet `s = 2·√G·(1 − d/r)`. Yalnızca `Math.sqrt` kullanılır; sin/cos/exp/pow yoktur.
  - **Dayanıklılık:** statik materyalin `strength` değeri zorunludur (`Infinity` = kırılmaz). `s ≥ strength` olan katı `debris` materyaline döner ve savrulur. Toz ve sıvı her zaman savrulur, gaz yalnız ısınır.
  - **Savurma havuzu:** havuz yoksa (`null`) savrulacak hücre yerinde kalır, kırılan katı yerinde enkazına döner.
  - **Parçacık havuzu:** `debris.js` önceden ayrılmış SoA havuz (2000) tutar; geçiş 6 parçacıkları ilerletir. Yol hücre hücre izlenir (DDA, tek eksen adımı): köşeden de duvardan da sızılmaz. İniş çarpmadan önceki son hücreye, doluysa 4 komşuya (köşegen yok), o da doluysa sütunda yukarı; ömür (300 tick) sonunda yarıçap 3'te yerleşir, bulamazsa kaybolur ve sayılır. Havuz anlık görüntüye ve çevirmeye dahildir.
- **Alternatifler:**
  - Tam hız alanı (basınç ve hız ızgarası). Reddedildi: bellek ve tick maliyeti yüksek, sonuç tek seferlik patlama için gereğinden karmaşık.
  - Anlık itme (patlamada hücreleri doğrudan taşımak). Reddedildi: sıra bağımlı, katı çarpışmayı ve duvardan sızmayı denetlemek zor.
- **Sonuç:** patlama maliyeti tick başına sınırlı ve deterministik. Patlayıcı malzemeler yalnızca tablolara (`EXPLOSIVE_POWER`, `EXPLODE_AT`, `EXPLOSIVE_IGNITE`) alan ekler. Savrulan parçacıklar ızgaranın dışında yaşadığından geri alma ve çevirmede ayrıca ele alınır.

## ADR-018 — Kapalı bölge basıncı: dört tick'te bir bölge taraması

- **Bağlam:** Kapalı kapta ısınan buhar ve gaz patlamalı; cam kolay, taş zor, metal neredeyse hiç kırılmalı. Basıncın her hücrede ayrı tutulması hem bellek hem tick maliyeti getirir.
- **Karar:**
  - **Bölge taraması:** `pressure.js` 4 tick'te bir hava ve gaz hücrelerini satır parçalarıyla birleşim-bul yöntemiyle etiketler (geçiş 4). Üst satıra değen bölge açıktır; kapalı bölgenin hücrelerine `CLOSED_BIT` (flags bit4) yazılır. Duman bu bitle ömrünü dondurur.
  - **Basınç:** P = Σ w·(T+273)/293 / hacim; buharın ağırlığı 8. Tek bir sayı bölgeyi anlatır.
  - **Tavan şartı:** yalnız katı tavan basınç tutar; sıvı ya da toz tavanlı ve yanları sıvı/toz olan bölgeler sayılmaz (gaz kabarcıkla çıkar). Yan komşu denetimi yalnız parça uçlarında yapılır: ucuz.
  - **Patlama:** G = min(400, 0,15·(P − 1)·hacim); en zayıf tavan hücresi 2·√G ≥ dayanıklılık ise orada patlama istenir, yoksa basınç birikir. POWER_K başlangıçta 0,5'ti; 4×3 kavanozda su bir anda kaynadığından P tek taramada ~7'ye sıçrıyor ve G ≈ 37 taşı da (8) kırıyordu. 0,15 ile cam kırılır, taş ve metal dayanır.
  - **Geri alma:** `resetPressureState` bir sonraki tick'te zorunlu tarama yapar.
- **Alternatifler:**
  - Hücre başına basınç alanı (yayılan sayısal alan). Reddedildi: bellek ve tick maliyeti yüksek, bölge düzeyinde bir sonuç için gereksiz.
  - Yalnız olay tabanlı (ısınan gaz hücresi patlama tetikler). Reddedildi: kapalılık bilinmediği için açık havadaki sıcak gaz da patlardı.
- **Ölçüm:** spike'ta 400×225'te tarama 0,13–0,21 ms (ortalama ~0,05 ms/tick). `tools/bench.js` 400×225 medyanı: görev öncesi 1,70–2,86 ms, sonrası 1,83–2,64 ms (makine gürültülü; fark gürültü içinde, yaklaşık +0,1–0,2 ms). `PERIOD` 4'te kaldı.
- **Sonuç:** sabit maliyetli, deterministik ve geri almaya duyarlı. Sınırlama: bölge basıncı sürekli değil 4 tick'te bir örneklenir.

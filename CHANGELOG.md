# Changelog

Bu projedeki önemli değişiklikler bu dosyada tutulur.
Biçim [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) yaklaşımını izler. Sürümleme [Semantic Versioning](https://semver.org/lang/tr/) kurallarına göre yapılır.

## [Unreleased]

Hedef sürüm 0.11.0.

### Added

- **Patlama çekirdeği:** olay kuyruğu (tick başına en fazla 16 patlama, 4000 hücre), 8×8 birleştirme ızgarası ve patlamanın uygulanması. Yarıçap `min(20, 1 + 1,5·√G)`, şiddet `2·√G·(1 − d/r)`; her hücre merkeze uzaklıkla orantılı ısınır, merkezdeki boş hücrelerin bir kısmı ateş olur. Patlama durumu geri almaya ve çevirmeye dahildir.
- **Dayanıklılık ve enkaz:** her statik materyalin patlamaya dayanıklılığı ve kırılınca dönüştüğü enkaz var (taş 8 → moloz, cam 2 → kum, buz 2 → kar, odun 4 → kül, metal 20; kenar ve magma kırılmaz).
- **Savrulan parçacıklar:** patlamada kırılan ve toz ya da sıvı olan hücreler 2000 parçacıklık bir havuzda yay çizerek uçar; hücre hücre izlenen yol duvardan sızmaz, parçacık çarptığı yere (ya da yakın boş hücreye) iner. Kütle korunur; havuz geri almaya ve çevirmeye dahildir.
- **Barut (`R`) ve Dinamit (`D`):** barut (güç 4) ateş, lav ya da 200 °C ile; dinamit (güç 30, dayanıklılık 3) 150 °C ya da yakındaki patlamayla tetiklenir. Güçler 8×8 blokta toplanır, yığın büyüdükçe patlama büyür. Eşik altı bloklar kıvılcım olur ve komşu patlayıcıyı tetikler; zincir tick tick ilerler.
- **Fitil (`I`):** ateşi saniyede ~10 hücre (6 tick'te bir hücre) taşır; yanan fitil ömrü bitince küle döner, komşu fitili tutuşturur ve patlayıcıyı tetikler. Yanarken kıvılcım çıkarır, suyla söner. Dayanıklılık 4: zayıf patlama fitili tutuşturur, güçlüsü kırar.
- **Moloz (`O`):** kırılan taşın tozu; kumdan ağır, lavın üstünde yüzer, 1500 °C'de lava döner.
- **Metan (`N`), Yanan metan ve Duman (`U`):** metan havadan hafif, yanıcı bir gazdır (540 °C); yanan metan 8 komşusundaki metanı tutuşturur ve birleştirme ızgarasına güç yazar, bu yüzden yoğun cep patlar, seyrek metan yalnız yanar. Duman yangınlardan (sönen ateş, yanan madde; tick başına en fazla 60) ve patlama halkasından çıkar, açık havada 200–500 tick sonra söner. Patlama gaz yanıcıları tutuşturur.
- **Kapalı bölge basıncı:** hava ve gaz bölgeleri 4 tick'te bir taranır; kapalı bölgenin basıncı (buhar ağırlığı 8, sıcaklıkla artar) tavanın en zayıf katı hücresini aşarsa orada patlama olur. Cam kolay, taş zor, metal küçük kapta hiç kırılmaz; sıvı tavanlı bölge ya da yanı sıvı olan gaz cebi basınç tutmaz. Kapalı bölgedeki duman sönmez. Debug panelinde kapalı bölge sayısı, en yüksek basınç ve patlama sayısı görünür.
- **Ani buharlaşma (buhar patlaması):** her su→buhar dönüşümü kaynama eşiği üstündeki ısıyla orantılı ağırlıkla 8×8 bloğa sayılır (tick başına ×0,85); ağırlıklı sayaç 6'ya ulaşınca (yalnız en sıcak komşusu ≥ 720 °C olan, yani lav, erimiş metal ya da magma ısıtmış taşa değen su sayılır; ateş, söndürme ve yanan madde saymaz) dönüşüm merkezinde `STEAM` patlaması çıkar. Lava ya da erimiş metale dökülen su patlar, yavaş kaynayan su ve mevcut sahneler patlamaz. Sayaç geri almaya ve çevirmeye dahildir.
- **Patlama görselleri:** her patlamada yarıçapla orantılı, 6 karede sönen parlama; savrulan parçacıklar malzeme renginde çizilir, ≥ 450 °C olanlar akkor ve ışıyıcıdır (termal görünümde sıcaklık rampası). G ≥ 64 patlamada tuval 12 kare sarsılır (genlik 0,4·√G, en çok 6 px). Azaltılmış harekette sarsıntı yoktur, parlama yarı yoğunluktadır; PNG yakalama sarsıntısız ve parlamasızdır. Duman yarı saydam çizilir ve ömrü azaldıkça soluklaşır, metan çok saydamdır.
- **Patlat aracı (`P`):** tıklanan yerde fırça boyutuna göre patlama (G = min(400, boyut²)); tek tık tek patlama, sürükleme ve basılı tutma tekrarlamaz, duraklatılmışken de çalışır, tek vuruş olarak geri alınır. Seçicide Araç sekmesinde, beyaz-sarı-kırmızı desenle.

- **Volkanik gaz:** `sim.configureMagma(x, y, { degas: true })` ile işaretlenen gaz salan magmaya (flags bit5) değen lav, tick başına 1/1000 olasılıkla sıcak dumana döner (tick başına en fazla 8). Diğer sahnelerdeki magma gaz salmaz.
- **Patlayan volkan:** baca 8 satırlık taş tıkaçla kapalı, altında gaz cebi var; magma odasının gazı bacadan yükselip cepte birikir ve basınç tıkacı kırar (ilk patlama ~3 dakikada). Kratere su ya da barut atmak hemen patlatır.

### Changed

- **Kum saati:** yutucular kapak dibinden kaldırıldı. Artık alt haznenin üst kısmında, boğazdan inen akışın iki yanında duvara yaslı cam raflar var; her rafta 3 aşağı yönlü, sınırsız yutucu bulunuyor. Raflar boğazdan hazne yüksekliğinin ~%30'u kadar aşağıda; küçük haznede sığana kadar aşağı iner.
  - Alt hazne raf seviyesine kadar dolar, fazlası yutulur. Hazne tamamen dolup boğazı tıkamaz.
  - Üst haznedeki aynı raflar yutucunun "tavanı" olduğu için boşta kalır. Çevirince görevler yine kendiliğinden yer değiştirir.
  - Çevirmeden sonra alt haznenin kenarlarında kalan kalıcı yığınlar sorunu ortadan kalktı: iki yönde de alt hazne aynı seviyeye kadar dolu.
- **Volkan:** lav artık ağaçlara ulaşıyor. Yarık ağzından koni eteğine kadar yamaç yüzeyinin 2 hücre içinden geçen, kesintisiz bir magma damarı eklendi; damar ağaç hücrelerine 5 hücreden ve ilk ağaç gövdesine 9 sütundan fazla yaklaşmaz. Böylece ağacı damarın ısısı değil, eteğe ulaşan lav tutuşturur. Damar ağzın önündeki yamaç yüzünü de ısıtır; lav artık ağızda kabuk bağlayıp yarığı tıkamıyor. Sağ yamaca artık kum konmuyor: ısınan kum cama dönüp lavın önüne set çekiyor, eteğe kayıp ağaç gövdesine yığılıyordu. RNG sırası korunduğu için seed'ler aynı ağaç yerlerini verir.
- **Dökümhane:** eğimli taş oluk geri geldi. Oluk potanın yarığından ilk kalıba iner; iki hücre kalın tabanı önceden 1350 °C'ye ısıtılır ve altında magma damarı vardır. Potadaki erimiş metalin yaklaşık yarısı oluktan kalıplara dökülüyor (320×180'de 1575 hücreden 810'u; serbest düşüşle 521'di).

### Fixed

- **Materyal seçici:** kategori sekmeleri yatay kaydırma çubuğu göstermez; satırı paylaşır, sığmazsa alt satıra geçer. Kontrol etiketleri (`user-select: none`) çift tıklayınca metin gibi seçilmez.

## [0.10.1] - 2026-09-30

0.10.0'ın bütün-dal incelemesinde bulunan hataların yaması.

### Fixed

- **Söndürme (0.10.0 regresyonu):** sönen odun ve bitki, yanan hâlinin 700 °C kaynak sıcaklığını koruyordu. Isı geçişi hücreyi tutuşma eşiğinin üstünde bulup yeniden yakıyordu; su altındaki yanan kalas 700–1300 tick yanmaya devam edebiliyordu. Sönen hücre artık buhar sıcaklığına (105 °C) iner, ısı buhara geçer.
- **Kum saati ters çevrilince akış kalıcı olarak duruyordu.** Çoğaltıcı kumun altında kalıyor, yutucunun yutacak bir şeyi olmuyordu. Kaynaklara isteğe bağlı "aşağı yönlü" mod eklendi (`sim.configureSource(x, y, { downward: true })`, flags bit2):
  - aşağı yönlü çoğaltıcı yalnızca alttaki üç komşuya üretir;
  - aşağı yönlü yutucu yalnızca üstteki üç komşudan yutar.
  Kum saatinin iki kapağında da aynı sıra var: ortada 8 çoğaltıcı, iki yanda ortaya 12 hücre uzakta 3'er yutucu. Çevirince görevler kendiliğinden yer değiştirir. Boyanan kaynaklar yönsüz kalır.
- **Isıt/Soğut sürüklerken birikiyordu.** Çizgi boyunca her adım fırça ayak izinin tamamını yeniden uyguluyordu; 16'lık fırça tek bir çizgide +400 °C veriyordu. Hücre artık tick ve stroke başına en fazla bir kez değişir (Uint16 araç mührü ve nesil sayacı). Basılı tutma yine tick başına 25 °C verir.
- **Su:** kaynama ve donma ilerlemesi aynı sayacı paylaşıyordu. Kısa süre 160 °C'de tutulan su, −3 °C'de 1 tick'te donuyordu. İlerlemenin yönü flags bit3'te tutuluyor; yön değişince ilerleme sıfırlanır.
- **Ortam değeri:** `setAmbient`, `setDayCycle` ve `undo` dünyanın ortam değerini hemen güncellemiyordu. Duraklatılmışken boyanan hücre eski ortam sıcaklığında doğuyordu.
- Çoğaltıcı ve Yutucu ısınınca akkorlaşmıyordu.
- Dokunmatik ekranda sürüm rozetinin dokunma hedefi 32 px idi. Görünmez bir alanla 44 px'e genişletildi; başlık yüksekliği değişmedi.
- Dokümanlar:
  - `docs/MATERIALS.md`: `life` tablosu güncel anlamlarla yenilendi, geliştirme sırasındaki "Görev N" notları kaldırıldı.
  - Volkan açıklaması ve README düzeltildi: lav yamaçta kabuk bağlar, ağaçlara ve göle ulaşmaz.
  - README'deki yinelenen "Basınç yok" maddesi birleştirildi.
  - Su donma koşulu açıklandı: ortam −2 °C ya da daha soğuk olmalı.

### Changed

- Kum saati akış testleri artık boğazdaki tanelerin gerçekten hareket ettiğini ölçüyor; tıkalı boğaz akış sayılmıyor. Ters çevirme testi geri geldi.
- Testler güçlendirildi:
  - uyku eşdeğerliği testine eriyen buz ve ılık hava alanı eklendi;
  - mağara testi duvarın yerinde kaldığını ve göl suyunun lav cebine sızmadığını doğruluyor.

### Performance

- Gün/gece döngüsü açıkken ortam sürekli kaydığı için satır uykusu daha az işe yarıyor. Benchmark sahnesinde tick başına artış 0.9.0'a göre ~+0,85–0,90 ms; döngü kapalıyken ~+0,52–0,60 ms (ADR-014).

## [0.10.0] - 2026-09-30

Sıcaklık sistemi (alt proje 1/4): her hücrede sıcaklık ve ısı iletimi, ortam ve gün/gece, gizli ısılı faz geçişleri; Buz, Kar, Metal, Erimiş metal, Çoğaltıcı, Yutucu; Isıt/Soğut fırçaları; termal görünüm; Buzul, Dökümhane, Mağara sahneleri; sürekli akan kum saati; sekmeli seçici ve Yenilikler diyaloğu. Tasarım: `docs/superpowers/specs/2026-09-30-sicaklik-sistemi-design.md`.

### Performance

- Isı geçişi: satır uykusu, materyal başına eşik adayı penceresi ve hava–hava hızlı yolu. 400×225 benchmark sahnesinde tick başına ~+0,65 ms (ısı geçişi ~0,62 ms).

### Added

- Başlıkta sürüm rozeti. Rozete tıklanınca "Yenilikler" diyaloğu açılır: en üstte geliştirmedeki sürümün (0.10.0) yayında olan yenilikleri, altında yayınlanmış tüm sürümler listelenir. Görülmemiş sürümde rozette küçük bir işaret görünür.
- Sürüm tutarlılığı testi: `APP_VERSION`, `package.json`, CHANGELOG ve Yenilikler aynı sürümü göstermek zorunda. `docs/MATERIALS.md` için senkron testi: her materyal belgede yer almak zorunda.
- Ters çevirme (`F` ya da "Ters çevir" düğmesi): dünya dikey olarak aynalanır ve işlem geri alınabilir. (0.10.0'da kum saati çevrilince akış duruyordu; 0.10.1'de düzeltildi.)
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
- Yeni sahneler: **Buzul** (−15 °C; karlı yamaçlar, donmuş göl ve altında ılık su, metal çubuk, magma ısıtmalı baca), **Dökümhane** (potadaki erimiş metal yarıktan basamaklı kalıplara dökülüp katılaşıyor, sonda su teknesi), **Mağara** (12 °C; tüneller, yeraltı gölü, lav cebinin ısıttığı kaplıca buharı, sarkıtlar, maden destekleri).
- `docs/MATERIALS.md`: tüm materyallerin ve etkileşimlerinin (mevcut ve planlanan) başvuru belgesi. Tür, yoğunluk, kısayol, olasılıklar ve 0.10.0'da değişecek kurallar burada tutulur.

### Changed

- Materyal seçici sekmelere ayrıldı: Toz, Sıvı, Gaz, Katı, Araç. Ok tuşlarıyla gezilir; kısayolla seçilen materyalin sekmesi açılır.
- Faz geçişleri artık sıcaklık alanında ve gizli ısıyla çalışıyor: su 100 °C'de kaynıyor; buhar 95 °C'de yoğuşuyor ve bir kısmı kayboluyor; lav 750 °C'de taşa dönüyor (önce dış yüzeyi, ortası en son); kum 550 °C'de cama dönüyor; taş 1500 °C'de eriyor.
- Sıcak ortamda (≥ 35 °C) açık su yüzeyi yavaşça buharlaşıyor. Odun (300 °C), yağ ve bitki (250 °C) sıcaklıkla kendiliğinden tutuşuyor; bitki 5 °C'nin altında büyümüyor.
- Eski `life` sayaç hileleri (kum ısısı, lav soğuma sayacı, buhar zamanlayıcısı) kaldırıldı. Temasla tutuşma ve ateşin suyu buharlaştırması korundu; tüm buhar üretimi tek bir yoldan (`emitSteam`) geçiyor.
- Kum saati yenilendi: kavisli iki cam hazne, dar boğaz, odun kapaklar ve direkler; cam ve odun şekli orta satıra göre tam simetrik. Üstte sınırsız çoğaltıcı, altta sınırsız yutucu olduğu için kum hiç durmadan akıyor. Kum camda takılmıyor. Sahne yüklenince bir ipucu duyuruluyor.
- CI: yalnızca `docs/` altında değişiklik olduğunda test ve yayın akışı çalışmıyor (`paths-ignore`). Karışık push'larda akış yine çalışır.

### Fixed

- Volkan: krater yarığının sağ ucu tek sıra taşla kapalıydı; lav yamaca hiç çıkamıyordu. Yarık artık yamaca açık; altında magma damarı, tabanında iki çoğaltıcı var, lav sağ yamaçtan akıyor. Magma odasına sabit sıcaklıklı magma kaynağı eklendi.
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

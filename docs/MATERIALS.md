# Strata Sandbox — Materyaller ve Etkileşimler

Bu belge, simülasyondaki tüm materyalleri ve aralarındaki etkileşimleri tek yerde toplar. Mevcut olanları, 0.9.0'daki eski kuralları (§3, tarihçe) ve planlanmış alt projeleri içerir.

- **Kaynak:** `js/engine/materials.js` (tanımlar), `js/engine/reactions.js` (etkileşimler), `js/engine/kernels.js` (hareket).
- **Kural:** yeni bir materyal ya da etkileşim ekleyen, var olanı değiştiren her değişiklik bu belgeyi de günceller. `tests/docs-materials.test.js`, tanımlı her materyal anahtarının bu belgede geçtiğini doğrular.
- **Durum etiketleri:**
  - **Mevcut:** yayında (0.9.0'dan beri).
  - **Mevcut (0.10.0):** sıcaklık sistemi ve yeni materyaller (§4). Tasarım: `docs/superpowers/specs/2026-09-30-sicaklik-sistemi-design.md`. 0.10.1 yamasındaki düzeltmeler ilgili bölümlerde belirtilir.

---

## 1. Temel kavramlar

- **Grid:** dünya hücrelerden oluşur. Her hücrede tam olarak bir materyal bulunur. Boş hücre "hava"dır (`EMPTY`).
- **Tür (kind):** hareketi türe göre çekirdek belirler.

| Tür | Hareket |
|---|---|
| Statik | Hiç hareket etmez. |
| Toz | Aşağı düşer. Aşağısı doluysa çapraz aşağı kayar ve yığın yapar. |
| Sıvı | Düşer, çapraz akar ve her tick en fazla "dağılım" kadar hücre yana yayılır. Yayılma olasılığı viskoziteyi belirler. |
| Gaz | Yükselir. Zaman zaman yana sürüklenir, tavana takılınca yana kıpırdar. |

- **Yoğunluk:** havanın yoğunluğu 5'tir, bu bir referans değerdir. Hareketli bir materyal yalnızca kendinden hafif olan bir materyalin yerine geçebilir:
  - Toz ve sıvı havaya ve gaza her zaman girer.
  - Toz, kendinden hafif bir sıvının içine `1 − sürtünme` olasılığıyla batar.
  - Ağır sıvı, hafif sıvının altına aynı olasılıkla geçer.
  - Gaz yalnızca havaya ve kendinden ağır gaza doğru yükselir.
  - Statikler hiçbir şeyin yerine geçmez; hiçbir şey de statiklerin yerine geçemez.
- **Tek sahip kuralı:** her etkileşimi çiftin yalnızca bir tarafı işler. Sahip hücre her tick rastgele bir komşusuna bakar; ateş iki komşuya bakar. Böylece etkileşimler çift sayılmaz ve yön bias'ı oluşmaz.
- **`life` alanı:** materyale göre anlamı değişen bir sayaçtır.

| Materyal | `life` ne sayar |
|---|---|
| Ateş | ömür |
| Yanan materyaller | kalan yanma süresi |
| Bitki | büyüme bütçesi |
| Çoğaltıcı, Yutucu | kalan bütçe (`65535` = sınırsız) |
| Faz geçişi olan materyaller (su, buz, kar, kum, taş, lav, buhar, metal, erimiş metal) | faz dönüşüm ilerlemesi (§4.2) |

- 0.9.0'daki buhar zamanlayıcısı, lav soğuma sayacı ve kum ısısı kaldırıldı; yerlerini sıcaklık alanı aldı (§4.6).
- Her hücrede ayrıca bir sıcaklık (°C) tutulur. Sıcaklık parçacıkla birlikte taşınır ve komşu hücrelere iletilir (§4).
- **`flags` bitleri:** bit0 sıvının akış yönü; bit1 çoğaltıcının "öğrendi" işareti; bit2 kaynağın "aşağı yönlü" modu (§4.5); bit3 faz ilerlemesinin yönü (aşağı kenara doğru, §4.2); bit4 `CLOSED_BIT`, kapalı bölgedeki hava ve gaz hücresi (basınç geçişi yazar, §5.7).

---

## 2. Mevcut materyaller (0.9.0)

| Materyal | Anahtar | Kısayol | Tür | Yoğunluk | Hareket ayrıntısı |
|---|---|---|---|---|---|
| Hava (boş) | `EMPTY` | — | — | 5 | Referans. |
| Kenar | `WALL` | — | statik | — | Dünyanın görünmez çerçevesi; boyanamaz, silinemez. |
| Kum | `SAND` | `1` | toz | 20 | Suya %50, yağa %40 olasılıkla batar. Lavın üstünde yüzer. |
| Su | `WATER` | `2` | sıvı | 10 | Dağılım 5, yayılma 1, sürtünme 0,5. Lav ya da erimiş metale değince birden buharlaşırsa buhar patlaması yapar (§5.8). |
| Taş | `STONE` | `3` | statik | — | — |
| Ateş | `FIRE` | `4` | gaz | 3 | Ömür 10–26 tick. Tick'lerin %65'inde hareket eder, %30 olasılıkla sürüklenir. |
| Odun | `WOOD` | `5` | statik | — | Yanıcılık 0,25. |
| Buhar | `STEAM` | `6` | gaz | 2 | %45 olasılıkla sürüklenir. Ömür 240–480 tick. |
| Yağ | `OIL` | `7` | sıvı | 8 | Dağılım 2, yayılma 0,6, sürtünme 0,6. Suyun üstünde yüzer. Yanıcılık 1. |
| Lav | `LAVA` | `8` | sıvı | 30 | Dağılım 1, yayılma 0,2 (ağır akar), sürtünme 0,9. Havada normal hızla düşer. Üstüne su dökülürse buhar patlaması olur (§5.8). |
| Bitki | `PLANT` | `9` | statik | — | Büyüme bütçesi 8. Yanıcılık 0,5. |
| Cam | `GLASS` | `G` | statik | — | — |
| Moloz | `RUBBLE` | `O` | toz | 26 | Kumdan ağır, lavdan hafif: lavın üstünde yüzer. 1500 °C'de lava döner (0.11.0). |
| Barut | `GUNPOWDER` | `R` | toz | 14 | Suya batar. Ateş, yanan madde ya da lav teması veya ≥ 200 °C ile patlar; hücre başına güç 4 (0.11.0 ayarı: taşı kırabilmek için). |
| Dinamit | `DYNAMITE` | `D` | statik | — | Dayanıklılık 3. ≥ 150 °C ya da yakındaki patlamayla tetiklenir; hücre başına güç 30 (0.11.0 ayarı: taşı kırabilmek için). |
| Fitil | `FUSE` | `I` | statik | — | Dayanıklılık 4; 200 °C ya da ateşle tutuşur (yanıcılık 1). Yanan fitil ateşi taşır. |
| Metan | `METHANE` | `N` | gaz | 3 | Havadan hafif (hava 5), yukarı çıkar. Yanıcılık 1; ≥ 540 °C, ateş, yanan madde ya da patlamayla tutuşur (0.11.0). |
| Duman | `SMOKE` | `U` | gaz | 4 | Yangından ve patlamadan çıkar; 200–500 tick sonra söner, kapalı bölgede sönmez (0.11.0). |
| Silgi | — | `0` | — | — | Materyal değil; hücreyi boşaltır. Sağ tık her zaman geçici silgidir. |

### Seçicide olmayan (reaksiyonla oluşan) durumlar

| Durum | Anahtar | Tür | Ömür (tick) | Ateş üretimi | Suyla sönme | Kül bırakma | Sönünce |
|---|---|---|---|---|---|---|---|
| Yanan odun | `BURNING_WOOD` | statik | 300–600 | %12 | %50 | %30 | Odun |
| Yanan bitki | `BURNING_PLANT` | statik | 30–60 | %30 | %70 | %5 | Bitki |
| Yanan fitil | `BURNING_FUSE` | statik | 5–7 | %10 | %80 | %100 | Fitil |
| Yanan yağ | `BURNING_OIL` | sıvı (yoğunluk 8) | 120–240 | %35 | sönmez | yok | (Yağ) |
| Yanan metan | `BURNING_METHANE` | gaz (yoğunluk 3) | 3–6 | — | — | yok | (kaybolur) |
| Kül | `ASH` | toz (yoğunluk 12) | — | — | — | — | — |

Yanan yağ akmaya devam eder ve suyla sönmez (söndürme olasılığı 0); suyun üstünde yüzerek yanar.

---

## 3. Etkileşimler (0.9.0'da böyleydi)

> Bu tablo 0.9.0 davranışını tarih için korur. 0.10.0'da ısıya bağlı kurallar sıcaklık alanına taşındı; güncel hâli §4.6'da. Temas kuralları (ateş, yanma, bitki) değişmedi.

Olasılıklar tick başına ve sahip hücrenin örneklemesi başına verilmiştir.

| Etkileşim | Sahip | Sonuç |
|---|---|---|
| Ateş + yanıcı (odun, bitki, yağ) | Ateş | Yanıcılık olasılığıyla tutuşur: yanan odun, yanan bitki ya da yanan yağ olur. |
| Ateş + su | Ateş | %50 olasılıkla su buhara döner ve ateş söner. Bir ateş tick başına en fazla bir suyu buharlaştırır. |
| Ateş (tek başına) | Ateş | Ömrü bitince söner; %15 olasılıkla (duman bütçesi varsa) duman olur (0.11.0). |
| Yanan materyal (tek başına) | Yanan | Her tick üstündeki üç hücreden birine, boşsa, ateş üretir. Dünya genelinde tick başına en fazla 400 ateş üretilir. Ömrü bitince kül olur ya da kaybolur. Alev üretirken %10 olasılıkla üstüne duman da çıkarır (yanan fitil çıkarmaz); duman tick başına dünya genelinde en fazla 60 (0.11.0). |
| Yanan materyal + yanıcı | Yanan | Yangın yayılır (yanıcılık olasılığıyla). |
| Yanan materyal + su | Yanan | Sönme olasılığıyla söner ve eski materyaline döner; su buhara döner. Yanan yağ sönmez. 0.10.1'den beri sönen hücre 105 °C'ye iner (ısı buhara geçer), böylece kendi ısısıyla yeniden tutuşmaz. |
| Lav + su | Lav | %60 olasılıkla su buhara döner; lavın soğuma sayacı 25 artar. |
| Lav + hava | Lav | %10 olasılıkla soğuma sayacı 1 artar. Hava görmeyen iç lav soğumaz. |
| Lav (soğuma sayacı 200) | Lav | Taşa döner. |
| Lav + kum | Lav | Kumun ısısı 16 artar. Kum her tick 1 soğur ve ısısı 300'e ulaşınca cama döner. Kısa temas cam yapmaz. |
| Lav + yanıcı | Lav | Tutuşturur. |
| Buhar (ömrü bitince) | Buhar | %60 olasılıkla suya döner, yoksa kaybolur. Kapalı kutuda da yoğuşur. |
| Bitki + su | Bitki | %1,2 olasılıkla büyür: suyu tüketir ve yerine bütçesi bir eksik yeni bir bitki koyar. Dünya genelinde tick başına en fazla 24 büyüme olur. Bitki + su toplamı korunur. |

Bu reaksiyonlar üzerinden örnek zincirler:

- **Lav gölü + su:** buhar yükselir, lavın yüzeyi taşlaşır. Yoğuşan buharın bir kısmı su olarak geri döner.
- **Yağ yangını:** yanan yağ akar ve uzun süre ateş besler. Su onu söndüremez.

---

## 4. Sıcaklık sistemi (Mevcut, 0.10.0)

Her hücrenin bir sıcaklığı (°C) olur ve ısı komşu hücrelere iletilir. Hava, ortam sıcaklığına yaklaşır. Ortam sıcaklığı bir kaydırıcıyla ayarlanır; isteğe bağlı gün/gece döngüsü eklenir.

### 4.1 Termal özellikler (başlangıç değerleri; uygulama sırasında ayarlanabilir)

> Durum: doğuş sıcaklığı, iletkenlik, ısı kapasitesi, ısı kaynakları, faz geçişleri (gizli ısı), sıcaklıkla tutuşma ve buharlaşma **mevcut** (0.10.0). Kaynaklar (çoğaltıcı ve yutucu) K 0,06, C 4 değerini kullanır. Buz, kar ve metal için §4.3.
>
> Gizli ısı değerleri (kapasite × °C): su → buhar 1500, buhar → su 600 (%40'ı kaybolur), lav → taş 800, taş → lav 800, kum → cam 300.

| Materyal | Doğuş sıcaklığı | İletkenlik K | Isı kapasitesi C | Sıcaklıkla davranış |
|---|---|---|---|---|
| Hava | ortam | 0,01 | 1 | Ortama yaklaşır. |
| Kum | ortam | 0,04 | 3 | 550 °C'de cama döner (lavla uzun temas). |
| Taş | ortam | 0,06 | 4 | 1500 °C'de lava döner. |
| Su | ortam | 0,08 | 4 | −1 °C'nin altında buza, 100 °C'nin üstünde buhara döner. Hücreler ortama yalnızca yaklaştığı için göl ancak ortam −2 °C ya da daha soğukken donar. 35 °C üstünde ve üstü açıksa yavaşça buharlaşır. |
| Yağ | ortam | 0,03 | 3 | 250 °C'de kendiliğinden tutuşur. |
| Lav | 1150 °C | 0,04 | 4 | 750 °C'de taşa döner. |
| Buhar | 105 °C | 0,02 | 1 | 95 °C'de suya döner; %40'ı kaybolur. |
| Ateş | 900 °C | 0,05 | 1 | Isı kaynağıdır (900 °C'nin altına inmez). |
| Odun | ortam | 0,02 | 3 | 300 °C'de kendiliğinden tutuşur. |
| Cam | ortam | 0,05 | 3 | — |
| Bitki | ortam | 0,02 | 3 | 250 °C'de tutuşur; 5 °C'nin altında büyümez. |
| Yanan odun, bitki, yağ | 700 °C | 0,04 | 2 | Isı kaynağıdır (700 °C). |
| Kül | ortam | 0,01 | 2 | — |

### 4.2 Faz geçişi ve gizli ısı

> Uygulama notu: ilerleme sayacı sabit noktalıdır (1 enerji birimi = 16 adım) ve kesir stokastik yuvarlanır. Böylece eşiğin çok az üstünde bekleyen hücre (ör. 2 °C havadaki buz) de sonunda dönüşür. Gizli ısı en fazla 4095 olabilir.

Eşiği aşan bir hücrenin sıcaklığı eşikte sabitlenir. Fazla ısı `life` sayacında birikir. Sayaç materyalin gizli ısısına ulaşınca hücre dönüşür. Sonuçları:

- buz bir anda erimez
- su bir süre kaynar
- göl kat kat donar

Eşiklerde histerezis vardır (ör. donma −1 °C, erime +1 °C), böylece hücreler iki faz arasında titreşmez.

İki kenarı olan materyalde (su: kaynama ve donma) ilerlemenin yönü `flags` bit3'te tutulur. Yön değişince yarım kalan ilerleme sıfırlanır; kaynamaya başlamış su soğutulunca gizli ısıyı atlayıp anında donmaz (0.10.1).

### 4.3 Yeni materyaller — Mevcut (0.10.0)

| Materyal | Anahtar | Kısayol | Tür | Yoğunluk | Davranış |
|---|---|---|---|---|---|
| Buz | `ICE` | `B` | statik | — | Doğuş −15 °C, K 0,12, C 3. +1 °C'nin üstünde suya döner (gizli ısı 300); bu yüzden +1 °C'lik ortamda erimez, en az +2 °C gerekir. Su −1 °C'nin altında buza döner; göl yüzeyden donar. |
| Kar | `SNOW` | `K` | toz | 8 | Doğuş −8 °C, yalıtkan (K 0,01, C 1). +1 °C'de suya döner (gizli ısı 30, buzdan hızlı). Suyun üstünde yüzer. |
| Metal | `METAL` | `M` | statik | — | Isıyı çok hızlı iletir (K 1,6, C 8; havaya kayıpla ~10 hücre menzil). 450 °C'den sonra kızarır, 1400 °C'de erir (gizli ısı 1200). |
| Erimiş metal | `MOLTEN_METAL` | `E` | sıvı | 40 | Doğuş 1450 °C, K 0,8, C 4, dağılım 4 (çok akışkan). 1300 °C'de metale döner (gizli ısı 400). Lavdan ağırdır, lavın içinde batar. |
| Magma kaynağı | `MAGMA` | — | statik | — | Seçicide yok; sahneler yerleştirir (volkan odası, yarık ve yamaç damarları, Buzul bacası, Dökümhane kaidesi ve oluk damarı, Mağara lav cebi). Sabit 1200 °C ısı kaynağıdır. |
| Çoğaltıcı | `CLONER` | `X` | statik | — | **Mevcut (0.10.0).** Bkz. §4.5. |
| Yutucu | `SINK` | `Y` | statik | — | **Mevcut (0.10.0).** Bkz. §4.5. |

### 4.4 Araçlar — Mevcut (0.10.0)

| Araç | Kısayol | Etki |
|---|---|---|
| Isıt | `H` | Materyal koymaz. Fırçanın altındaki her hücrenin sıcaklığını tick başına en fazla bir kez 25 °C artırır (en fazla 2500 °C). Sürükleme ve üst üste binen fırça izleri birikmez; basılı tutunca her tick yeniden uygulanır. Duraklatılmışken her yeni çizim bir kez uygular (0.10.1). |
| Soğut | `C` | Aynı etki, ters yönde (en az −100 °C). |

### 4.5 Çoğaltıcı (`CLONER`) ve Yutucu (`SINK`) — Mevcut (0.10.0)

- **Öğrenme:** çoğaltıcı ilk temas ettiği hareketli materyali "öğrenir". Hareketli materyaller toz, sıvı ve gazdır; örneğin üstüne dökülen kum, su ya da lav.
- **Üretim:** öğrendikten sonra her tick rastgele bir komşusuna bakar. O komşu boşsa oraya bir kopya koyar. Kopya materyalin doğuş sıcaklığıyla doğar.
- **Bütçe:** her çoğaltıcı hücresi en fazla 1000 kopya üretir. Bütçe bitince durur ve sönük görünür. Dünya genelinde tick başına en fazla 300 kopya üretilir.
- **Öğrenemediği materyaller:** statik materyaller (taş, odun, buz vb.), başka bir çoğaltıcı ve boşluk. Bu sayede kabının duvarlarını kopyalamaz.
- **Görünüm:** öğrendiği materyalin rengine bürünür.
- **Sınırsız mod:** bütçe `65535` ise hiç azalmaz. Seçiciden boyanan kaynaklar sınırlıdır (1000); sahneler `sim.configureSource(x, y, { learn, budget })` ile sınırsız kaynak kurar (`budget: Infinity`).
- **Yutucu (`SINK`, `Y`):** çoğaltıcının tersidir. Her tick rastgele bir komşusuna bakar; komşu hareketli bir materyalse (toz, sıvı, gaz) hücreyi boşaltır ve bütçesini 1 azaltır.
  - Statik materyalleri ve başka kaynakları yutmaz.
  - Hücre başına 1000 birimlik bütçesi vardır; `65535` sınırsızdır.
  - Dünya genelinde tick başına en fazla 300 yutma olur.
  - Bütçesi biten yutucu grileşir.
- **Aşağı yönlü mod (0.10.1):** sahneler `sim.configureSource(x, y, { downward: true })` ile kaynağa yön verebilir (`flags` bit2). Aşağı yönlü kaynak 8 komşu yerine yalnızca yönündeki üç komşudan birine bakar:
  - aşağı yönlü çoğaltıcı yalnızca alttaki üç komşuya üretir;
  - aşağı yönlü yutucu yalnızca üstteki üç komşudan yutar.
  Yön dünya koordinatındadır; dünya çevrilince alttaki kaynaklar üste geçer ve görevleri kendiliğinden değişir. Seçiciden boyanan kaynaklar yönsüzdür.
- **Kum saati** (0.11.0'da yeniden yerleştirildi): tüm kaynaklar sınırsız ve aşağı yönlüdür; şekil kaynaklarla birlikte orta satıra göre simetriktir.
  - İki kapağın iç yüzünün ortasında kumu öğrenmiş 8 çoğaltıcı. Üstteki kapakta hazneye kum üretir; alttakinin altı kapak olduğu için boşta kalır.
  - Yutucular dipte değildir. Alt haznenin üst kısmında, boğazdan inen akışın iki yanında duvara yaslı cam raflar vardır; her rafın üstünde 3 yutucu. Raf boğazdan hazne yüksekliğinin ~%30'u kadar aşağıdadır; küçük haznede sığana kadar aşağı iner.
  - Alt hazne raf seviyesine kadar dolar (400×225'te ~6000 kum, ~3000 tick), fazlası yutulur; hazne tamamen dolup boğazı tıkamaz.
  - Üst haznedeki aynı raf yutucunun tavanıdır, bu yüzden oradaki yutucu boşta kalır.
  - Kum sürekli akar; ters çevrilince görevler yer değiştirir ve akış sürer. İki yönde de alt hazne raf seviyesine kadar dolu kalır.
- **Volkandaki kullanım (mevcut):** iki çoğaltıcı hücre krater yarığının tabanında, yarığın altında bir magma damarı var. Yarık yamaca açık (0.9.0'da sağ ucu kapalıydı); çoğaltıcı boşalan yeri ~2000 hücre boyunca doldurur. 0.11.0'dan beri yarık ağzından koni eteğine kadar yamaç yüzeyinin 2 hücre içinden kesintisiz bir magma damarı geçer. Isınan yamaçta lav kabuk bağlamadan eteğe iner ve sağdaki ağaçları tutuşturur. Damar ağaçlara yaklaşmaz, ağacı damarın ısısı değil lav tutuşturur. Sağ yamaçta kum yoktur.
- **Sınır:** basınç olmadığı için, dolu bir odanın altındaki çoğaltıcı lavı yukarı itemez; etrafında boş hücre yoksa üretim yapmaz. Basınç, planlanan alt proje 2'nin (Basınç ve patlama) konusu.

### 4.6 0.9.0 → 0.10.0 etkileşim değişiklikleri (Mevcut)

| Mevcut kural (§3) | 0.10.0'da |
|---|---|
| Lav + su → buhar, soğuma sayacı | **Mevcut:** ısı iletimiyle olur: su ısınıp kaynar, lav soğuyup taşa döner. Taş dış yüzeyden içe doğru oluşur. |
| Lav + hava → soğuma | **Mevcut:** ısı iletimiyle olur. |
| Lav + kum → kum ısısı → cam | **Mevcut:** ısı iletimiyle olur; kum 550 °C'de cama döner. |
| Buhar ömrü → yoğuşma | **Mevcut:** 95 °C'nin altına soğuyan buhar yoğuşur. Soğuk havada yağmur olarak düşer. |
| Ateş ve yanan materyal + su → buhar | Kalır. Buhar 105 °C'de doğar. |
| Ateş ve lav + yanıcı → tutuşma (temasla) | Kalır. Ek olarak sıcaklıkla kendiliğinden tutuşma gelir. |
| Bitki büyümesi | Kalır. 5 °C'nin altında büyüme yok. |

---

## 5. Basınç ve patlama (0.11.0)

### 5.1 Patlama

Bir patlama (merkez, güç G) şöyle uygulanır (ADR-017):

- **Yarıçap:** `r = min(20, 1 + 1,5·√G)`.
- **Şiddet:** merkeze uzaklığı d olan hücrede `s = 2·√G·(1 − d/r)`, yalnız d < r için.
- **Kenar ve magma:** dokunulmaz.
- **Katı:** `s ≥ dayanıklılık` ise enkazına döner (aşağıdaki tablo). Kırılmayan yanıcı katı `s ≥ 1` ise tutuşur.
- **Toz ve sıvı:** savrulur; yanıcıysa önce tutuşur. Savrulan parçacık havuzu yokken yerinde kalır.
- **Gaz:** yerinde kalır, yalnız ısınır.
- **Isı:** her hücre `600·(1 − d/r)` °C ısınır (en fazla 1500 °C).
- **Ateş:** `d < r/2` olan boş hücreler %50 olasılıkla ateş olur.
- **Sınırlar:** tick başına en fazla 16 patlama ve 4000 etkilenen hücre; kalanlar sonraki tick'e kalır. Kuyruk 64 olay alır, taşan güç 8×8 birleştirme ızgarasında bekler.
- **Araç patlaması:** duraklatılmışken de hemen uygulanır, bir stroke olarak geri alınır, kullanıcı girdisi olduğu için `inputRng` kullanır.

### 5.2 Dayanıklılık ve enkaz

| Materyal | Dayanıklılık | Kırılınca |
|---|---|---|
| toz, sıvı, gaz | 0 (kırılmaz, savrulur) | — |
| Bitki (`PLANT`), yanan bitki | 1 | kül |
| Cam (`GLASS`) | 2 | kum |
| Buz (`ICE`) | 2 | kar |
| Odun (`WOOD`), yanan odun | 4 | kül |
| Taş (`STONE`) | 8 | moloz |
| Çoğaltıcı (`CLONER`), yutucu (`SINK`) | 12 | moloz |
| Metal (`METAL`) | 20 | metal |
| Kenar (`WALL`), magma (`MAGMA`) | kırılmaz | — |

### 5.3 Moloz (`RUBBLE`)

- Kırılan taş ve kırılan çoğaltıcı ya da yutucunun tozu; seçicide `O` kısayolu ile boyanabilir.
- Yoğunluk 26: kumdan (20) ağır, lavdan (30) hafif. Lavın üstünde yüzer.
- Isıl özellikleri taş gibidir (iletkenlik 0,06, kapasite 4); 1500 °C'de lava döner.

### 5.4 Savrulan parçacıklar

Patlamanın ızgaradan aldığı hücreler `debris.js` içindeki önceden ayrılmış havuzda (SoA, kapasite 2000) uçar; tick geçiş 6'da ilerler.

- **Hareket:** her tick `vy += 0,25`, `v *= 0,98`, `|v| ≤ 6` hücre/tick.
- **Yol:** konumdan yeni konuma hücre hücre izlenir (DDA, tek eksen adımları). Hava ve gaz geçilebilir; ilk diğer hücrede ya da dünya kenarında durulur. Köşeden de geçilmez, duvardan sızma yok.
- **İniş:** çarpmadan önceki son hücreye kendi türü, tonu ve sıcaklığıyla iner; doluysa 4 komşusuna (köşegen yok), o da doluysa aynı sütunda yukarıdaki ilk boş hücreye. Bulunamazsa yatay hızını kaybedip düşmeye devam eder. İniş hücresi gazsa gaz silinir.
- **Ömür:** 300 tick sonunda yarıçap 3 içindeki ilk boş hücreye yerleşir; bulamazsa kaybolur ve `debrisLost` artar (testler 0 bekler).
- **Kütle:** ızgara sayımı + havuz sayımı sabittir. `getStats().particles` havuzu içerir. Havuz doluysa hücre yerinde kalır.
- Havuz geri almaya (anlık görüntü) ve dikey çevirmeye (`y ↦ H − y`, `vy ↦ −vy`) dahildir; temizle ve sahne yükleme boşaltır.

### 5.5 Patlayıcılar

- **Güç:** barut hücre başına 4, dinamit 30 (0.11.0 ayarı: taşı kırabilmek için). Tetiklenen hücrenin gücü 8×8 bloğunda toplanır; blok başına tek patlama olur, yarıçap ve şiddet toplam güçten çıkar (§5.1). Büyük yığın bu yüzden daha büyük patlar.
- **Eşik:** barut 200 °C, dinamit 150 °C. Eşiği aşan hücre hemen tetiklenir; tetiklenen hücre boşalır ve en az 800 °C olur.
- **Tutuşma:** ateş, yanan madde ve lav komşu patlayıcıyı tetikler (barut her temasta, dinamit 0,5 olasılıkla).
- **Kıvılcım:** birleştirme eşiğinin (2) altında kalan blok (güç 2 altı; barut tanesi 4 olduğundan tek tane küçük bir patlama üretir, eşik altı kalan kısmî bloklar kıvılcım olur) patlama olayı üretmez; blok merkezinin 3×3 çevresindeki patlayıcıları tetikler. Bunlar sonraki tick patlar. Tek tanenin zinciri böyle başlar. Tick başına en fazla 64 kıvılcım.
- **Fitil:** yanan fitil 5–7 tick yanar, sonra küle döner; bu sırada 8 komşusundaki fitili tutuşturur ve patlayıcıyı tetikler. Ateş yaklaşık 6 tick'te bir hücre ilerler (1× hızda ~10 hücre/s). Yanarken %10 olasılıkla üstüne kıvılcım (ateş) çıkarır; su %80 olasılıkla söndürür (hücre fitile döner). Dayanıklılık 4: şiddeti 1–4 arası patlama fitili tutuşturur, daha güçlüsü kırar.
- **Zincir:** patlamanın şiddeti bir patlayıcıda 0,5 ve üstündeyse hücre tetiklenir. Tetiklenenler ızgaraya yazılır ve sonraki tick patlar; zincir tick tick ilerler, bir tick'te sonsuz döngü olmaz.

### 5.6 Gazlar ve duman

- **Metan:** yoğunluk 3 (havadan hafif), yukarı çıkar. Yanıcılık 1, tutuşma 540 °C. Patlama şiddeti 0,5 ve üstündeyse tutuşur.
- **Yanan metan:** 3–6 tick yanar, sonra kaybolur. Her tick 8 komşusundaki metanı tutuşturur (alev cephesi yayılır), bir komşudaki yanıcıyı tutuşturabilir ve birleştirme ızgarasına hücre başına 0,5 güç yazar (`METHANE_POWER`). 8×8 blokta ≥ 4 yanan hücre eşiği (2) aşar ve patlama olur; yoğun metan cebi bu yüzden patlar, seyrek metan yalnız yanar.
- **Duman:** yoğunluk 4, ömür 200–500 tick. Yalnız açık bölgede söner; kapalı bölgede (`CLOSED_BIT`, flags bit4, basınç geçişi yazar) ömrü azalmaz, birikir.
- **Duman kaynakları:** sönen ateşin %15'i (sıcaklığını korur); yanan maddenin alev üretirken %10'u (en az 300 °C); patlama halkasındaki (d ≥ r/2) boş hücrelerin %25'i. Yangın kaynaklı duman tick başına en fazla 60 (`maxSmokePerTick`).


### 5.7 Kapalı bölge basıncı

- **Tarama:** 4 tick'te bir (geri alma, temizleme ve sahne yüklemede hemen) hava ve gaz hücrelerinin 4-komşu bölgeleri satır parçalarıyla etiketlenir. Dünyanın üst satırına değen bölge açıktır; diğerleri kapalıdır. Kapalı bölgenin hücreleri `CLOSED_BIT` alır, açık bölgedekilerden silinir.
- **Basınç:** P = Σ w·(T+273)/293 / hacim. w(buhar) = 8, hava ve diğer gazlar 1; oda sıcaklığındaki kapalı hava P ≈ 1.
- **Tavan şartı:** basınç yalnız katı tavan altında birikir. Tavanında sıvı ya da toz olan bölge basınçlı sayılmaz; parça uçlarında yan komşusu sıvı ya da toz olan bölge de sayılmaz (suyun içindeki buhar cebi kabarcıkla çıkar).
- **Patlama:** P ≥ 3 ve hacim ≥ 3 ise G = min(400, 0,15·(P − 1)·hacim). Tavanın en zayıf (eşitlikte en üst, sonra en sol) hücresi için 2·√G ≥ dayanıklılık ise orada `PRESSURE` türünde patlama istenir; değilse basınç birikir. Tavan açılınca bölge açık havaya bağlanır ve basınç düşer.
- **Ölçüm (4×3 kavanoz, su 150 °C'de tutulur):** cam 8. tick'te patlar, taş ve metal dayanır (P ≈ 7,2, G ≈ 11).

### 5.8 Ani buharlaşma

- **Sayaç:** `emitSteam` (kaynama, ateşle kaynama, söndürme) her su→buhar dönüşümünü 8×8 bloğa yazar. Her dönüşümün ağırlığı kaynama eşiği üstündeki ısıya (aşırı ısınma) bağlıdır: w = clamp((T − 100) / 6, 0, 3); ateşle kaynama ve söndürme ağırlık 1 alır. Blok sayacı (ağırlıklı toplam) her tick 0,85 ile çarpılır (kısa pencere).
- **Patlama:** sayaç ≥ 6 olunca (ağırlıklı) dönüşüm merkezinde G = sayaç (güç 1/ağırlık) olan `STEAM` türünde patlama istenir ve sayaç sıfırlanır.
- **Sonuç:** lava ya da erimiş metale dökülen su aynı anda buhara dönüp patlar; yavaş ısınan suda dönüşümler zamana yayılır, eşiğe ulaşmaz. Ölçüm (sayaç tepesi): lav + su 3 seedde 4–30 (hepsi patlar), erimiş metal + su ≈ 20–30, magma üstü taş + su ≈ 18; tabanı 150/200/400 °C'de tutulan tencere 0,3/1,4/5,2 (patlamaz); sahnelerde (Buzul, Mağara, Vaha, Kum saati, Dökümhane, Volkan) en çok 0,5. Zayıf ısıtıcı az aşırı ısınma verdiği için tencere ağır sayılmaz.

---

## 6. Materyal ekleme kontrol listesi

Yeni bir materyal ya da etkileşim eklerken:

1. `materials.js` içinde `MAT` kimliğini ve `MATERIAL_DEFS` kaydını ekle. Tür, yoğunluk, renk ve gerekiyorsa termal alanlar buraya girer. Statik materyalde `strength` (ve gerekirse `debris`) zorunludur.
2. Etkileşim varsa `reactions.js` içinde sahip tarafı belirle. Tek sahip kuralını izle.
3. Seçicide görünecekse `js/app/catalog.js` içine etiket, kısayol ve kategori ekle.
4. `tests/` altına davranış testlerini yaz.
5. **Bu belgeyi güncelle:** materyal tablosunu, etkileşim tablosunu ve gerekiyorsa durum etiketini değiştir.
6. Değişikliği `CHANGELOG.md`'ye yaz.

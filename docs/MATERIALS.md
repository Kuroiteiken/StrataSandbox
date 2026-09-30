# Strata Sandbox — Materyaller ve Etkileşimler

Bu belge, simülasyondaki tüm materyalleri ve aralarındaki etkileşimleri tek yerde toplar. Hem mevcut hem planlanmış olanları içerir.

- **Kaynak:** `js/engine/materials.js` (tanımlar), `js/engine/reactions.js` (etkileşimler), `js/engine/kernels.js` (hareket).
- **Kural:** yeni bir materyal ya da etkileşim ekleyen, var olanı değiştiren her değişiklik bu belgeyi de günceller. `tests/docs-materials.test.js` bu testi 0.10.0 planının 1. görevinde ekliyor. Test, tanımlı her materyal anahtarının bu belgede geçtiğini doğrular.
- **Durum etiketleri:**
  - **Mevcut:** yayında (0.9.0).
  - **Planlandı (0.10.0):** tasarımı onaylı, uygulaması sürüyor. Ayrıntılar `docs/superpowers/specs/2026-09-30-sicaklik-sistemi-design.md` dosyasında.
  - **Değişecek:** mevcut davranışın 0.10.0'da nasıl değişeceği.

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
| Buhar | yoğuşma zamanlayıcısı |
| Lav | soğuma sayacı |
| Kum | ısı birikimi |

**Değişecek (0.10.0):**

- Buhar, lav ve kum sayaçlarının yerini sıcaklık alanı alacak. Faz geçişi olan materyallerde `life` "dönüşüm ilerlemesi" anlamına gelecek (bkz. §5).
- Her hücrede ayrıca bir sıcaklık (°C) tutulacak. Sıcaklık parçacıkla birlikte taşınacak ve komşu hücrelere iletilecek.

---

## 2. Mevcut materyaller (0.9.0)

| Materyal | Anahtar | Kısayol | Tür | Yoğunluk | Hareket ayrıntısı |
|---|---|---|---|---|---|
| Hava (boş) | `EMPTY` | — | — | 5 | Referans. |
| Kenar | `WALL` | — | statik | — | Dünyanın görünmez çerçevesi; boyanamaz, silinemez. |
| Kum | `SAND` | `1` | toz | 20 | Suya %50, yağa %40 olasılıkla batar. Lavın üstünde yüzer. |
| Su | `WATER` | `2` | sıvı | 10 | Dağılım 5, yayılma 1, sürtünme 0,5. |
| Taş | `STONE` | `3` | statik | — | — |
| Ateş | `FIRE` | `4` | gaz | 3 | Ömür 10–26 tick. Tick'lerin %65'inde hareket eder, %30 olasılıkla sürüklenir. |
| Odun | `WOOD` | `5` | statik | — | Yanıcılık 0,25. |
| Buhar | `STEAM` | `6` | gaz | 2 | %45 olasılıkla sürüklenir. Ömür 240–480 tick. |
| Yağ | `OIL` | `7` | sıvı | 8 | Dağılım 2, yayılma 0,6, sürtünme 0,6. Suyun üstünde yüzer. Yanıcılık 1. |
| Lav | `LAVA` | `8` | sıvı | 30 | Dağılım 1, yayılma 0,2 (ağır akar), sürtünme 0,9. Havada normal hızla düşer. |
| Bitki | `PLANT` | `9` | statik | — | Büyüme bütçesi 8. Yanıcılık 0,5. |
| Cam | `GLASS` | `G` | statik | — | — |
| Silgi | — | `0` | — | — | Materyal değil; hücreyi boşaltır. Sağ tık her zaman geçici silgidir. |

### Seçicide olmayan (reaksiyonla oluşan) durumlar

| Durum | Anahtar | Tür | Ömür (tick) | Ateş üretimi | Suyla sönme | Kül bırakma | Sönünce |
|---|---|---|---|---|---|---|---|
| Yanan odun | `BURNING_WOOD` | statik | 300–600 | %12 | %50 | %30 | Odun |
| Yanan bitki | `BURNING_PLANT` | statik | 30–60 | %30 | %70 | %5 | Bitki |
| Yanan yağ | `BURNING_OIL` | sıvı (yoğunluk 8) | 120–240 | %35 | sönmez | yok | (Yağ) |
| Kül | `ASH` | toz (yoğunluk 12) | — | — | — | — | — |

Yanan yağ akmaya devam eder ve suyla sönmez (söndürme olasılığı 0); suyun üstünde yüzerek yanar.

---

## 3. Etkileşimler (0.9.0)

Olasılıklar tick başına ve sahip hücrenin örneklemesi başına verilmiştir.

| Etkileşim | Sahip | Sonuç |
|---|---|---|
| Ateş + yanıcı (odun, bitki, yağ) | Ateş | Yanıcılık olasılığıyla tutuşur: yanan odun, yanan bitki ya da yanan yağ olur. |
| Ateş + su | Ateş | %50 olasılıkla su buhara döner ve ateş söner. Bir ateş tick başına en fazla bir suyu buharlaştırır. |
| Ateş (tek başına) | Ateş | Ömrü bitince söner. |
| Yanan materyal (tek başına) | Yanan | Her tick üstündeki üç hücreden birine, boşsa, ateş üretir. Dünya genelinde tick başına en fazla 400 ateş üretilir. Ömrü bitince kül olur ya da kaybolur. |
| Yanan materyal + yanıcı | Yanan | Yangın yayılır (yanıcılık olasılığıyla). |
| Yanan materyal + su | Yanan | Sönme olasılığıyla söner ve eski materyaline döner; su buhara döner. Yanan yağ sönmez. |
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

## 4. Planlandı (0.10.0): sıcaklık sistemi

Her hücrenin bir sıcaklığı (°C) olur ve ısı komşu hücrelere iletilir. Hava, ortam sıcaklığına yaklaşır. Ortam sıcaklığı bir kaydırıcıyla ayarlanır; isteğe bağlı gün/gece döngüsü eklenir.

### 4.1 Termal özellikler (başlangıç değerleri; uygulama sırasında ayarlanabilir)

| Materyal | Doğuş sıcaklığı | İletkenlik K | Isı kapasitesi C | Sıcaklıkla davranış |
|---|---|---|---|---|
| Hava | ortam | 0,01 | 1 | Ortama yaklaşır. |
| Kum | ortam | 0,04 | 3 | 700 °C'de cama döner. |
| Taş | ortam | 0,06 | 4 | 1500 °C'de lava döner. |
| Su | ortam | 0,08 | 4 | −1 °C'de buza, 100 °C'de buhara döner. 35 °C üstünde ve üstü açıksa yavaşça buharlaşır. |
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

Eşiği aşan bir hücrenin sıcaklığı eşikte sabitlenir. Fazla ısı `life` sayacında birikir. Sayaç materyalin gizli ısısına ulaşınca hücre dönüşür. Sonuçları:

- buz bir anda erimez
- su bir süre kaynar
- göl kat kat donar

Eşiklerde histerezis vardır (ör. donma −1 °C, erime +1 °C), böylece hücreler iki faz arasında titreşmez.

### 4.3 Yeni materyaller

| Materyal | Anahtar | Kısayol | Tür | Yoğunluk | Davranış |
|---|---|---|---|---|---|
| Buz | `ICE` | `B` | statik | — | Doğuş −15 °C; +1 °C'de suya döner. Su −1 °C'de buza döner. |
| Kar | `SNOW` | `K` | toz | 8 | Doğuş −8 °C, yalıtkan. +1 °C'de suya döner. Suyun üstünde yüzer. |
| Metal | `METAL` | `M` | statik | — | Isıyı çok hızlı iletir (K 1,6, C 8). 450 °C'den sonra kızarır, 1400 °C'de erir. |
| Erimiş metal | `MOLTEN_METAL` | `E` | sıvı | 40 | Doğuş 1450 °C. 1300 °C'de metale döner. Lavdan ağırdır, lavın içinde batar. |
| Magma kaynağı | `MAGMA` | — | statik | — | Seçicide yok; sahneler yerleştirir. Sabit 1200 °C ısı kaynağıdır. |
| Çoğaltıcı | `CLONER` | `X` | statik | — | Bkz. §4.5. |

### 4.4 Araçlar

| Araç | Kısayol | Etki |
|---|---|---|
| Isıt | `H` | Materyal koymaz. Fırçanın altındaki sıcaklığı her uygulamada 25 °C artırır (en fazla 2500 °C). Basılı tutunca sürer. |
| Soğut | `C` | Aynı etki, ters yönde (en az −100 °C). |

### 4.5 Çoğaltıcı (`CLONER`)

- **Öğrenme:** çoğaltıcı ilk temas ettiği hareketli materyali "öğrenir". Hareketli materyaller toz, sıvı ve gazdır; örneğin üstüne dökülen kum, su ya da lav.
- **Üretim:** öğrendikten sonra her tick rastgele bir komşusuna bakar. O komşu boşsa oraya bir kopya koyar. Kopya materyalin doğuş sıcaklığıyla doğar.
- **Bütçe:** her çoğaltıcı hücresi en fazla 1000 kopya üretir. Bütçe bitince durur ve sönük görünür. Dünya genelinde tick başına en fazla 300 kopya üretilir.
- **Öğrenemediği materyaller:** statik materyaller (taş, odun, buz vb.), başka bir çoğaltıcı ve boşluk. Bu sayede kabının duvarlarını kopyalamaz.
- **Görünüm:** öğrendiği materyalin rengine bürünür.
- **Volkandaki kullanım:** çoğaltıcı krater tabanına, lavın taştığı yarığa yerleştirilir. Volkan böylece bütçe bitene kadar uzun süre lav akıtır.
- **Sınır:** basınç olmadığı için, dolu bir odanın altındaki çoğaltıcı lavı yukarı itemez; etrafında boş hücre yoksa üretim yapmaz. Basınç alt proje 2'de gelecek.

### 4.6 Değişecek etkileşimler

| Mevcut kural (§3) | 0.10.0'da |
|---|---|
| Lav + su → buhar, soğuma sayacı | Isı iletimiyle olur: su ısınıp kaynar, lav soğuyup taşa döner. Taş dış yüzeyden içe doğru oluşur. |
| Lav + hava → soğuma | Isı iletimiyle olur. |
| Lav + kum → kum ısısı → cam | Isı iletimiyle olur: kum 700 °C'de cama döner. |
| Buhar ömrü → yoğuşma | 95 °C'nin altına soğuyan buhar yoğuşur. Soğuk havada yağmur olarak düşer. |
| Ateş ve yanan materyal + su → buhar | Kalır. Buhar 105 °C'de doğar. |
| Ateş ve lav + yanıcı → tutuşma (temasla) | Kalır. Ek olarak sıcaklıkla kendiliğinden tutuşma gelir. |
| Bitki büyümesi | Kalır. 5 °C'nin altında büyüme yok. |

---

## 5. Materyal ekleme kontrol listesi

Yeni bir materyal ya da etkileşim eklerken:

1. `materials.js` içinde `MAT` kimliğini ve `MATERIAL_DEFS` kaydını ekle. Tür, yoğunluk, renk ve gerekiyorsa termal alanlar buraya girer.
2. Etkileşim varsa `reactions.js` içinde sahip tarafı belirle. Tek sahip kuralını izle.
3. Seçicide görünecekse `js/app/catalog.js` içine etiket, kısayol ve kategori ekle.
4. `tests/` altına davranış testlerini yaz.
5. **Bu belgeyi güncelle:** materyal tablosunu, etkileşim tablosunu ve gerekiyorsa durum etiketini değiştir.
6. Değişikliği `CHANGELOG.md`'ye yaz.

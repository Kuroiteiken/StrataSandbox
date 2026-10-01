# Basınç ve Patlama — Tasarım (Alt proje 2/4)

- **Tarih:** 2026-10-01
- **Durum:** Tasarım onaylandı (bölüm bölüm); yazılı spec kullanıcı incelemesinde
- **Hedef sürüm:** 0.11.0 (bekleyen kum saati, volkan ve dökümhane değişiklikleriyle birlikte)
- **Etkilenen kararlar:** yeni ADR-017 (patlama ve savrulan parçacıklar), yeni ADR-018 (kapalı bölge basıncı); ADR-007'ye (tick geçişleri) ek

---

## 1. Bağlam ve hedef

Kullanıcının ilk isteği: "lavın soğuması ve kayaya dönmesi durumu da olabilir. Ayrıca örneğin bir volkanda lava bir şey atarak o volkanı patlamaya zorlayabilir ya da dar bir alanda sıkışma ve patlama gibi durumları da işleyelim."

İş dört alt projeye bölünmüştü. Alt proje 1 (sıcaklık sistemi) 0.10.x ile bitti. Bu belge alt proje 2'yi tanımlar:

1. Isı çekirdeği + Soğuk ve metal (tamamlandı, 0.10.1)
2. **Basınç ve patlama** (bu belge)
3. Kimya: Asit, Tuz, Tuzlu su
4. Toprak ve yaşam: Toprak, Çamur, Tohum

### 1.1 Kullanıcının belirledikleri

- **Hareket:** patlama, yakınındaki hücreleri ızgaradan alıp **savrulan parçacıklara** çevirir. Parçacıklar yay çizerek uçar, bir yere çarpınca ızgaraya geri iner. Tam hız alanı yok.
- **Basınç:** **kapalı bölge basıncı**. Birkaç tick'te bir, gökyüzüne açılmayan gaz bölgeleri bulunur. Bölgedeki gaz miktarı ve sıcaklığı hacme göre basınç verir. Eşik aşılınca en zayıf duvar noktasından patlar.
- **Yıkım:** katılar **dayanıklılığa göre kırılır**. Cam ve buz kolay, odun ve taş orta, metal zor kırılır; kenar hiç kırılmaz. Kırılan taş yeni Moloz tozuna, cam kuma döner.
- **Malzemeler:** Barut, Duman, Metan, ek olarak **Moloz**, **Dinamit** ve **Fitil**.
- **Volkan:** basınçlı oda ve tetik.
  - Oda zamanla gaz biriktirir ve kendiliğinden birkaç dakikada bir küçük patlama olur.
  - Kratere su, buz ya da barut atılınca basınç sıçrar ve volkan patlar. Tepe kabuğu açılır, lav ve taş savrulur.
- **Sahneler:** yeni **Maden ocağı** ve **Gayzer**. **Mağara** patlatılabilir olur, **Volkan** patlayabilir olur.
- **Araç:** **Patlat**. Tıklanan noktada fırça boyutuna göre güçlü bir patlama yapar. Basılı tutmak tekrarlamaz, işlem geri alınabilir.
- **Görüntü:** parlama ve duman; büyük patlamalarda ek olarak kısa **tuval sarsıntısı**. Azaltılmış harekette sarsıntı kapalıdır.
- **Duman:** yangınlar mevcut sahnelerde de **azar azar** duman çıkarır (tick başına sınırlı).
- **Performans:** 400×225 benchmark sahnesinde ortalama tick artışı **≤ 0,5 ms**. Patlama anında kısa süreli sıçrama serbest.

### 1.2 Varsayımlar (kullanıcı onayladı)

- Kalite çıtası alt proje 1 ile aynı: determinizm, TDD, `Math.random` yasağı, motorda DOM yok, hot loop'ta tahsis yok.
- Her şey mevcut hücre simülasyonunun içinde çalışır; katı cisim fiziği yok.
- Mağara bu alt projenin kazı ve patlatma sahnesi olur (alt proje 1'de sözü verilmişti).
- Her şey 0.11.0 olarak, bekleyen üç sahne değişikliğiyle birlikte yayınlanır.

### 1.3 Başarı ölçütleri

- Bir barut yığını tutuşturulunca patlar. Yığın büyüdükçe patlama büyür; yakınındaki taş Moloza döner ve savrulur, odun ve cam kırılır, metal dayanır.
- Bir fitil hattı ateşi saniyede yaklaşık 10 hücre hızla taşır ve sonundaki dinamiti patlatır.
- Kapalı bir cam kavanozdaki hava ısıtılınca kavanoz patlar. Açık kavanoz ve oda sıcaklığındaki kapalı kutu patlamaz.
- Lava ya da erimiş metale su dökülünce buhar patlaması olur. Ağır ağır kaynayan bir tencere patlamaz.
- Yoğun bir metan cebi tutuşunca patlar; seyrek metan yalnız yanar.
- Volkan 1× hızda kendiliğinden birkaç dakikada bir patlar ve kratere su ya da barut atılınca hemen patlar. Yarıktan ağaçlara akan lav korunur.
- Gayzer düzenli aralıklarla su fışkırtır.
- Savrulan parçacıklar duvardan sızmaz. Kırılan ve savrulan malzeme kaybolmaz: ızgara ile parçacık havuzunun toplamı korunur.
- Aynı seed ve aynı işlemler aynı sonucu verir. Geri alma, ters çevirme ve temizleme parçacıklarla da doğru çalışır.
- Benchmark ortalaması ≤ +0,5 ms.

### 1.4 Kapsam dışı

- Hücre başına tam hız alanı (Noita tarzı).
- Hidrolik basınç iletimi: U borusunda seviyelenme, sıvıyı yukarı iten basınç. Bilinen sınırlama olarak kalır.
- Rüzgâr ve konveksiyon.
- Ses.
- Katı cisimler ve yapı statiği: desteği kırılan tavan "çökmez", yalnız kırılan hücreler savrulur.

---

## 2. Motor çekirdeği

### 2.1 Veri modeli

Yeni durumların hepsi önceden ayrılır ve yeniden kullanılır (hot loop'ta tahsis yok).

- **Patlama kuyruğu** (`explosions.js`, SoA, kapasite 64):
  - `qx`, `qy` (Float32): merkez
  - `qPower` (Float32): güç G
  - `qKind` (Uint8): kaynak (barut, dinamit, metan, basınç, buhar, araç)
  - İki tampon vardır: bu tick'in kuyruğu ve zincirleme tetiklenenlerin gideceği bir sonraki tick'in kuyruğu.
- **Birleştirme ızgarası** (8×8 bloklar, `Float32Array` güç toplamı ve ağırlıklı merkez toplamları): aynı tick'te tetiklenen barut ve metan hücreleri bloklarında toplanır, tick sonunda blok başına tek olaya dönüşür. Etkinleşen bloklar bir listede tutulur; ızgaranın tamamı her tick taranmaz.
- **Parçacık havuzu** (`debris.js`, SoA, kapasite 2000):
  - `px`, `py`, `pvx`, `pvy` (Float32)
  - `pType`, `pVariant` (Uint8)
  - `pTemp` (Float32)
  - `pAge` (Uint16)
  - `count`; boşalan yuva son elemanla doldurulur, sıra korunur (determinizm için yerleşik sıra).
- **Basınç durumu** (`pressure.js`):
  - satır parçaları (run) için birleşim-bul tamponları
  - bölge başına hacim, ağırlıklı gaz toplamı, açık/kapalı bayrağı, tavan adayı
  - ani buharlaşma için 8×8 blok sayaçları
- **`flags` bitleri:**
  - bit4 = **kapalı bölgede** (basınç geçişi her taramada yazar; duman yalnız açık bölgede söner)
  - bit5–7 boş kalır.
- **Görünüm (`sim.view`) eklemeleri** (salt okunur):
  - `debris`: { count, x, y, type, variant, temp }
  - `blasts`: son 8 patlamanın halka tamponu { x, y, power, tick }; parlama ve sarsıntı için.

### 2.2 Tick sırası

1. Geçiş 1: toz, sıvı ve reaktif statikler (mevcut).
2. Geçiş 2: gazlar (mevcut).
3. Geçiş 3: ısı (mevcut). Tutuşma kuralları patlayıcıları kuyruğa yazabilir.
4. **Geçiş 4 — basınç** (`stepPressure`):
   - her tick: ani buharlaşma bloklarını değerlendirir;
   - 4 tick'te bir: kapalı bölge taraması, bit4 işaretleri, patlama koşulu.
5. **Geçiş 5 — patlamalar** (`stepExplosions`): birleştirme ızgarasını olaylara çevirir, kuyruğu işler.
6. **Geçiş 6 — parçacıklar** (`stepDebris`): hareket ve iniş.
7. Basılı tutma (mevcut).

**Kuyruğa yazma ve zincirleme:** olayları reaksiyonlar, ısı geçişindeki tutuşma ve basınç yazar. Hepsi aynı tick'in geçiş 5'inde işlenir. Bir patlamanın yarıçapındaki patlayıcılar **bir sonraki tick'in** kuyruğuna yazılır. Böylece barut hattı dalga gibi ilerler ve tek tick'te sınırsız zincir oluşmaz.

### 2.3 Patlama olayı ve sınırlar

- `requestExplosion(x, y, power, kind)`: kuyruğa ekler. Kuyruk doluysa olay birleştirme ızgarasına düşer (güç kaybolmaz, sonraki tick'e kalır).
- Barut, dinamit ve metan doğrudan kuyruğa değil birleştirme ızgarasına yazar. 8×8 bloktaki güçler toplanır, merkez güç ağırlıklı ortalamadır. 500 barut hücresi tek tick'te en fazla birkaç blok olayı üretir.
- **Tick başına sınırlar:**
  - en fazla 16 patlama işlenir;
  - patlamalarda en fazla 4000 hücre etkilenir.

  Kalan olaylar sonraki tick'e kalır.
- **Patlat aracı** istisnadır: patlamasını duraklatılmışken de hemen uygular (§4.1).

### 2.4 Patlamanın uygulanması (ADR-017)

Bir patlama (x, y, G) için:

- **Yarıçap:** r = min(R_MAX, 1 + 1,5·√G).
- **Şiddet:** merkeze uzaklık d olan hücrede s = 2·√G·(1 − d/r), yalnız d < r için.
- **Hücre başına kural** (yarıçap içi, merkezden dışa doğru halka sırasıyla; sıra deterministiktir):
  - **Kenar (WALL) ve magma:** dokunulmaz.
  - **Katı:**
    - s ≥ dayanıklılık ise kırılır: hücre enkaz malzemesine döner (§3.3) ve savrulur.
    - Patlayıcı katı (dinamit, fitil) kırılmaz, tetiklenir.
  - **Toz ve sıvı:** savrulan parçacığa döner. Hız dışa doğrudur: yön (dx, dy)/d ile 0,35 yukarı eğilimin normalize toplamı, büyüklük v = min(V_MAX, 0,75·s). Havuz doluysa hücre yerinde kalır.
  - **Gaz:** yerinde kalır, yalnız ısınır.
  - **Patlayıcı:** s ≥ 0,5 ise tetiklenir.
    - Barut ve dinamit: gücü sonraki tick'in birleştirme ızgarasına yazılır, hücre sıcak boşluğa döner.
    - Metan: yanan metana döner (alev cephesi, §3.2).
    - Fitil: yanan fitile döner.
  - **Yanıcı:** tutuşur.
  - **Isı:** her hücre +HEAT_MAX·(1 − d/r) ısınır (en fazla `TEMP_MAX`). Savrulan parçacık bu sıcaklığı taşır.
  - **Ateş ve duman:** d < r/2 olan boş hücreler %50 olasılıkla ateş, r/2 ≤ d < r olanlar %25 olasılıkla duman olur (tick başına üst sınırlı).
- **Görüntü:** olay `view.blasts` halka tamponuna yazılır.

### 2.5 Savrulan parçacıklar (ADR-017)

- **Hareket (her tick):**
  - vy += GRAVITY;
  - v *= DRAG;
  - |v| ≤ V_MAX.
- **Yol:** konumdan yeni konuma hücre hücre izlenir (DDA). Hava ve gaz geçilebilir; ilk diğer hücrede ya da kenarda durur. Duvardan sızmaz (ölçüm: 5000 parçacıktan 0'ı 1 hücrelik duvardan geçti).
- **İniş:**
  - Parçacık yoldaki son boş hücreye iner: `world.set` ile kendi türü, tonu ve sıcaklığıyla, yeni doğan hücre gibi damgalı.
  - O hücre aynı tick'te dolduysa parçacık yatay hızını kaybeder, uçmaya devam eder ve düşer.
  - İniş hücresi gazsa gaz silinir (boyamadaki kural gibi).
- **Ömür:** 300 tick sonunda parçacık en yakın boş hücreye (yarıçap 3) yerleşir. Bulamazsa kaybolur ve `debris.lost` sayacına yazılır. Testlerde bu sayaç 0 olmalı.
- **Kütle:** ızgara sayımı + havuz sayımı. İstatistiklerdeki parçacık sayısı havuzu da içerir.
- **Sıvı parçacık:** lav ve su sıçrar, indiği yerde sıvı olarak akar.
- **Ölçüm (spike):** 2000 parçacıklık dolu havuz tick başına ~0,11 ms. Tipik bir patlamada havuz 1–2 saniyede boşalır, ortalama ~0,04 ms/tick.

### 2.6 Kapalı bölge basıncı (ADR-018)

- **Tarama:** 4 tick'te bir, hava ve gaz hücrelerinin (EMPTY + GAS türü) 4-komşu bağlı bölgeleri satır parçalarıyla birleşim-bul yöntemiyle etiketlenir.
  - Ölçüm: 400×225'te 0,13–0,21 ms; hücre etiketiyle 0,15–0,23 ms. Ortalama ~0,05 ms/tick.
  - Dünyanın üst satırına değen bölge **açıktır**; diğerleri **kapalıdır**. Kapalı bölge hücrelerine bit4 yazılır, açık bölgedekilerden silinir.
- **Basınç:** P = Σ w(tür)·(T+273)/293 / hacim.
  - w(hava) = w(duman) = w(metan) = w(ateş) = 1; w(buhar) = 8 (suyun genleşmesinin temsili).
  - Ortam sıcaklığındaki kapalı hava P ≈ 1 verir.
- **Tavan:** bölge hücrelerinin hemen üstündeki, bölgeye ait olmayan hücreler. Basınç **yalnız katı tavan altında** birikir. Tavanında sıvı ya da toz hücresi olan bölge basınçlı sayılmaz, çünkü bu modelde gaz sıvının ve tozun içinden kabarcık olarak yükselir.
- **Patlama koşulu:** P ≥ P_BURST ve hacim ≥ V_MIN olsun. Güç G = min(G_MAX, POWER_K·(P − 1)·hacim).
  - Tavanın en zayıf hücresi seçilir. Eşitlikte en üstteki, sonra en soldaki seçilir.
  - 2·√G ≥ o hücrenin dayanıklılığı ise orada patlama kuyruğa yazılır.
  - Değilse bir şey olmaz; basınç birikmeye devam eder. Dar alanda sıkışıp patlama budur: cam kavanoz az basınçla patlar, taş oda çok basınç ister, metal kutu neredeyse hiç patlamaz.
- Patlama tavanı açınca bölge bir sonraki taramada açık havaya bağlanır ve basınç kendiliğinden düşer.

### 2.7 Ani buharlaşma — buhar patlaması

- `emitSteam` her dönüşümü 8×8 bloğuna yazar. Blok sayacı her tick yarıya iner (kısa pencere): c ← c·0,5 + yeni.
- c ≥ FLASH_MIN olunca bloğun dönüşüm merkezinde güç G = c·FLASH_POWER olan bir patlama kuyruğa yazılır ve sayaç sıfırlanır.
- Lava ya da erimiş metale su dökülünce birçok hücre aynı anda buhara döner ve patlar. Yavaş ısınan tencerede dönüşümler zamana yayılır, eşiğe ulaşmaz.

### 2.8 Volkanik gaz

- Magma kaynağına değen lav hücresi düşük olasılıkla (DEGAS_CHANCE) sıcak dumana döner. Sıcaklığı lavınki kadardır.
- Duman kabarcığı lavın içinden yükselir (sıvı gaza her zaman girer) ve krater kabuğunun altında birikir. Bu kapalı cep ısınır ve dolar; basınç tıkacı kıracak kadar yükselince patlar (§2.6).
- Açık kraterden duman tüter.
- Lav kaybı yavaştır (dakikada birkaç hücre). Çok uzun koşuda oda boşalır ve volkan söner; bu bilinçli bir sınırlamadır.
- Tick başına üst sınır: DEGAS_MAX.

### 2.9 Sabitler (başlangıç değerleri)

Değerler uygulama sırasında testlerle ayarlanır; son hâlleri ilgili modüllerdeki sabit nesnelerinde durur.

| Sabit | Değer | Anlam |
|---|---|---|
| `R_MAX` | 20 | patlama yarıçapı üst sınırı |
| `HEAT_MAX` | 600 °C | patlama merkezindeki ısınma |
| `MAX_BLASTS_PER_TICK` | 16 | tick başına işlenen patlama |
| `MAX_BLAST_CELLS_PER_TICK` | 4000 | tick başına etkilenen hücre |
| `MERGE_BLOCK` | 8 | birleştirme ve ani buharlaşma blok kenarı |
| `DEBRIS_CAPACITY` | 2000 | parçacık havuzu |
| `GRAVITY` | 0,25 hücre/tick² | parçacık yerçekimi |
| `DRAG` | 0,98 | tick başına hız çarpanı |
| `V_MAX` | 6 hücre/tick | parçacık hız üst sınırı |
| `DEBRIS_LIFE` | 300 tick | zorunlu iniş |
| `PRESSURE_PERIOD` | 4 tick | bölge tarama aralığı |
| `P_BURST` | 3 | patlama basınç eşiği |
| `V_MIN` | 3 hücre | basınçlı bölge en küçük hacmi |
| `POWER_K` | 0,15 | basınç → güç (0,5 ile taş da kırılıyordu, ADR-018) |
| `G_MAX` | 400 | basınç patlaması güç üst sınırı |
| `W_STEAM` | 8 | buharın basınç ağırlığı |
| `FLASH_MIN` | 6 | ani buharlaşma eşiği (yarılanan sayaç) |
| `FLASH_POWER` | 1 | dönüşüm başına güç |
| `DEGAS_CHANCE` | 1/2500 | magmaya değen lavın tick başına gaz olma olasılığı |
| `DEGAS_MAX` | 8 | tick başına volkanik gaz |
| `SMOKE_MAX` | 60 | tick başına yangın dumanı |
| `FIRE_SMOKE_CHANCE` | 0,15 | sönen ateşin dumana dönme olasılığı |

### 2.10 Geri alma, ters çevirme, temizleme, sahne yükleme

- **Geri alma snapshot'ı:** parçacık havuzu (sayı ve dizilerin kullanılan kısmı), patlama kuyrukları, birleştirme ve ani buharlaşma sayaçları dahil edilir. Basınç bölge tamponları türetilmiş veridir, kaydedilmez. Geri almadan sonra bir sonraki tarama hemen yapılır.
- **Ters çevirme:** parçacıklar y → H − 1 − y, vy → −vy olarak aynalanır. Kuyruktaki olaylar ve birleştirme sayaçları aynalanır. Bit4 bir sonraki taramada yenilenir.
- **Temizle ve sahne yükleme:** havuz, kuyruklar ve sayaçlar boşaltılır.
- **Değişmezler:** `checkInvariants` havuzdaki her parçacığın dünya içinde, türünün tanımlı ve hareketli olduğunu da doğrular.

### 2.11 Determinizm

- Yalnız sim RNG kullanılır. Patlama halkalarının ve havuzun işlenme sırası sabittir.
- Aritmetik: `+ − × ÷`, `Math.sqrt`, `floor`, `imul`. `Math.sin`, `exp` ve `pow` kullanılmaz (motor saflık testi bu modüllere de genişletilir).

---

## 3. Malzemeler

### 3.1 Yeni tanım alanları

- `strength`: patlamaya dayanıklılık (yalnız katılar; varsayılan 0).
- `debris`: kırılınca dönüştüğü malzeme (varsayılan kendisi).
- `explosive: { power, at }`: tetiklenince birleştirme ızgarasına yazılan güç ve sıcaklık eşiği (°C).
- `smoke`: yanarken duman çıkarma olasılığı (yanan malzemeler).
- Derlenen yeni tablolar: `STRENGTH`, `DEBRIS_OF`, `EXPLOSIVE_POWER`, `EXPLODE_AT`.

### 3.2 Yeni malzemeler

Kimlikler 23'ten başlar. "İç" olanlar seçicide yoktur, yalnız motor yazar.

| Kimlik | Anahtar | Ad | Tür | Davranış | Seçici |
|---|---|---|---|---|---|
| 23 | `GUNPOWDER` | Barut | toz, yoğunluk 14 | Ateş, yanan madde ya da lav teması veya ≥ 200 °C ile patlar; hücre başına güç 1. Suya batar. | Toz, `R` |
| 24 | `RUBBLE` | Moloz | toz, yoğunluk 26 | Kırılan taş. Kumdan ağır, lavın üstünde yüzer. K 0,06, C 4; 1500 °C'de lava döner. | Toz, `O` |
| 25 | `METHANE` | Metan | gaz, yoğunluk 3 | Havadan hafif. Ateşle ya da ≥ 540 °C'de yanan metana döner. | Gaz, `N` |
| 26 | `BURNING_METHANE` | Yanan metan | gaz (iç) | 3–6 tick yaşar. Her tick komşu metanı tutuşturur (alev cephesi) ve birleştirme ızgarasına 0,5 güç yazar. Sonunda sıcak boşluğa döner. | — |
| 27 | `SMOKE` | Duman | gaz, yoğunluk 4 | Yalnız açık bölgede 200–500 tick içinde söner. Tutuşmaz. | Gaz, `U` |
| 28 | `DYNAMITE` | Dinamit | katı | Ateş, ≥ 150 °C ya da patlama şiddeti ≥ 0,5 ile tetiklenir; hücre başına güç 8. | Katı, `D` |
| 29 | `FUSE` | Fitil | katı | Tutuşunca yanan fitile döner. Suya değince söner. | Katı, `I` |
| 30 | `BURNING_FUSE` | Yanan fitil | katı (iç) | 5–7 tick yanar. Sonunda küle döner ve 8 komşusundaki fitil, barut ve dinamiti tutuşturur; ateş yaklaşık 10 hücre/s ilerler. Ara sıra üstüne kıvılcım (ateş) çıkarır. Suyla söner. | — |

**Başlangıç termal değerleri** (K/C ≤ 0,25; doğuş sıcaklığı belirtilmedikçe ortam):

| Malzeme | K | C | Not |
|---|---|---|---|
| Barut | 0,03 | 2 | |
| Moloz | 0,06 | 4 | taş gibi; 1500 °C'de lava (gizli ısı 800) |
| Metan | 0,02 | 1 | |
| Yanan metan | 0,05 | 1 | doğuş 1200 °C |
| Duman | 0,02 | 1 | yangın dumanı ~300 °C, volkanik gaz lav sıcaklığında doğar |
| Dinamit | 0,03 | 3 | |
| Fitil | 0,02 | 2 | |
| Yanan fitil | 0,04 | 2 | doğuş 600 °C |

### 3.2a Sıvı azot (kullanıcı isteği, 2026-10-01)

Kullanıcı "magmayı soğutarak taşlaştırabileceğimiz birşey" istedi ve seçenekler arasından yeni bir malzeme olarak **Sıvı azot**u seçti. Magma sabit kaynak olarak kalır; onu yalnız sıvı azot taşa çevirir. Ayrıntılar §3.5'te.

### 3.3 Dayanıklılık ve enkaz

| Malzeme | Dayanıklılık | Kırılınca |
|---|---|---|
| toz, sıvı, gaz | 0 (kırılmaz, savrulur) | — |
| bitki | 1 | kül |
| fitil | 1 | tetiklenir |
| cam | 2 | kum |
| buz | 2 | kar |
| odun, yanan odun | 4 | kül |
| taş | 8 | moloz |
| çoğaltıcı, yutucu | 12 | moloz |
| metal | 20 | metal (parça olarak savrulur, indiği yerde katı metal olur) |
| dinamit | — | tetiklenir |
| kenar, magma | kırılmaz | — |

### 3.4 Mevcut malzemelerde değişiklikler

- **Lav:** temasla tutuşturduğu malzemeler arasına barut, dinamit, fitil ve metan girer. Magmaya değen lav volkanik gaz salar (§2.8).
- **Ateş:** söndüğünde FIRE_SMOKE_CHANCE olasılıkla dumana döner (tick başına SMOKE_MAX). Barut, dinamit, fitil ve metanı tutuşturur.
- **Yanan odun, bitki ve yağ:** alev üretirken ara sıra duman çıkarır (aynı sınır).
- **`emitSteam`:** dönüşümü ani buharlaşma sayacına yazar (§2.7).
- **Isı geçişi (tutuşma kuralı):** `explosive.at` eşiğini aşan patlayıcı, yanmak yerine birleştirme ızgarasına yazar.

### 3.5 Sıvı azot

| Kimlik | Anahtar | Ad | Tür | Seçici |
|---|---|---|---|---|
| 31 | `LIQUID_NITROGEN` | Sıvı azot | sıvı, yoğunluk 8 (suyun üstünde yüzer), dağılım 5 | Sıvı, `A` |

- **Doğuş:** −196 °C. K 0,04, C 2.
- **Kaynama:** ısınınca kaybolur (`phase.up` −190 °C, gizli ısı 150, tamamen kaybolur). Yerinde soğuk hava kalır, hava ortama döner.
- **Temas** (sahip sıvı azot; tick başına bir komşu):
  - lav → taş, magma → taş, erimiş metal → metal, su → buz;
  - ateş ve yanan madde söner (yanan yağ hariç: suyla da sönmez).
  - Her dönüşüm bir sıvı azot hücresini tüketir; geride −196 °C soğuk hava kalır. Dönüşen hücre en fazla 300 °C olur.
- **Magma:** sabit kaynak olarak kalır (Soğut fırçası onu söndürmez). Yalnız sıvı azot taşa çevirir; komşu magma taşı ısıtsa da taşın erime eşiği (1500 °C) aşılmaz.

---

## 4. Araçlar ve arayüz

### 4.1 Patlat aracı

- Araç sekmesinde **Patlat** (`P`).
- Tıklanan hücrede güç G = min(400, boyut²) olan bir patlama: boyut 6 → G 36 (yarıçap 10, merkezde şiddet 12; taş ~3 hücre içinde kırılır).
- Tek tık tek patlama: basılı tutmak ve sürüklemek tekrarlamaz.
- **Duraklatılmışken de** kırma, savurma ve ısıtma hemen uygulanır; parçacıklar zaman akınca uçar.
- Bir stroke'tur, geri alınabilir. Sağ tık yine silgidir.

### 4.2 Seçici ve kısayollar

| Sekme | Yeni girişler |
|---|---|
| Toz | Barut `R`, Moloz `O` |
| Gaz | Metan `N`, Duman `U` |
| Katı | Dinamit `D`, Fitil `I` |
| Araç | Patlat `P` |

Kısayol yardımı ve README tablosu güncellenir.

### 4.3 Durum göstergeleri

- Başlıktaki parçacık sayısı havuzu da içerir.
- `?debug=1` paneline şunlar eklenir:
  - tick başına patlama sayısı
  - havuzdaki parçacık sayısı
  - kapalı bölge sayısı ve en yüksek basınç

---

## 5. Görseller

- **Savrulan parçacıklar:** ızgaradan sonra, kendi malzeme renkleriyle çizilir. 450 °C üstündekiler akkorlaşır ve ışıma tamponuna yazılır. Termal görünümde sıcaklık rampasıyla çizilir.
- **Parlama:** `view.blasts` halka tamponundaki her patlama için, yarıçapla orantılı, merkezi beyaz-sarı ve 6 karede sönen bir ışık lekesi ışıma katmanına eklenir. Azaltılmış harekette yoğunluk yarıya iner. Düşük kalitede kapalıdır.
- **Sarsıntı:** G ≥ 64 olan patlamalarda tuval birkaç piksel, ~12 karede sönen sarsıntıyla kaydırılır. Genlik √G ile orantılıdır, üst sınırlıdır. Azaltılmış harekette kapalıdır. Görüntü alma (PNG) sarsıntısız çizer.
- **Renkler:**
  - Barut: koyu gri-siyah benekli
  - Moloz: koyu taş grisi, iri tonlu
  - Metan: soluk sarımsı yeşil, çok saydam
  - Duman: gri, yarı saydam, ömrü azaldıkça soluklaşır
  - Dinamit: kırmızı
  - Fitil: bej-gri
  - Yanan fitil ve yanan metan: parlak turuncu

---

## 6. Sahneler

### 6.1 Volkan

- Krater çanağının üstünde ince bir **taş tıkaç**, altında küçük bir boşluk (gaz cebi) vardır.
- Magmaya değen lavın saldığı volkanik gaz cepte birikir. Basınç tıkacı kıracak kadar yükselince patlar: tıkaç ve üstündeki lav savrulur, kraterden duman tüter. Lav krater yüzeyinde yeniden kabuk bağlar ve döngü sürer.
- **Hedef:** 1× hızda ilk patlama 1–4 dakika içinde; sonraki patlamalar ≤ 5 dakika arayla.
- **Tetik:**
  - Kratere su ya da buz atmak: sıcak tıkaçta ya da açık lavda ani buharlaşma, hemen patlama.
  - Barut atmak: tutuşur ve patlar.
- **Korunanlar:** yarıktan sağ yamaçtan ağaçlara akan lav ve sol göl.
- **Gaz cebi ile yarık ayrı tutulur.** Yarık cebe açılırsa cep açık havaya bağlanır ve basınç birikmez. Gerekirse yarık bacaya cebin altından bağlanır.
- Ayrıntılı geometri uygulamada ölçümle ayarlanır.
- **Uygulama notu (Görev 10):** tıkaç platonun üst satırı ve bacanın içine 7 satır taştır (toplam 8, `PLUG_ROWS`); altında 4 satırlık boş cep (`POCKET_ROWS`). Baca duvarları magmadır (baca lavı donmaz), yarık (`riftY = plateauY + craterD + 1`, 3 satır) bacadan bir sütun magmayla ayrıdır. Gaz salan magma `RATES.degasU32` = 1/1000. Her patlama tıkacın bir satırını yer, bu yüzden "lav yeniden kabuk bağlar ve döngü sürer" sağlanmadı: ölçülen ilk patlama 9 672. tick, 30 000 tick'te 5 basınç patlaması; tıkacın iki yanındaki yüzey magması su/barut tetiğini sağlar, sonra volkan susar.

### 6.2 Yeni sahne: Maden ocağı

`js/scenes/quarry.js`; `id: 'quarry'`, ad "Maden ocağı", ortam 15.

- Katmanlı taş: farklı tonlarda taş bantları, arada kum ve moloz.
- Taşın içinde metal cevher damarları.
- Yüzeyden aşağı inen delikler: dipte barut ve dinamit, yüzeye kadar fitil.
- Taşın içinde kapalı metan cepleri.
- Ocak tabanında odun destekler ve bir el arabası yığını (moloz).
- **İpucu:** "Fitilin ucunu Ateş ya da Isıt ile tutuştur."

### 6.3 Yeni sahne: Gayzer

`js/scenes/geyser.js`; `id: 'geyser'`, ad "Gayzer", ortam 10.

- Derinde magma yatağı. Üstünde taş tabanlı bir su odası.
- Odadan yüzeye çıkan dar bir baca, yüzeyde sığ bir havuz ve terasları (cam ve taş).
- Odayı alttan besleyen, yandaki gölden gelen bir kanal (su düzeyi göl tarafından korunur).
- **Döngü:**
  1. Magma odanın suyunu topluca kaynama noktasına getirir.
  2. Ani buharlaşma patlaması suyu bacadan yukarı fırlatır (fışkırma).
  3. Oda gölden soğuk suyla dolar ve döngü yeniden başlar.
- **Hedef:** 1× hızda 30–120 saniyede bir fışkırma.
- **Risk ve yedek:** döngünün düzenliliği ince ayara bağlıdır. Ölçümle tutmazsa sahneye özel bir "gayzer ısı darbesi" kaynağı kullanılır ve bu karar ledger'a yazılır.

### 6.4 Mağara

- Taşın içine iki kapalı metan cebi eklenir.
- Tünelde bir barut fıçısı (odun çerçeveli barut) bulunur.
- Mevcut göl, lav cebi ve yağ cebi korunur. Duvar ve sızıntı testleri geçmeye devam eder.

### 6.5 Sahne sırası

Volkan, Kum saati, Vaha, Buzul, Dökümhane, Mağara, Maden ocağı, Gayzer, Kaos Lab, Boş. Benchmark gizli kalır.

---

## 7. Hata durumları ve değişmezler

- **Kuyruk ve havuz doluysa:** olay sonraki tick'e kalır; savrulamayan hücre yerinde kalır. Kayıp olmaz.
- **Yerleşemeyen parçacık:** kaybolur ve `debris.lost` artar. Testler 0 bekler.
- **Basınç taraması:** bölge sayısı ve hacimler sınırlıdır (ızgara boyutu). Tampon taşması olmaz.
- **Patlama dünya dışına taşmaz:** halka dünya sınırında kırpılır; kenar hücrelerine hiç yazılmaz.
- **NaN koruması:** güç ve hız sonlu ve sınırlıdır. Sonlu olmayan güç istekleri reddedilir.
- **Değişmezler:** kenar bütünlüğü, tanımlı türler, sıcaklık aralığı, sayımlar; bunlara ek olarak havuz parçacıklarının sınır içinde ve hareketli türde olması.

---

## 8. Test stratejisi

TDD: her davranış önce testle (kırmızı), sonra kodla (yeşil).

- **Patlama çekirdeği:**
  - Yarıçap ve şiddet formülü; halka sırası deterministik.
  - Dayanıklılık: aynı güçte cam kırılır, taş belli uzaklıkta kırılır, metal kırılmaz, kenar ve magma hiç değişmez.
  - Enkaz eşlemesi: taş → moloz, cam → kum, buz → kar, odun → kül.
  - Toz ve sıvı savrulur, gaz yerinde kalır, yanıcı tutuşur, ısı artar.
  - Zincir: bir barut hattı tek tick'te değil, tick tick ilerler.
  - Sınırlar: 16 patlama ve 4000 hücre; fazlası sonraki tick'e kalır.
- **Parçacıklar:**
  - 1 hücrelik duvardan ve çapraz merdivenden sızmaz.
  - Kütle: patlamada savrulan kum + ızgaradaki kum sabit, `lost` = 0.
  - Aynı hücreye inmek isteyenler başka yere iner.
  - Geri alma havuzu da geri getirir; ters çevirme aynalar; temizle boşaltır.
- **Malzemeler:**
  - barut yığını büyüdükçe patlama büyür;
  - dinamit ısıyla ve patlamayla tetiklenir;
  - fitil hızı ~10 hücre/s (±%30) ve sonundaki dinamiti patlatır, su fitili söndürür;
  - yoğun metan cebi patlar, seyrek metan yalnız yanar;
  - duman açık bölgede söner, kapalı bölgede kalır;
  - yangın tick başına sınırlı duman çıkarır.
- **Basınç:**
  - kapalı cam kavanoz ısıtılınca patlar;
  - aynı kavanoz açıkken patlamaz;
  - oda sıcaklığındaki kapalı kutu patlamaz;
  - taş kutu cam kavanozdan çok daha fazla basınç ister;
  - metal kutu yüksek basınçta bile dayanır;
  - sıvı tavanlı bölge basınçlı sayılmaz;
  - patlama tavanın en zayıf, en üstteki hücresinden olur.
- **Ani buharlaşma:** lava dökülen su patlar; ağır ağır ısınan tencere 2000 tick boyunca patlamaz.
- **Sahneler:**
  - Volkan:
    - 30 000 tick içinde en az 3 kendiliğinden patlama;
    - kratere su atınca 300 tick içinde patlama;
    - yarıktan ağaçlara akış ve "lav yalnız sağ yarıktan" testi korunur. Bu test ilk kendiliğinden patlamadan önceki süreyle sınırlanır.
  - Gayzer: 20 000 tick içinde en az 3 fışkırma.
  - Maden ocağı: fitil tutuşunca dinamit patlar ve taş molozlaşır.
  - Mağara: metan cebi ve barut fıçısı patlatılabilir; duvar ve sızıntı testleri geçer.
  - Tümü: 7 grid boyutunda üretim, değişmezler ve determinizm.
- **Arayüz:**
  - Patlat aracı tek tıkta tek patlama yapar, duraklatılmışken de uygulanır, geri alınır;
  - kısayollar ve sekmeler;
  - sarsıntı azaltılmış harekette kapalıdır;
  - görüntü alma sarsıntısızdır.
- **Determinizm ve saflık:** aynı seed ve işlemler aynı `hashView`. Havuz da hash'e katılır. Yeni modüllerde `Math.random`, `sin`, `exp`, `pow` yoktur.

### 8.1 İnceleme odağı (plan için aday)

1. 500 barut hücresinin tek seferde tutuşması: tick süresi sınırlı kalır ve olaylar birleşir.
2. Ters çevirme ve geri alma, uçuşta parçacık varken.
3. Kapalı odada sürekli yanan yangın: basınç patlamaları spam'e dönüşmez, tavan kırılamıyorsa sessiz kalır.
4. Mevcut sahnelerde istenmeyen buhar patlaması: Buzul bacası, Dökümhane su teknesi, Mağara kaplıcası. Yalnız beklenen yerlerde olmalı.
5. Patlamada çoğaltıcı ve yutucu kırılınca kum saati: kırılmaları dayanıklılığa göre olur ve sahne bozulmaz.

---

## 9. Performans

- **Hedef:** 400×225 benchmark sahnesinde ortalama tick artışı ≤ +0,5 ms (patlama olmayan sahne).
- **Ölçüm planı:**
  - Basınç taraması 4 tick'te bir (spike: ~0,05 ms ortalama).
  - Ani buharlaşma blokları yalnız etkin bloklarda.
  - Havuz boşken parçacık geçişi ~0.
  - Patlamada tepe değer ayrıca ölçülür: 64 barutluk patlama ve dolu havuz.
- **Yedek:** tarama maliyeti tutmazsa periyot 8'e çıkar; uyuyan satır bilgisi (ısı geçişi) bölge taramasında kullanılmaz (bölgeler satırlar arası bağlantılıdır).
- Sonuçlar DEVELOPMENT.md benchmark tablosuna yazılır.

---

## 10. Dokümanlar ve sürüm

- `docs/MATERIALS.md`: yeni malzemeler, dayanıklılık ve enkaz tablosu, patlama, basınç, ani buharlaşma, volkanik gaz, duman kuralları; `flags` bit4.
- `docs/DECISIONS.md`: ADR-017 (patlama ve savrulan parçacıklar), ADR-018 (kapalı bölge basıncı), ADR-007 eki (geçiş 4–6).
- `docs/ARCHITECTURE.md`: yeni modüller, tick sırası, görünüm eklemeleri.
- `README.md`:
  - materyaller, kısayollar, sahneler, ekran görüntüleri;
  - bilinen sınırlamalar: hidrolik basınç yok, yapı statiği yok.
- `CHANGELOG.md` `[Unreleased]` ve `js/app/releases.js` `UNRELEASED` (0.11.0): her görünür değişiklik eklenir.
- `docs/DEVELOPMENT.md`: Phase 14 maddeleri ve 0.11.0 manuel kontrol listesi.
- Sürüm: tamamlanınca 0.11.0. v1.0.0 dört alt proje bitince.

---

## 11. Uygulama sırası (plan için taslak)

1. Sürüm notları, Phase 14 ve ADR iskeleti; `flags` bit4 ve yeni tablo alanları.
2. Patlama çekirdeği: kuyruk, birleştirme, yarıçap ve şiddet, dayanıklılık ve enkaz, ısı, ateş ve duman (havuz yokken toz yerinde kalır).
3. Savrulan parçacık havuzu: hareket, DDA, iniş, ömür, kütle; geri alma, çevirme, temizle.
4. Barut, Moloz, Dinamit; tutuşma ve zincirleme.
5. Fitil ve yanan fitil.
6. Metan, yanan metan, Duman; yangın dumanı.
7. Kapalı bölge basıncı: tarama, bit4, P, tavan, patlama koşulu.
8. Ani buharlaşma.
9. Görseller: parçacık çizimi, parlama, sarsıntı, termal.
10. Patlat aracı, seçici, kısayollar, debug paneli.
11. Volkanik gaz ve volkan tıkacı.
12. Maden ocağı sahnesi.
13. Gayzer sahnesi.
14. Mağara güncellemesi.
15. Sıvı azot (kullanıcı isteği, 2026-10-01).
16. Performans, dokümanlar, ekran görüntüleri, 0.11.0.

> Not: planda görev numaraları farklıdır (Görev 13 Mağara, 14 Sıvı azot, 15 sürüm).

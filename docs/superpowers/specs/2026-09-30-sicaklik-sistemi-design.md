# Sıcaklık Sistemi — Tasarım (Alt proje 1/4: Isı çekirdeği + Soğuk ve metal)

- **Tarih:** 2026-09-30
- **Durum:** Tasarım onaylandı (bölüm bölüm); yazılı spec kullanıcı incelemesinde
- **Hedef sürüm:** 0.10.0
- **Etkilenen kararlar:** ADR-003'ün yerini ADR-014 alır; yeni ADR-015 eklenir

---

## 1. Bağlam ve hedef

Kullanıcının isteği şuydu: "ortam sıcaklığı gibi şeyleri ekle, ekstra elementler ekle ve iyileştir." Sonra şunu ekledi: "lav soğuyup kayaya dönsün; volkana bir şey atarak onu patlamaya zorlamak, dar alanda sıkışma ve patlama gibi durumlar da olsun."

İş, bağımlılık sırasıyla dört alt projeye bölündü. Her alt proje kendi spec → plan → uygulama döngüsünden geçer.

1. **Isı çekirdeği + Soğuk ve metal** (bu belge)
2. **Basınç ve patlama:** Barut, Duman, Metan, buhar patlaması, volkan patlaması, dar alanda sıkışma
3. **Kimya:** Asit, Tuz, Tuzlu su
4. **Toprak ve yaşam:** Toprak, Çamur, Tohum

### 1.1 Kullanıcının belirledikleri

- Tam sıcaklık simülasyonu: her hücrenin bir sıcaklığı vardır ve ısı komşulara yayılır.
- Ortam sıcaklığı bir kaydırıcıyla ayarlanır. İsteğe bağlı bir gün/gece döngüsü vardır.
- Yeni materyaller: Buz, Kar, Metal ve Erimiş metal.
- İyileştirmeler:
  - kategorili materyal seçici
  - ısı görselleri: akkorluk, termal görünüm, imleç altında °C
  - Isıt ve Soğut fırçaları
  - mevcut fiziğin sıcaklığa bağlanması: lav kabuğu, buharlaşma, kendiliğinden tutuşma
- Lav soğuyup taşa dönmeli.
- Yaklaşım A seçildi: tam çözünürlüklü sıcaklık alanı.
- Kum saati, Vaha ve Volkan gibi yeni hazır sahneler eklenmeli. Kum saati sahnesinin iyileştirilmesi gerekiyor (§7).
- Çoğaltıcı: üstüne konan materyali belli bir miktar çoğaltıp duran bir kaynak; örneğin volkanda (§3.4).
- Tüm materyaller ve etkileşimleri, eskiler ve yeniler, `docs/MATERIALS.md`'de belgelenmeli ve güncel tutulmalı.

### 1.2 Varsayımlar (kullanıcı onayladı)

- Sıcaklıklar gerçekçi °C referans noktalarıyla gösterilir. Değişim hızları oynanabilirlik için ayarlanır.
- Isı maddeyle birlikte taşınır.
- Hava, ortam sıcaklığına yaklaşan bir ısı deposudur. Konveksiyon ve rüzgâr yoktur.
- Determinizm, undo ve performans bütçesi korunur. Mevcut sahneler karakterini kaybetmez.
- Basınç bu alt projede yoktur. Tasarım, basınca bir bağlantı noktası bırakır.

### 1.3 Başarı ölçütleri

1. Ortam 0 °C'nin altındayken göl yüzeyden aşağı doğru donar. Ortam 0 °C'nin üstüne çıkınca çözülür.
2. Lavın yanındaki buz gecikmeli erir, su kaynar ve buhar olur. Lav yüzeyden kabuk bağlar, içi daha uzun süre sıvı kalır.
3. Bir metal çubuk ısıyı bir ucundan diğerine iletir ve ısındıkça kızarır.
4. 400×225 gridde tick başına medyan süre en fazla 0,6 ms artar (Node, `tools/bench.js`).
5. Tüm testler geçer. Aynı seed ve aynı girdi aynı dünyayı üretir; buna sıcaklık alanı da dahildir.

### 1.4 Kapsam dışı

- Basınç, patlama ve itme (alt proje 2).
- Konveksiyon: sıcak hava yükselmez, rüzgâr yoktur.
- Kimya: tuzun donma noktasını düşürmesi alt proje 3'te.
- Buzun kaldırma kuvvetiyle yüzmesi yoktur: buz statik bir katıdır. Göl yüzeyden donduğu için görsel sonuç doğrudur.
- Karın sıkışıp buza dönmesi yoktur.
- Kalıcı, seçilebilir ısıtıcı ve soğutucu blokları yoktur. Yerlerini Isıt ve Soğut fırçaları tutar.

---

## 2. Motor çekirdeği

### 2.1 Veri modeli

- **`world.temp`:** `Float32Array(size)`, birimi °C. Hava (EMPTY) dahil her hücrede bulunur.
- **`world.tempNext`:** difüzyon için ikinci tampon. İki tamponun rolü her tick yer değiştirir. Bu yüzden kod `world.temp` referansını her kullanımda yeniden okur; referans saklanmaz.
- **`world.ambient`:** bu tick'in ortam sıcaklığı. Simulation her tick başında yazar.
- **Kenar çerçevesi (WALL):** her tick ortam sıcaklığına ayarlanır. Dünyanın sınırı böylece bir ısı deposu gibi davranır.
- **Primitive'ler:**
  - `swap(a, b)`: sıcaklığı da takas eder. Isı maddeyle birlikte taşınır.
  - `set(i, type, variant, life, flags, temp)`: yeni `temp` parametresi zorunludur. Kim hangi değeri verir:
    - **Boyama, sahne ve oluşan ateş:** materyalin doğuş sıcaklığı (`spawnTemp(t, ambient)`, bkz. §3.1).
    - **`vanish` (ateşin sönmesi, yanmanın bitmesi):** hücrenin mevcut sıcaklığı korunur. Sönen ateş geride sıcak hava bırakır.
    - **Silgi:** ortam sıcaklığı yazar. Silinen lavın yerinde sıcak hava kalmaz.
  - `transform(i, type, life)`: sıcaklığa dokunmaz.
  - `clear()`: tüm hücrelerin sıcaklığını ortam sıcaklığına ayarlar.
- **Undo snapshot'ı:** `temp` de kopyalanır. 400×225 gridde bu, snapshot başına ~360 KB ek bellek demektir.
- **Determinizm:**
  - Yalnızca `Float32Array` ve dört işlem kullanılır. JavaScript'te FMA yoktur; IEEE 754 davranışı tanımlıdır.
  - Isı kodunda ve iklim kodunda `Math.sin`, `Math.exp` ve `Math.pow` kullanılmaz. Bu, kaynak taramalı bir testle zorlanır.

### 2.2 Tick sırası

1. **Geçiş 1**, aşağıdan yukarı: toz, sıvı ve reaktif hücreler (değişmedi).
2. **Geçiş 2**, yukarıdan aşağı: gazlar (değişmedi).
3. **Geçiş 3, ısı** (yeni `js/engine/heat.js`, `stepHeat`): difüzyon, hava, kaynaklar, faz geçişleri, tutuşma ve buharlaşma.
4. Basılı tutma (hold) uygulanır.

Geçiş 3'te dönüşen hücreler damgalanır. Bu damga, sonraki tick'te yeni saat değeri geldiği için etkisizdir.

### 2.3 Difüzyon

`a` kaynak (`world.temp`), `b` hedef (`world.tempNext`) tamponudur. İç hücre `i` ve 4 komşusu `j` için:

```text
k_ij   = min(K[type[i]], K[type[j]])          // yalıtkan taraf belirler; simetrik
flux_i = Σ_j k_ij · (a[j] − a[i])
b[i]   = a[i] + flux_i · INV_CAP[type[i]]
EMPTY ise:   b[i] += (ambient − b[i]) · AIR_RELAX
Kaynaksa:    b[i] = max(b[i], SOURCE_TEMP[type[i]])
```

- **Kararlılık:** `compileMaterials`, her materyal için `4 · K / C ≤ 1` şartını doğrular; yani `K/C ≤ 0,25`. Şart sağlanmazsa hata fırlatır. Bu şart sağlanınca açık (explicit) şema monotondur ve yeni değer komşuların min–max aralığında kalır.
- **Enerji korunumu:** `k_ij` simetrik olduğu için `Σ C_i·T_i` korunur. Korunumu bilinçli olarak bozan yerler şunlardır:
  - havanın ortama yaklaşması
  - ısı kaynakları
  - Isıt ve Soğut araçları
  - faz ilerlemesinin sönmesi (§2.5)
- **Kenar:** WALL hücrelerinin iletkenliği havayla aynıdır (`K_WALL = K_AIR`).
- **Tampon değişimi:** geçiş sonunda `world.temp` ile `world.tempNext` yer değiştirir.

### 2.4 Uyuyan satırlar

Difüzyondan önce her satır için `hot[y]` hesaplanır. Bir satır "sıcak" sayılır, eğer içinde şu hücrelerden biri varsa:

- `|T − ambient| > SLEEP_EPS` olan bir hücre, **ya da**
- "eşik adayı" bir hücre: yukarı eşiğini aşmış, aşağı eşiğinin altına inmiş, tutuşma sıcaklığını geçmiş, bir ısı kaynağı ya da buharlaşma adayı.

Satır `y`, ancak `hot[y−1] | hot[y] | hot[y+1]` doğruysa işlenir. İşlenmeyen satır hedef tampona olduğu gibi kopyalanır (`b.set(a.subarray(...))`).

- **Bilinçli yaklaşıklık:** uyuyan satırın hücreleri, ortam sıcaklığına ±`SLEEP_EPS` hassasiyetle takılı kalabilir. Bu yüzden uyku açıkken ve kapalıyken sonuçlar birebir aynı olmaz.
- **Doğruluk şartı:** kısa bir senaryoda (büyük, ılık bir alanın içinde bir sıcak nokta ve bir buz bloğu; 500 tick) iki koşu karşılaştırılır:
  - her hücrenin sıcaklık farkı ≤ 2 · `SLEEP_EPS` olmalıdır;
  - materyal sayıları aynı olmalıdır.

  Testte uyku, iç bir bayrakla kapatılır.
- **Gün/gece döngüsünde:** uyuyan satırlar, ortam sıcaklığı `SLEEP_EPS` kadar uzaklaşınca kısa süreliğine uyanır.
- Uyku mekanizmasının kendisi deterministiktir; aynı seed yine aynı sonucu verir.

### 2.5 Faz geçişleri ve gizli ısı (ADR-015)

Her materyalin en fazla iki faz geçişi vardır: `up` (ısınınca) ve `down` (soğuyunca). Her geçiş `{ at, into, latent, vanish? }` alanlarından oluşur. Difüzyondan sonra, işlenen satırlarda:

```text
T = b[i], C = CAP[t]
up  varsa ve T > up.at    :  life[i] += round((T − up.at) · C)
                             b[i] = up.at
                             life[i] ≥ up.latent ise    → dönüş(i, up)
down varsa ve T < down.at :  life[i] += round((down.at − T) · C)
                             b[i] = down.at
                             life[i] ≥ down.latent ise  → dönüş(i, down)
aksi halde, life[i] > 0   :  life[i] −= min(life[i], PROGRESS_DECAY)
dönüş(i, g) : vanish varsa ve zar tutarsa   → EMPTY
              aksi halde                    → transform(i, g.into, 0)
              (sıcaklık eşik değerinde kalır)
```

- **`life`'ın anlamı:** faz geçişi olan materyallerde `life` "dönüşüm ilerlemesi"dir. Bu materyaller: su, buz, kar, buhar, lav, kum, taş, metal ve erimiş metal. `life` değeri Uint16 ile sınırlanır; bu yüzden gizli ısı değerleri 65535'ten küçük olmalıdır ve bu, derlemede doğrulanır.
- **Değişmeyen anlamlar:** ateşin ve yanan materyallerin ömrü ile bitkinin büyüme bütçesi aynen kalır. Bu materyallerde gizli ısılı faz geçişi yoktur.
- **Histerezis:** geçiş eşikleri arasında boşluk bırakılır. Örnekler: su −1 °C'de donar, buz +1 °C'de erir; su 100 °C'de kaynar, buhar 95 °C'de yoğuşur. Bu boşluk sayesinde dönüşen hücre hemen geri dönmez.
- **Enerji:** erime ısıyı ilerleme sayacına çeker. Donma, sıcaklığı eşikte sabitleyerek ısıyı serbest bırakır. Tam bir döngüde enerji korunur. Yarım kalmış ilerleme söner ve bu enerji kaybolur; bu bilinçli bir basitleştirmedir.

### 2.6 Olasılıklı sıcaklık kuralları

Bu kurallar da geçiş 3'te, eşik adaylarında çalışır. Hepsi sim RNG'sini kullanır; RNG tüketim sırası tarama sırasıyla aynıdır, bu yüzden sonuç deterministiktir.

- **Tutuşma:** `ignitesAt` değeri olan bir materyal `T ≥ ignitesAt` ise, her tick `IGNITE_CHANCE` olasılıkla kendi `burnsInto` durumuna dönüşür. Dönüşümde yanma ömrü atanır (`initialLife`).
- **Buharlaşma:** yalnızca su için geçerlidir. `T ≥ EVAP_AT` ise ve üstündeki hücre EMPTY ise, su hücresi her tick `min(EVAP_MAX, EVAP_RATE · (T − EVAP_AT))` olasılıkla EMPTY olur. Su kaybolur, nem olarak geri gelmez.
- **Bitki:** `T < PLANT_MIN_TEMP` ise bitki büyümez. Bu kural geçiş 1'deki `reactPlant` içinde tek bir sıcaklık okumasıyla uygulanır.

### 2.7 Reaksiyonlarda yapılan değişiklikler (`reactions.js`)

**Kaldırılanlar:** hepsi sıcaklık alanına taşınır.

- `COOLS` ve geçiş 1'deki satır içi kum soğuması
- `RATES` içindeki `sandHeatGain`, `glassHeat`, `lavaQuench`, `lavaAirCool`, `lavaSolidify`
- `reactLava` içindeki kum ısıtma, su kaynatma ve hava soğutma dalları
- `reactSteam` ve buharın yoğuşma zamanlayıcısı

**Korunanlar:**

- Ateşin komşuyu tutuşturması (2 örnek), ateşin suyla sönüp suyu buhara çevirmesi
- Yanan materyallerin kuralları: ateş üretimi, bütçe, suyla sönme, kül
- Lavın yanıcı komşuyu temasla tutuşturması. Lav bu yüzden reaktif kalır; tek bir dalı olur.
- Bitki büyümesi (§2.6'daki sıcaklık şartıyla)
- `condenseToWater` kuralı, buharın `down.vanish` değeri olarak taşınır: yoğuşan buharın %40'ı kaybolur.

**Yeni:** tüm buhar üretimi `emitSteam(world, i)` adlı tek bir fonksiyondan geçer: suyun kaynaması (faz geçişi), ateşin suyu buharlaştırması ve yanan materyalin suyla sönmesi.

- Fonksiyon hücreyi buhara dönüştürür ve sıcaklığını buharın doğuş sıcaklığına (105 °C) ayarlar. Aksi halde temasla oluşan buhar suyun sıcaklığını alır ve hemen yoğuşurdu.
- Alt proje 2 basınç kaynağını bu fonksiyona bağlayacak.

### 2.8 Sabitler (başlangıç değerleri)

Bu değerler uygulama sırasında testlerle ayarlanır; son hâlleri `heat.js`'teki `HEAT` nesnesinde durur.

| Sabit | Değer | Anlam |
|---|---|---|
| `AIR_RELAX` | 0,02 | havanın tick başına ortama yaklaşma oranı |
| `SLEEP_EPS` | 0,5 °C | uyuyan satır toleransı |
| `PROGRESS_DECAY` | 2 / tick | eşiğin gerisindeki hücrede ilerlemenin sönme hızı |
| `IGNITE_CHANCE` | 1/16 | tutuşma sıcaklığını geçen hücrenin tick başına tutuşma olasılığı |
| `EVAP_AT` | 35 °C | buharlaşma eşiği |
| `EVAP_RATE` | 0,00002 / °C | buharlaşma olasılığının eğimi |
| `EVAP_MAX` | 0,001 | tick başına buharlaşma olasılığının üst sınırı |
| `PLANT_MIN_TEMP` | 5 °C | bu sıcaklığın altında bitki büyümez |
| `TOOL_DELTA` | 25 °C | Isıt/Soğut fırçasının tick başına etkisi |
| `TOOL_MIN` / `TOOL_MAX` | −100 / 2500 °C | fırça sınırları |

**Gizli ısı** (birim: kapasite × °C):

| Geçiş | Değer |
|---|---|
| Su ↔ Buz, iki yönde de | 300 |
| Su → Buhar | 1500 |
| Buhar → Su | 300 |
| Lav → Taş | 800 |
| Taş → Lav | 800 |
| Kum → Cam | 450 |
| Kar → Su | 30 |
| Metal ↔ Erimiş metal, iki yönde de | 150 |

- **Simetrik geçişler:** donma/erime ve metalin erime/katılaşma çiftleri enerji dengesi için aynı değeri kullanır.
- **Buharın yoğuşması:** kasıtlı olarak kaynamadan küçük tutulur. Aksi halde buhar tavana kadar yükselir, yağmur olarak geri düşmezdi. Bu, oynanabilirlik için bilinçli bir sapmadır.

### 2.9 Basınç için bağlantı noktası

- "Alan + ayrı geçiş" deseni alt proje 2'de `pressure.js` ile tekrarlanır: geçiş 4.
- `stepHeat`, bir durum nesnesi (`heatState`) alır ve durumu dışarı sızdırmaz.
- Magma kaynağı (§3.2, §7), alt proje 2'deki basınçlı magma odasının çekirdeği olacak.

---

## 3. Materyaller

### 3.1 Tanım alanları

`MATERIAL_DEFS` kayıtlarına şu alanlar eklenir:

| Alan | Anlam | Varsayılan |
|---|---|---|
| `temp` | doğuş sıcaklığı (°C); `null` ise ortam sıcaklığı kullanılır | `null` |
| `conduct` | iletkenlik K (0..0,25) | 0,02 |
| `capacity` | ısı kapasitesi C (≥ 1) | 2 |
| `source` | sabit kaynak sıcaklığı (°C); hücre bu değerin altına inmez | yok |
| `phase.up` / `phase.down` | `{ at, into, latent, vanish? }` | yok |
| `ignitesAt` | kendiliğinden tutuşma sıcaklığı (°C); `burnsInto` alanını gerektirir | yok |

`compileMaterials` bu alanlardan şu tabloları üretir:

- `CONDUCT`, `CAP`, `INV_CAP`, `SPAWN_TEMP` (NaN, ortam demektir), `SOURCE_TEMP`
- `UP_AT`, `UP_INTO`, `UP_LATENT`, `UP_VANISH`
- `DOWN_AT`, `DOWN_INTO`, `DOWN_LATENT`, `DOWN_VANISH`
- `IGNITE_AT`

Geçişi olmayan materyallerde `UP_AT = +∞` ve `DOWN_AT = −∞` olur.

**Derleme sırasında doğrulananlar:** `K/C ≤ 0,25`, gizli ısı < 65535, `up.at > down.at` ve `into` değerinin geçerli bir materyal olması.

### 3.2 Başlangıç değerleri

Bu değerler hedef değerlerdir. Kesin sabitler testlerle ayarlanır ve uygulama planında kaydedilir.

| Materyal | Tür | Doğuş °C | K | C | Sıcaklıkla davranış |
|---|---|---|---|---|---|
| EMPTY (hava) | — | ortam | 0,02 | 1 | ortama yaklaşır (`AIR_RELAX`) |
| Kum | toz | ortam | 0,03 | 3 | up 1000 → Cam (gizli ısı orta) |
| Taş | statik | ortam | 0,06 | 4 | up 1250 → Lav |
| Su | sıvı | ortam | 0,08 | 4 | down −1 → Buz; up 100 → Buhar (gizli ısı büyük); ≥ 35'te buharlaşma |
| Yağ | sıvı | ortam | 0,03 | 3 | ignitesAt 250 |
| Lav | sıvı | 1150 | 0,04 | 4 | down 750 → Taş (gizli ısı orta) |
| Buhar | gaz | 105 | 0,02 | 1 | down 95 → Su (%40'ı kaybolur) |
| Ateş | gaz | 900 | 0,05 | 1 | kaynak 900; ömür bitince söner |
| Odun | statik | ortam | 0,02 | 3 | ignitesAt 300 |
| Cam | statik | ortam | 0,05 | 3 | — |
| Bitki | statik | ortam | 0,02 | 3 | ignitesAt 250; 5 °C altında büyümez |
| Yanan odun / bitki / yağ | — | 700 | 0,04 | 2 | kaynak 700 |
| Kül | toz | ortam | 0,01 | 2 | — |
| **Buz** | statik | −15 | 0,12 | 3 | up +1 → Su (gizli ısı orta) |
| **Kar** | toz, yoğunluk 8 | −8 | 0,01 | 1 | up +1 → Su (gizli ısı küçük) |
| **Metal** | statik | ortam | 0,24 | 1 | ~450 °C'den sonra akkorlaşır; up 1400 → Erimiş metal |
| **Erimiş metal** | sıvı, yoğunluk 40 | 1500 | 0,24 | 1 | down 1300 → Metal |
| **Magma kaynağı** (gizli) | statik | 1200 | 0,06 | 4 | kaynak 1200 |

**Kasıtlı sıralamalar:**

- Taşın erime sıcaklığı (1250) > lavın doğuş sıcaklığı (1150) > lavın katılaşma sıcaklığı (750). Böylece volkan konisi kendi lavıyla erimez.
- Metalin erime sıcaklığı (1400) > lav. Lav metali kızartır ama eritemez; metali eritmek için Isıt fırçası gerekir.

**Fiziksel sonuçlar:**

- Kar suyun üstünde yüzer, çünkü toz ancak kendinden az yoğun bir sıvının içine batabilir.
- Erimiş metal lavın içinde batar.

### 3.3 Yeni materyal kimlikleri

| Materyal | Kimlik | Görünürlük |
|---|---|---|
| `ICE` | 16 | seçicide |
| `SNOW` | 17 | seçicide |
| `METAL` | 18 | seçicide |
| `MOLTEN_METAL` | 19 | seçicide |
| `MAGMA` | 20 | `hidden`; seçicide yok, sahneler yazar |
| `CLONER` | 21 | seçicide (Katı, `X`) |

Kimlik 22 ve sonrası alt proje 2'ye ayrılır.

### 3.4 Çoğaltıcı (`CLONER`)

Kullanıcı isteği (2026-09-30): "üstüne konulan malzemeyi çoğaltır, belli bir miktar çoğalttıktan sonra durur; örneğin volkanın altına koyarız."

**Davranış** (reaktif statik; tek sahip kuralı; tick başına rastgele bir komşu örneklenir):

- **Öğrenme:**
  - Henüz öğrenmemiş bir çoğaltıcı, örneklediği komşu hareketli bir materyalse (toz, sıvı ya da gaz) o materyali öğrenir.
  - Öğrenilen materyal `variant` alanında saklanır; `flags` bit1 "öğrendi" işaretidir.
  - Statik materyaller, boşluk ve başka çoğaltıcılar öğrenilmez. Bu sayede çoğaltıcı kabının duvarlarını kopyalamaz.
- **Üretim:**
  - Öğrenmiş bir çoğaltıcı, örneklediği komşu boşsa oraya öğrendiği materyalden bir kopya koyar.
  - Kopya doğuş sıcaklığı, doğuş ömrü ve rastgele bir tonla oluşur.
  - Kalan bütçe (`life`) 1 azalır.
- **Bütçe:**
  - Hücre başına varsayılan 1000 kopya (`life: [1000, 1000]`).
  - Bütçe biten çoğaltıcı durur ve sönük görünür.
  - Dünya genelinde tick başına en fazla 300 kopya üretilir (`RATES.maxClonesPerTick`).
- **Termal:** iletkenlik 0,06, kapasite 4; faz geçişi yoktur. Kopyalar materyalin doğuş sıcaklığıyla doğar; örneğin lav 1150 °C.
- **Görünüm:**
  - Öğrenmemiş çoğaltıcı kendi rengindedir (mor-gri).
  - Öğrenmiş çoğaltıcı öğrendiği materyalin rengiyle %50 karışık görünür.
  - Bütçesi bitmiş çoğaltıcı %20 karışık ve daha sönük görünür.
- **Sınır:** basınç olmadığından sıvı yalnızca aşağı ve yana akar. Dolu bir magma odasının altındaki çoğaltıcının boş komşusu olmaz ve üretim yapmaz. Volkan sahnesinde çoğaltıcı bu yüzden krater yarığının içine konur (§7). Alt proje 2'deki basınç, çoğaltıcının derin odalardan patlama beslemesini mümkün kılacak.

---

## 4. Ortam ve gün/gece döngüsü

`js/engine/climate.js` saf fonksiyonlar içerir ve yalnızca aritmetik kullanır.

```text
DAY_TICKS     = 14400      // 1× hızda 4 dakika
DAY_AMPLITUDE = 10         // °C
DAY_START     = 0.25       // tick 0 sabah
dayPhase(tick) = frac(DAY_START + tick / DAY_TICKS)      ∈ [0, 1)
dayWave(p)     : tri = p < 0.5 ? 4p − 1 : 3 − 4p          // 0'da −1, 0.5'te +1
                 dönen değer = tri · (1.5 − 0.5 · tri²)   // yumuşatılmış, [−1, 1]
ambientAt(base, tick, cycle) = cycle ? base + DAY_AMPLITUDE · dayWave(dayPhase(tick)) : base
dayLabel(p)    : Gece (p < 0.2 ya da p ≥ 0.8), Sabah (< 0.4), Öğle (< 0.6), Akşam
```

**Simulation API:**

- `setAmbient(c)`: değeri [−40, 60] aralığına kırpar.
- `ambientBase`
- `setDayCycle(bool)`
- `dayCycle`
- `get ambient()`: bu tick'in ortam sıcaklığı.

**Sahne ve undo davranışı:**

- `loadScene`, `ambientBase` değerini `scene.ambient` (varsayılan 20) yapar. Sıcaklık alanını ortam sıcaklığıyla doldurur, sahneyi ondan sonra üretir; böylece `set` doğuş sıcaklıklarını doğru yazar.
- Undo, `tick` değerini geri yükler; gün fazı da bu yüzden geri gelir.
- `ambientBase` bir kullanıcı ayarıdır; undo ile geri alınmaz.

**Sahne varsayılanları:**

| Sahne | Varsayılan ortam |
|---|---|
| Volkan | 20 |
| Kum saati | 20 |
| Vaha | 30 (buharlaşma eşiği 35; döngü kapalıyken gölet kurumaz) |
| Kaos | 20 |
| Boş | 20 |
| Benchmark | 20 |
| **Buzul** | −15 |

---

## 5. Araçlar ve arayüz

### 5.1 Isıt ve Soğut fırçaları

- **Fırça nesnesi:** `brush.tool` alanı alır: `'heat'` ya da `'cool'`. Bu alan varsa `material` yok sayılır.
- **Etki:** `paintLine`, fırçanın kapladığı her iç hücrenin sıcaklığını `TOOL_DELTA = 25` °C değiştirir. Sonuç [−100, 2500] aralığına kırpılır. Hava da etkilenir.
- **Hold:** hold her tick yeniden uygulandığı için basılı tutmak etkiyi sürdürür.
- **Undo:** değişiklik varsa stroke "kirli" sayılır ve undo noktası oluşur.
- **Sağ tık:** her zaman silgidir.

### 5.2 Ters çevirme

`sim.flipVertical()` tüm dünyayı dikey olarak aynalar: `y` satırı `H−1−y` satırına gider.

- **Kapsam:** `type`, `variant`, `life`, `flags` ve `temp` alanlarının hepsi aynalanır. Parçacık sayıları değişmez.
- **Undo:** işlem `clear` gibi geri alınabilir; öncesinde snapshot alınır.
- **Arayüz:** Simülasyon bölümünde "Ters çevir" düğmesi, kısayolu `F`.
- **Kullanım:** kum saatinde kum bitince çevrilir ve kum yeniden akar. Diğer sahnelerde de çalışır; örneğin göl yukarıdan dökülür.
- **Çift çevirme:** iki kez çevirmek dünyayı birebir ilk hâline döndürür.

### 5.3 Materyal seçici

- **`catalog.js`:** her kayda `category` alanı eklenir. `CATEGORIES` sırası: `powder` Toz, `liquid` Sıvı, `gas` Gaz, `solid` Katı, `tool` Araç.

| Sekme | İçerik |
|---|---|
| Toz | Kum, Kar |
| Sıvı | Su, Yağ, Lav, Erimiş metal |
| Gaz | Buhar, Ateş |
| Katı | Taş, Odun, Cam, Bitki, Buz, Metal |
| Araç | Silgi, Isıt, Soğut |

- **`controls.js`:** ARIA tablist ve tabpanel.
  - Ok tuşları sekmeler arasında gezer (roving tabindex).
  - Her panelde mevcut radiogroup ve numune kartları bulunur.
  - Kısayolla bir materyal seçilince onun sekmesi açılır.
  - Mobilde sekme şeridi yatay kaydırılır; dokunma hedefleri ≥ 44 px.
- **Kısayollar:**
  - Mevcutlar aynen kalır: `1`–`0`, `G`.
  - Yeniler: `B` Buz, `K` Kar, `M` Metal, `E` Erimiş metal, `H` Isıt, `C` Soğut.
  - `T` termal görünümü açıp kapatır; bu bir eylemdir (`toggleThermal`), materyal değildir.
  - `F` dünyayı ters çevirir (§5.2).
  - Mevcut `S` (fırça şekli), `.` ve `?` ile çakışma yoktur. Yardım diyaloğu güncellenir.

### 5.4 Ortam bölümü

Simülasyon bölümünün altına, her zaman görünür bir "Ortam" bölümü eklenir:

- kaydırıcı (−40…60, adım 1) ve `<output>`: "20 °C"
- "Gün/gece döngüsü" onay kutusu
- anlık durum, örneğin "Öğle · 28 °C"; stats ile aynı sıklıkta, 400 ms'de bir güncellenir
- "Termal görünüm" düğmesi (`aria-pressed`)

### 5.5 Durum göstergeleri

- Başlıktaki durum satırına "Ortam" değeri eklenir.
- Hassas işaretçili cihazlarda (`pointer: fine`) "İmleç" değeri gösterilir, örneğin "Su · 12 °C".
- Debug paneline imleç sıcaklığı eklenir.
- `getCell` sonucuna `temp` alanı eklenir.

### 5.6 Sürüm bilgisi ve yenilikler

Kullanıcı isteği (2026-09-30): sürüm numarası ekranda görünsün ve eklenenler gösterilsin.

- **Rozet:** başlıkta uygulama adının yanında, örneğin `v0.10.0`. Rozet bir düğmedir ve "Yenilikler" diyaloğunu açar.
- **Veri kaynağı:**
  - `js/config.js`'teki `APP_VERSION`.
  - `js/app/releases.js`'teki `RELEASES` dizisi: `{ version, date, items: string[] }`. Kullanıcıya dönük kısa maddeler içerir, geliştirici changelog'unu birebir kopyalamaz.
  - `CHANGELOG.md` yayınlanmadığı için çalışma zamanında okunmaz.
- **Senkron testi:** şu üçünün aynı olması bir testle doğrulanır:
  - `APP_VERSION`
  - `package.json` sürümü
  - `CHANGELOG.md`'deki en son yayınlanmış sürüm başlığı

  Ayrıca `RELEASES[0].version === APP_VERSION` şartı aranır. Böylece sürüm bilgisi kayamaz.
- **Diyalog:** en yeni sürüm en üstte olmak üzere son 3 sürümün maddeleri listelenir. Tasarım yardım diyaloğuyla aynıdır.
- **"Yeni" işareti:** tercihlerde `seenVersion` alanı tutulur. Değeri `APP_VERSION`'dan farklıysa rozette küçük bir işaret görünür. Diyalog açılınca bu değer güncellenir.

### 5.7 Tercihler (`storage.js`)

- `DEFAULT_PREFS` içine `dayCycle: false` ve `seenVersion: ''` eklenir; `sanitizePrefs` bunları doğrular.
- Ortam sıcaklığı ve termal görünüm saklanmaz: ortam her sahnede o sahnenin varsayılanına döner.

---

## 6. Görseller

`pixels.js` ve `palette.js` değişir; sim durumu yalnızca okunur.

- **Akkorluk:**
  - Şu materyallere uygulanır: ateş, lav ve yanan materyaller dışında kalan, hava olmayan her hücre.
  - Sıcaklık ≥ 450 °C ise materyal rengi akkorluk rampasıyla karıştırılır: koyu kırmızı → turuncu → sarı-beyaz, 450–1500 °C.
  - Karışım oranı 450 °C'de 0'dan başlar, 800 °C'de 1'e ulaşır. Glow alfası sıcaklıkla artar.
  - Karıştırma yalnızca sıcak hücrelerde yapılır.
  - Kumun ısınma rengi artık sıcaklıktan gelir. `DYN.SAND` kaldırılır.
- **Lav:** rampa indeksi sıcaklıktan türetilir (750 koyu, 1150 parlak); mevcut nabız bunun üstüne eklenir. Kabuk yaklaşırken koyulaşma görülür.
- **Soğuk su:** 4 °C'nin altındaki su 8 adımlı küçük bir rampayla hafif açık maviye kayar.
- **Buz, Kar ve Metal:** palet renkleri vardır. Metal gri-mavidir, akkorluk metalde en belirgin olur. Erimiş metal kendi rampasıyla gösterilir.
- **Termal görünüm** (`renderer.setViewMode('normal' | 'thermal')`):
  - Her hücre sıcaklık rampasıyla boyanır: −40 mavi → 20 koyu gri → 100 kırmızı → 600 turuncu → 1200+ beyaz.
  - İki önceden hesaplanmış rampa kullanılır: hava için daha koyu olanı, madde için daha açık olanı. Materyal şekilleri böylece seçilebilir kalır.
  - Piksel başına bir LUT okuması yapılır, karıştırma yoktur. Glow kapalıdır.
- **Gökyüzü:**
  - `paintBackground`, `daylight ∈ [0, 1]` parametresi alır; değer 32 adıma yuvarlanır.
  - Gündüz sıcak alacakaranlık tonlarıdır. Gece koyudur ve yıldızlar belirgindir.
  - Önbellek anahtarında daylight adımı da bulunur.
  - Döngü kapalıyken bugünkü görünüm sabit kalır.
- **Animasyon:** renderer sıcaklık değiştikçe yeniden çizer; zaten tick başına `version` artıyor.

---

## 7. Sahneler

- **Tüm sahneler:** sahne nesnesine `ambient` alanı eklenir.
- **Volkan:**
  - Krater tabanına, lavın altına bir sıra `MAGMA` yerleştirilir.
  - Krater yarığının tabanına iki `CLONER` hücresi konur. Çoğaltıcı çevresindeki lavı öğrenir. Yarıktan lav aktıkça boşalan yerleri doldurur, böylece volkan yaklaşık 2000 hücrelik ek lav akıtıp durur.
  - Mevcut lav sızıntısı regresyon testi (7 boyut × 4 seed) geçmeye devam etmelidir.
  - Yeni test: magma kraterde kalır ve krater lavının bir kısmı uzun süre sıvı kalır.
- **Buzul** (yeni, `js/scenes/glacier.js`; `id: 'glacier'`, ad "Buzul", ortam −15):
  - Normalize koordinatlarla üretilir; yalnızca aritmetik noise kullanılır.
  - İçerik:
    - iki yanda karla kaplı taş yamaçlar
    - ortada bir göl: üstte 2–3 sıra buz, altında su
    - bir yamaçtan göle uzanan metal bir çubuk
    - bir yanda taşın içinde magma kaynaklı küçük bir lav cebi ve bacası
  - Beklenen zaman içindeki davranış:
    - baca çevresindeki buz ve kar yavaşça erir
    - metal çubuk ısıyı iletir
    - gece ortam daha da soğur

### 7.1 Kum saati iyileştirmesi

**Mevcut sorunlar** (2026-09-30 ölçümü):

- İki düz üçgen, kutunun içinde bir "X" gibi görünüyor, kum saatine benzemiyor.
- Kum bitince sahne ölüyor; çevirme yok.
- Üst ve alt hazne dünyanın ortasına göre tam simetrik değil.
- Üstte bir tane kum takılı kalıyor.
- Akış doğru; 400×225'te kum yaklaşık 25 saniyede tamamen boşalıyor.

**Yeni tasarım:**

- **Kavisli hazneler:**
  - Haznenin yarım genişliği `w(u) = neck + A · smoothstep(u)` ile hesaplanır. `u`, boğazdan kapağa doğru 0'dan 1'e gider.
  - Bu profil boğaza doğru daralan, kapağa yakın yerde dikleşen yuvarlak bir hazne verir.
  - `A ≤ 0,66 · L` şartı duvar eğimini satır başına en fazla 1 hücrede tutar. `L` hazne yüksekliğidir. Böylece kum duvarda takılmaz.
- **Tam simetri:**
  - Önce üst yarı üretilir, alt yarı dünyanın orta satırına göre aynalanır (`y → H−1−y`).
  - Böylece çevirme (§5.2) şekli birebir korur; grid yüksekliğinin tek ya da çift olması fark etmez.
- **Boğaz:** 2 hücre genişliğinde, 2–3 satır uzunluğunda bir tüp. Hedef boşalma süresi 400×225'te 1× hızda 30–60 saniye.
- **Çerçeve:**
  - üstte ve altta 3 satır kalınlığında odun kapak
  - iki yanda odun direk; direkler camdan 2 hücre uzakta
- **Kum miktarı:** üst haznenin yaklaşık %85'i.
- **İpucu:** sahne yüklenince duyuru bölgesine (`aria-live`) "Kum bitince Ters çevir (F)" yazılır.

### 7.2 Yeni sahne: Dökümhane

`js/scenes/foundry.js`; `id: 'foundry'`, ad "Dökümhane", ortam 20.

**İçerik:**

- Solda yüksekte, magma kaynağının üstünde duran taştan bir pota. Potanın içinde erimiş metal var.
- Potanın yan duvarında bir yarık. Oradan eğimli bir taş oluk başlar.
- Oluk, basamaklı bir kalıp sırasına iner: taştan U biçimli 3 kalıp. Biri dolunca taşar ve sıradakini doldurur.
- Sonda bir su teknesi. Oraya ulaşan metal suyu kaynatır ve hızla katılaşır.
- Zeminde istiflenmiş metal külçeler ve akışın içinden geçen bir metal kiriş. Kiriş ısınıp kızarır.

**Beklenen davranış:**

- Erimiş metal kalıplara akar, soğur ve metal olur.
- Potada kalan metal katılaşır ama magma üstünde kızgın kalır. Magma 1200 °C'de, metalin katılaşma eşiği 1300 °C. Isıt fırçası metali yeniden eritir.

### 7.3 Yeni sahne: Mağara

`js/scenes/cave.js`; `id: 'cave'`, ad "Mağara", ortam 12.

**İçerik:**

- Neredeyse tamamen taş bir dünya. Aritmetik value noise ile oyulmuş bir ana tünel ve birkaç oda var. Üstte ince bir yüzey açıklığı var.
- En alçak odada bir yeraltı gölü.
- Gölün yanında, taşın içinde magma kaynaklı bir lav cebi. Arada ince bir taş duvar var. Duvar ısınınca göl kenarı kaynar ve buhar tünel boyunca yükselir: bir kaplıca etkisi.
- Tavandan sarkan taş sarkıtlar.
- Odun maden destekleri: dikmeler ve kirişler.
- Taşın içinde bir yağ cebi.
- Tünel tabanında kum birikintileri.

**Alt proje 2 ile ilişkisi:** bu sahne ilerideki patlatma ve kazı mekaniklerinin sahnesi olacak.

### 7.4 Sahne sırası ve sonraki alt projeler

**Seçicideki sıra:** Volkan, Kum saati, Vaha, Buzul, Dökümhane, Mağara, Kaos Lab, Boş. Benchmark gizli kalır.

**Sonraki alt projelerin sahneleri** (bu belgenin kapsamı dışında):

| Alt proje | Sahneler |
|---|---|
| 2. Basınç ve patlama | Maden ocağı (patlatma), Gayzer |
| 3. Kimya | Laboratuvar |
| 4. Toprak ve yaşam | Orman ya da Bahçe |

---

## 8. Hata durumları ve değişmezler

- **Derleme hataları:** `compileMaterials` şu durumlarda hata fırlatır:
  - `K/C > 0,25`
  - gizli ısı ≥ 65535
  - `up.at ≤ down.at`
  - geçersiz `into`
  - `ignitesAt` var ama `burnsInto` yok
- **Debug değişmezi** (`checkInvariants`): tüm sıcaklıklar sonlu olmalı ve [−273, 5000] aralığında kalmalı.
- **Kırpma:** araçlar, `setAmbient` ve doğuş sıcaklıkları değerlerini kırpar. `NaN` ya da `Infinity` hiçbir yoldan alana giremez; araçlar sonlu olmayan girdiyi reddeder.
- **Eski kayıtlar:** yeni tercih alanları eksikse varsayılan değer kullanılır.

---

## 9. Test stratejisi

Önce testler yazılır (TDD, `node --test`); mevcut 280 testin hepsi geçmeye devam etmelidir.

**Isı çekirdeği** (`tests/heat.test.js`):

- Yalıtılmış kapalı bir kutuda (hava yok, kaynak yok) toplam `Σ C·T` korunur (bağıl tolerans 1e-4).
- Tek bir sıcak nokta sol/sağ ve yukarı/aşağı eşit yayılır.
- Monotonluk: yeni değer komşuların min–max aralığında kalır; en iletken materyalde bile salınım olmaz.
- Hava ortama yaklaşır; kenar ortam sıcaklığındadır.
- Uyku açıkken ve kapalıyken sonuçlar eşdeğerdir: §2.4'teki senaryoda sıcaklık farkı ≤ 2 · `SLEEP_EPS`, materyal sayıları aynı.
- `swap` sıcaklığı taşır, `set` doğuş sıcaklığını yazar, `transform` sıcaklığı korur.
- Undo sıcaklığı da geri getirir.
- Stabilite tablosu doğrulaması, kararsız bir tanım verilince hata fırlatır.

**Faz geçişleri** (`tests/thermal.test.js`):

- Ortam −15 °C'de göl yüzeyden donar (üst sıra alt sıradan önce); ortam +10 °C olunca çözülür.
- Gizli ısı: lavın yanındaki buz ilk 20 tick'te erimez ama 2000 tick içinde erir. Kesin sınırlar ayar sırasında sabitlenir.
- Su kaynar; oluşan buhar yükselir, soğuk havada yoğuşur ve su olarak düşer.
- Lav yüzeyden kabuk bağlar; iç lav yüzey lavından daha uzun süre sıvı kalır.
- Kum lavla uzun temasta cam olur, kısa temasta olmaz (mevcut testin anlamı korunur).
- Metal çubuk ısıyı aynı boydaki taş çubuktan belirgin hızlı iletir. Erimiş metal soğuyunca metal olur.
- Odun, yağ ve bitki tutuşma sıcaklığında kendiliğinden tutuşur.
- Bitki 5 °C altında büyümez.
- Histerezis: eşik çevresinde tutulan bir hücrede dönüşüm sayısı sınırlı kalır.
- Buharlaşma: 45 °C'de açık su yavaşça azalır; 20 °C'de azalmaz.

**İklim** (`tests/climate.test.js`):

- periyot, genlik ve süreklilik (ardışık tick'ler arasında sıçrama yok)
- `dayLabel` sınırları
- kaynak taraması: `Math.sin`, `Math.exp` ve `Math.pow` kullanılmıyor

**Geçiş** (mevcut testler):

- `reactions.test.js` içindeki kum ısısı, lav sayacı ve buhar testleri sıcaklık üzerinden yeniden yazılır; davranışsal anlamları korunur.
- 10 bin tick'lik lav + su kapalı kutusu testi yerinde kalır.
- `render-pixels` testlerinde kum ısısı sıcaklığa taşınır.

**Determinizm:**

- `helpers.js` içindeki hash'e sıcaklık da girer (Float32 bitleri).
- Aynı seed aynı hash'i verir.
- `Math.random` yasağı sürer.

**Sahneler:**

- Buzul, Dökümhane ve Mağara seed ve grid determinizmini sağlar (7 boyut); üretim < 250 ms.
- Volkan regresyon testi ve magma testi.
- **Kum saati:**
  - Üretilen dünya kendi aynasına eşittir.
  - Üst hazne boşalır: 400×225'te 1× hızda 30–60 s içinde kumun %99,5'i alta geçer.
  - Çevrilince kum yeniden akar.
  - Toplam kum korunur.
- **Dökümhane:** 3000 tick sonunda metal sayısı artar, erimiş metal azalır, kalıplar dolar. Erimiş metal oluk dışına taşmaz.
- **Mağara:** göl suyu mağaradan dışarı sızmaz. Lav cebi ile göl arasındaki duvar yerinde kalır.
- **Çoğaltıcı:**
  - Üstüne dökülen materyali öğrenip boş komşulara kopyalar.
  - Tam olarak bütçesi kadar kopya üretir ve durur.
  - Statik materyali ve kendi türünü öğrenmez; öğrenmemiş çoğaltıcı hiçbir şey üretmez.
  - Deterministiktir.
  - Volkan çoğaltıcılı sahnede, çoğaltıcısız hâline göre daha çok lav akıtır.
- **Belge senkronu:** her materyal anahtarı `docs/MATERIALS.md`'de geçer.
- **Ters çevirme:**
  - İki kez çevirmek aynı hash'i verir.
  - Undo çevirmeyi geri alır.
  - Parçacık sayıları korunur.
  - Sıcaklık da aynalanır.

**Arayüz ve render:**

- katalog kategorileri, kısayollar (`B K M E H C T`), tercih doğrulaması
- piksel çıktısı: akkorluk, lav koyulaşması, termal görünüm, gökyüzü daylight adımı
- renderer, sıcaklık dahil hiçbir view alanını değiştirmez

**Tarayıcı** (Playwright MCP smoke testi):

- sekmeler, ortam kaydırıcısı, gün/gece döngüsü, termal görünüm, Isıt ve Soğut fırçaları
- Buzul ekran görüntüsü
- konsolun temiz olması
- 360 px genişlikte yatay scroll olmaması

---

## 10. Performans

- **Ölçüm:** 400×225 gridde `tools/bench.js` ile önce ve sonra ölçülür. Mevcut durum: medyan 0,86 ms.
- **Hedef:** medyan artış ≤ 0,6 ms. Mikro-ölçüm tahmini: uyku açıkken ~0,2 ms, tam grid için ~0,57 ms.
- **Hedef aşılırsa sırasıyla:**
  1. `SLEEP_EPS` ve eşik adayı taraması ayarlanır.
  2. Difüzyon iki tick'te bir, iki kat katsayıyla çalıştırılır (`K/C` sınırı buna göre yeniden doğrulanır).
- **Bellek:** iki sıcaklık tamponu ve iki snapshot, 400×225'te ~1,4 MB. Soak testinde bellek sabit kalmalıdır.
- Sonuçlar DEVELOPMENT.md'deki benchmark log'una yazılır.

---

## 11. Dokümanlar ve sürüm

- **DECISIONS.md:**
  - ADR-003 "Yerini ADR-014 aldı" olarak işaretlenir.
  - ADR-014: tam çözünürlüklü sıcaklık alanı, ayrı geçiş, uyuyan satırlar.
  - ADR-015: gizli ısı ve `life` üzerinde ilerleme sayacı.
- **ARCHITECTURE.md:** veri modeli, tick sırası (geçiş 3), termal tablo ve reaksiyon tablosu güncellenir.
- **DEVELOPMENT.md:** yeni fazlar eklenir (Phase 13+), manuel checklist ve benchmark log güncellenir.
- **CHANGELOG.md:** 0.10.0.
- **README.md:** materyaller, kısayollar, Ortam bölümü ve Buzul sahnesi.
- **Sürüm:** `package.json` 0.10.0 olur. `v1.0.0` etiketi yine kullanıcının onayındadır.

---

## 12. Uygulama sırası (plan için taslak)

0. Sürüm rozeti ve Yenilikler diyaloğu (§5.6); ardından kum saati iyileştirmesi ve ters çevirme (`flipVertical`, düğme, `F`). Sıcaklıktan bağımsız olduğu için önce yapılır; sıcaklık gelince `flipVertical` alanı da aynalar.
1. `world.temp` ve `tempNext`; `swap`, `set` ve `clear`; undo; hash yardımcısı.
2. `heat.js`: difüzyon, hava, kenar, kaynaklar, uyuyan satırlar ve bunların testleri.
3. Termal tanım alanları, derleyici doğrulamaları, faz mekanizması, tutuşma, buharlaşma.
4. Mevcut sayaç hilelerinin kaldırılması; `reactions.js` sadeleştirilir ve mevcut testler yeşil kalır.
5. Yeni materyaller: Buz, Kar, Metal, Erimiş metal, Magma.
6. `climate.js` ve Simulation ortam API'si; sahnelere `ambient` alanı.
7. Render: akkorluk, lav, soğuk su, termal görünüm, gökyüzü.
8. Arayüz: sekmeler, Ortam bölümü, araçlar, kısayollar, durum göstergeleri, tercihler, yardım.
9. Çoğaltıcı (`CLONER`).
10. Buzul, Dökümhane ve Mağara sahneleri; volkan magma kaynağı ve çoğaltıcısı.
11. Performans ölçümü, dokümanlar (`docs/MATERIALS.md` dahil), tarayıcı smoke testi, sürüm.

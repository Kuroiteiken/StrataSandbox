# Strata Sandbox — Mimari

Bu doküman sistemin nasıl kurulduğunu anlatır. Mimari değiştikçe güncellenir.

- **Durum etiketleri:**
  - **(uygulandı)**: kod ve test mevcut.
  - **(planlandı)**: henüz tasarım aşamasında.
- **Kararların gerekçeleri:** [DECISIONS.md](DECISIONS.md).

## 1. Katmanlar

```text
app/  (DOM, pointer, klavye, panel, tercihler)
  │  komutlar: play / pause / step / paintLine / undo / loadScene …
  ▼
Simulation (engine public API) ──► world / kernels / reactions   ← DOM'a asla dokunmaz
  │
  │  sim.view  (salt-okunur typed array görünümü + version sayacı)
  ▼
Renderer.render(view, frameInfo)                                 ← state'i asla yazmaz
```

**Katman sınırları:**

| Katman | Klasör | Kural |
| --- | --- | --- |
| Physics engine | `js/engine/` | `window`/`document` kullanmaz. Node testleri import ederek bunu doğrular. `Math.random` kullanılmaz. |
| Render engine | `js/render/` | `sim.view`'ı yalnızca okur. Fizik kuralı içermez. |
| Uygulama | `js/app/`, `js/main.js` | Engine içindeki array'lere doğrudan erişmez; yalnızca `Simulation` API'sini kullanır. |
| Sahneler | `js/scenes/` | Dünyayı yalnızca world primitive'leri üzerinden doldurur. |

`js/main.js` composition root'tur: tüm parçaları burada oluşturur ve birbirine bağlar.

## 2. Grid temsili (uygulandı — Phase 1)

- **Düzen:** Dünya, her hücre için bir değer tutan paralel typed array'lerdir (SoA).
- **Kenar çerçevesi:**
  - Boyut `(W+2)×(H+2)`'dir; kenarda 1 hücrelik görünmez **WALL** çerçevesi bulunur.
  - Bu sayede hot loop'ta bounds check gerekmez.
  - Tüm kurallar en fazla 1 hücre uzağa bakar.

| Array | Tip | İçerik |
| --- | --- | --- |
| `type` | `Uint8Array` | materyal id (0 = EMPTY/hava) |
| `variant` | `Uint8Array` | parçacığa özgü kozmetik ton; parçacıkla birlikte taşınır |
| `life` | `Uint16Array` | materyale göre anlamı değişen sayaç: ömür, yanma, ısı, soğuma, büyüme bütçesi |
| `flags` | `Uint8Array` | bit0 = sıvının kalıcı akış yönü |
| `stamp` | `Uint16Array` | update stamp; taşmada `fill(0)` yapılır ve saat 1'den başlar |

**Koordinat ve boyut:**

- Koordinat: `x` 0…W−1 soldan sağa, `y` 0…H−1 yukarıdan aşağı.
- Index hesabı: `index(x, y) = (y + 1) * (W + 2) + (x + 1)`.
- Grid boyutu açılışta bir kez belirlenir. Viewport resize'ı yalnızca sunum ölçeğini değiştirir (ADR-002).

## 3. Simulation tick (uygulandı — Phase 1–2)

- **Geçişler:** Her tick iki taramadan oluşur.
  1. Aşağıdan yukarı: tozlar, sıvılar ve reaktif statikler.
  2. Yukarıdan aşağı: gazlar. Dünyada gaz yoksa bu geçiş atlanır.
- **Yatay yön:** tick paritesi XOR satır paritesi. Kalıcı sağa/sola akış bias'ı oluşmaz.
- **Stamp kuralları:**
  - Yer değiştiren iki hücre de stamp'lenir.
  - Bu tick'te stamp'lenmiş bir parçacıkla swap yapılmaz. Boş hücreye girmek serbesttir.
  - Transform olan ya da yeni oluşan hücre de stamp'lenir.
- **Fixed timestep:**
  - Taban hız 60 TPS; hız çarpanı tick aralığını değiştirir.
  - `dt` en fazla 100 ms olacak şekilde kırpılır.
  - Frame başına tick sayısı ve fizik bütçesi sınırlıdır.
  - Sınıra takılınca birikmiş borç silinir (ADR-006).

## 4. Materyal sistemi (uygulandı — Phase 1–2; reaksiyonlar Phase 3)

- **Tanımlar:** `js/engine/materials.js` her materyali tek bir kayıtta tanımlar: id, ad, tür, yoğunluk, renk ve davranış parametreleri.
- **Derleme:** Başlangıçta bu kayıtlar hot loop'un kullandığı düz lookup tablolarına dönüştürülür:
  - `KIND`, `DENSITY`
  - `DISPERSION`, `SPREAD` (sıvı), `DRIFT` (gaz)
  - `GAS_IDS`: gaz geçişini atlama kararı için
  - `DISPLACE` (256×256): "mover → target" yer değiştirme olasılığı
- **Hareket:** tür bazlı genel çekirdekler yapar (`stepPowder`, `stepLiquid`, `stepGas`). Materyale özgü davranış yalnızca reaktif materyallerde çağrılır.
- **Sıvılar** (`stepLiquid`, geçiş 1):
  - Önce aşağı düşer. Serbest düşüş viskoziteden bağımsızdır.
  - Sonra `flags` bit0'daki kalıcı yönle köşegen dener.
  - Sonra `SPREAD` olasılığıyla en fazla `DISPERSION` hücre yatay akar:
    - Yalnızca boş hücreler üzerinden akar ve ilk dolu hücrede durur. Böylece duvardan tünel oluşmaz ve kenar çerçevesi aşılmaz.
    - Altı açık bir hücreye gelince orada durur.
    - Önü tıkanınca yön bit'i döner.
  - Yön bit'i spawn'da hash ile dengeli tohumlanır.
- **Gazlar** (`stepGas`, geçiş 2, yukarıdan aşağı):
  - Yükselir; `DRIFT` olasılığıyla önce köşegeni dener.
  - Tavana takılınca yatay kıpırdar.
  - Sıvı↔gaz değişimi yalnızca sıvının gaza düşmesiyle olur; sıvılar gaz hücresine yatay giremez.
- **Yoğunluk sırası:** Steam 2 < Fire 3 < hava 5 < Oil 8 < Water 10 < Sand 20 < Lava 30. Statikler 255'tir.

| Faz sırası | gaz / hava | < sıvı | < toz | < statik |
| --- | --- | --- | --- | --- |
| Kural | gazlar havaya ya da daha ağır gaza doğru yükselir | sıvılar tozu itemez | toz sıvıya olasılıksal batar | statikler asla yer değiştirmez |

## 5. Reaksiyon sistemi (uygulandı — Phase 3)

- **Kod:** `js/engine/reactions.js`.
- **Çağrı:** Reaktif hücreler (`REACTIVE`) kendi geçişlerinde önce `react()`'i çalıştırır. `react()` true dönerse hücre dönüşmüştür ve hareket atlanır.
- **Tek sahip:** her etkileşim çiftini yalnızca bir taraf işler.
- **Örnekleme:** sahip hücre tick başına 8 komşudan rastgele birini örnekler. Ateş 2 örnekler.
- **Damga:** dönüştürülen ya da oluşturulan hücre damgalanır; aynı tick'te zincirleme olmaz.
- **Sıcaklık:** per-cell sıcaklık alanı yoktur. Yerel ısı ve soğuma `life` sayaçlarında tutulur (ADR-003).

| Etkileşim | Sahip | Sonuç |
| --- | --- | --- |
| Fire ↔ Wood/Plant/Oil | Fire | hedef → Burning_* (olasılık = yanıcılık) |
| Fire ↔ Water | Fire | Water → Steam, Fire söner |
| Fire (ömür) | Fire | ömür bitince söner |
| Burning_* ↔ yanıcı | Burning_* | yangın yayılır; üstteki boşluğa ateş üretir (tick başına dünya geneli sınır) |
| Burning_* ↔ Water | Burning_* | söner (Wood/Plant), Water → Steam. Yanan yağ sönmez. |
| Burning_* (ömür) | Burning_* | Ash ya da boşluk |
| Lava ↔ Water | Lava | Water → Steam; soğuma sayacı +25; 200'de Stone |
| Lava ↔ hava | Lava | %10 olasılıkla soğuma +1 (kabuk) |
| Lava ↔ yanıcı | Lava | tutuşturur |
| Lava ↔ Sand | Lava | kum ısısı +16; 300'de Glass |
| Sand (soğuma) | Sand | ısı tick başına −1 (RNG'siz) |
| Steam (ömür) | Steam | %60 Water, aksi halde kaybolur |
| Plant ↔ Water | Plant | su → Plant (bütçe − 1); tick başına dünya geneli sınır |

**`life` alanının anlamı materyale göre değişir:**

| Materyal | `life` anlamı |
| --- | --- |
| Fire | kalan ömür |
| Steam | yoğuşmaya kalan süre |
| Burning_* | kalan yanma süresi |
| Lava | soğuma sayacı |
| Sand | ısı |
| Plant | büyüme bütçesi |

## 6. Renderer (uygulandı — Phase 4; glow Phase 8)

| Modül | Sorumluluk | DOM |
| --- | --- | --- |
| `render/layout.js` | `computeLayout` (tam sayı ölçek tercihi), `pointToCell`, `chooseGridSize` | yok |
| `render/palette.js` | statik ton LUT'u (`256 × 32`), dinamik rampalar, `DYNAMIC`/`ANIMATED_IDS` | yok |
| `render/pixels.js` | `fillPixels(view, out, pal, ramps, frame, reducedMotion)` | yok |
| `render/background.js` | `ridgeProfile` (saf) + `paintBackground` (canvas) | kısmen |
| `render/renderer.js` | canvas, tamponlar, katman birleştirme, `clientToCell` | var |

- **Sim tamponu:** grid boyutunda `ImageData` ve üzerinde `Uint32Array` view.
  - Statik renk: `PALETTE[type * 32 + (variant & 31)]`.
  - Dinamik materyallerin rengi `life` (ömür, yanma, ısı) ve kozmetik titremeden hesaplanır. Titreme fizik RNG'sine dokunmaz.
  - EMPTY şeffaftır.
- **Yeniden doldurma:** yalnızca `view` kimliği ya da `version` değişince, veya canlanan materyal (ateş, lava, yanma) varken yapılır (reduced motion'da değil).
- **Katman sırası:**
  1. letterbox dolgusu
  2. cache'li arka plan (yarım çözünürlük, smoothing açık)
  3. sim tamponu (`imageSmoothingEnabled = false`)
  4. brush preview (Phase 5)
  5. glow (Phase 8)
- **Grid boyutu:** açılışta bir kez seçilir. Resize yalnızca sunumu değiştirir.

## 7. Input (uygulandı — Phase 5)

- **Fırça geometrisi** (`engine/brush.js`, saf):
  - `footprint(shape, size)`: `(dx, dy)` çiftleri; cache'li.
  - `footprintOutline`: önizleme ana hattı.
  - `lineCells`: boşluksuz 8-komşulu Bresenham.
- **Boyama API'si** (`Simulation`):
  - `paintAt` ve `paintLine(x0, y0, x1, y1, { material, size, shape, replace })`.
  - Varsayılan: yalnızca boş ve gaz hücrelere yazar. `replace` her şeye yazar; `EMPTY` silgidir. WALL korunur.
  - Spray, footprint hücrelerini `inputRng` ile seyreltir; fizik RNG'si tüketilmez.
- **Basılı tutma:** `setHold` ve `releaseHold`. Fırça tick sonunda yeniden uygulanır; akış refresh rate'ten bağımsızdır.
- **Undo** (ADR-010):
  - `beginStroke` bekleyen bir snapshot alır.
  - `endStroke`: stroke boyama yaptıysa bu snapshot undo noktası olur.
  - `undo` dünyayı, sayaçları, RNG'yi ve tick'i geri yükler.
  - İki önceden ayrılmış tampon kullanılır; Clear da geri alınabilir.
- **Pointer** (`app/pointer.js`):
  - Pointer Events ve capture; coalesced örneklerle çizgi.
  - Sağ tık silgi, Shift replace.
  - Tek pointer çizer.
  - `onCursor` önizlemeyi günceller (touch'ta gizli).

## 8. Sahneler (planlandı — Phase 7)

- **Üretim:** sahneler normalize koordinatta üretilir, böylece her grid boyutunda çalışır.
- **Determinizm:** aynı (seed, W, H) üçlüsü aynı sahneyi verir.
- **Aritmetik:** yalnızca aritmetik işlemler kullanılır. `Math.sin`/`exp`/`pow` kullanılmaz, çünkü tarayıcılar arasında bit farkı çıkabilir.

## 9. Performans yaklaşımı

- **Hot loop:** obje allocation yoktur; typed array'ler lokal değişkenlerde tutulur.
- **Tarama:** full-grid, boş ve inert hücreler erken atlanır. Active-chunk sistemi ölçüme göre Phase 10'da değerlendirilecek (ADR-005).
- **Görsel kalite:** kalite düşürülürken önce dekoratif efektler azaltılır. Fizik doğruluğu korunur.

## 10. Geliştirme araçları (uygulandı — Phase 0)

- **`tools/serve.js`:** yerel statik sunucu. Doğru MIME tiplerini gönderir, path traversal'ı engeller, `no-store` başlığı kullanır.
- **`tools/check-paths.js`:** JS import'larını ve HTML `src`/`href` değerlerini tarar. Harf büyüklüğü uyuşmazlığı, eksik dosya ve root-absolute path problemlerini yakalar. `npm test` içinde ve CI'da çalışır.
- **`.github/workflows/pages.yml`:** önce test, ardından yalnızca uygulama dosyalarının GitHub Pages'e yayını.

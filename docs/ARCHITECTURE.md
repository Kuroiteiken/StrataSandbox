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
| `life` | `Uint16Array` | materyale göre anlamı değişen sayaç: ömür, yanma, faz ilerlemesi, büyüme bütçesi, kaynak bütçesi |
| `flags` | `Uint8Array` | bit0 = sıvının kalıcı akış yönü; bit1 = çoğaltıcı materyal öğrendi |
| `temp` / `tempNext` | `Float32Array` | sıcaklık (°C), hava dahil her hücre; difüzyon için çift tampon (0.10.0, ADR-014) |
| `stamp` | `Uint16Array` | update stamp; taşmada `fill(0)` yapılır ve saat 1'den başlar |

**Koordinat ve boyut:**

- Koordinat: `x` 0…W−1 soldan sağa, `y` 0…H−1 yukarıdan aşağı.
- Index hesabı: `index(x, y) = (y + 1) * (W + 2) + (x + 1)`.
- Grid boyutu açılışta bir kez belirlenir. Viewport resize'ı yalnızca sunum ölçeğini değiştirir (ADR-002).

## 3. Simulation tick (uygulandı — Phase 1–2)

- **Geçişler:** Her tick üç taramadan oluşur.
  1. Aşağıdan yukarı: tozlar, sıvılar ve reaktif statikler.
  2. Yukarıdan aşağı: gazlar. Yalnızca birinci geçişte gaz görülen satırlar taranır.
  3. Isı (`heat.js`, 0.10.0): çift tamponlu difüzyon, hava ve kaynaklar; ardından ayrı bir döngüde faz geçişleri, sıcaklıkla tutuşma ve buharlaşma. Sakin satırlar atlanır.
- **Ortam:** `climate.js` ortam sıcaklığını ve gün/gece dalgasını yalnızca aritmetikle, tick'ten türeterek verir.
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
- **Sıcaklık (0.10.0):** ısı alışverişi sıcaklık alanındadır (ADR-014). Bu tabloda yalnızca temas kuralları kalır; eşiğe bağlı dönüşümler aşağıdaki "Termal kurallar" tablosunda. 0.9.0'daki sayaç kuralları için `docs/MATERIALS.md` §3.

| Etkileşim | Sahip | Sonuç |
| --- | --- | --- |
| Fire ↔ Wood/Plant/Oil | Fire | hedef → Burning_* (olasılık = yanıcılık) |
| Fire ↔ Water | Fire | Water → Steam, Fire söner |
| Fire (ömür) | Fire | ömür bitince söner |
| Burning_* ↔ yanıcı | Burning_* | yangın yayılır; üstteki boşluğa ateş üretir (tick başına dünya geneli sınır) |
| Burning_* ↔ Water | Burning_* | söner (Wood/Plant), Water → Steam. Yanan yağ sönmez. |
| Burning_* (ömür) | Burning_* | Ash ya da boşluk |
| Lava ↔ yanıcı | Lava | tutuşturur |
| Plant ↔ Water | Plant | su → Plant (bütçe − 1); tick başına dünya geneli sınır; 5 °C altında yok |
| Cloner ↔ hareketli / boş | Cloner | ilk hareketli materyali öğrenir; boş komşuya kopyalar (bütçe − 1) |
| Sink ↔ hareketli | Sink | komşuyu boşaltır (bütçe − 1) |

**Termal kurallar** (`heat.js`, eşikler materyal tablosunda; ayrıntı ve sayılar `docs/MATERIALS.md` §4):

| Materyal | Eşik | Sonuç |
| --- | --- | --- |
| Water | ≤ −1 °C / ≥ 100 °C | Ice / Steam (buhar `emitSteam` ile 105 °C'de doğar); ≥ 35 °C ve üstü açıksa yavaş buharlaşma |
| Steam | ≤ 95 °C | Water (%40'ı kaybolur) |
| Ice, Snow | ≥ +1 °C | Water |
| Lava | ≤ 750 °C | Stone |
| Stone | ≥ 1500 °C | Lava |
| Sand | ≥ 550 °C | Glass |
| Metal / Molten Metal | ≥ 1400 °C / ≤ 1300 °C | Molten Metal / Metal |
| Wood, Oil, Plant | ≥ 300 / 250 / 250 °C | tick başına 1/16 olasılıkla tutuşur |

**`life` alanının anlamı materyale göre değişir:**

| Materyal | `life` anlamı |
| --- | --- |
| Fire | kalan ömür |
| Burning_* | kalan yanma süresi |
| Plant | büyüme bütçesi |
| Faz materyalleri (Water, Steam, Lava, Sand, Stone, Ice, Snow, Metal, Molten Metal) | faz ilerlemesi (sabit noktalı, ADR-015) |
| Cloner, Sink | kalan bütçe (65535 = sınırsız) |

## 6. Renderer (uygulandı — Phase 4, 8)

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
  4. glow (`lighter`)
  5. brush preview
- **Grid boyutu:** açılışta bir kez seçilir. Resize yalnızca sunumu değiştirir.
- **Glow:**
  - `fillPixels`, isteğe bağlı bir ışık tamponunu aynı döngüde doldurur (ateş, lav, yanma; alfa = yoğunluk).
  - Renderer bu tamponu grid → ½ → ¼ çözünürlüğe bilinear küçültür (ucuz bulanıklık) ve `lighter` ile ekler.
  - HIGH iki katman kullanır, MEDIUM tek katman, LOW hiç glow çizmez.
- **Otomatik kalite** (`app/quality.js`): kare iş süresinin EMA'sına bakar. 12 ms'yi 2 sn aşarsa bir kademe düşer; 6 ms'nin altında 5 sn kalırsa yükselir. Fizik etkilenmez.

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

## 8. Sahneler (uygulandı — Phase 7)

- **Sahne biçimi:** `{ id, name, generate(sim, rng), hidden? }`. Kayıt `js/scenes/index.js`'te.
- **Yükleme:** `Simulation.loadScene(scene, seed)`:
  1. dünyayı temizler;
  2. `sim`, `input` ve `scene` RNG stream'lerini seed'den yeniden kurar;
  3. tick, undo ve hold'u sıfırlar;
  4. sahneyi `scene` stream'iyle üretir.
  - Engine sahne kaydını bilmez; sahne nesnesi dışarıdan verilir.
- **Normalize koordinat:** sahneler `frame(sim)` ile çalışır (`X(0..1)`, `Y(0..1)`, `S(kısa kenar oranı)`). Böylece her grid boyutunda çalışır.
- **Determinizm:**
  - Aynı (sahne, seed, W, H) aynı başlangıcı verir.
  - Spawn hash'i `(index, tick, seed)` üzerinden hesaplanır; sonuç çağrı geçmişinden bağımsızdır.
  - Sahne kodu yalnızca aritmetik kullanır: `Math.sin`/`exp`/`pow` yoktur.
- **Yardımcılar** (`scenes/tools.js`): `valueNoise`, `rect`, `disk`, `thickLine`, `fillPolygon`, `fillColumns`.

| Sahne | İçerik |
| --- | --- |
| Volkan | kesik koni, krater + baca + magma odası, sağ yarık, kum, göl + bitki, ağaçlar |
| Kum saati | cam hazneler, 3 hücrelik boğaz, odun çerçeve, kum |
| Vaha | kum tepeleri, taşla kaplı gölet, bitki örtüsü, palmiyeler |
| Kaos Lab | seed'li platformlar, kaplar, materyal kütleleri (≤ %40 doluluk) |
| Benchmark | seed'den bağımsız sabit yük (performans karşılaştırması) |
| Boş | — |

## 9. Performans yaklaşımı (uygulandı — Phase 10)

- **Hot loop:**
  - Obje allocation yok; typed array'ler lokal değişkenlerde; lookup tabloları.
  - Yerleşmiş tozlar RNG tüketmez (zarsız ön kontrol).
  - Kum soğuması satır içi yapılır.
  - Gaz geçişi yalnızca gaz görülen satırları tarar.
- **Full-grid tarama:** boş hücreler erken atlanır. Active-chunk sistemi v1'de gerekmedi: Benchmark sahnesinde 400×225 ve ~44k parçacıkta ~2 ms/tick (ADR-005).
- **Ölçüm:** `npm run bench` headless ölçer; tarayıcıda `?debug=1` paneli fizik ve render sürelerini gösterir. Sonuçlar DEVELOPMENT.md benchmark log'undadır.
- **Frame bütçesi:** kare başına en fazla 8 ms fizik ve 8 tick. Yetişilemezse efektif hız zarifçe düşer.
- **Görsel kalite:** kalite düşürülürken önce dekoratif efektler azaltılır (otomatik kalite, Phase 8). Fizik doğruluğu korunur.

## 10. Geliştirme araçları (uygulandı — Phase 0)

- **`tools/serve.js`:** yerel statik sunucu. Doğru MIME tiplerini gönderir, path traversal'ı engeller, `no-store` başlığı kullanır.
- **`tools/check-paths.js`:** JS import'larını ve HTML `src`/`href` değerlerini tarar. Harf büyüklüğü uyuşmazlığı, eksik dosya ve root-absolute path problemlerini yakalar. `npm test` içinde ve CI'da çalışır.
- **`.github/workflows/pages.yml`:** önce test, ardından yalnızca uygulama dosyalarının GitHub Pages'e yayını.

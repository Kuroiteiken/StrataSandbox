// Kum saati: kavisli iki cam hazne, dar boğaz, odun kapaklar ve yan direkler.
// Cam ve odun şekli dünyanın orta satırına göre tam simetriktir (ters çevirince (F) aynı kalır).
// Akış sahte değildir: kum yalnızca fizik kurallarıyla boğazdan akar.
// Duvar eğimi satır başına en fazla 1 hücredir (A ≤ 0,66·L), bu yüzden kum camda takılmaz.
// Sürekli akış (hepsi sınırsız ve "aşağı yönlü" kaynak, ADR-016):
// - İki kapağın iç yüzünün ortasında kumu öğrenmiş çoğaltıcılar. Üstteki kapakta hazneye kum üretir;
//   alttakinin altı kapak olduğu için boşta kalır.
// - Yutucular dipte değil, alt haznenin üst kısmında, akışın iki yanında duvara yaslı cam rafların
//   üstünde. Alt hazne raf seviyesine kadar dolar, fazlası yutulur; hazne tamamen dolup boğazı
//   tıkamaz. Üst haznedeki eşleri aynada raf "tavanının" altında kalır ve boşta kalır.
// Çevirince (F) şekil aynı kalır ve görevler kendiliğinden yer değiştirir.
import { MAT } from '../engine/materials.js';
import { frame } from './tools.js';

const SAND_FILL = 0.85; // üst haznenin doluluk oranı
const CLONER_HALF = 4; // ortada en fazla 8 çoğaltıcı
const SHELF_DEPTH = 0.3; // raf satırının boğazdan uzaklığı (hazne yüksekliği L'nin oranı; en az)
const SHELF_SINKS = 3; // raf başına yutucu
const SHELF_MIN_HALF = 6; // rafın sığması için gereken en az iç yarı genişlik fazlası
const smoothstep = (u) => u * u * (3 - 2 * u);

export function hourglass(sim) {
  const { W, H } = frame(sim);
  // Her yazma orta satıra göre aynalanır (kum hariç; kum yalnızca üst yarıya konur).
  const put = (x, y, mat) => {
    sim.setCell(x, y, mat);
    sim.setCell(x, H - 1 - y, mat);
  };

  const cx = Math.floor((W - 2) / 2); // boğazın sol hücresi; boğaz: cx, cx+1
  const capH = Math.max(2, Math.min(3, Math.round(H * 0.015)));
  const top = Math.max(1, Math.round(H * 0.05));
  const glassTop = top + capH; // haznenin ilk satırı (kapağın altı)
  const midRow = Math.floor((H - 1) / 2); // üst yarının son satırı (tek H'de orta satır)
  const neckStart = H % 2 === 1 ? midRow - 1 : midRow; // boğaz tüpü: toplam 2 (çift H) ya da 3 (tek H) satır
  const L = Math.max(1, neckStart - glassTop);
  const A = Math.max(1, Math.min(Math.floor(0.66 * L), cx - 7, W - 9 - cx));
  // İç yarı genişlik fazlası (boğazda 0, kapağa yakın A): iç boşluk x ∈ [cx − a, cx + 1 + a].
  const extra = (y) => (y >= neckStart ? 0 : Math.round(A * smoothstep((neckStart - y) / L)));

  // Cam duvarlar: iki yanda 2'şer hücre.
  for (let y = glassTop; y <= midRow; y++) {
    const a = extra(y);
    for (const x of [cx - a - 2, cx - a - 1, cx + a + 2, cx + a + 3]) put(x, y, MAT.GLASS);
  }

  // Odun kapaklar ve direkler (direk ile cam arasında 2 hücre boşluk).
  const x0 = cx - A - 7;
  const x1 = cx + A + 8;
  for (let y = top; y < glassTop; y++) for (let x = x0; x <= x1; x++) put(x, y, MAT.WOOD);
  for (let y = glassTop; y <= midRow; y++) {
    for (const x of [cx - A - 6, cx - A - 5, cx + A + 6, cx + A + 7]) put(x, y, MAT.WOOD);
  }

  // Kum: üst haznenin alttan (boğazdan) yukarı ~%85'i.
  let total = 0;
  for (let y = glassTop; y <= midRow; y++) total += 2 + 2 * extra(y);
  let filled = 0;
  for (let y = midRow; y >= glassTop && filled < total * SAND_FILL; y--) {
    const a = extra(y);
    for (let x = cx - a; x <= cx + 1 + a; x++) sim.setCell(x, y, MAT.SAND);
    filled += 2 + 2 * a;
  }

  const configure = (x, y, options) => {
    sim.configureSource(x, y, options);
    sim.configureSource(x, H - 1 - y, options);
  };

  // Çoğaltıcılar: kapağın altındaki satırın ortası (sol/sağ simetrik).
  const cHalf = Math.min(CLONER_HALF, A + 1);
  for (let x = cx + 1 - cHalf; x <= cx + cHalf; x++) {
    put(x, glassTop, MAT.CLONER);
    configure(x, glassTop, { learn: MAT.SAND, budget: Infinity, downward: true });
  }

  // Raflar: üst yarı koordinatında boğazın dS satır üstü (aynası alt haznede boğazın dS satır altı).
  // Alt haznede yutucu rafın üstündedir; üstte (aynada) raf yutucunun tavanıdır.
  let dS = Math.max(3, Math.round(L * SHELF_DEPTH));
  while (dS < L - 2 && extra(neckStart - dS) < SHELF_MIN_HALF) dS++;
  const yS = neckStart - dS;
  const a = extra(yS);
  if (a < SHELF_MIN_HALF) return; // çok küçük hazne: raf sığmaz
  const aUp = extra(yS - 1);
  for (const side of [-1, 1]) {
    // Yan için x: sol duvardan içe doğru i. hücre (sağ taraf aynası).
    const at = (i) => (side < 0 ? cx - a + i : cx + 1 + a - i);
    for (let i = 0; i < SHELF_SINKS; i++) {
      put(at(i), yS, MAT.SINK);
      configure(at(i), yS, { budget: Infinity, downward: true });
    }
    // Raf/tavan: duvara bitişik, yutucuların iki yanına birer hücre taşar.
    for (let i = a - aUp - 1; i <= SHELF_SINKS; i++) put(at(i), yS - 1, MAT.GLASS);
  }
}

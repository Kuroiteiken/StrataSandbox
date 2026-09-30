// Kum saati: kavisli iki cam hazne, dar boğaz, odun kapaklar ve yan direkler.
// Cam ve odun şekli dünyanın orta satırına göre tam simetriktir (ters çevirince (F) aynı kalır).
// Akış sahte değildir: kum yalnızca fizik kurallarıyla boğazdan akar.
// Duvar eğimi satır başına en fazla 1 hücredir (A ≤ 0,66·L), bu yüzden kum camda takılmaz.
// Sürekli akış: iki kapağın iç yüzünde de aynı kaynak sırası var, hepsi sınırsız ve "aşağı yönlü":
// ortada kumu öğrenmiş çoğaltıcılar, iki yanda biraz uzakta yutucular. Üstteki kapakta çoğaltıcılar
// hazneye kum üretir (yutucuların üstü kapak, boşta kalır); alttaki kapakta yutucular yukarıdan
// yutar (çoğaltıcıların altı kapak, boşta kalır). Alttaki yığın yutuculara uzanana kadar büyür, bu
// yüzden boyu yutucuların ortaya uzaklığıyla belirlenir. Çevirince (F) roller yer değiştirir.
import { MAT } from '../engine/materials.js';
import { frame } from './tools.js';

const SAND_FILL = 0.85; // üst haznenin doluluk oranı
const CLONER_HALF = 4; // ortada en fazla 8 çoğaltıcı
const SINK_GAP = 12; // yutucuların ortadaki çifte uzaklığı (alt yığının yarı taban genişliği)
const SINK_RUN = 3; // her yanda 3 yutucu
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

  // Kaynaklar: kapağın altındaki satırda; ortadaki çifte uzaklık d ≤ A olduğundan camın içinde kalır.
  // Sıra sol/sağ simetriktir: d < cHalf çoğaltıcı, d ∈ [k, k + SINK_RUN) yutucu.
  const cHalf = Math.min(CLONER_HALF, A + 1);
  const k = Math.max(cHalf, Math.min(SINK_GAP, A + 1 - SINK_RUN));
  const source = (d, mat, options) => {
    if (d > A) return;
    for (const x of [cx - d, cx + 1 + d]) {
      put(x, glassTop, mat);
      for (const y of [glassTop, H - 1 - glassTop]) sim.configureSource(x, y, options);
    }
  };
  for (let d = 0; d < cHalf; d++) source(d, MAT.CLONER, { learn: MAT.SAND, budget: Infinity, downward: true });
  for (let d = k; d < k + SINK_RUN; d++) source(d, MAT.SINK, { budget: Infinity, downward: true });
}

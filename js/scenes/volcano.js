// Volkan (varsayılan sahne): taş koni, krater ve magma odası, sağa açılan bir yarıktan
// taşan lav, yamaçlarda kum, solda göl ve kıyısında bitkiler, sağda ağaçlar.
// Lav sağ yamaçtan iner: yamaç yüzeyinin hemen altındaki magma damarı yolu sıcak tuttuğu için kabuk
// bağlamadan eteğe ulaşır ve sağdaki ağaçları tutuşturur; etekte soğuk zeminde yayılıp taşlaşır.
// (Göl sol tarafta; lav yalnızca sağ yarıktan çıktığı için göle ulaşmaz.)
import { MAT } from '../engine/materials.js';
import { frame, valueNoise, rect, disk, fillColumns, isEmpty } from './tools.js';

const SLOPE_VEIN_DEPTH = 2; // yamaç damarının yüzeyden uzaklığı (arada 1 sıra taş)
const TREE_CLEARANCE = 9; // damarın ilk ağacın gövdesinden en az yatay uzaklığı (hücre)
const VEIN_TREE_GAP = 5; // damar hücresinin herhangi bir ağaç hücresine (gövde/taç) en az uzaklığı

export function volcano(sim, rng) {
  const { W, H, X, Y, S } = frame(sim);

  // Zemin: hafif dalgalı taş taban.
  const groundNoise = valueNoise(W, sim.seed, 'volcano-ground', 6);
  const ground = new Float32Array(W);
  for (let x = 0; x < W; x++) ground[x] = H * 0.86 + (groundNoise[x] - 0.5) * H * 0.05;

  // Koni: yamuk profil. Düz tepe (plato) krater ve bacayı her grid oranında taşın içinde
  // tutacak kadar geniştir; dikey/dar gridlerde bile lav havaya açılmaz.
  const cx = W * (0.52 + (rng.next() - 0.5) * 0.08);
  const cxi = Math.round(cx);
  const craterW = Math.max(2, S(0.06));
  const craterD = Math.max(2, S(0.05));
  const half = W * 0.27;
  const topHalf = Math.min(half * 0.6, craterW + 4);
  const plateauY = Math.round(H * 0.3) + craterD;
  const coneNoise = valueNoise(W, sim.seed, 'volcano-cone', 10);
  const top = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    const dx = Math.abs(x - cx);
    let cone = Infinity;
    if (dx <= topHalf) cone = plateauY;
    else if (dx < half) {
      const u = (dx - topHalf) / (half - topHalf);
      cone = plateauY + u * (ground[x] - plateauY) + (coneNoise[x] - 0.5) * H * 0.03 * u;
    }
    top[x] = Math.min(ground[x], cone);
  }

  // Göl havzası (sol): zemini alçalt.
  const lakeL = X(0.03);
  const lakeR = X(0.19);
  const lakeDepth = Math.max(3, H * 0.07);
  for (let x = lakeL; x <= lakeR; x++) {
    const u = (x - lakeL) / Math.max(1, lakeR - lakeL);
    top[x] = Math.max(top[x], ground[x] + lakeDepth * 4 * u * (1 - u));
  }
  fillColumns(sim, top, sim.view.height - 1, MAT.STONE);

  // Göl suyu: havzanın kenar seviyesine kadar.
  const waterLine = Math.round(Math.min(ground[lakeL], ground[lakeR]));
  for (let x = lakeL; x <= lakeR; x++) {
    for (let y = waterLine; y < Math.round(top[x]); y++) sim.setCell(x, y, MAT.WATER);
  }
  // Kıyı bitkileri (su kenarında, büyüyebilirler).
  for (const x of [lakeL - 1, lakeL, lakeR, lakeR + 1]) {
    const y = Math.round(top[Math.max(0, Math.min(W - 1, x))]) - 1;
    rect(sim, x, y - S(0.02), x, y, MAT.PLANT);
  }
  for (let x = lakeL + 1; x < lakeR; x += Math.max(2, Math.round((lakeR - lakeL) / 5))) sim.setCell(x, waterLine - 1, MAT.PLANT);

  // Magma odası + baca + krater çanağı (platonun altında; iki yanda taş kenar kalır).
  const chamberY = Y(0.62);
  const chamberR = S(0.07);
  disk(sim, cxi, chamberY, chamberR, MAT.LAVA);
  // Magma kaynağı: odanın alt yarısında sabit 1200 °C (oda lavı sıvı kalır; alt proje 2'de basınç).
  disk(sim, cxi, chamberY + Math.max(1, Math.floor(chamberR / 2)), Math.max(1, Math.floor(chamberR / 3)), MAT.MAGMA);
  const vent = Math.max(1, S(0.015));
  rect(sim, cxi - vent, plateauY + 1, cxi + vent, chamberY, MAT.LAVA);
  // Çanak yalnızca taşın içine oyulur ve dış tarafta en az 2 hücrelik taş kenar bırakır;
  // dik konilerde (dar/dikey grid) çanak ucunun havaya taşıp sol yamaca akması önlenir.
  const isStone = (x, y) => sim.getCell(x, y)?.material === MAT.STONE;
  for (let y = plateauY + 1; y <= plateauY + craterD; y++) {
    const w = Math.max(vent, Math.round(craterW * (1 - (y - plateauY - 1) / (craterD + 1))));
    // İçeriden dışarıya: dış kenar kontrolü henüz değiştirilmemiş (özgün) taşa bakar.
    for (const out of [-1, 1]) {
      for (let k = out === -1 ? 0 : 1; k <= w; k++) {
        const x = cxi + out * k;
        if (!(isStone(x, y) && isStone(x + out, y) && isStone(x + 2 * out, y))) break;
        sim.setCell(x, y, MAT.LAVA);
      }
    }
  }
  // Sağ kenardaki yarık: lav buradan sağ yamaçtan aşağı süzülür (sol kenar sağlam). Yarık yamaç
  // yüzeyine ulaşana kadar uzar (0.9.0'da sağ ucu tek sıra taşla kapalıydı; lav hiç çıkamıyordu).
  let riftEnd = cxi;
  for (let x = cxi; x < W - 1; x++) {
    sim.setCell(x, plateauY + 1, MAT.LAVA);
    sim.setCell(x, plateauY + 2, MAT.LAVA);
    riftEnd = x;
    if (x >= cxi + craterW + 4 && top[x + 1] > plateauY + 2) break; // sonraki sütunda yamaç yarığın altında
  }
  // Magma damarı: yarığın tabanını alttan ısıtır; ince kanaldaki lav soğuk taşa değip hemen kabuk
  // bağlamaz, yamaca akmaya devam eder (ağız kısmı açık kalsın diye son iki sütuna uzanmaz).
  for (let x = cxi; x <= riftEnd - 2; x++) if (isStone(x, plateauY + 3)) sim.setCell(x, plateauY + 3, MAT.MAGMA);
  // Çoğaltıcı: yarığın tabanında iki hücre. Çevresindeki lavı öğrenir; yarıktan lav aktıkça boşalan
  // bitişik hücreleri doldurur (hücre başına 1000 kopya, sonra durur). Basınç olmadığı için dolu odanın
  // dibine değil buraya konur: orada boş komşusu olmaz ve üretim yapamazdı (alt proje 2'de basınç).
  for (const dx of [Math.max(2, vent + 1), Math.max(3, vent + 2)]) sim.setCell(cxi + dx, plateauY + 2, MAT.CLONER);

  // Yamaçlarda kum örtüsü (taşın hemen üstü, kraterden uzak). Sağ yamaç lavın yoludur ve magma damarıyla
  // ısınır: oradaki kum cama dönüp lavın önüne set çekiyor, eteğe kayıp ağaç gövdesine yığılıyor ve damarın
  // ısısını ağaca iletiyordu; bu yüzden sağ yamaca kum konmaz (RNG sırası korunur: seed aynı sahneyi verir).
  const sandDepth = Math.max(1, S(0.012));
  for (let x = 0; x < W; x++) {
    const d = Math.abs(x - cx) / half;
    if (d < 0.25 || d > 0.95) continue;
    const y = Math.round(top[x]);
    const depth = sandDepth + (rng.next() < 0.5 ? 1 : 0);
    if (x > cx) continue;
    for (let k = 1; k <= depth; k++) {
      if (isEmpty(sim, x, y - k)) sim.setCell(x, y - k, MAT.SAND);
    }
  }

  // Ağaçlar (sağ): odun gövde + bitki taç.
  const trees = Math.max(1, Math.min(3, Math.round(W / 110)));
  const crownR = Math.max(1, S(0.045));
  let firstTree = W;
  for (let t = 0; t < trees; t++) {
    const x = X(0.84 + (t - (trees - 1) / 2) * 0.07 + (rng.next() - 0.5) * 0.02);
    firstTree = Math.min(firstTree, x);
    const base = Math.round(top[Math.max(0, Math.min(W - 1, x))]) - 1;
    const trunkH = Math.max(3, S(0.1 + rng.next() * 0.05));
    rect(sim, x, base - trunkH, x + (W > 150 ? 1 : 0), base, MAT.WOOD);
    disk(sim, x, base - trunkH - S(0.03), crownR, MAT.PLANT, { onlyEmpty: true });
  }

  // Yamaç damarı: yarık ağzından eteğe doğru, yüzeye paralel ve kesintisiz; yüzeyden tam
  // SLOPE_VEIN_DEPTH hücre içerideki taşlar (dik yamaçta da boşluksuz). Aradaki taş ~1000 °C'ye ısınır;
  // lav 750 °C'nin üstünde kalıp yamaç boyunca akar (yamaçtaki kum bu sıcak yolda zamanla cama döner).
  // Damar ilk ağacın gövdesinin TREE_CLEARANCE hücre önünde biter (taç gövdenin üstünde, damardan
  // yüksekte kalır): ağacı damarın ısısı değil, oraya ulaşan lav tutuşturur.
  const veinEnd = Math.min(W - 2, Math.round(cx + half), firstTree - TREE_CLEARANCE);
  const x0 = Math.max(cxi, riftEnd - 1);
  const exposed = (x, y, r) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!isStone(x + dx, y + dy)) return true;
    return false;
  };
  // Küçük gridlerde taç yamaca yaslanabilir: damar ağaç hücrelerinin (gövde ya da taç) VEIN_TREE_GAP
  // hücre yakınına konmaz, ısınan yamaç yüzü ağaca değmez.
  const nearTree = (x, y) => {
    for (let dy = -VEIN_TREE_GAP; dy <= VEIN_TREE_GAP; dy++) {
      for (let dx = -VEIN_TREE_GAP; dx <= VEIN_TREE_GAP; dx++) {
        const m = sim.getCell(x + dx, y + dy)?.material;
        if (m === MAT.WOOD || m === MAT.PLANT) return true;
      }
    }
    return false;
  };
  const vein = [];
  for (let x = x0; x <= veinEnd; x++) {
    // Yarığın içinde tabanın altından, ağzın dışında yarık seviyesinden başlar (ağzın hemen önündeki yamaç
    // yüzü de ısınır; soğuk yüzde lav ağızda kabuk bağlayıp yarığı tıkıyordu).
    for (let y = x > riftEnd ? plateauY + 1 : plateauY + 3; y < Math.round(ground[x]); y++) {
      if (isStone(x, y) && exposed(x, y, SLOPE_VEIN_DEPTH) && !exposed(x, y, SLOPE_VEIN_DEPTH - 1) && !nearTree(x, y)) vein.push(x, y);
    }
  }
  for (let k = 0; k < vein.length; k += 2) sim.setCell(vein[k], vein[k + 1], MAT.MAGMA);
}

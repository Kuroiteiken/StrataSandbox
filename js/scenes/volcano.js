// Volkan (varsayılan sahne): taş koni, krater ve magma odası, sağa açılan bir yarıktan
// taşan lav, yamaçlarda kum, solda göl ve kıyısında bitkiler, sağda ağaçlar.
// Lav zamanla ağaçlara ve göle ulaşır: tutuşma, buharlaşma ve taşlaşma etkileşimleri.
import { MAT } from '../engine/materials.js';
import { frame, valueNoise, rect, disk, fillColumns, isEmpty } from './tools.js';

export function volcano(sim, rng) {
  const { W, H, X, Y, S } = frame(sim);

  // Zemin: hafif dalgalı taş taban.
  const groundNoise = valueNoise(W, sim.seed, 'volcano-ground', 6);
  const ground = new Float32Array(W);
  for (let x = 0; x < W; x++) ground[x] = H * 0.86 + (groundNoise[x] - 0.5) * H * 0.05;

  // Koni profili: tepe noktasından iki yana doğrusal iniş + gürültü.
  const cx = W * (0.52 + (rng.next() - 0.5) * 0.08);
  const half = W * 0.27;
  const peak = H * 0.3;
  const coneNoise = valueNoise(W, sim.seed, 'volcano-cone', 10);
  const top = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    const d = Math.abs(x - cx) / half;
    const cone = d < 1 ? peak + d * (ground[x] - peak) + (coneNoise[x] - 0.5) * H * 0.03 : Infinity;
    top[x] = Math.min(ground[x], cone);
  }

  // Kesik koni: tepede krater platosu (krater koninin içine oyulur; lav havada durmaz).
  const cxi = Math.round(cx);
  const craterW = Math.max(2, S(0.06));
  const craterD = Math.max(2, S(0.05));
  const plateauY = Math.round(peak) + craterD;
  for (let x = cxi - craterW - 3; x <= cxi + craterW + 3; x++) {
    if (x >= 0 && x < W) top[x] = Math.max(top[x], plateauY);
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
  const vent = Math.max(1, S(0.015));
  rect(sim, cxi - vent, plateauY + 1, cxi + vent, chamberY, MAT.LAVA);
  for (let y = plateauY + 1; y <= plateauY + craterD; y++) {
    const w = Math.max(vent, Math.round(craterW * (1 - (y - plateauY - 1) / (craterD + 1))));
    rect(sim, cxi - w, y, cxi + w, y, MAT.LAVA);
  }
  // Sağ kenardaki yarık: lav buradan sağ yamaçtan aşağı süzülür (sol kenar sağlam).
  for (let x = cxi; x <= cxi + craterW + 4 && x < W; x++) {
    sim.setCell(x, plateauY + 1, MAT.LAVA);
    sim.setCell(x, plateauY + 2, MAT.LAVA);
  }

  // Yamaçlarda kum örtüsü (taşın hemen üstü, kraterden uzak).
  const sandDepth = Math.max(1, S(0.012));
  for (let x = 0; x < W; x++) {
    const d = Math.abs(x - cx) / half;
    if (d < 0.25 || d > 0.95) continue;
    const y = Math.round(top[x]);
    for (let k = 1; k <= sandDepth + (rng.next() < 0.5 ? 1 : 0); k++) {
      if (isEmpty(sim, x, y - k)) sim.setCell(x, y - k, MAT.SAND);
    }
  }

  // Ağaçlar (sağ): odun gövde + bitki taç.
  const trees = Math.max(1, Math.min(3, Math.round(W / 110)));
  for (let t = 0; t < trees; t++) {
    const x = X(0.84 + (t - (trees - 1) / 2) * 0.07 + (rng.next() - 0.5) * 0.02);
    const base = Math.round(top[Math.max(0, Math.min(W - 1, x))]) - 1;
    const trunkH = Math.max(3, S(0.1 + rng.next() * 0.05));
    rect(sim, x, base - trunkH, x + (W > 150 ? 1 : 0), base, MAT.WOOD);
    disk(sim, x, base - trunkH - S(0.03), Math.max(1, S(0.045)), MAT.PLANT, { onlyEmpty: true });
  }
}

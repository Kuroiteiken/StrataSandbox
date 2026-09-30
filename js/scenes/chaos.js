// Kaos Lab: seed tabanlı, kontrollü rastgele düzen. Taş zemin, platformlar, cam kaplar
// ve materyal kütleleri; doluluk en fazla %40. Aynı seed aynı başlangıcı üretir.
import { MAT } from '../engine/materials.js';
import { frame, rect, disk } from './tools.js';

const BLOB_MATERIALS = [MAT.SAND, MAT.WATER, MAT.OIL, MAT.LAVA, MAT.WOOD, MAT.PLANT, MAT.STONE, MAT.STEAM];
const MAX_FILL = 0.36; // üretim sonunda en fazla ~%40 (kaplar ve zemin dahil)

export function chaos(sim, rng) {
  const { W, H, S } = frame(sim);
  const budget = W * H * MAX_FILL;
  const filled = () => sim.getStats().particles;

  // Zemin.
  rect(sim, 0, H - 2, W - 1, H - 1, MAT.STONE);

  // Platformlar.
  const platforms = 3 + rng.int(4);
  for (let p = 0; p < platforms; p++) {
    const w = Math.max(4, Math.round(W * (0.1 + rng.next() * 0.2)));
    const x = rng.int(Math.max(1, W - w));
    const y = Math.round(H * (0.3 + rng.next() * 0.55));
    rect(sim, x, y, x + w, y + (rng.next() < 0.5 ? 0 : 1), rng.next() < 0.7 ? MAT.STONE : MAT.GLASS);
  }

  // Cam kaplar (üstü açık), bazıları sıvıyla dolu.
  const cups = 1 + rng.int(3);
  for (let c = 0; c < cups; c++) {
    const w = Math.max(5, Math.round(W * (0.08 + rng.next() * 0.08)));
    const h = Math.max(4, Math.round(H * (0.1 + rng.next() * 0.1)));
    const x = rng.int(Math.max(1, W - w));
    const y = H - 3 - h;
    rect(sim, x, y, x, y + h, MAT.GLASS);
    rect(sim, x + w, y, x + w, y + h, MAT.GLASS);
    rect(sim, x, y + h, x + w, y + h, MAT.GLASS);
    if (rng.next() < 0.7) {
      const liquid = [MAT.WATER, MAT.OIL, MAT.LAVA][rng.int(3)];
      rect(sim, x + 1, y + Math.round(h * 0.4), x + w - 1, y + h - 1, liquid);
    }
  }

  // Materyal kütleleri: ilk dördü farklı materyallerden (çeşitlilik garantisi).
  const order = [...BLOB_MATERIALS];
  for (let k = order.length - 1; k > 0; k--) {
    const j = rng.int(k + 1);
    [order[k], order[j]] = [order[j], order[k]];
  }
  const blobs = 8 + rng.int(8);
  for (let b = 0; b < blobs && filled() < budget; b++) {
    const mat = b < order.length ? order[b] : BLOB_MATERIALS[rng.int(BLOB_MATERIALS.length)];
    const r = Math.max(1, S(0.03 + rng.next() * 0.05));
    const x = rng.int(W);
    const y = Math.round(H * (0.05 + rng.next() * 0.6));
    if (rng.next() < 0.5) disk(sim, x, y, r, mat, { onlyEmpty: true });
    else {
      for (let yy = y - r; yy <= y + r; yy++) {
        for (let xx = x - r; xx <= x + r; xx++) {
          const cell = sim.getCell(xx, yy);
          if (cell && cell.material === MAT.EMPTY) sim.setCell(xx, yy, mat);
        }
      }
    }
  }

  // Biraz ateş: odun ya da bitki varsa yakınına kıvılcım.
  if (rng.next() < 0.6) sim.setCell(rng.int(W), Math.round(H * 0.5), MAT.FIRE);
}

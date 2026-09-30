// Mağara: neredeyse tamamen taş bir dünya; value noise ile oyulmuş ana tünel ve bir oda, yüzeye açılan
// baca, en alçak odada yeraltı gölü, ince taş duvarın ardında magma ısıtmalı lav cebi (kaplıca
// buharı), tavandan sarkıtlar, odun maden destekleri, taşın içinde yağ cebi ve kum birikintisi.
// Alt proje 2'nin patlatma/kazı sahnesi olacak. Ortam 12 °C (index.js).
import { MAT } from '../engine/materials.js';
import { frame, valueNoise, rect, disk, thickLine } from './tools.js';

export function cave(sim, rng) {
  const { W, H, X, Y, S } = frame(sim);
  rect(sim, 0, 0, W - 1, H - 1, MAT.STONE);
  const empty = (x, y) => sim.getCell(x, y)?.material === MAT.EMPTY;

  // Ana tünel: gürültülü orta çizgi ve yükseklik.
  const mid = valueNoise(W, sim.seed, 'cave-mid', 6);
  const tall = valueNoise(W, sim.seed, 'cave-tall', 9);
  const center = new Int32Array(W);
  const half = new Int32Array(W);
  for (let x = 0; x < W; x++) {
    center[x] = Math.round(H * (0.4 + (mid[x] - 0.5) * 0.2));
    half[x] = Math.max(2, Math.round(S(0.05) + tall[x] * S(0.05)));
    rect(sim, x, center[x] - half[x], x, center[x] + half[x], MAT.EMPTY);
  }

  // Yüzeye açılan baca.
  const sx = X(0.14);
  const sw = Math.max(1, S(0.02));
  rect(sim, sx - sw, 0, sx + sw, center[sx], MAT.EMPTY);

  // Göl odası (en alçak) ve tünele bağlantısı; göl odanın alt yarısında.
  const lx = X(0.58);
  const ly = Y(0.72);
  const lr = Math.max(3, S(0.11));
  disk(sim, lx, ly, lr, MAT.EMPTY);
  const jx = lx - Math.round(lr / 2);
  thickLine(sim, lx, ly - lr, jx, center[jx], MAT.EMPTY, Math.max(2, S(0.03)));
  for (let y = ly; y <= ly + lr; y++) {
    for (let x = lx - lr; x <= lx + lr; x++) if (empty(x, y) && y > center[x] + half[x]) sim.setCell(x, y, MAT.WATER);
  }

  // Lav cebi: gölün sağında, arada en az 2 hücre taş.
  const pr = Math.max(2, S(0.04));
  const pxc = Math.min(W - 2 - pr, lx + lr + 3 + pr);
  const pyc = ly + Math.round(lr / 3);
  disk(sim, pxc, pyc, pr, MAT.LAVA);
  disk(sim, pxc, pyc, Math.max(1, Math.floor(pr / 2)), MAT.MAGMA);

  // Yan oda (tünelin altında) ve tabanında kum.
  const ax = X(0.34);
  const ar = Math.max(2, S(0.07));
  const ay = center[ax] + half[ax] + Math.round(ar * 0.6);
  disk(sim, ax, ay, ar, MAT.EMPTY);
  for (let y = ay + Math.round(ar / 2); y <= ay + ar; y++) for (let x = ax - ar; x <= ax + ar; x++) if (empty(x, y)) sim.setCell(x, y, MAT.SAND);

  // Sarkıtlar (tünel tavanından).
  const step = Math.max(4, S(0.07));
  for (let x = X(0.2); x < X(0.95); x += step) {
    const len = 2 + Math.floor(rng.next() * Math.max(1, S(0.04)));
    const y0 = center[x] - half[x];
    for (let k = 0; k < len; k++) {
      const w = Math.floor((len - k - 1) / 2);
      for (let dx = -w; dx <= w; dx++) if (empty(x + dx, y0 + k)) sim.setCell(x + dx, y0 + k, MAT.STONE);
    }
  }

  // Odun maden destekleri: iki dikme ve tavan kirişi.
  const gap = Math.max(3, S(0.05));
  for (const f of [0.45, 0.8]) {
    const x0 = X(f);
    const x1 = Math.min(W - 1, x0 + gap);
    for (const x of [x0, x1]) {
      for (let y = center[x] - half[x] + 1; y <= center[x] + half[x]; y++) if (empty(x, y)) sim.setCell(x, y, MAT.WOOD);
    }
    const beamY = Math.max(center[x0] - half[x0], center[x1] - half[x1]) + 1;
    for (let x = x0; x <= x1; x++) if (empty(x, beamY)) sim.setCell(x, beamY, MAT.WOOD);
  }

  // Taşın içinde kapalı yağ cebi.
  disk(sim, X(0.3), Y(0.86), Math.max(1, S(0.03)), MAT.OIL);
}

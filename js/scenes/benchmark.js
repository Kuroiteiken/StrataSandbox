// Benchmark: performans karşılaştırmaları için seed'den bağımsız sabit yerleşim.
// Büyük kum alanı, su deposu, lav havuzu, odun + ateş, buhar bulutu ve bitki bahçesi.
// Sonuçlar docs/DEVELOPMENT.md benchmark log'una yazılır (tools/bench.js, Phase 10).
import { MAT } from '../engine/materials.js';
import { frame, rect, disk } from './tools.js';

export function benchmark(sim) {
  const { W, H, X, Y, S } = frame(sim);

  // Büyük kum alanı (alt ~%38).
  rect(sim, 0, Y(0.62), W - 1, H - 1, MAT.SAND);
  // Su deposu (sol): cam kap + su.
  const tx0 = X(0.04);
  const tx1 = X(0.3);
  const ty0 = Y(0.2);
  const ty1 = Y(0.6);
  rect(sim, tx0, ty0, tx0, ty1, MAT.GLASS);
  rect(sim, tx1, ty0, tx1, ty1, MAT.GLASS);
  rect(sim, tx0, ty1, tx1, ty1, MAT.GLASS);
  rect(sim, tx0 + 1, Y(0.3), tx1 - 1, ty1 - 1, MAT.WATER);
  // Bitki bahçesi: deponun hemen üstünde, suya değen bitkiler.
  rect(sim, tx0 + 2, Y(0.3) - 1, tx1 - 2, Y(0.3) - 1, MAT.PLANT);
  // Lav havuzu (orta-sağ): taş çanak + lav; üstünde su damlası akacak alan.
  const lx0 = X(0.55);
  const lx1 = X(0.8);
  const ly = Y(0.55);
  rect(sim, lx0, ly - S(0.06), lx0, ly, MAT.STONE);
  rect(sim, lx1, ly - S(0.06), lx1, ly, MAT.STONE);
  rect(sim, lx0, ly, lx1, ly, MAT.STONE);
  rect(sim, lx0 + 1, ly - S(0.05), lx1 - 1, ly - 1, MAT.LAVA);
  // Odun blokları ve altlarında ateş.
  for (const f of [0.36, 0.44]) {
    rect(sim, X(f), Y(0.44), X(f) + S(0.05), Y(0.52), MAT.WOOD);
    rect(sim, X(f), Y(0.53), X(f) + S(0.05), Y(0.54), MAT.FIRE);
  }
  // Buhar bulutu (üst).
  disk(sim, X(0.7), Y(0.12), Math.max(2, S(0.07)), MAT.STEAM);
  // Yağ tabakası (lavın solunda, kum üstünde).
  rect(sim, X(0.34), Y(0.58), X(0.52), Y(0.61), MAT.OIL);
}

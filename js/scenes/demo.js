// Geçici demo sahnesi (görünür dilim). Normalize koordinatlarla kurulur, her grid
// boyutunda çalışır. Phase 7'de gerçek sahneler gelince kaldırılacak.
import { MAT } from '../engine/materials.js';

function line(sim, x0, y0, x1, y1, material, thickness = 2) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(x0 + ((x1 - x0) * s) / steps);
    const y = Math.round(y0 + ((y1 - y0) * s) / steps);
    for (let t = 0; t < thickness; t++) sim.setCell(x, y + t, material);
  }
}

function rect(sim, x0, y0, x1, y1, material) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) sim.setCell(x, y, material);
}

export function buildDemo(sim) {
  const { width: W, height: H } = sim.view;
  const X = (f) => Math.round(f * (W - 1));
  const Y = (f) => Math.round(f * (H - 1));
  sim.clear();

  line(sim, X(0.06), Y(0.36), X(0.4), Y(0.48), MAT.STONE); // sol eğimli raf
  line(sim, X(0.94), Y(0.5), X(0.6), Y(0.62), MAT.STONE); // sağ eğimli raf
  // Alt havuz: taş zemin + cam kenarlar.
  rect(sim, X(0.3), Y(0.97), X(0.7), Y(0.97), MAT.STONE);
  rect(sim, X(0.3), Y(0.78), X(0.3) + 1, Y(0.97), MAT.GLASS);
  rect(sim, X(0.7) - 1, Y(0.78), X(0.7), Y(0.97), MAT.GLASS);
  // Statikler: odun kütüğü ve bitki.
  rect(sim, X(0.08), Y(0.88), X(0.2), Y(0.92), MAT.WOOD);
  rect(sim, X(0.1), Y(0.84), X(0.18), Y(0.87), MAT.PLANT);

  rect(sim, X(0.1), Y(0.06), X(0.3), Y(0.24), MAT.SAND); // kum bloğu
  rect(sim, X(0.78), Y(0.3), X(0.9), Y(0.42), MAT.OIL); // sağ rafta yağ
  rect(sim, X(0.84), Y(0.86), X(0.94), Y(0.97), MAT.LAVA); // köşede lava
  rect(sim, X(0.34), Y(0.9), X(0.66), Y(0.95), MAT.STEAM); // havuzun dibinde buhar
  rect(sim, X(0.1), Y(0.93), X(0.18), Y(0.94), MAT.FIRE); // kütüğü tutuşturan kıvılcımlar
}

// Demo sırasında sürekli akıtılan kaynaklar.
export function demoSources(W, H) {
  void H;
  return [
    { x: Math.round(0.5 * (W - 1)), y: 0, material: MAT.WATER },
    { x: Math.round(0.62 * (W - 1)), y: 0, material: MAT.SAND },
  ];
}

// Geçici demo sahnesi (Phase 1 görünür dilim). Normalize koordinatlarla
// kurulur, her grid boyutunda çalışır. Phase 7'de gerçek sahneler gelince kaldırılacak.
import { MAT } from '../engine/materials.js';

function line(sim, x0, y0, x1, y1, material, thickness = 2) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(x0 + ((x1 - x0) * s) / steps);
    const y = Math.round(y0 + ((y1 - y0) * s) / steps);
    for (let t = 0; t < thickness; t++) sim.setCell(x, y + t, material);
  }
}

export function buildDemo(sim) {
  const { width: W, height: H } = sim.view;
  const X = (f) => Math.round(f * (W - 1));
  const Y = (f) => Math.round(f * (H - 1));
  sim.clear();

  line(sim, X(0.08), Y(0.38), X(0.46), Y(0.5), MAT.STONE); // sol eğimli raf
  line(sim, X(0.92), Y(0.58), X(0.54), Y(0.7), MAT.STONE); // sağ eğimli raf
  line(sim, X(0.2), Y(0.8), X(0.46), Y(0.92), MAT.STONE); // huni sol
  line(sim, X(0.8), Y(0.8), X(0.54), Y(0.92), MAT.STONE); // huni sağ

  for (let y = Y(0.06); y <= Y(0.26); y++) {
    for (let x = X(0.12); x <= X(0.34); x++) sim.setCell(x, y, MAT.SAND);
  }
}

// Demo sırasında sürekli kum akıtılan noktalar.
export function demoSources(W, H) {
  void H;
  return [
    { x: Math.round(0.6 * (W - 1)), y: 0 },
    { x: Math.round(0.74 * (W - 1)), y: 0 },
  ];
}

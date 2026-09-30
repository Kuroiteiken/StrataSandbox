// Vaha: seed'li kum tepeleri, taşla çevrili bir gölet, kıyıda bitki örtüsü ve palmiyeler.
import { MAT } from '../engine/materials.js';
import { frame, valueNoise, rect, disk, fillColumns, isEmpty } from './tools.js';

export function oasis(sim, rng) {
  const { W, H, X, S } = frame(sim);

  // Kum tepeleri: iki oktav value noise.
  const coarse = valueNoise(W, sim.seed, 'oasis-dunes', 4);
  const fine = valueNoise(W, sim.seed, 'oasis-ripples', 14);
  const top = new Float32Array(W);
  for (let x = 0; x < W; x++) top[x] = H * (0.5 + 0.18 * (coarse[x] - 0.5) + 0.04 * (fine[x] - 0.5));

  // Gölet: çanak şeklinde çukur.
  const pc = X(0.5 + (rng.next() - 0.5) * 0.16);
  const hw = Math.max(4, Math.round(W * 0.13));
  const rim = Math.round(Math.min(top[Math.max(0, pc - hw)], top[Math.min(W - 1, pc + hw)]));
  const depth = Math.max(3, Math.round(H * 0.12));
  const bowl = new Float32Array(W).fill(Infinity);
  for (let x = pc - hw; x <= pc + hw; x++) {
    if (x < 0 || x >= W) continue;
    const u = (x - pc) / hw;
    bowl[x] = rim + depth * (1 - u * u);
    top[x] = Math.max(top[x], rim + 1);
  }

  // Taş taban ve kum.
  const bedrock = H - 1 - Math.max(2, Math.round(H * 0.06));
  fillColumns(sim, top, H - 1, MAT.SAND);
  rect(sim, 0, bedrock, W - 1, H - 1, MAT.STONE);

  // Göleti oy: taş kaplama (2 hücre) + su.
  for (let x = pc - hw; x <= pc + hw; x++) {
    if (x < 0 || x >= W) continue;
    const b = Math.round(bowl[x]);
    for (let y = rim; y <= b + 2 && y < bedrock; y++) {
      if (y <= b) sim.setCell(x, y, MAT.WATER);
      else sim.setCell(x, y, MAT.STONE);
    }
  }
  // Kıyıda taş kenar (su kaçmasın).
  rect(sim, pc - hw - 1, rim, pc - hw, rim + 2, MAT.STONE);
  rect(sim, pc + hw, rim, pc + hw + 1, rim + 2, MAT.STONE);

  // Bitki örtüsü: gölet kıyısında küçük öbekler.
  const surface = (x) => {
    for (let y = 0; y < H; y++) if (!isEmpty(sim, x, y)) return y;
    return H - 1;
  };
  for (let k = 0; k < Math.max(4, Math.round(W / 30)); k++) {
    const side = k % 2 === 0 ? -1 : 1;
    const x = pc + side * (hw + 2 + Math.round(rng.next() * hw * 0.5));
    if (x < 0 || x >= W) continue;
    const y = surface(x) - 1;
    rect(sim, x, y - Math.round(rng.next() * S(0.02)), x, y, MAT.PLANT);
  }
  sim.setCell(pc - hw + 1, rim - 1, MAT.PLANT);
  sim.setCell(pc + hw - 1, rim - 1, MAT.PLANT);

  // Palmiyeler: kavisli odun gövde + bitki taç.
  const palms = Math.max(1, Math.min(3, Math.round(W / 120)));
  for (let p = 0; p < palms; p++) {
    const side = p % 2 === 0 ? -1 : 1;
    const x0 = pc + side * (hw + Math.round(W * 0.06) + p * Math.round(W * 0.05));
    if (x0 < 1 || x0 >= W - 1) continue;
    const base = surface(x0) - 1;
    const height = Math.max(4, S(0.16 + rng.next() * 0.05));
    let x = x0;
    for (let k = 0; k < height; k++) {
      if (k > 0 && k % Math.max(3, Math.round(height / 3)) === 0) x += side;
      sim.setCell(x, base - k, MAT.WOOD);
    }
    disk(sim, x, base - height - 1, Math.max(1, S(0.035)), MAT.PLANT, { onlyEmpty: true });
  }
}

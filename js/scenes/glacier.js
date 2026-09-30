// Buzul: karla kaplı taş yamaçlar, yüzeyi donmuş bir göl (üstte buz, altında +4 °C su), bir yamaçtan
// göle uzanan metal çubuk ve taşın içinde magma ısıtmalı küçük bir lav cebi (üstü taşla kapalı baca).
// Ortam −15 °C (index.js). Zamanla baca çevresindeki kar erir, metal ısıyı iletir, göl yavaşça donar.
import { MAT } from '../engine/materials.js';
import { frame, valueNoise, rect, disk, fillColumns, isEmpty } from './tools.js';

const LAKE_TEMP = 4; // göl suyu ve altındaki zemin (°C)
const ICE_TEMP = -5;

export function glacier(sim, rng) {
  const { W, H, X, Y, S } = frame(sim);
  const noise = valueNoise(W, sim.seed, 'glacier-ground', 9);
  const lakeL = X(0.3);
  const lakeR = X(0.68);
  const surface = Y(0.56);
  const depth = Math.max(4, Math.round(H * 0.2));

  // Zemin profili: solda yüksek yamaç, ortada göl çanağı, sağda daha alçak yamaç.
  const top = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    const n = (noise[x] - 0.5) * H * 0.04;
    if (x <= lakeL) {
      const u = x / Math.max(1, lakeL);
      top[x] = H * 0.3 + u * (surface - H * 0.3) + n * (1 - u);
    } else if (x >= lakeR) {
      const u = (x - lakeR) / Math.max(1, W - 1 - lakeR);
      top[x] = surface + u * (H * 0.38 - surface) + n * u;
    } else {
      const u = (x - lakeL) / Math.max(1, lakeR - lakeL);
      top[x] = surface + depth * 4 * u * (1 - u);
    }
  }
  fillColumns(sim, top, H - 1, MAT.STONE);

  // Gölün altındaki zemin ılık (jeotermal); göl: üstte buz, altında su.
  const iceRows = Math.max(2, Math.min(3, Math.round(H * 0.012)));
  const warmDepth = Math.max(2, S(0.06));
  for (let x = lakeL + 1; x < lakeR; x++) {
    const bottom = Math.round(top[x]);
    for (let y = bottom; y < Math.min(H, bottom + warmDepth); y++) sim.setTemp(x, y, LAKE_TEMP);
    for (let y = surface; y < bottom; y++) {
      const ice = y < surface + iceRows;
      sim.setCell(x, y, ice ? MAT.ICE : MAT.WATER);
      sim.setTemp(x, y, ice ? ICE_TEMP : LAKE_TEMP);
    }
    if (rng.next() < 0.3) sim.setCell(x, surface - 1, MAT.SNOW); // buzun üstünde serpinti
  }

  // Yamaçlarda kar örtüsü.
  for (let x = 0; x < W; x++) {
    if (x >= lakeL - 1 && x <= lakeR + 1) continue;
    const y = Math.round(top[x]);
    const snowDepth = 1 + (rng.next() < 0.6 ? 1 : 0) + (S(0.01) > 1 ? 1 : 0);
    for (let k = 1; k <= snowDepth; k++) if (isEmpty(sim, x, y - k)) sim.setCell(x, y - k, MAT.SNOW);
  }

  // Metal çubuk: sol yamaçtan (içine gömülü) göl yüzeyinin üstüne uzanır.
  const barY = surface - 2;
  for (let x = Math.max(0, lakeL - S(0.1)); x <= Math.min(W - 1, lakeL + S(0.12)); x++) sim.setCell(x, barY, MAT.METAL);

  // Lav cebi ve baca: sağ yamacın altında, üstü 2 hücre taşla kapalı (ısı iletimle yüzeye çıkar).
  const vx = X(0.84);
  const vr = Math.max(1, S(0.025));
  const lavaR = vr + Math.max(1, S(0.02));
  const vy = Math.min(H - 2 - lavaR, Math.round(top[vx]) + Math.max(lavaR + 3, S(0.12)));
  disk(sim, vx, vy, lavaR, MAT.LAVA);
  disk(sim, vx, vy, vr, MAT.MAGMA);
  const chimneyTop = Math.round(top[vx]) + 2;
  if (chimneyTop < vy - lavaR) rect(sim, vx, chimneyTop, vx + (W > 150 ? 1 : 0), vy - lavaR, MAT.LAVA);
}

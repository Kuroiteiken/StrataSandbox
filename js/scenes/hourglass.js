// Kum saati: cam duvarlı iki hazne, 3 hücrelik dar boğaz, odun çerçeve ve üst haznede kum.
// Animasyon sahte değildir: kum yalnızca fizik kurallarıyla boğazdan akar.
import { MAT } from '../engine/materials.js';
import { frame, rect, thickLine, fillPolygon } from './tools.js';

export function hourglass(sim) {
  const { W, H } = frame(sim);
  const cx = Math.floor(W / 2);
  const y0 = Math.max(3, Math.round(H * 0.06));
  const y1 = Math.min(H - 4, Math.round(H * 0.94));
  const ym = Math.round((y0 + y1) / 2);
  const hw = Math.max(6, Math.round(Math.min(W * 0.42, (y1 - y0) * 0.36)));
  const throat = 1; // boğaz açıklığı: cx-1..cx+1 (3 hücre)
  const glass = 2; // cam kalınlığı

  // Cam duvarlar: sol ve sağ, dış köşeden boğaza ve tekrar dışa.
  const wallL = [[cx - hw, y0], [cx - throat - 1 - glass + 1, ym], [cx - hw, y1]];
  const wallR = [[cx + hw, y0], [cx + throat + 1 + glass - 1, ym], [cx + hw, y1]];
  for (const wall of [wallL, wallR]) {
    thickLine(sim, wall[0][0], wall[0][1], wall[1][0], wall[1][1], MAT.GLASS, glass);
    thickLine(sim, wall[1][0], wall[1][1], wall[2][0], wall[2][1], MAT.GLASS, glass);
  }
  // Boğazın iki yanı: tam boğaz satırında 3 hücrelik açıklık kalsın.
  rect(sim, cx - throat - glass, ym, cx - throat - 1, ym, MAT.GLASS);
  rect(sim, cx + throat + 1, ym, cx + throat + glass, ym, MAT.GLASS);
  for (let x = cx - throat; x <= cx + throat; x++) sim.setCell(x, ym, MAT.EMPTY);

  // Üst ve alt kapaklar (cam) + odun çerçeve.
  rect(sim, cx - hw, y0, cx + hw, y0, MAT.GLASS);
  rect(sim, cx - hw, y1, cx + hw, y1, MAT.GLASS);
  const fx0 = cx - hw - 3;
  const fx1 = cx + hw + 3;
  rect(sim, fx0, y0 - 2, fx1, y0 - 1, MAT.WOOD);
  rect(sim, fx0, y1 + 1, fx1, y1 + 2, MAT.WOOD);
  rect(sim, fx0, y0 - 2, fx0 + 1, y1 + 2, MAT.WOOD);
  rect(sim, fx1 - 1, y0 - 2, fx1, y1 + 2, MAT.WOOD);

  // Üst haznede kum: iç üçgenin alt ~%80'i (tepede boşluk kalır).
  const sandTop = y0 + Math.max(2, Math.round((ym - y0) * 0.18));
  const inset = glass + 1;
  const topBulb = [[cx - hw + inset, y0 + 1], [cx + hw - inset, y0 + 1], [cx, ym - 1]];
  fillPolygon(sim, topBulb, MAT.SAND);
  for (let y = y0 + 1; y < sandTop; y++) for (let x = cx - hw; x <= cx + hw; x++) {
    const c = sim.getCell(x, y);
    if (c && c.material === MAT.SAND) sim.setCell(x, y, MAT.EMPTY);
  }
}
